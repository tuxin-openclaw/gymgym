import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'
import './index.css'
import { preloadExercises } from './lib/exercises'
import { initInstall } from './lib/install'
import { initFeedback } from './lib/feedback'
import './lib/sync'

initInstall()
initFeedback()
// 触屏长按不弹出系统菜单（保存图片、选中等），输入框除外
document.addEventListener('contextmenu', (e) => {
  const t = e.target as HTMLElement
  if ((e as PointerEvent).pointerType === 'mouse' || t.closest('input, textarea, [contenteditable], .selectable')) return
  e.preventDefault()
})
preloadExercises()

if (import.meta.env.DEV) import('./lib/db').then((m) => Object.assign(window, { __db: m.db }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
