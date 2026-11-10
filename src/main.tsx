import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import App from './App'
import './index.css'
import { preloadExercises } from './lib/exercises'
import { initInstall } from './lib/install'
import './lib/sync'

initInstall()
preloadExercises()

if (import.meta.env.DEV) import('./lib/db').then((m) => Object.assign(window, { __db: m.db }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
