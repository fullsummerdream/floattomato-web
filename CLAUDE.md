# 飘悠番茄 Web（FloatTomato Web）

飘悠番茄的 **Web / PWA 版本**，独立网站项目。React 18 + TypeScript + Vite。
纯本地零追踪：无后端、无网络请求、无第三方 SDK，数据存 IndexedDB + localStorage。

> **单一信源**：[`docs/`](./docs/) 是产品决策、设计规范、架构、数据模型、业务规则的唯一权威。改逻辑先改文档，再改代码。

## 当前阶段

**阶段 0 — 工程基础（待开工）**：文档骨架已建，下一步搭 Vite + React + TS + Tailwind + Zustand + Dexie 脚手架，跑通路由 + token 体系 + 空 HomePage。

## 不可违反的铁律

1. **文档单一信源**：数据模型 / 状态机 / 业务规则以 [`docs/`](./docs/) 为准。改逻辑先改文档，再改代码。
2. **计时核心纯逻辑**：TimerService 是纯 TS 状态机，禁耦合 React。用 `Date.now()` 算剩余，禁 setInterval 累加。
3. **持久化**：IndexedDB（Dexie）存番茄记录/任务/预设，localStorage 存外观偏好与计时态。每次状态变更立即写。
4. **Token 化**：颜色/间距/动效走 Tailwind config + CSS 变量，禁魔法数字。与 [`docs/02`](docs/02-design-system.md) 一致。
5. **PWA 优先**：可安装、可离线、Service Worker 缓存。但**不依赖 SW 做后台计时**（浏览器后台限制严，靠 Notification + 可见性 API 兜底）。
6. **无后端**：V1.0 纯前端 + IndexedDB，不申请网络、不接第三方 SDK、不上传任何数据。
7. **响应式一多**：CSS 媒体查询 + Tailwind 断点，手机/平板/PC 一套代码自适应。
8. **键盘优先**：Web 优势——所有核心操作有快捷键（空格启停、S 跳过、F 全屏）。
9. **UI/动效 Q 弹**：过渡走 spring 物理曲线（轻微 overshoot），材质走 `MaterialBox` 统一封装（毛玻璃/厚毛玻璃/云母/黏土/新拟态/扁平）；动效 token 集中在 `src/theme/motion.ts`，禁散写魔法数值；遵循 `prefers-reduced-motion` 与低端设备降级。
10. **真机验证**：浏览器 + 安装后 PWA 双测；移动端浏览器后台行为与桌面差异大，必须真机测。
11. **长列表**：>20 项用虚拟滚动（react-window），禁直接 map。

## 必查文档

| 场景 | 去查 |
|---|---|
| 加新功能前 | [docs/01-product-vision.md](docs/01-product-vision.md) 看是否在路线 |
| 设计组件 | [docs/02-design-system.md](docs/02-design-system.md) |
| 改架构/状态机 | [docs/03-architecture.md](docs/03-architecture.md) |
| 改数据模型 | [docs/04-data-model.md](docs/04-data-model.md) |
| 技术选型 | [docs/05-tech-stack.md](docs/05-tech-stack.md) |
| 拍设计决策 | 追加到 [docs/10-decisions-log.md](docs/10-decisions-log.md) |
| 想到新点子 | 暂记 [docs/11-future-ideas.md](docs/11-future-ideas.md)，禁动 V1.0 代码 |

## 编码约定

- **中文注释，UTF-8 编码**，修改文件不改原编码
- TypeScript 严格模式（`strict: true`）
- 计时器/数据库/通知逻辑放 `src/service/`，禁写在组件内
- 所有 ID 用 UUID（时间戳前缀 + crypto.randomUUID）
- 状态管理：全局用 Zustand，组件局部用 useState/useReducer
- 路由：React Router，主页面下沉为 Tab，全屏专注走独立路由
- 组件目录：`src/components/`（复用）/ `src/pages/`（页面）/ `src/service/`（业务）/ `src/store/`（状态）/ `src/theme/`（token）

## 维护铁律

- **决策日志只追加不修改**：旧条目改动 → 新增「修订」条目
- **想法不进代码**：开发期间冒出的新点子先写 `docs/11-future-ideas.md`
- **变更同步**：实施时发现规范不准 → **先改 docs，再改代码**
- **此文件 ≤ 80 行**：超长 AI 会忽略，详情写到 `docs/`
