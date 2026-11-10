/**
 * 本地优先 + 服务器同步
 *
 * - 页面照常读写 IndexedDB（Dexie），断网也能用。
 * - Dexie hooks 记录每次本地修改（表 + id + 时间），存在 localStorage 的「待同步」列表里。
 * - 联网时把待同步的记录推给服务器，同时拉回服务器上 cursor 之后的变更（其他设备的修改）。
 * - 冲突按「最后修改者胜」处理。
 */
import { create } from 'zustand'
import type { Transaction } from 'dexie'
import { db } from './db'
import { api, ApiError } from './api'
import { authClient, authError, useAuth, type User } from './auth'
import { useWorkout } from './workout-store'

export const SYNC_TABLES = ['plans', 'workouts', 'bodyweights', 'customExercises'] as const
type Tbl = (typeof SYNC_TABLES)[number]

interface Change {
  tbl: Tbl
  id: string
  updatedAt: number
  deleted?: boolean
  data?: { id: string; [k: string]: unknown } | null
}
interface SyncResponse {
  epoch: string
  cursor: number
  more: boolean
  changes: Change[]
}

/* ---------------- 状态 ---------------- */
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error'
export const useSync = create<{ state: SyncState; lastSyncAt: number | null; error: string | null; pending: number }>(() => ({
  state: 'idle',
  lastSyncAt: Number(localStorage.getItem('gymgym-sync-last')) || null,
  error: null,
  pending: 0,
}))

/* ---------------- 待同步列表 ---------------- */
const DIRTY_KEY = 'gymgym-sync-dirty'
const CURSOR_KEY = 'gymgym-sync-cursor'
const EPOCH_KEY = 'gymgym-sync-epoch'

type Dirty = Record<string, { t: number; d?: 1 }> // key = `${tbl}:${id}`
let dirty: Dirty = load()
useSync.setState({ pending: Object.keys(dirty).length })

function load(): Dirty {
  try {
    return JSON.parse(localStorage.getItem(DIRTY_KEY) || '{}')
  } catch {
    return {}
  }
}
let persistTimer: ReturnType<typeof setTimeout> | undefined
function persistDirty() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(flushDirty, 0)
}
function flushDirty() {
  clearTimeout(persistTimer)
  localStorage.setItem(DIRTY_KEY, JSON.stringify(dirty))
  useSync.setState({ pending: Object.keys(dirty).length })
}
const keyOf = (tbl: string, id: string) => `${tbl}:${id}`
const splitKey = (k: string) => {
  const i = k.indexOf(':')
  return [k.slice(0, i) as Tbl, k.slice(i + 1)] as const
}

function markDirty(tbl: Tbl, id: string, deleted = false) {
  dirty[keyOf(tbl, id)] = deleted ? { t: Date.now(), d: 1 } : { t: Date.now() }
  persistDirty()
  scheduleSync(2000)
}

/* ---------------- 监听本地修改 ---------------- */
// 应用服务器下发的变更时，事务上打这个标记，避免又被当成本地修改
const REMOTE = Symbol('remote')
const isRemote = (tx: Transaction | undefined) => !!(tx as unknown as Record<symbol, boolean> | undefined)?.[REMOTE]

for (const name of SYNC_TABLES) {
  const t = db.table(name)
  t.hook('creating', (key, obj, tx) => {
    if (!isRemote(tx)) markDirty(name, String(obj?.id ?? key))
  })
  t.hook('updating', (_mods, key, _obj, tx) => {
    if (!isRemote(tx)) markDirty(name, String(key))
  })
  t.hook('deleting', (key, _obj, tx) => {
    if (!isRemote(tx)) markDirty(name, String(key), true)
  })
}

async function remoteTx(fn: () => Promise<void>) {
  await db.transaction('rw', SYNC_TABLES.map((t) => db.table(t)), async (tx) => {
    ;(tx as unknown as Record<symbol, boolean>)[REMOTE] = true
    await fn()
  })
}

async function applyRemote(changes: Change[]) {
  if (!changes.length) return
  await remoteTx(async () => {
    for (const ch of changes) {
      const local = dirty[keyOf(ch.tbl, ch.id)]
      if (local && local.t > ch.updatedAt) continue // 本地更新，稍后推上去
      const t = db.table(ch.tbl)
      if (ch.deleted || !ch.data) {
        await t.delete(ch.id)
        continue
      }
      // 体重按日期唯一：两台设备离线时各记了同一天，保留 id 较大的那条，另一条删掉
      if (ch.tbl === 'bodyweights') {
        const dup = await t.where('date').equals(ch.data.date as string).first()
        if (dup && dup.id !== ch.id) {
          if (dup.id > ch.id) {
            dirty[keyOf('bodyweights', ch.id)] = { t: Date.now(), d: 1 }
            continue
          }
          await t.delete(dup.id)
          dirty[keyOf('bodyweights', dup.id)] = { t: Date.now(), d: 1 }
        }
      }
      await t.put(ch.data)
    }
  })
  persistDirty()
}

/* ---------------- 同步流程 ---------------- */
let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

export function scheduleSync(delay = 0) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delay)
}

export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = doSync().finally(() => {
    running = null
    if (again) {
      again = false
      scheduleSync(0)
    }
  })
  return running
}

async function doSync() {
  if (!useAuth.getState().user) return
  if (!navigator.onLine) {
    useSync.setState({ state: 'offline' })
    return
  }
  useSync.setState({ state: 'syncing', error: null })
  try {
    let cursor = Number(localStorage.getItem(CURSOR_KEY)) || 0
    const queue = Object.entries(dirty)
    let more = true
    while (more) {
      const batch = queue.splice(0, 200)
      const changes: Change[] = await Promise.all(
        batch.map(async ([k, v]): Promise<Change> => {
          const [tbl, id] = splitKey(k)
          if (v.d) return { tbl, id, updatedAt: v.t, deleted: true }
          const data = await db.table(tbl).get(id)
          return data ? { tbl, id, updatedAt: v.t, data } : { tbl, id, updatedAt: v.t, deleted: true }
        }),
      )
      const res = await api<SyncResponse>('/sync', { cursor, changes })

      const epoch = localStorage.getItem(EPOCH_KEY)
      if (epoch !== res.epoch) {
        localStorage.setItem(EPOCH_KEY, res.epoch)
        if (epoch) {
          // 服务器数据库被重建：从头拉取，并把本地全部数据重新上传
          localStorage.setItem(CURSOR_KEY, '0')
          await markAllDirty()
          again = true
          return
        }
      }

      for (const [k, v] of batch) if (dirty[k]?.t === v.t) delete dirty[k]
      await applyRemote(res.changes)
      cursor = res.cursor
      localStorage.setItem(CURSOR_KEY, String(cursor))
      flushDirty()
      more = res.more || queue.length > 0
    }
    const now = Date.now()
    localStorage.setItem('gymgym-sync-last', String(now))
    useSync.setState({ state: 'idle', lastSyncAt: now })
  } catch (e) {
    const offline = e instanceof ApiError && e.status === 0
    useSync.setState({ state: offline ? 'offline' : 'error', error: e instanceof Error ? e.message : '同步失败' })
  }
}

async function markAllDirty() {
  const now = Date.now()
  for (const name of SYNC_TABLES) {
    const keys = await db.table(name).toCollection().primaryKeys()
    for (const k of keys) dirty[keyOf(name, String(k))] ??= { t: now }
  }
  flushDirty()
}

async function wipeLocal() {
  await remoteTx(async () => {
    await Promise.all(SYNC_TABLES.map((t) => db.table(t).clear()))
  })
  dirty = {}
  flushDirty()
  localStorage.removeItem(CURSOR_KEY)
  localStorage.removeItem(EPOCH_KEY)
  localStorage.removeItem('gymgym-sync-last')
  useSync.setState({ lastSyncAt: null })
  useWorkout.getState().discard()
}

/* ---------------- 登录 / 退出 ---------------- */
type AuthUser = { id: string; name: string; username?: string | null; role?: string | null }
const toUser = (u: AuthUser): User => ({ id: u.id, username: u.username ?? u.name, role: u.role ?? 'user' })

/** 登录成功后：处理本机数据归属，然后开始同步 */
async function completeSignIn(user: User) {
  const { owner, setOwner, setUser } = useAuth.getState()
  if (owner !== user.id) {
    if (owner != null) await wipeLocal() // 本机数据属于其他账号
    else await markAllDirty() // 首次登录：把本机已有数据并入这个账号
    localStorage.removeItem(CURSOR_KEY)
    setOwner(user.id)
  }
  setUser(user)
  scheduleSync(0)
}

export async function signInWithPassword(username: string, password: string) {
  let res
  try {
    res = await authClient.signIn.username({ username, password })
  } catch {
    throw new Error('网络连接失败')
  }
  if (res.error || !res.data?.user) throw new Error(authError(res.error, '登录失败'))
  await completeSignIn(toUser(res.data.user as AuthUser))
}

/** 跳转到 GitHub 授权；回来后由 resumeSession() 完成登录 */
export async function signInWithGitHub() {
  const res = await authClient.signIn.social({ provider: 'github', callbackURL: '/', errorCallbackURL: '/' })
  if (res.error) throw new Error(authError(res.error, 'GitHub 登录失败'))
}

/** 本地没有登录信息、但服务器已有会话（例如 GitHub 授权回来）时，接上登录 */
export async function resumeSession() {
  const res = await authClient.getSession().catch(() => null)
  const u = res?.data?.user as AuthUser | undefined
  if (u) await completeSignIn(toUser(u))
}

/** 已登录时刷新一次用户信息（角色可能被管理员改过） */
async function refreshUser() {
  const res = await authClient.getSession().catch(() => null)
  if (!res || res.error) return
  if (res.data?.user) useAuth.getState().setUser(toUser(res.data.user as AuthUser))
  else useAuth.getState().setUser(null) // 会话已失效
}

export async function signOut() {
  if (navigator.onLine) {
    await syncNow()
    await authClient.signOut().catch(() => {})
  }
  await wipeLocal()
  useAuth.setState({ user: null, owner: null })
}

/* ---------------- 自动同步时机 ---------------- */
export function startAutoSync() {
  scheduleSync(0)
  if (navigator.onLine) void refreshUser()
  const onOnline = () => scheduleSync(0)
  const onOffline = () => useSync.setState({ state: 'offline' })
  const onVisible = () => document.visibilityState === 'visible' && scheduleSync(0)
  const onHide = () => flushDirty()
  const interval = setInterval(() => scheduleSync(0), 60_000)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('pagehide', onHide)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
