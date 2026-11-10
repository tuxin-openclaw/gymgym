// 一条命令同时启动后端和前端：npm run dev:all
// 本地开发默认管理员：admin / admin12345（可用环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 覆盖）
import { spawn } from 'node:child_process'

const env = { ...process.env, ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? 'admin', ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'admin12345' }
const procs = [
  spawn(process.execPath, ['--watch', '--disable-warning=ExperimentalWarning', 'server/index.ts'], { stdio: 'inherit', env }),
  spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], { stdio: 'inherit', env }),
]
const stop = () => {
  for (const p of procs) p.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const p of procs) p.on('exit', (code) => code && stop())
