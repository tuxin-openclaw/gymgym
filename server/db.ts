// SQLite（Node 内置 node:sqlite，无需原生编译）
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'

export const DB_PATH = resolve(process.env.DB_PATH ?? 'data/gymgym.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`)

// 按顺序追加，不要修改已发布的迁移
// 账号相关的表（user / session / account / verification）由 Better Auth 自己创建和迁移
const MIGRATIONS = [
  `
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  -- 计划 / 训练 / 体重 / 自定义动作，统一按 JSON 文档存储，user_id 对应 Better Auth 的 user.id
  CREATE TABLE records (
    user_id    TEXT NOT NULL,
    tbl        TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT,                       -- 已删除时为 NULL（墓碑）
    updated_at INTEGER NOT NULL,
    deleted    INTEGER NOT NULL DEFAULT 0,
    seq        INTEGER NOT NULL,           -- 全局递增，用于增量拉取
    PRIMARY KEY (user_id, tbl, id)
  );
  CREATE INDEX records_user_seq ON records(user_id, seq);
  `,
]

const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number }
for (let v = user_version; v < MIGRATIONS.length; v++) {
  tx(() => {
    db.exec(MIGRATIONS[v])
    db.exec(`PRAGMA user_version = ${v + 1}`)
  })
}

// 数据库实例标识：数据库被重建后，客户端据此重新全量同步
const epochRow = db.prepare(`SELECT value FROM meta WHERE key = 'epoch'`).get() as { value: string } | undefined
export const EPOCH = epochRow?.value ?? randomUUID()
if (!epochRow) db.prepare(`INSERT INTO meta (key, value) VALUES ('epoch', ?)`).run(EPOCH)

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

/** Better Auth 的签名密钥：优先用环境变量，否则首次启动时随机生成并存进数据库 */
export function getAuthSecret(): string {
  const fromEnv = process.env.BETTER_AUTH_SECRET
  if (fromEnv) return fromEnv
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'auth_secret'`).get() as { value: string } | undefined
  if (row) return row.value
  const secret = randomBytes(32).toString('base64url')
  db.prepare(`INSERT INTO meta (key, value) VALUES ('auth_secret', ?)`).run(secret)
  return secret
}
