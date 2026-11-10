// 生成 PWA 安装所需的图标、iOS 启动图和快捷方式图标。
// 用法：node scripts/gen-pwa-assets.cjs   （需要 playwright + chromium）
const { chromium } = require('playwright')
const path = require('path')
const OUT = path.join(__dirname, '..', 'public')

const GLYPH = `<g fill="#0b0d10"><rect x="9" y="22" width="7" height="20" rx="2.5"/><rect x="48" y="22" width="7" height="20" rx="2.5"/><rect x="17" y="26" width="5" height="12" rx="2"/><rect x="42" y="26" width="5" height="12" rx="2"/></g><path d="M22 32h6l3-7 4 14 3-7h4" fill="none" stroke="#0b0d10" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`
// scale: 字形相对整张图标的比例（maskable 安全区为中心 80% 圆）
const icon = (rounded, scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">` +
  `<rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="#c6f432"/>` +
  `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${GLYPH}</g></svg>`

const shortcut = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" rx="6" fill="#c6f432"/>` +
  `<g transform="translate(5 5) scale(0.5833)" fill="none" stroke="#0b0d10" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`

const SHORTCUTS = {
  start: '<path d="M7 4.5v15l12-7.5z" fill="#0b0d10"/>',
  records: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M8 17v-4M13 17V8M18 17v-7"/>',
  library: '<path d="M8 12h8"/><rect x="2.5" y="8" width="5" height="8" rx="1.5"/><rect x="16.5" y="8" width="5" height="8" rx="1.5"/>',
}

// iOS 启动图：[CSS 宽, CSS 高, DPR]
const SPLASH = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2], [320, 568, 2],
  [1024, 1366, 2], [834, 1194, 2], [820, 1180, 2], [810, 1080, 2], [768, 1024, 2],
]

;(async () => {
  const browser = await chromium.launch()
  const shot = async (html, w, h, file, dpr = 1, transparent = false) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr })
    await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#0b0d10'}">${html}</body></html>`)
    await page.screenshot({ path: path.join(OUT, file), omitBackground: transparent })
    await page.close()
  }
  const box = (svg, s) => `<div style="width:${s}px;height:${s}px">${svg}</div>`
  // 普通图标：圆角 + 透明背景（桌面端、安卓「any」）
  await shot(box(icon(true, 1), 192), 192, 192, 'icon-192.png', 1, true)
  await shot(box(icon(true, 1), 512), 512, 512, 'icon-512.png', 1, true)
  // maskable：满版背景，字形缩小进安全区
  await shot(box(icon(false, 0.72), 512), 512, 512, 'icon-maskable-512.png')
  await shot(box(icon(false, 0.72), 192), 192, 192, 'icon-maskable-192.png')
  // iOS 主屏图标：满版，由系统裁圆角
  await shot(box(icon(false, 0.86), 180), 180, 180, 'apple-touch-icon.png')
  await shot(box(icon(true, 1), 32), 32, 32, 'favicon-32.png', 1, true)
  for (const [k, inner] of Object.entries(SHORTCUTS)) await shot(box(shortcut(inner), 96), 96, 96, `shortcuts/${k}.png`, 1, true)
  for (const [w, h, d] of SPLASH) {
    const html = `<div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:-apple-system,'PingFang SC',sans-serif">
      <div style="width:96px;height:96px;filter:drop-shadow(0 12px 36px rgba(198,244,50,.35))">${icon(true, 1)}</div>
      <div style="color:#f3f5f8;font-size:26px;font-weight:800;letter-spacing:.5px">GymGym</div>
      <div style="color:#78818f;font-size:14px">练好每一组</div></div>`
    await shot(html, w, h, `splash/splash-${w * d}x${h * d}.png`, d)
  }
  await browser.close()
  console.log('PWA 资源已生成', SPLASH.length, '张启动图')
})()
