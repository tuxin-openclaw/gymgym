import { useEffect, useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { Logo } from '../components/icons'
import { Button } from '../components/ui'
import { OAUTH_ERRORS, loadServerConfig, useAuth, useServerConfig } from '../lib/auth'
import { resumeSession, signInWithGitHub, signInWithPassword } from '../lib/sync'

export default function LoginPage() {
  const lastUser = useAuth((s) => s.user)
  const github = useServerConfig((s) => s.github)
  const [username, setUsername] = useState(lastUser?.username ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'password' | 'github' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadServerConfig()
    // GitHub 授权失败会带着 ?error=xxx 回来
    const params = new URLSearchParams(location.search)
    const err = params.get('error')
    if (err) {
      setError(OAUTH_ERRORS[err] ?? `GitHub 登录失败（${err}）`)
      history.replaceState(null, '', location.pathname + location.hash)
    }
    // GitHub 授权成功回来时服务器已有会话，直接进入
    void resumeSession()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy('password')
    try {
      await signInWithPassword(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '出错了')
    } finally {
      setBusy(null)
    }
  }

  const loginWithGitHub = async () => {
    setError('')
    setBusy('github')
    try {
      await signInWithGitHub() // 成功会跳转离开页面
    } catch (err) {
      setError(err instanceof Error ? err.message : '出错了')
      setBusy(null)
    }
  }

  const input =
    'h-13 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none placeholder:text-ink-3/70 focus:ring-2 focus:ring-accent/60'

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size={64} />
        <h1 className="text-2xl font-bold">GymGym</h1>
        <p className="text-sm text-ink-3">登录后，训练数据会在你的所有设备间同步</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          className={input}
          placeholder="用户名"
          autoComplete="username"
          autoCapitalize="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className={input}
          type="password"
          placeholder="密码"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="px-1 text-sm leading-relaxed text-danger">{error}</p>}
        <Button type="submit" block size="lg" disabled={!!busy || !username.trim() || !password}>
          {busy === 'password' && <Loader2 className="size-5 animate-spin" />}
          登录
        </Button>
      </form>

      {github && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-3">
            <div className="h-px flex-1 bg-line" />或<div className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" block size="lg" disabled={!!busy} onClick={loginWithGitHub}>
            {busy === 'github' ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
            使用 GitHub 登录
          </Button>
        </>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-ink-3">没有账号？请联系管理员为你创建。</p>
    </div>
  )
}
