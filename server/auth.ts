// 账号系统：Better Auth
// - 用户名 + 密码登录，登录态在 HttpOnly Cookie 里
// - 不开放注册：账号由管理员在应用里创建（admin 插件），首个管理员由环境变量初始化
// - 可选 GitHub 登录：只能登录已绑定 GitHub 的账号，不会自动创建新账号
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { admin, username } from 'better-auth/plugins'
import { getMigrations } from 'better-auth/db/migration'
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { DB_PATH, db, getAuthSecret } from './db.ts'

const GITHUB_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_SECRET = process.env.GITHUB_CLIENT_SECRET
export const GITHUB_ENABLED = !!(GITHUB_ID && GITHUB_SECRET)

// Better Auth 用独立连接：它会跨 await 开事务，不能和业务代码共用同一个连接
const authDb = new DatabaseSync(DB_PATH)
authDb.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')

/** 浏览器发来的 Origin 和访问的域名一致（同源）。反向代理后面也适用，不用写死域名。 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) return true // 非浏览器请求
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

/** 没有邮箱时的占位邮箱（Better Auth 要求每个用户有唯一 email，本应用只用用户名） */
export const placeholderEmail = () => `${randomUUID()}@gymgym.local`

const secure = process.env.COOKIE_SECURE
const options = {
  appName: 'GymGym',
  baseURL: process.env.BETTER_AUTH_URL || undefined,
  secret: getAuthSecret(),
  database: authDb,
  trustedOrigins: (req) => (req && isSameOrigin(req) ? [req.headers.get('origin')] : []),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // 不开放注册
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: GITHUB_ENABLED
    ? { github: { clientId: GITHUB_ID!, clientSecret: GITHUB_SECRET!, disableSignUp: true } }
    : {},
  account: {
    accountLinking: {
      enabled: true,
      // 管理员建账号时填了 GitHub 邮箱 → 该用户可直接用 GitHub 登录
      trustedProviders: ['github'],
      // 用户登录后在设置里主动绑定 GitHub，不要求邮箱一致
      allowDifferentEmails: true,
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 180, updateAge: 60 * 60 * 24 },
  advanced: {
    ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
    // 默认生产环境用 Secure Cookie（要求 HTTPS）；纯 HTTP 内网部署可设 COOKIE_SECURE=false
    ...(secure ? { useSecureCookies: secure === 'true' } : {}),
  },
  databaseHooks: {
    user: {
      delete: {
        // 删除用户时一并删除他的训练数据
        after: async (user) => {
          db.prepare('DELETE FROM records WHERE user_id = ?').run(user.id)
        },
      },
    },
  },
  plugins: [
    username({
      minUsernameLength: 2,
      maxUsernameLength: 32,
      usernameValidator: (u) => /^[\p{L}\p{N}_.-]+$/u.test(u),
    }),
    // 角色：user / admin。以后要细分权限，可在这里配置 access control
    admin({ defaultRole: 'user', adminRoles: ['admin'] }),
  ],
  telemetry: { enabled: false },
} satisfies BetterAuthOptions

// 启动时自动建表 / 升级 Better Auth 自己的表（要先于 betterAuth() 初始化，否则它会报 schema 不匹配）
const { runMigrations } = await getMigrations(options)
await runMigrations()

export const auth = betterAuth(options)

/** 用环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 初始化管理员：账号不存在则创建，已存在则确保是管理员 */
async function ensureAdmin() {
  const name = process.env.ADMIN_USERNAME?.trim()
  const password = process.env.ADMIN_PASSWORD
  if (!name) {
    const { n } = authDb.prepare('SELECT count(*) AS n FROM user').get() as { n: number }
    if (!n) console.warn('⚠️  还没有任何账号。请设置 ADMIN_USERNAME 和 ADMIN_PASSWORD 环境变量后重启，以创建管理员。')
    return
  }
  const existing = authDb.prepare('SELECT id, role FROM user WHERE username = ?').get(name.toLowerCase()) as
    | { id: string; role: string | null }
    | undefined
  if (existing) {
    if (existing.role !== 'admin') {
      authDb.prepare(`UPDATE user SET role = 'admin' WHERE id = ?`).run(existing.id)
      console.log(`已将用户 ${name} 设为管理员`)
    }
    return
  }
  if (!password || password.length < 8) {
    console.warn('⚠️  ADMIN_PASSWORD 未设置或少于 8 位，未创建管理员。')
    return
  }
  await auth.api.createUser({ body: { email: placeholderEmail(), password, name, role: 'admin', data: { username: name } } })
  console.log(`已创建管理员账号 ${name}`)
}
await ensureAdmin()
