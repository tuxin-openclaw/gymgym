import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from './types'

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      defaultRest: 90,
      theme: 'dark',
      weekStart: 1,
      vibrate: true,
      sound: true,
      nickname: '',
      set: (patch) => set(patch),
    }),
    { name: 'gymgym-settings' },
  ),
)

export function applyTheme(theme: Settings['theme']) {
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0d10' : '#f4f5f7')
}
