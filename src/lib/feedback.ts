/**
 * 训练提醒：提示音 + 振动。
 *
 * 浏览器限制与对策：
 * - 声音：AudioContext 必须在用户手势（点按）里创建/恢复，否则一直是 suspended，播放无声。
 *   → 应用启动后监听第一次（以及之后每次被系统挂起后的）点按来「解锁」音频。
 * - iOS：Safari 没有 navigator.vibrate。iOS 18+ 可借助 <input type="checkbox" switch> 的系统触感反馈模拟轻震。
 * - iOS 的网页声音默认受静音键影响；支持 Audio Session API（Safari 16.4+）时设为 transient，
 *   作为短提示音播放，并短暂压低正在播放的音乐。
 */

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

let ctx: AudioContext | null = null

function getCtx() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

function setAudioSession(type: string) {
  try {
    const s = (navigator as AudioSessionNavigator).audioSession
    if (s && s.type !== type) s.type = type
  } catch {
    /* 不支持 */
  }
}

/** 在用户手势中调用：创建 / 恢复音频上下文，并播放一个静音片段完成 iOS 解锁 */
export function unlockAudio() {
  const c = getCtx()
  if (!c || c.state === 'running') return
  setAudioSession('transient')
  c.resume().catch(() => {})
  try {
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination)
    src.start(0)
  } catch {
    /* ignore */
  }
}

/** 应用启动时调用一次 */
export function initFeedback() {
  const onGesture = () => unlockAudio()
  for (const ev of ['pointerdown', 'touchend', 'keydown'])
    window.addEventListener(ev, onGesture, { capture: true, passive: true })
}

/** 播放提示音：两短一长，三角波在手机外放上比正弦波更清楚 */
export function beep() {
  const c = getCtx()
  if (!c) return false
  setAudioSession('transient')
  if (c.state !== 'running') c.resume().catch(() => {})
  try {
    const t0 = c.currentTime + 0.03
    const notes = [
      [880, 0, 0.16],
      [880, 0.24, 0.16],
      [1320, 0.48, 0.42],
    ] as const
    for (const [freq, at, dur] of notes) {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'triangle'
      o.frequency.value = freq
      const t = t0 + at
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    }
    return c.state === 'running'
  } catch {
    return false
  }
}

/* ---------------- 振动 ---------------- */

let iosSwitch: HTMLLabelElement | null = null
function iosTap() {
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.body.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

/** 振动；pattern 与 navigator.vibrate 相同（毫秒，振/停交替） */
export function haptic(pattern: number | number[]) {
  if (canVibrate()) {
    try {
      if (navigator.vibrate(pattern)) return true
    } catch {
      /* ignore */
    }
  }
  // iOS：用系统开关控件的触感模拟，按振动段数轻触几次
  const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1
  try {
    for (let i = 0; i < pulses; i++) setTimeout(iosTap, i * 220)
    return true
  } catch {
    return false
  }
}

/** 休息结束：振动 + 提示音（按设置开关） */
export function restFinishedAlert(opts: { vibrate: boolean; sound: boolean }) {
  if (opts.vibrate) haptic([300, 120, 300, 120, 500])
  if (opts.sound) beep()
}
