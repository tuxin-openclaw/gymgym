import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  // 监听 0.0.0.0，手机可通过本机局域网 IP 访问（终端会打印 Network 地址）
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  preview: { host: true, port: 4173, proxy: { '/api': 'http://localhost:3000' } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'GymGym 健身记录',
        short_name: 'GymGym',
        description: '制定训练计划、记录每一组、回顾你的进步',
        lang: 'zh-CN',
        dir: 'ltr',
        categories: ['health', 'fitness', 'sports', 'lifestyle'],
        theme_color: '#0b0d10',
        background_color: '#0b0d10',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: './?source=pwa',
        scope: './',
        launch_handler: { client_mode: 'focus-existing' },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          { name: '开始训练', short_name: '开始训练', url: './?action=start', icons: [{ src: 'shortcuts/start.png', sizes: '96x96', type: 'image/png' }] },
          { name: '训练记录', short_name: '记录', url: './#/records', icons: [{ src: 'shortcuts/records.png', sizes: '96x96', type: 'image/png' }] },
          { name: '动作库', short_name: '动作库', url: './#/exercises', icons: [{ src: 'shortcuts/library.png', sizes: '96x96', type: 'image/png' }] },
        ],
        screenshots: ['home', 'workout', 'stats', 'library'].map((n, i) => ({
          src: `screenshots/${n}.jpg`,
          sizes: '780x1328',
          type: 'image/jpeg',
          form_factor: 'narrow' as const,
          label: ['首页：本周训练与今日计划', '训练中：逐组记录与组间休息', '统计：趋势、部位分布与个人记录', '动作库：876 个动作'][i],
        })),
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // 启动图和截图只在安装时使用，不必预缓存
        globIgnores: ['splash/**', 'screenshots/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // 动作示范图（开源 free-exercise-db）
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|raw\.githubusercontent\.com)\/.*\.(jpg|png)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
