import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router'
import { BottomNav } from './components/BottomNav'
import { ConfirmHost, ToastHost } from './components/ui'
import { StartSheetHost, openStartSheet } from './components/StartSheet'
import { InstallSheetHost } from './components/InstallSheet'
import { openInstallSheet } from './lib/install'
import { useWorkout } from './lib/workout-store'
import { applyTheme, useSettings } from './lib/settings'
import Home from './pages/Home'
import Plans from './pages/Plans'
import PlanEdit from './pages/PlanEdit'
import Library from './pages/Library'
import ExerciseDetail from './pages/ExerciseDetail'
import CustomExercise from './pages/CustomExercise'
import WorkoutPage from './pages/Workout'
import Summary from './pages/Summary'
import Records from './pages/Records'
import WorkoutDetail from './pages/WorkoutDetail'
import SettingsPage from './pages/Settings'

const TAB_ROUTES = ['/', '/plans', '/exercises', '/records']

export default function App() {
  const theme = useSettings((s) => s.theme)
  const { pathname } = useLocation()
  const nav = useNavigate()
  // 桌面图标长按快捷方式：?action=start | install
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const action = params.get('action')
    if (!action) return
    history.replaceState(null, '', location.pathname + location.hash)
    if (action === 'start') {
      if (useWorkout.getState().workout) nav('/workout')
      else openStartSheet()
    } else if (action === 'install') openInstallSheet()
  }, [nav])
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const showNav = TAB_ROUTES.includes(pathname)
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-bg">
      <main className={showNav ? 'pb-28' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:id" element={<PlanEdit />} />
          <Route path="/exercises" element={<Library />} />
          <Route path="/exercises/new" element={<CustomExercise />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/workout" element={<WorkoutPage />} />
          <Route path="/summary/:id" element={<Summary />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<WorkoutDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
      <StartSheetHost />
      <InstallSheetHost />
      <ConfirmHost />
      <ToastHost />
    </div>
  )
}
