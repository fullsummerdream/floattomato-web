# 06 — 实施路径（阶段 0 → 阶段 6）

> 每阶段独立可验证。V1.0 目标：跑通核心流程、无 Bug、上线见用户。

## 阶段 0：工程基础（1-2 天）

**任务**：
1. `npm create vite@latest` React + TS 模板，初始化仓库
2. 装 Tailwind + Zustand + Dexie + React Router + Framer Motion + lucide-react + date-fns
3. Tailwind config 扩展色彩/间距/圆角 token（依 [02-design-system.md](02-design-system.md)）
4. 目录骨架（pages/components/service/store/theme/hooks/types/utils）
5. React Router 配置：主页面 Tab 布局 + 全屏独立路由
6. ThemeProvider：CSS 变量注入 + 深色模式三档 + 8 套主题切换
7. 响应式断点 hook（useBreakpoint，sm/md/lg）

**验证**：`npm run dev` 启动，空 HomePage 显示 + 切主题色实时变 + 切深色模式 + 响应式断点切换布局

## 阶段 1：核心计时（3-4 天）

**任务**：
1. `TimerService.ts` 状态机（Idle/Working/Paused/ShortBreak/LongBreak + 任务锁定 + 暂停限时）
2. `PersistenceService.ts` 计时态 localStorage 持久化（每次状态变更立即写）
3. `TimerRing` 组件（SVG 圆环，progress 平滑动画）
4. `TimerDigits` 组件（4 套数字样式：经典/细线/翻页/点阵）
5. HomePage：圆环 + 数字 + 启停/跳过/放弃 + 任务 chip + 阶段标签
6. 开始/暂停/恢复/跳过/放弃 操作
7. 完成提示音（Web Audio）+ 振动（Vibration API）
8. 后台校准：`useVisibilityCalibration` hook（visibilitychange 重算剩余）
9. 冷启动恢复：从 localStorage 读 PersistedTimerState 恢复

**验证**：
- Vitest 状态机单元测试覆盖所有状态转换
- 开始番茄 → 切后台 30s → 回前台剩余准确
- 锁屏/切标签页 → 回来校准正确
- 杀进程重开 → 状态恢复
- 完成番茄 → 提示音 + 振动 + 状态流转到短休息

## 阶段 2：数据持久化（2-3 天）

**任务**：
1. `DatabaseService.ts` Dexie 封装（tasks/sessions/presets 三表 + 索引 + version 迁移）
2. `TaskDao` / `SessionDao` / `PresetDao`：CRUD + 软删除（deletedAt 墓碑）+ 按区间/任务聚合查询
3. TaskPage：任务列表 CRUD（名称 + 颜色 + 归档）
4. 番茄完成自动写 PomodoroSession 记录
5. StatsPage：今日/本周/本月/总计 四档统计 + 任务专注分布
6. 预设方案 CRUD（PresetEditorPage）

**验证**：
- 完成几个番茄 → 数据库有记录
- 任务 CRUD 完整
- 统计数字与记录吻合
- 删任务（软删）→ 不出现在列表但历史记录保留
- 杀进程数据不丢

## 阶段 3：自定义系统 + Q 弹动效/材质（3-4 天）

**任务**：
1. `ThemeProvider` 完善：8 套主题色切换（CSS 变量根值切换）
2. 4 套数字样式完整实现（翻页用 CSS transform + Framer Motion，点阵用 text-shadow 多层）
3. `MaterialBox` 组件：6 种材质（flat/glass/frosted/mica/clay/neumorph），`backdrop-filter` + 双向阴影 + 降级
4. `src/theme/motion.ts` 动效 token：spring 参数（按压 overshoot / 状态切换）、stagger、模态出入场（出场快 ~65%）、`MOTION` 集中导出
5. 微交互落地：按压 `scale(0.92)` Q 弹回弹、列表 staggerChildren 入场、模态从触发源 scale+fade、共享元素转场（View Transitions API + Framer Motion `layoutId` 降级）
6. `prefers-reduced-motion` + 低端设备（`hardwareConcurrency ≤ 4` / `deviceMemory ≤ 4`）降级为 Flat + 简化动画
7. 背景渐变轮播（BackgroundCarousel，4 套预设 + 随机档）
8. 深色模式三档（跟随系统/强制浅/强制深），禁纯 `#000000`
9. AppearancePage：集中外观自定义入口
10. 外观偏好持久化（localStorage）

**验证**：
- 8 套主题切换实时生效
- 4 套数字样式正确渲染（翻页有动画、点阵有发光）
- 6 种材质视觉差异明显，按压有 Q 弹回弹
- 共享元素转场在 Chrome 生效，Safari 降级为 slide 正常
- 低端设备档自动降级为 Flat 且层级清晰
- 深色模式三档正确
- 切外观后刷新页面，偏好保留

## 阶段 4：专注模式 + PWA（3-4 天）

**任务**：
1. FullscreenFocusPage：Fullscreen API + 大圆环 + 大数字 + 防烧屏微动（60s ±20px）+ 降亮
2. Wake Lock API：番茄进行中防熄屏
3. 背景渐变在专注页铺底
4. 单击唤起控制条 / Esc 退出
5. PWA 配置：vite-plugin-pwa + manifest + 图标
6. Service Worker 注册 + 离线 App Shell 缓存
7. 「安装到桌面」按钮（beforeinstallprompt）
8. Notification API：番茄完成通知 + 授权请求

**验证**：
- 全屏专注页防烧屏微动生效
- 屏幕常亮（Wake Lock）番茄期间不熄屏
- PWA 可安装（Lighthouse PWA 审计通过）
- 断网后打开仍可用（离线）
- 番茄完成弹通知（已授权）

## 阶段 5：打磨与统计增强（3-4 天）

**任务**：
1. **专注热力图**（FocusHeatmap）：365 格 + 按周分组 + 虚拟滚动 + 长按/悬停气泡 + 3M/6M/1Y 切换
2. 响应式一多完善：平板/PC 侧边 Tab + 限宽居中 + 任务列表多列
3. 数据导出 JSON（应用自有 schemaVersion，备份与跨设备迁移）
4. 数据导入 JSON（LWW 冲突解决 + 旧版本 migration）
5. 键盘快捷键（空格启停 / S 跳过 / F 全屏 / T 任务 / , 设置）
6. 首启动引导页（6 页 Swiper，数据驱动可扩展）
7. 关于页 + 隐私协议/用户协议纯文本展示
8. 性能优化（虚拟列表、React.memo、路由懒加载）

**验证**：
- 热力图正确显示 + 切范围 + 气泡明细
- 响应式三档（手机/平板/PC）布局正确
- 导出 JSON 可被本应用重新导入还原
- 导入旧版本 JSON 自动 migration 还原
- 键盘快捷键全部可用
- 引导页首启动显示，二次启动跳过
- Lighthouse 性能审计 ≥90

## 阶段 6：上线（1-2 天）

**任务**：
1. Vercel 部署（连 GitHub 仓库自动部署）
2. 自定义 favicon + PWA 图标 + og:image（社交分享卡片）
3. SEO 基础（meta description + 结构化数据）
4. 隐私协议 / 用户协议页面（网站版，HTML 直出）
5. Lighthouse 全项审计（PWA / 性能 / 可访问性 / SEO ≥90）
6. 真机验证：桌面 Chrome / 移动 Chrome / Safari / 安装后 PWA
7. 上线 + 分享链接

**验证**：
- Vercel 部署成功，`<project>.vercel.app` 可访问
- Lighthouse 全项 ≥90
- 移动端浏览器 + 安装后 PWA 双测通过
- 大陆访问可用（速度可接受）

---

## V1.1 — 本地体验深化（5-7 天）

> 【2026-06-23 决策】V1.1 原定「云同步版」推至 V2.x，该版本改为在现有纯本地架构内深化质感。详见 [01-product-vision.md](01-product-vision.md) + [10-decisions-log.md](10-decisions-log.md)。

**任务**：

### 1. 音效 + 振动设置（~0.5 天）
- SettingsPage 音效/振动/暂停限时 TODO 落地
- 番茄完成提示音（AudioService 接 UI）+ 移动端振动
- 4 档音量 + 静音开关 + 振动开关 + 试听按钮
- 持久化到 preferencesStore（localStorage）

**验证**：设置页音效开关联动，番茄完成响铃/振；刷新后偏好保留

### 2. 白噪音 / 专注音轨（~2.5 天）
- 4-6 段内置音轨（雨声 / 咖啡馆 / 森林 / 海浪 / 白噪音纯色 / 粉噪音）
- HTML5 `<audio>` 循环播放 + 音量滑块
- PWA precache 音轨文件（每段 ~200KB，总量 ~1.2MB acceptable）
- 暂不做上传/多轨混音/频谱可视化

**验证**：音轨可播放并切换、音量调节生效、断网离线也可播

### 3. 统计详情时间线（~1.5 天）
- StatsPage 新增「最近记录」时间线（默认 20 条，可加载更多）
- 每条：任务名 + 时长 + 起止时间 + 是否完成
- 直接复用 SessionDao 现有查询

**验证**：完成番茄后时间线出现该记录，数据与聚合视图一致

### 4. 极克制成就系统（~1.5 天）

**8 条固定里程碑**（详见 [04-data-model.md](04-data-model.md#成就系统v11-4)）：
首次 `first-tomato` / 累计 `ten/fifty/hundred-tomatoes` / 时长 `focus-hour/focus-day` / 节奏 `seven-day-streak` / 彩蛋 `early-bird`

**数据**：
- Dexie `version(2)` 新建 `achievements` 表，**表中存在即解锁**（无未解锁行）
- 类型 `AchievementRecord { id, unlockedAt }` 见 `src/types/AchievementTypes.ts`

**双触发点**：
- 番茄完成（`timerStore` 监听 `sessionEnd + completed`）→ 评估 + toast（开关开时）
- 应用启动 IIFE → 评估**不弹 toast**（首扫静默，防 toast 排队骚扰）

**反馈**：
- 解锁 toast 3 秒右下角弹（手机底部居中），Q 弹 spring 入场（用 `motion.ts` token）
- `pointerEnter` 暂停倒计时，`pointerLeave` 恢复
- 不可点击（被动陈列原则）
- 多条堆叠最多 3 条，超出 FIFO 顶替

**UI 入口**：
- `/achievements` 路由（lazy 加载），**不进** TabLayout，避免 Tab 膨胀
- 入口在 SettingsPage「关于」上方一行 `<Link>`
- 成就墙：手机 2 列 / PC 4 列网格；解锁=彩色 emoji+日期，未解锁=灰度 emoji+条件描述
- 顶部「已解锁 X / 8」小汇总

**开关**：
- preferencesStore 新增 `achievementsEnabled: boolean`（默认 true）
- 设置页「成就反馈」节，开关样式复刻振动开关（已含 `left-0.5` thumb 修正 + `shrink-0`）
- 关后不评估不弹 toast；成就墙仍可查阅
- 重开会触发补扫

**幂等 & 并发**：
- 已解锁项跳过 check → N 遍跑结果一致
- `isEvaluating` 标志位防 async 二次进入

**性能边界**（**当前 V1.1 不优化**，留作后期升级）：
- 当前 O(n) 全表扫，session < 几千条无感知（< 30ms）
- 升级路径见 [04-data-model.md 成就系统-性能升级路径](04-data-model.md#成就系统v11-4)
- 触发条件：用户反馈卡顿 或 profile 发现 evaluate > 50ms

**验证**：
- 完成第 1/10/50/100 个番茄分别解锁对应里程碑
- 关开关后完成番茄不弹 toast；重开后补齐期间已达成项
- 启动应用首扫不弹 toast；evaluate 并发跑两次仅写一次库
- Playwright `scripts/test-achievements.py` 冒烟绿灯

**合计**：5-7 个工作日

---

## V1.2 — 音频深化 + 番茄日记（4-6 天）

详见 [01-product-vision.md](01-product-vision.md)。

---

## V2.0+ — 按用户反馈触发

详见 [01-product-vision.md](01-product-vision.md)。

---

## V2.x（原 V1.1） — 云同步版（按启动条件触发）

> **启动条件**：本地版部署后跑一段时间 + 真实用户提出过同步诉求。
> **形态**：运行时 VITE_SYNC_ENDPOINT 插件，不开双 build target 或双 git 分支。

---

## 时间估算（V1.0 完成，V1.1 启动）

| 阶段 | 工时 |
|---|---|
| V1.0 阶段 0-6 | 16-23 天（已完成） |
| V1.1 本地体验深化 | 5-7 天 |
| V1.2 音频 + 日记 | 4-6 天 |
| V2.0+ | 按反馈触发 |
