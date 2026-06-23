# 05 — 技术栈

## 核心选型

| 项 | 选型 | 理由 |
|---|---|---|
| 构建工具 | **Vite 5** | 快、现代、PWA 插件成熟 |
| 框架 | **React 18** | 生态最大、AI 辅助最熟、TS 支持一等 |
| 语言 | **TypeScript 5**（strict） | 类型安全，大型项目可维护 |
| 样式 | **Tailwind CSS 3** | token 化理念，快速搭建 |
| 状态管理 | **Zustand** | 轻量、无 boilerplate、适合中等复杂度 |
| 路由 | **React Router 6** | 主流，主页面 Tab + 全屏独立路由 |
| 数据库 | **Dexie.js**（IndexedDB 封装） | 异步非阻塞，大数据量结构化存储 |
| 动效 | **Framer Motion** | 声明式、spring 物理动画，Q 弹过渡主力 |
| 转场 | **View Transitions API** | 共享元素转场，不支持浏览器降级为 Framer Motion 方向化 slide |
| 虚拟列表 | **react-window** | 热力图 / 任务列表长列表复用 |
| PWA | **vite-plugin-pwa** | Service Worker + manifest 一体化 |
| 图标 | **lucide-react** | 轻量、tree-shake、风格统一 |
| 工具库 | **date-fns**（日期）、**uuid**（UUID） | 轻量 tree-shake |

## 不用的（V1.0 纯净）

- ❌ 任何后端 / BaaS（V1.1 再加）
- ❌ 任何第三方 SDK（统计 / 推送 / 崩溃上报 / 广告）
- ❌ Redux（Zustand 够用，避免 boilerplate）
- ❌ CSS-in-JS（Tailwind 够用，避免运行时开销）
- ❌ UI 组件库（自建极简组件，保持设计一致性）

## PWA 配置

### vite-plugin-pwa
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'icons/*.png'],
  manifest: {
    name: '飘悠番茄',
    short_name: '飘悠番茄',
    description: '极简专注计时，把时间还给真正重要的事',
    theme_color: '#1A1A1A',
    background_color: '#FFFFFF',
    display: 'standalone',
    orientation: 'any',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    runtimeCaching: [
      { urlPattern: /^https:\/\/fonts\./, handler: 'StaleWhileRevalidate' }
    ]
  }
})
```

### 可安装性
- 满足 criteria 后，`beforeinstallprompt` 事件捕获 + 自定义「安装到桌面」按钮
- 安装后 `display: standalone` 独立窗口运行

### 离线
- App Shell 预缓存，断网可打开
- IndexedDB 天然离线可读写

## 权限策略（V1.0 纯净）

| 权限 | 用途 | 申请时机 |
|---|---|---|
| Notification | 番茄完成通知 | 用户首次开始番茄时请求 |
| Wake Lock | 番茄进行中防熄屏 | 番茄开始时请求，结束释放 |
| Vibration | 阶段切换触觉反馈（移动端） | 无需请求，调用即用 |
| Fullscreen | 全屏专注模式 | 用户点「全屏」时 |
| Clipboard | 数据导出复制到剪贴板（可选） | 用户点「复制」时 |

**不申请**：地理位置、摄像头、麦克风、文件系统写（导出走下载或分享 API）。

## 托管与部署

### 选型：Vercel 或 Cloudflare Pages

| 平台 | 优势 | 劣势 |
|---|---|---|
| **Vercel**（推荐） | CI 自动部署、预览分支、自定义域名免费、大陆访问相对稳 | 免费额度有限（100GB/月流量） |
| Cloudflare Pages | 无限流量、全球 CDN、大陆访问较稳 | 配置略复杂 |
| GitHub Pages | 最简单、与代码同仓库 | 大陆访问不稳定、仅静态 |

**V1.0 用 Vercel**：免费额度够小流量，部署最简（连 GitHub 仓库后 push 自动部署）。

### 域名
- V1.0：用 Vercel 默认域名 `<project>.vercel.app`（免备案，先上线）
- V1.1+：自定义域名（`floattomato.app` 等，境外注册免备案）

### 免备案原理
- Vercel / Cloudflare 服务器在境外，不受大陆 ICP 备案约束
- 代价：大陆访问速度取决于运营商到境外 CDN 的链路，一般可接受
- 若未来需大陆加速，再考虑境内 CDN（需备案）——V1.0 不做

## 浏览器兼容性

- **现代浏览器**：Chrome 90+ / Edge 90+ / Firefox 90+ / Safari 15+
- **PWA 安装**：Chrome / Edge / Safari（iOS 16.4+ 支持 iOS 安装）
- **IndexedDB**：全支持
- **Wake Lock API**：Chrome 84+ / Safari 16.4+（不支持的浏览器降级为不防熄屏）
- **Vibration API**：仅 Android Chrome，iOS 不支持（降级为无声）
- **Web Audio API**：全支持

**降级策略**：每个 API 调用前检测 `if ('wakeLock' in navigator)`，不支持则静默降级，不影响核心计时功能。

## 开发工具

- **ESLint + Prettier**：代码规范（strict TS + React hooks 规则）
- **Vitest**：单元测试（TimerService 状态机必测）
- **Playwright**：E2E 测试（核心流程可选）
- **Lighthouse**：PWA / 性能审计

## 包体积策略

- Framer Motion 按 `motion/react` 子路径按需引入，`layoutId` / `AnimatePresence` tree-shake，避免全量打入
- 路由懒加载（`React.lazy` + `Suspense`）按页面拆包，保首屏 LCP / FCP
- 材质 / 动效代码不进 App Shell 首屏关键路径，hydration 后按设备档位挂载
- Vite `build.rollupOptions` 分包，`react` / `react-dom` 独立 vendor chunk 利于缓存命中
