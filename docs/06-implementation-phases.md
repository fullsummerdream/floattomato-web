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

## V1.0 上线后（按反馈迭代）

- **V1.1**：云同步（Supabase，可选，PWA + IndexedDB 已满足单设备需求）
- **V1.2**：白噪音 + 真实音频频谱（Web Audio API）
- **V2.0**：专注成就系统 + 番茄日记
- **V2.1**：实时协作自习室（WebRTC + 信令服务器）

详见 [01-product-vision.md](01-product-vision.md)。

---

## 时间估算

| 阶段 | 工时 |
|---|---|
| 0 工程基础 | 1-2 天 |
| 1 核心计时 | 3-4 天 |
| 2 数据持久化 | 2-3 天 |
| 3 自定义系统 | 3-4 天 |
| 4 专注+PWA | 3-4 天 |
| 5 打磨+统计 | 3-4 天 |
| 6 上线 | 1-2 天 |
| **合计** | **16-23 天**（约 3-4 周全职） |

剩余时间可做 V1.2 白噪音 / 频谱。
