export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const pad = (n: number) => String(n).padStart(2, '0')

export function fmtClock(sec: number) {
  sec = Math.max(0, Math.floor(sec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function fmtDuration(sec: number) {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} 小时 ${m % 60} 分` : `${h} 小时`
}

export function fmtNumber(n: number, digits = 1) {
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return Number(n.toFixed(digits)).toLocaleString('zh-CN')
}

export const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export const dayKey = (d: Date | number) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function startOfDay(d: Date | number) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function startOfWeek(d: Date | number, weekStart: 0 | 1 = 1) {
  const x = startOfDay(d)
  const diff = (x.getDay() - weekStart + 7) % 7
  x.setDate(x.getDate() - diff)
  return x
}

export function addDays(d: Date | number, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function fmtDate(d: Date | number, withYear = false) {
  const x = new Date(d)
  const s = `${x.getMonth() + 1}月${x.getDate()}日`
  return withYear ? `${x.getFullYear()}年${s}` : s
}

export function fmtRelativeDay(d: Date | number) {
  const today = startOfDay(Date.now()).getTime()
  const t = startOfDay(d).getTime()
  const diff = Math.round((today - t) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  if (diff < 7) return `${diff} 天前`
  return fmtDate(d, new Date(d).getFullYear() !== new Date().getFullYear())
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
