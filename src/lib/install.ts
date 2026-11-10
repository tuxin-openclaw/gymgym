import { create } from 'zustand'

/**
 * 「添加到桌面 / 主屏幕」支持：
 * - Chrome / Edge / 安卓浏览器：捕获 beforeinstallprompt，提供一键安装
 * - iOS / iPadOS Safari：只能手动「分享 → 添加到主屏幕」，给出图文引导
 * - 微信 / QQ 等内置浏览器：无法安装，引导用系统浏览器打开
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop' | 'inapp'

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

export function detectPlatform(): InstallPlatform {
  if (/MicroMessenger|QQ\/|Weibo|DingTalk|AlipayClient|Lark|FBAN|FBAV|Instagram/i.test(ua)) return 'inapp'
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

interface InstallState {
  deferred: BeforeInstallPromptEvent | null
  installed: boolean
  standalone: boolean
  platform: InstallPlatform
  sheetOpen: boolean
}

export const useInstall = create<InstallState>(() => ({
  deferred: null,
  installed: false,
  standalone: false,
  platform: 'desktop',
  sheetOpen: false,
}))

export const openInstallSheet = () => useInstall.setState({ sheetOpen: true })
export const closeInstallSheet = () => useInstall.setState({ sheetOpen: false })

/** 尽早调用（在 React 渲染前），避免错过 beforeinstallprompt 事件 */
export function initInstall() {
  useInstall.setState({ platform: detectPlatform(), standalone: isStandalone() })
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // 用我们自己的引导代替浏览器默认的迷你信息栏
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => {
    useInstall.setState({ deferred: null, installed: true, sheetOpen: false })
    try {
      localStorage.setItem('gymgym-installed', '1')
    } catch {
      /* ignore */
    }
  })
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () =>
    useInstall.setState({ standalone: isStandalone() }),
  )
}

/** 触发浏览器原生安装弹窗；返回是否安装成功 */
export async function promptInstall() {
  const { deferred } = useInstall.getState()
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  useInstall.setState({ deferred: null })
  return outcome === 'accepted'
}

const DISMISS_KEY = 'gymgym-install-dismissed'
export function bannerDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - t < 14 * 86400000 || localStorage.getItem('gymgym-installed') === '1'
  } catch {
    return false
  }
}
export function dismissBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}
