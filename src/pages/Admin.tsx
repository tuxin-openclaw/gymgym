import { useCallback, useEffect, useState } from 'react'
import { Ban, KeyRound, Loader2, ShieldCheck, ShieldOff, Trash2, UserPlus, Users, CircleCheck } from 'lucide-react'
import { Button, EmptyState, IconButton, PageHeader, Sheet, Tag, Toggle, confirm, toast } from '../components/ui'
import { authClient, authError, isAdmin, useAuth } from '../lib/auth'

interface AdminUser {
  id: string
  name: string
  username?: string | null
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt: string | Date
}

const isPlaceholder = (email: string) => email.endsWith('@gymgym.local')
const nameOf = (u: AdminUser) => u.username ?? u.name
const roleIsAdmin = (u: AdminUser) => !!u.role?.split(',').includes('admin')

export default function AdminPage() {
  const me = useAuth((s) => s.user)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<AdminUser | null>(null)

  const load = useCallback(async () => {
    const res = await authClient.admin.listUsers({ query: { limit: 200, sortBy: 'createdAt', sortDirection: 'asc' } })
    if (res.error) setError(authError(res.error, '加载失败'))
    else setUsers(res.data.users as AdminUser[])
  }, [])

  useEffect(() => {
    if (isAdmin(me)) void load()
  }, [me, load])

  if (!isAdmin(me))
    return (
      <div>
        <PageHeader title="用户管理" back />
        <EmptyState icon={<ShieldOff className="size-10 text-ink-3" />} title="没有权限" desc="只有管理员可以管理用户" />
      </div>
    )

  return (
    <div className="pb-10">
      <PageHeader
        title="用户管理"
        back
        actions={
          <IconButton label="创建账号" onClick={() => setCreating(true)}>
            <UserPlus className="size-5" />
          </IconButton>
        }
      />
      <div className="space-y-2 px-4 pt-2">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!users && !error && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-ink-3" />
          </div>
        )}
        {users?.length === 0 && <EmptyState icon={<Users className="size-10 text-ink-3" />} title="还没有用户" />}
        {users?.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className="pressable flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-left"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-base font-bold uppercase">
              {nameOf(u).slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={`truncate text-[15px] font-semibold ${u.banned ? 'text-ink-3 line-through' : ''}`}>{nameOf(u)}</span>
                {roleIsAdmin(u) && <Tag className="bg-accent-soft text-accent-text">管理员</Tag>}
                {u.banned && <Tag className="bg-danger/12 text-danger">已停用</Tag>}
                {u.id === me?.id && <Tag>我</Tag>}
              </div>
              <div className="truncate text-xs text-ink-3">
                {!isPlaceholder(u.email) ? `${u.email} · ` : ''}
                创建于 {new Date(u.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </button>
        ))}
        <p className="px-2 pt-3 text-xs leading-relaxed text-ink-3">
          填写了 GitHub 邮箱的账号，可以直接用「使用 GitHub 登录」进入。其他用户也可以登录后在「设置」里自己绑定 GitHub。
        </p>
      </div>

      <CreateUserSheet open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <UserActionsSheet user={selected} meId={me?.id} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  )
}

const input =
  'h-12 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none placeholder:text-ink-3/70 focus:ring-2 focus:ring-accent/60'

function CreateUserSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [asAdmin, setAsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setUsername('')
    setPassword('')
    setEmail('')
    setAsAdmin(false)
    setError('')
  }

  const submit = async () => {
    setError('')
    const name = username.trim()
    const mail = email.trim().toLowerCase()
    if (!name) return setError('请填写用户名')
    if (!password && !mail) return setError('请设置密码，或填写 GitHub 邮箱让对方用 GitHub 登录')
    if (password && password.length < 8) return setError('密码至少 8 位')
    setBusy(true)
    const res = await authClient.admin.createUser({
      name,
      email: mail || `${crypto.randomUUID()}@gymgym.local`,
      password: password || undefined,
      role: asAdmin ? 'admin' : 'user',
      // 管理员亲自填写的邮箱视为已验证，这样对方用该邮箱的 GitHub 账号登录时会自动关联
      data: { username: name, ...(mail ? { emailVerified: true } : {}) },
    })
    setBusy(false)
    if (res.error) return setError(authError(res.error, '创建失败'))
    toast(`已创建账号 ${name}`)
    reset()
    onClose()
    onCreated()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="创建账号"
      footer={
        <Button block size="lg" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="size-5 animate-spin" />}创建
        </Button>
      }
    >
      <div className="space-y-3 px-5 pb-4 pt-1">
        <input className={input} placeholder="用户名（登录用）" autoCapitalize="off" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className={input} type="password" autoComplete="new-password" placeholder="初始密码（至少 8 位）" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className={input} type="email" placeholder="GitHub 邮箱（可选）" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="px-1 text-xs leading-relaxed text-ink-3">
          填了 GitHub 邮箱，对方就能直接用 GitHub 登录，密码可以不设。邮箱要和对方 GitHub 账号里已验证的邮箱一致。
        </p>
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
          <div>
            <div className="text-[15px]">设为管理员</div>
            <div className="text-[11px] text-ink-3">可以创建和管理其他账号</div>
          </div>
          <Toggle checked={asAdmin} onChange={setAsAdmin} label="设为管理员" />
        </div>
        {error && <p className="px-1 text-sm text-danger">{error}</p>}
      </div>
    </Sheet>
  )
}

function UserActionsSheet({
  user,
  meId,
  onClose,
  onChanged,
}: {
  user: AdminUser | null
  meId?: string
  onClose: () => void
  onChanged: () => void
}) {
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setResetting(false)
    setNewPassword('')
  }, [user])

  if (!user) return null
  const self = user.id === meId
  const admin = roleIsAdmin(user)

  const run = async (fn: () => Promise<{ error: unknown }>, ok: string) => {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.error) return toast(authError(res.error as { code?: string }))
    toast(ok)
    onClose()
    onChanged()
  }

  const row = 'flex h-14 w-full items-center gap-3 px-5 text-left text-[15px] hover:bg-surface-2 disabled:opacity-40'

  return (
    <Sheet open onClose={onClose} title={nameOf(user)}>
      <div className="divide-y divide-line pb-6">
        {resetting ? (
          <div className="space-y-3 px-5 py-4">
            <input
              className={input}
              type="password"
              autoComplete="new-password"
              placeholder="新密码（至少 8 位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <Button
              block
              disabled={busy || newPassword.length < 8}
              onClick={() => run(() => authClient.admin.setUserPassword({ userId: user.id, newPassword }), '密码已重置')}
            >
              确认重置
            </Button>
          </div>
        ) : (
          <button className={row} onClick={() => setResetting(true)}>
            <KeyRound className="size-5" />
            重置密码
          </button>
        )}
        <button
          className={row}
          disabled={self || busy}
          onClick={() =>
            run(() => authClient.admin.setRole({ userId: user.id, role: admin ? 'user' : 'admin' }), admin ? '已取消管理员' : '已设为管理员')
          }
        >
          {admin ? <ShieldOff className="size-5" /> : <ShieldCheck className="size-5" />}
          {admin ? '取消管理员' : '设为管理员'}
        </button>
        {user.banned ? (
          <button className={row} disabled={busy} onClick={() => run(() => authClient.admin.unbanUser({ userId: user.id }), '已恢复')}>
            <CircleCheck className="size-5" />
            恢复账号
          </button>
        ) : (
          <button
            className={row}
            disabled={self || busy}
            onClick={async () => {
              if (await confirm({ title: `停用 ${nameOf(user)}？`, message: '对方会立即退出所有设备，无法再登录。数据会保留，可随时恢复。', danger: true, confirmText: '停用' }))
                await run(() => authClient.admin.banUser({ userId: user.id }), '已停用')
            }}
          >
            <Ban className="size-5" />
            停用账号
          </button>
        )}
        <button
          className={`${row} text-danger`}
          disabled={self || busy}
          onClick={async () => {
            if (await confirm({ title: `删除 ${nameOf(user)}？`, message: '账号和他的全部训练数据都会被永久删除，无法恢复。', danger: true, confirmText: '删除' }))
              await run(() => authClient.admin.removeUser({ userId: user.id }), '已删除')
          }}
        >
          <Trash2 className="size-5" />
          删除账号
        </button>
        {self && <p className="px-5 pt-3 text-xs text-ink-3">不能停用、删除自己，或取消自己的管理员身份。</p>}
      </div>
    </Sheet>
  )
}
