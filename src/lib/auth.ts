import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createAuthClient } from 'better-auth/client'
import { adminClient, usernameClient } from 'better-auth/client/plugins'

export interface User {
  id: string
  username: string
  role: string
}

/** Better Auth 客户端；登录态保存在服务器下发的 HttpOnly Cookie 里，前端拿不到也不用管 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE || undefined,
  plugins: [usernameClient(), adminClient()],
})

interface AuthState {
  /** 已登录的用户；为 null 时显示登录页。保存在本地，是为了断网时也能直接进入应用 */
  user: User | null
  /** 本地 IndexedDB 中的数据属于哪个账号 */
  owner: string | null
  setUser: (user: User | null) => void
  setOwner: (owner: string | null) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      owner: null,
      setUser: (user) => set({ user }),
      setOwner: (owner) => set({ owner }),
    }),
    { name: 'gymgym-auth-v2' },
  ),
)

export const isAdmin = (u: User | null) => !!u?.role?.split(',').includes('admin')

/** 服务器配置（是否启用 GitHub 登录），启动时拉一次，离线时沿用上次的值 */
export const useServerConfig = create<{ github: boolean }>()(persist((): { github: boolean } => ({ github: false }), { name: 'gymgym-config' }))
export async function loadServerConfig() {
  try {
    const res = await fetch((import.meta.env.VITE_API_BASE ?? '') + '/api/config')
    if (res.ok) useServerConfig.setState(await res.json())
  } catch {
    /* 离线 */
  }
}

/** 把 Better Auth 返回的英文错误码翻成中文 */
const ERRORS: Record<string, string> = {
  USERNAME_IS_ALREADY_TAKEN: '用户名已被占用',
  INVALID_USERNAME_OR_PASSWORD: '用户名或密码错误',
  INVALID_USERNAME: '用户名只能包含字母、数字、下划线、点和连字符',
  USERNAME_TOO_SHORT: '用户名至少 2 个字符',
  USERNAME_TOO_LONG: '用户名最多 32 个字符',
  PASSWORD_TOO_SHORT: '密码至少 8 位',
  PASSWORD_TOO_LONG: '密码太长了',
  INVALID_EMAIL: '邮箱格式不正确',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '这个邮箱已被其他账号使用',
  BANNED_USER: '账号已被停用，请联系管理员',
  YOU_CANNOT_BAN_YOURSELF: '不能停用自己',
  YOU_CANNOT_REMOVE_YOURSELF: '不能删除自己',
  SOCIAL_ACCOUNT_ALREADY_LINKED: '这个 GitHub 账号已绑定到其他用户',
  FAILED_TO_UNLINK_LAST_ACCOUNT: '这是唯一的登录方式，不能解绑',
  SESSION_NOT_FRESH: '为了安全，请退出后重新登录再操作',
}
export function authError(err: { status?: number; code?: string; message?: string } | null | undefined, fallback = '操作失败') {
  if (!err) return fallback
  if (err.status === 429) return '尝试次数过多，请稍后再试'
  if (err.status === 403 && !err.code) return '没有权限'
  return ERRORS[err.code ?? ''] ?? err.message ?? fallback
}

/** GitHub 登录失败时 Better Auth 跳回页面并带上 ?error=xxx */
export const OAUTH_ERRORS: Record<string, string> = {
  signup_disabled: '这个 GitHub 账号还没有绑定 GymGym 账号。请先用用户名密码登录，在「设置」里绑定 GitHub；或让管理员用你的 GitHub 邮箱创建账号。',
  account_not_linked: '这个 GitHub 账号还没有绑定 GymGym 账号，请先用用户名密码登录后在「设置」里绑定。',
  banned: '账号已被停用，请联系管理员',
}
