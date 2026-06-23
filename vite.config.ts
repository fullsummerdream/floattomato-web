import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// 飘悠番茄 Web — Vite 配置
// 包体积策略见 docs/05-tech-stack.md：react/react-dom 独立 vendor chunk
// PWA 见 docs/06 阶段 4 任务 5/6/7：manifest + SW 预缓存 + 安装入口
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 静默升级，下次打开生效（番茄钟无后台数据冲突）
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: '飘悠番茄',
        short_name: '番茄',
        description: '极简专注计时 PWA — 把时间还给真正重要的事',
        theme_color: '#E74C3C',
        background_color: '#1A1A1A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App Shell：预缓存全部入口产物（HTML + JS + CSS + 图标）
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // SPA 离线兜底：所有路由命中 index.html
        navigateFallback: '/index.html',
        // 静态资源用 CacheFirst（带版本 hash，长期可缓存）
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' ||
              request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
            },
          },
          {
            // 白噪音音轨 — 首次播放后永久离线可用（音轨不进 precache，5MB 拖慢首屏）
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'whitenoise-audio',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              rangeRequests: true, // 支持 audio seek
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // 开发期不启用，避免缓存干扰热更新
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 拆 vendor：react 核心 / framer-motion / lucide 图标 / idb 等独立 chunk
        // —— 首屏只需 vendor-react + 用到的图标子集 + framer-motion 关键路径
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-idb': ['dexie'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
})
