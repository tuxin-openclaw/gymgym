// GymGym 后端：账号 + 同步接口 + 托管前端静态文件
// 运行：node server/index.ts（Node ≥ 22.18，原生支持 TypeScript 类型擦除）
import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import { DB_PATH, EPOCH, db, tx } from './db.ts'
import { GITHUB_ENABLED, auth, isSameOrigin } from './auth.ts'

const PORT = Number(process.env.PORT ?? 3000)
const STATIC_DIR = process.env.STATIC_DIR ?? 'dist'
const PULL_PAGE = 500
const TABLES = new Set(['plans', 'workouts', 'bodyweights', 'customExercises'])

type Env = { Variables: { user: { id: string; username: string } } }
const app = new Hono<Env>()

/* ---------------- 工具 ---------------- */
const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 429, error: string) => c.json({ error }, status)

async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const v = await c.req.json()
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

/* ---------------- 账号（Better Auth：/api/auth/*） ---------------- */
app.get('/api/health', (c) => c.json({ ok: true }))
app.get('/api/config', (c) => c.json({ github: GITHUB_ENABLED }))
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// 同步接口需要登录；Cookie 会话还要防跨站请求
app.use('/api/sync', async (c, next) => {
  if (!isSameOrigin(c.req.raw)) return fail(c, 403, '来源不被允许')
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session || (session.user as { banned?: boolean | null }).banned) return fail(c, 401, '请先登录')
  const u = session.user as { id: string; name: string; username?: string | null }
  c.set('user', { id: u.id, username: u.username ?? u.name })
  await next()
})

/* ---------------- 同步 ----------------
 * 请求：{ cursor, changes: [{ tbl, id, updatedAt, deleted?, data? }] }
 * 1. 逐条写入（最后写入者胜：updatedAt 更新或相等才覆盖）
 * 2. 返回该用户 seq > cursor 的变更（分页，more=true 时继续拉）
 */
const getRecord = db.prepare('SELECT updated_at FROM records WHERE user_id = ? AND tbl = ? AND id = ?')
const nextSeq = db.prepare(`UPDATE meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'seq' RETURNING value`)
const upsert = db.prepare(`
  INSERT INTO records (user_id, tbl, id, data, updated_at, deleted, seq) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (user_id, tbl, id) DO UPDATE SET
    data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, seq = excluded.seq
`)
const pull = db.prepare(
  'SELECT tbl, id, data, updated_at, deleted, seq FROM records WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?',
)
db.prepare(`INSERT OR IGNORE INTO meta (key, value) VALUES ('seq', '0')`).run()

app.post('/api/sync', bodyLimit({ maxSize: 20 * 1024 * 1024, onError: (c) => fail(c, 400, '数据过大') }), async (c) => {
  const userId = c.get('user').id
  const body = await readJson(c)
  if (!body) return fail(c, 400, '请求格式错误')
  const cursor = Math.max(0, Number(body.cursor) || 0)
  const changes = Array.isArray(body.changes) ? body.changes : []
  if (changes.length > 1000) return fail(c, 400, '单次最多提交 1000 条')

  const now = Date.now()
  let accepted = 0
  tx(() => {
    for (const ch of changes) {
      if (!ch || typeof ch !== 'object') continue
      const { tbl, id, data } = ch as { tbl: unknown; id: unknown; data: unknown }
      if (typeof tbl !== 'string' || !TABLES.has(tbl)) continue
      if (typeof id !== 'string' || !id || id.length > 128) continue
      const deleted = ch.deleted ? 1 : 0
      if (!deleted && (!data || typeof data !== 'object' || (data as { id?: unknown }).id !== id)) continue
      // 防止设备时钟过快导致永远覆盖他人修改
      const updatedAt = Math.min(Number(ch.updatedAt) || now, now + 60_000)
      const cur = getRecord.get(userId, tbl, id) as { updated_at: number } | undefined
      if (cur && cur.updated_at > updatedAt) continue
      const { value: seq } = nextSeq.get() as { value: number }
      upsert.run(userId, tbl, id, deleted ? null : JSON.stringify(data), updatedAt, deleted, seq)
      accepted++
    }
  })

  const rows = pull.all(userId, cursor, PULL_PAGE + 1) as {
    tbl: string
    id: string
    data: string | null
    updated_at: number
    deleted: number
    seq: number
  }[]
  const more = rows.length > PULL_PAGE
  if (more) rows.pop()
  return c.json({
    epoch: EPOCH,
    accepted,
    more,
    cursor: rows.length ? rows[rows.length - 1].seq : cursor,
    changes: rows.map((r) => ({
      tbl: r.tbl,
      id: r.id,
      updatedAt: r.updated_at,
      deleted: !!r.deleted,
      data: r.data ? JSON.parse(r.data) : null,
    })),
  })
})

app.all('/api/*', (c) => fail(c, 404, '接口不存在'))

/* ---------------- 前端静态文件 ---------------- */
app.use(
  '/*',
  serveStatic({
    root: STATIC_DIR,
    onFound: (path, c) => {
      // 带 hash 的资源长期缓存；index.html / sw.js / manifest 每次校验
      c.header('Cache-Control', /\/assets\//.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache')
    },
  }),
)
app.get('*', serveStatic({ root: STATIC_DIR, path: 'index.html' }))

const server = serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`GymGym server listening on http://0.0.0.0:${info.port}  (db: ${DB_PATH})`)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, () => {
    server.close()
    db.close()
    process.exit(0)
  })
