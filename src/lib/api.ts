import { useAuth } from './auth'

const BASE = (import.meta.env.VITE_API_BASE ?? '') + '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, '网络连接失败')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // 登录已失效：回到登录页，本地数据保留（同一账号重新登录后继续同步）
    if (res.status === 401) useAuth.getState().setUser(null)
    throw new ApiError(res.status, data?.error ?? `请求失败（${res.status}）`)
  }
  return data as T
}
