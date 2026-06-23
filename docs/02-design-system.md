# 02 — 设计规范

> 色彩 / 字体 / 间距 / 圆角 / 动效 / 材质全部走 Tailwind config + CSS 变量，禁散写魔法数字。

## 设计原则

1. **专注优先** — 计时进行中，UI 元素降到最少
2. **柔和反馈** — 状态切换全部通过过渡动画衔接，无生硬跳变
3. **统一色系** — 单一主题色 + 中性灰阶，避免多彩
4. **Q 弹有度** — spring 物理过渡服务反馈，不哗众取宠；单视图同时仅 1–2 个主元素动
5. **Token 化** — 颜色 / 间距 / 圆角 / 动效全部走 Tailwind config + CSS 变量，禁散写魔法数字

## 色彩系统

**默认主题：极简黑灰（克制内敛，强调内容本身）**

| 角色 | Light | Dark |
|---|---|---|
| Primary | `#1A1A1A` | `#F5F5F5` |
| Surface | `#FFFFFF` | `#0F0F0F` |
| Surface-Variant | `#F5F5F5` | `#1A1A1A` |
| Neutral | `#FAFAFA` `#F0F0F0` `#D8D8D8` `#B0B0B0` `#7A7A7A` `#4A4A4A` `#2D2D2D` `#1A1A1A` `#0F0F0F` | 反转 |
| Accent（番茄橙，仅关键时刻） | `#FF6B35` | 同 |
| Success | `#4CAF50` | 同 |
| Warning | `#FF9800` | 同 |
| Danger | `#F44336` | 同 |

**落地**：CSS 变量 `--color-primary` / `--color-surface` 等，Tailwind 扩展 `colors: { primary: 'var(--color-primary)' }`。深色模式走 `:root.dark` 覆盖变量值（不依赖 `prefers-color-scheme`，支持「跟随系统/强制浅/强制深」三档）。深色模式禁纯 `#000000`（OLED smear），用 `#0a0a0f`→`#020203` 渐变底。

**内置主题（8 套）**：
1. 极简黑灰（默认） 2. 番茄橙 `#FF6B35` 3. 静谧蓝 `#4A90E2` 4. 森林绿 `#4A7C59`
5. 樱花粉 `#E8A0BF` 6. 暮光紫 `#6B5B95` 7. 米白原木 8. 深空蓝 `#2E4374`

每套主题含 5 级灰阶 + 主色 + 强调色，切换时改 CSS 变量根值，全应用实时跟随。

## 字体与数字样式

- 中文：`"HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`
- 英文 / 数字：`"HarmonyOS Sans", system-ui, sans-serif`
- 数字样式（4 套）：
  1. **经典** — Bold 字重，等宽
  2. **细线** — Light 字重，纤细
  3. **机械翻页** — CSS transform + Framer Motion 完整翻牌动画
  4. **点阵数码** — 像素 / 数码管风（text-shadow 多层叠加发光）

## 间距 / 圆角 Token

**间距**（Tailwind `spacing` 扩展）：`4 / 8 / 12 / 16 / 24 / 32 / 48`（对应 `xs/sm/md/lg/xl/2xl/3xl`）

**圆角**（Tailwind `borderRadius` 扩展）：`4 / 8 / 12 / 16 / 24 / 999`（`xs/sm/md/lg/xl/full`）
- 卡片圆角默认 16（`lg`），按钮默认 12（`md`），黏土材质按钮 16–24

## 动效规范

| 场景 | 时长 | 缓动 | 落地 |
|---|---|---|---|
| 启停/按压 | 280ms | spring(stiffness 320, damping 18, mass 0.8) **带轻微 overshoot** | Framer Motion `spring` |
| 状态切换（工作↔休息） | 320ms | spring(damping 20) | Framer Motion |
| 页面/路由切换 | 320ms | cubic-bezier(0.2,0,0,1) | 方向化 slide（见下「共享元素转场」） |
| 模态/弹层入场 | 280ms 入 / 180ms 出 | spring 入 / ease-in 出（**出场比入场快 ~65%**） | scale+fade from trigger |
| 列表项入场 | 30–50ms **stagger** | ease-out | Framer Motion staggerChildren |
| 圆环进度更新 | 1000ms | linear | CSS transition（每秒平滑） |
| 倒计时数字翻动 | 200ms | ease-out | CSS transition |
| 卡片悬浮/按压 | 160ms | ease-out | hover scale 1.02 / press scale 0.96 |

**动效铁律**（来源 `ui-ux-pro-max` skill）：
- **可中断**：用户手势可立即取消进行中的动画，不锁住交互
- **只用 transform/opacity**：禁 animating width/height/top/left（触发 reflow）
- **reduced-motion 降级**：`prefers-reduced-motion: reduce` 时降为 ≤150ms 线性或无
- **节制**：单视图同时仅 1–2 个主元素动，防 motion sickness
- **token 集中**：`src/theme/motion.ts` 导出 `MOTION = { pressSpring, pageTransition, modalIn/Out, stagger, ringUpdate }`，禁散写

### 共享元素转场（页面/路由切换）

- 优先 **View Transitions API**（`document.startViewTransition`），跨页面元素自动 morph；不支持时（Safari/Firefox 旧版）自动降级为 fade + 方向化 slide
- 同页内组件级共享元素（如番茄圆环从首页缩放到全屏专注页）用 **Framer Motion `layoutId`**
- 降级判定：`if (!('startViewTransition' in document))` → 走 Framer Motion 方向化 slide 兜底，确保 PWA 在所有浏览器体验一致

## 材质规范

| 材质 | CSS 实现（CSS 变量） | 适用场景 |
|---|---|---|
| 扁平 Flat | 纯色 `background` | 默认，最低开销；低端设备降级档 |
| 毛玻璃 Glass | `backdrop-filter: blur(15px); background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2)` + 顶部高光 | 卡片、设置面板、导航 |
| 厚毛玻璃 Frosted | `backdrop-filter: blur(24px) saturate(160%)` + 边缘高光；深色主题 `surface: rgba(255,255,255,0.05)` | 模态对话框、专注页浮层 |
| 云母 Mica | 半透明 + SVG 微噪声纹理 + 微妙渐变 | 番茄主卡片 |
| 黏土 Clay | `border-radius: 16–24px` + 双向阴影 `inset -2px -2px 8px, 4px 4px 8px` + 柔和渐变填充；按下 `scale(0.92)` Q 弹回弹（`cubic-bezier(0.34,1.56)` soft bounce） | 按钮、chip、控制条 |
| 新拟态 Neumorph | 同色系凸/凹阴影（仅浅色主题，3–4px 描边） | 设置项开关组（可选） |

**封装与降级**：
- `MaterialBox` 组件统一处理 blur/降级；毛玻璃仅小面积，禁全屏铺
- 按压时叠加 spring `scale` Q 弹反馈（Flat 材质也保按压回弹）
- **低端设备降级阈值**：`navigator.hardwareConcurrency ≤ 4` 或 `navigator.deviceMemory ≤ 4` 视为低端
  - 低端档：禁用 `backdrop-filter`（全部材质降级为 Flat）、Spring 动画改 200ms ease-out、stagger 改单次 fade
  - Flat 材质靠 `box-shadow` + `1px border` 维持视觉层级，不丢层级感
- PWA 首屏（App Shell）加载期间禁重度材质渲染，避免阻塞主线程影响 LCP/FCP；材质在 hydration 后按设备档位挂载

## 列表 / 网格性能规范

- **>20 项** 的列表 / 网格用 `react-window` 虚拟滚动，禁直接 `map`
- 热力图 365 格：按周分组 + 虚拟滚动横向
- 图片用 `loading="lazy"` + 缓存

## 响应式断点

| 断点 | 宽度 | 布局 |
|---|---|---|
| `sm` | < 768px | 手机：底部 Tab + 单列 |
| `md` | 768-1024px | 平板竖屏：底部 Tab + 限宽居中 |
| `lg` | ≥ 1024px | 平板横屏 / PC：侧边 Tab + 多列 |

**Tailwind 落地**：`md:` / `lg:` 前缀，断点值用 768/1024 标准断点。

## 关键界面线框

**首页（主计时）**
```
┌─────────────────────┐
│  ☰     ●任务名    🔔 │
│                     │
│    ╭─────────────╮  │
│   │     25:00    │  │  ← 数字样式可切换 + 圆环进度
│   │   ───●───    │  │
│    ╰─────────────╯  │
│      工作 1/4       │
│   [⏸暂停] [⏭跳过]   │
│  ── 进入全屏模式 ── │
└─────────────────────┘
```

**全屏专注模式**
```
┌─────────────────────┐
│                     │
│       25:00         │  ← 仅时钟，每 60s 微动 ±20px
│                     │
└─────────────────────┘
单击：唤起最小控制条
Esc：退出全屏
```

**统计页**：4-tab + 主卡片 + 热力图 + 任务分布
