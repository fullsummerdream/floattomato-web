# 03 — 模块架构与状态机

> 计时状态机是项目核心逻辑的单一信源；模块边界与平台机制围绕 Web / PWA 落地。

## 模块架构

```
src/
├── main.tsx                      # 入口
├── App.tsx                       # 根组件 + 路由 + 主题 Provider
├── pages/                        # 页面（React Router）
│   ├── HomePage.tsx              # 主计时
│   ├── FullscreenFocusPage.tsx   # 全屏专注
│   ├── TaskPage.tsx
│   ├── StatsPage.tsx             # 含热力图
│   ├── SettingsPage.tsx
│   ├── AppearancePage.tsx        # 外观自定义
│   ├── PresetEditorPage.tsx
│   ├── AboutPage.tsx             # 关于 + 协议入口
│   └── LegalDocPage.tsx          # 协议纯文本展示
├── components/
│   ├── TimerRing.tsx             # 圆环（SVG）
│   ├── TimerDigits.tsx           # 数字样式（4 套）
│   ├── MaterialBox.tsx           # 材质容器
│   ├── BackgroundCarousel.tsx    # 专注背景
│   ├── FocusHeatmap.tsx          # 年度热力图
│   ├── ThemeSwatch.tsx
│   ├── PressableButton.tsx       # 按压反馈按钮
│   └── ResponsivePage.tsx        # 限宽居中包装
├── service/                      # 纯 TS 业务逻辑（禁耦合 React）
│   ├── TimerService.ts           # 计时核心 + 状态机
│   ├── PersistenceService.ts     # 计时态持久化（localStorage）
│   ├── NotificationService.ts    # Web Notification
│   ├── DatabaseService.ts        # Dexie / IndexedDB 封装
│   ├── ExportService.ts          # JSON 导出导入
│   ├── AudioService.ts           # 提示音 + 振动（Vibration API）
│   └── WakeLockService.ts        # 屏幕常亮（Wake Lock API）
├── store/                        # Zustand 全局状态
│   ├── timerStore.ts
│   ├── taskStore.ts
│   ├── statsStore.ts
│   └── appearanceStore.ts
├── theme/                        # 设计 token
│   ├── colors.ts                 # 8 套主题色定义
│   ├── spacing.ts
│   ├── motion.ts
│   ├── materials.ts
│   └── ThemeProvider.tsx         # 主题切换 + CSS 变量注入
├── hooks/                        # 自定义 hooks
│   ├── useBreakpoint.ts          # 响应式断点
│   ├── useKeyboardShortcuts.ts   # 键盘快捷键
│   ├── useVisibilityCalibration.ts  # 可见性 API 校准
│   └── useServiceWorker.ts       # PWA 注册
├── types/                        # 类型定义
│   ├── TimerTypes.ts
│   ├── DatabaseTypes.ts
│   └── StatsTypes.ts
└── utils/
    ├── uuid.ts
    ├── time.ts
    ├── formatter.ts
    └── heatmap.ts                # 热力图纯函数
```

**职责边界**：
- `service/` 纯 TS 单例，禁 import React，禁耦合 UI。
- `store/` Zustand，订阅 service 事件 + 暴露 React 可用 hooks。
- `pages/` / `components/` 只消费 store + 调 service dispatch，禁写业务逻辑。
- `theme/motion.ts` 集中动效 token（spring 参数/时长/缓动），`components/MaterialBox.tsx` 统一材质封装与降级。

---

## 计时状态机（项目核心逻辑，单一信源）

```
            ┌──────┐  start  ┌─────────┐
            │ Idle │────────▶│ Working │
            └──────┘         └─────────┘
                ▲              │    │
        abandon │              │    │ pause
                │              │    ▼
   ┌────────────┴──┐           │  ┌────────┐
   │  Interrupted  │◀──────────┼──│ Paused │
   │ (写记录→Idle) │  超时     │  └────────┘
   └───────────────┘           │    │
                               │    │ resume
                               ▼    │
                          ┌──────────┐
                          │ ShortBrk │◀──┐
                          └──────────┘   │
                               │ done    │ done
                               ▼         │
                          ┌──────────┐   │
                          │ LongBreak│ (4 轮后)
                          └──────────┘
```

### 关键规则

- **暂停限时**：`pauseLimit`（默认 300 秒，可自定义 30s ~ 30min 或不限时）内未恢复 → 自动 Interrupted
- **跳过**：当前阶段直接 done，`actualDuration` 记实际时长
- **放弃**：进入 Idle，`status = abandoned`
- **任务锁定**：进入 Working / Paused 后，`taskId` 不可改，换任务必须先放弃当前番茄
- **后台校准**：`visibilitychange` / `focus` 事件触发时，用 `Date.now()` 重算剩余
- **冷启动恢复**：从 localStorage 读 `PersistedTimerState`，根据 `Date.now() - startAt - accumulatedPause` 算出当前应处阶段并恢复
- **状态变更立即持久化**：每次 phase 切换、pause、resume 同步写 localStorage，不依赖 `beforeunload`
- **计时核心禁 setInterval 累加**：用 `Date.now()` 算剩余（铁律 2），setInterval 仅作 1Hz UI 刷新触发

---

## PWA 机制

### Service Worker 策略
- **App Shell 缓存**：HTML / CSS / JS / 字体 预缓存，离线可打开
- **运行时缓存**：`stale-while-revalidate`（图片等静态资源）
- **不缓存 API**：V1.0 无后端，无 API 请求
- **更新策略**：SW 更新时跳过等待 + 提示用户刷新（`SkipWaiting` + `clients.claim`）

### 可安装性（Installable）
- 满足 PWA criteria：`manifest.json` + `service-worker.js` + HTTPS + 图标
- `beforeinstallprompt` 事件捕获，自定义「安装」按钮（不依赖浏览器弹窗）
- 安装后独立窗口运行，`display: standalone`

### 后台通知（受限）
- **番茄完成通知**：`Notification.requestPermission()` 授权后，`new Notification('番茄完成')`
- **SW 定时通知兜底**：`setTimeout` 在 SW 内注册延迟通知，但浏览器对 SW 后台存活有限（Chrome ~5min），仅短时兜底
- **不依赖后台计时**：核心策略是「可见性 API 校准 + 回前台后重算」，通知是辅助

### 离线数据
- IndexedDB（Dexie）天然离线可用
- 所有番茄记录 / 任务 / 预设离线可读写，联网无变化（V1.0 无后端）

---

## 通知与可见性校准机制

```
番茄进行中 → 切后台（visibilitychange → hidden）
  → 记录 hideTimestamp 到 localStorage
  → setTimeout/setInterval 被浏览器节流

回前台（visibilitychange → visible）
  → 读 hideTimestamp + Date.now() 算离线时长
  → 重算剩余：remaining = totalSeconds - (now - startAt - accumulatedPause)
  → 若 remaining ≤ 0：按规则跳阶段或标记 Interrupted
  → 同步 UI + 写持久化
```

**已知限制（Web 平台）**：不保证后台精确计时，但回前台立即校准准确。这是 Web 平台限制，文档声明已知，不视为 bug。
