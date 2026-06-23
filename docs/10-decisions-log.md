# 10 — 已敲定决策日志

> **append-only**：新决策追加新条目，旧决策有变更新增「修订」条目，不直接改原条目。

---

## 2026-06-22 项目立项：飘悠番茄 Web 版

**背景**：鸿蒙原生版上架受三重外部阻塞（ICP 备案 1-3 周 + 软著/专利 ~3 个月 + 代理提醒云端审批），且仅鸿蒙设备可用。决定开 Web / PWA 双线，利用三个月等待期先上线见用户。

**核心决策**：
1. **双线并行，不抽共享代码包**：靠 `docs/` 做单一信源契约，业务逻辑（状态机/数据模型/规则）两版照同一份文档实现，UI 各写各的。鸿蒙版零改动零风险，Web 版独立迭代。
2. **技术栈 = React 18 + TS + Vite + Tailwind + Zustand + Dexie(IndexedDB) + Framer Motion + vite-plugin-pwa**（用户拍板 React，其余推荐采纳）。
3. **托管 = Vercel（境外免备案）**，V1.0 用默认 `.vercel.app` 域名先上线，V1.1+ 自定义域名。
4. **V1.0 纯前端 PWA**：无后端、无网络请求、无第三方 SDK，与鸿蒙版 V1.0「纯本地零追踪」承诺一致。所有数据存 IndexedDB + localStorage。
5. **功能范围对齐鸿蒙 V1.0**：计时核心 / 任务 / 统计 / 热力图 / 自定义外观 / 专注模式 / 数据导出。Web 版额外提前做：数据导入（鸿蒙版留 V1.1）、键盘快捷键、响应式一多。
6. **Web 版不做鸿蒙特色**：桌面卡片（用 PWA 替代）/ 实况窗（用 Notification 替代）/ 长时任务保活（用可见性 API 校准替代）/ 流转/分布式/小艺（留鸿蒙独占）。
7. **先写文档再干活**：复用鸿蒙项目文档范式（docs/01-11 编号体系），文档骨架先行，代码照文档实现。

**Web 版与鸿蒙版对齐关系**：
| 维度 | 对齐 |
|---|---|
| 计时状态机 | ✅ 完全对齐 |
| 数据模型 | ✅ 完全对齐（导出 JSON 跨版互通） |
| 业务规则 | ✅ 完全对齐 |
| 设计 token | ✅ 对齐（色彩/间距/动效数值一致） |
| 桌面卡片/实况窗/长时任务/鸿蒙特色 | ❌ Web 用 PWA/Notification/可见性 API 替代 |

**立项动机**（用户原话）：
- "申请专利要三个月才能批下来，这个项目我们当然要保留，我们先上线一个网站怎么样"
- "我建议是做一个完整版，在有你的帮助下，我们完全可以开双线，我们在根目录下创建一个文件夹吧，同样是先写文档再干活"

**沉淀**：[07-pitfalls.md](07-pitfalls.md) 铁律 1-12（Web 版特有 + 双线维护）；[CLAUDE.md](../CLAUDE.md) 当前阶段 = 阶段 0 工程基础（待开工）。

**下一步**：搭 Vite + React + TS 脚手架，落地 Tailwind token + 路由 + 空 HomePage（阶段 0）。

---

## 2026-06-22 修订：脱离鸿蒙独立化

**背景**：项目原从一个鸿蒙原生番茄钟项目抽离而来，文档通篇以「与鸿蒙版对齐」「双线策略」「双线同步」立论，定位为鸿蒙版的附属第二战线。现决定彻底脱离鸿蒙，作为独立 Web/PWA 项目看待。功能按原文档保留不变。

**核心决策**：
1. **项目定位改为独立 Web/PWA**：删除「双线/对齐/同步」运营框架，状态机与数据模型重述为本项目自身设计信源（非两版契约）。原 2026-06-22 立项条目保留不动（历史交代），本条目为修订。
2. **跨版互通功能降级为通用 JSON 导入导出**：原「与鸿蒙跨版互通」叙述删除，导出 JSON 定性为应用自有备份与跨设备迁移；`schemaVersion` 为本项目自有版本号。
3. **新增「版本兼容规则」**（见 [04-data-model.md](04-data-model.md)）：导入向下兼容最近 2 个大版本 + 自动 migration；不支持跨大版本逆向导出；bump `schemaVersion` 必带迁移函数。
4. **UI/动效基调定为 Q 弹 spring + 6 材质体系**：过渡走 spring 物理曲线（轻微 overshoot）；材质从 4 种扩到 6 种（毛玻璃/厚毛玻璃/云母/黏土/新拟态/扁平），`MaterialBox` 统一封装；微交互含按压回弹 / stagger 入场 / 共享元素转场（View Transitions API + Framer Motion `layoutId` 降级）/ 模态出入场（出场快 ~65%）；遵循 `prefers-reduced-motion` + 低端设备（`hardwareConcurrency ≤ 4`）降级。
5. **包体积策略**：Framer Motion `motion/react` 按需引入 + 路由懒加载，保首屏 LCP/FCP；材质/动效代码不进 App Shell 首屏关键路径。

**沉淀**：
- [02-design-system.md](02-design-system.md) 扩写动效表 + 6 材质表 + 共享元素转场路径 + 低端降级阈值（参数取自 `ui-ux-pro-max` skill 的 glassmorphism / claymorphism 条目）
- [07-pitfalls.md](07-pitfalls.md) 删除「双线维护铁律 11/12」（只服务于双线模型），铁律 10 由「跨版对齐」改述为「向下兼容 migration」
- [05-tech-stack.md](05-tech-stack.md) 新增 View Transitions API 行 + 包体积策略小节
- 各文档清洗「与鸿蒙版对齐」「与 ArkTS 同源」等表述，删除指向 `../../Harmony/cloud/docs/` 的相对链接

**下一步**：按阶段 0 搭脚手架，UI/动效按 02 设计规范实现（含 6 材质 MaterialBox + motion token）。

---

## 2026-06-23 路线决策：暂不做联网版，未来作为「同步插件」追加

**背景**：阶段 1-5 完成（计时 / 任务 / 统计 / 热力图 / 外观 / 专注 / 备份 / 引导 / 关于均通过 Playwright 验证，Lighthouse Mobile 98/100/100/100），首次推送 GitHub（`fullsummerdream/floattomato-web`，MIT）。用户提出做双版本——纯本地 + 联网（用其已有云服务器做多用户跨设备同步）。

**决策**：
1. **阶段 6 仍按单一纯本地 PWA 部署**，不开「双 build target」也不开「双仓库」。理由：飘悠番茄的产品叙述（[01-product-vision.md](01-product-vision.md) + 隐私协议「不向任何服务器发送你的数据」）以零追踪本地优先为核心卖点，联网版直接打破此承诺，与本地版用户群几乎不重叠，本质是不同产品而非附加功能。
2. **未来联网形态走「运行时插件」而非「编译时分叉」**：一套代码，通过 `VITE_SYNC_ENDPOINT` 环境变量分叉——配了启用同步、不配纯本地。**绝不采用双 git 分支 / 双 build target**——本项目刚清理掉鸿蒙双线框架（2026-06-22 修订），不能让 Web 自身再陷入双线维护陷阱。
3. **联网版的产品目标限定为：多用户账号 + 跨设备同步**。不做实时协作（设计上无场景）、不做云端独占功能（避免本地版降级为「免费试用版」）。账号方案待启动时定（候选：Magic link 邮件 / OAuth GitHub）。
4. **启动条件**：本地版部署后跑一段时间 + 真实用户提出过同步诉求。在此之前不动相关代码。

**沉淀**：本条目作为路线决策入决策日志；[11-future-ideas.md](11-future-ideas.md) 后续可追加「同步插件」候选条目细化方案。

**下一步**：继续阶段 6——纯本地 PWA 部署到用户的云服务器（静态站点）。

---

## 2026-06-23 路线调整：V1.1 改为「本地体验深化」，云同步推到 V2.x

**背景**：V1.0 阶段 1-5 全部落地（含 GitHub 推送 + 部署能力齐 + UI 动效补齐）。用户表态「云同步等大后期再干」，要求先把 V1.1 排成本地痒点的延续。原文档（[01-product-vision.md](01-product-vision.md) + [06-implementation-phases.md](06-implementation-phases.md)）V1.1 定为「云同步版」，与本日（2026-06-23 第一条修订）已敲定的「云同步走运行时插件、按用户反馈触发」相互冲突。

**核心决策**：

1. **V1.1 主题改为「本地体验深化」**，4 个子项按价值/复杂度排序，5-7 个工作日交付：
   - 音效 + 振动落地（接 V1.0 已有 AudioService，填 SettingsPage TODO）
   - 白噪音 / 专注音轨 MVP（4-6 段内置，HTML5 audio，从 V1.2 拆过来）
   - 统计详情时间线（SessionDao 已有能力，UI 层补一个组件）
   - 极克制成就系统（固定 ~8 个里程碑，无积分/排行榜/推送，可一键关闭）

2. **云同步整体降级为 V2.x**：与 2026-06-23 第一条「联网版作为运行时同步插件」决策一致；启动条件 = 真实用户提出诉求。本日两条决策互为前后呼应，本条是路线层面的版本号重排，不引入新技术框架。

3. **原 V1.2「音乐番茄 + Web Audio 增强」拆分**：白噪音 MVP 提到 V1.1，完整音频生态（用户上传 / 多轨混音 / 频谱可视化）+ 番茄日记留在 V1.2。

4. **V2.0 改为「高级自定义」**：用户上传背景/提示音、自定义快捷键映射、番茄音乐模式。原 V2.0 的「成就系统 + 番茄日记」前者下放 V1.1，后者上移 V1.2。

**克制原则**（本次决策的隐含红线）：
- 成就系统**不做积分 / 排行榜 / 推送弹窗**——单机零追踪定位，禁止社交化压力机制
- 白噪音 V1.1 仅做 MVP，**不做上传 / 混音 / 频谱**——避免一次吞下完整音频生态导致 V1.1 拖延
- 任何 V1.1 子项必须**可独立交付、可单独关闭**——防止单项失败拖整版

**沉淀**：
- [01-product-vision.md](01-product-vision.md) V1.1/V1.2/V2.0/V2.x/V2.y 小节全部按本决策重排
- [06-implementation-phases.md](06-implementation-phases.md) V1.0 阶段后追加 V1.1 任务拆解 + 验证项；时间估算表更新；删除「V1.1 = 云同步」旧表述
- [11-future-ideas.md](11-future-ideas.md) 已采纳进 V1.1 的条目（白噪音、成就、统计详情）标记「采纳进 V1.1」

**下一步**：V1.1 子项 1（音效 + 振动）首发开工——已有 AudioService 基础，工作量最小，做完先 commit 让用户即刻体验。

---

## 2026-06-23 路线追加：桌面端纳入路线，Web 端稳定后启动，主打音乐番茄钟

**背景**：用户调研到 [InfinityLink](https://github.com/BetterNCM/InfinityLink)（BetterNCM 插件，向 Windows SMTC 写入网易云播放信息），问能否用于音乐番茄钟功能（[01-product-vision.md](01-product-vision.md) V2.0 既有项）。结论是飘悠番茄走 Web 路线无法消费跨进程播放信息——只有桌面壳能做。讨论后用户拍板：Web 端继续做，桌面端作为未来形态纳入路线，音乐番茄钟做成桌面端的差异化卖点。

**核心决策**：

1. **桌面端不是 Web 端套壳，而是 Web 端的增强形态**。Web 端保持「任意浏览器打开即用、纯本地零追踪」定位不变；桌面端做 Web 端做不到的事——音乐番茄钟（消费 SMTC）、托盘常驻、全局快捷键、真后台精确计时、稳定本地通知、开机自启。

2. **技术选型 Tauri**。理由：Rust 后端、吃 Vite 产物零迁移、5MB 安装包、30MB 内存。Electron 作 escape hatch 保留（若 Tauri 上某 Windows API 跑不通才回退）。

3. **首发只锁 Windows**。macOS（`MPNowPlayingInfoCenter` 私有 API + 签名复杂）推到桌面 V1.1；Linux（MPRIS 碎片化）桌面 V1.0 不出。

4. **代码组织：单仓库 + 平台抽象层**，禁止双 git 分支 / 双 build target（同 2026-06-23 第一条对「双线维护陷阱」的红线）。启动桌面端时迁移到 `packages/{core,ui,platform}` + `apps/{web,desktop}` monorepo 布局，platform 抽 `MusicSource / Notification / Storage / Shortcut` 接口双实现。

5. **音乐番茄钟数据来源 = 消费 SMTC，不写入 SMTC**。任何接入 SMTC 的播放器（Spotify / Foobar / 浏览器内 YouTube / Apple Music for Windows / 接入 InfinityLink 后的网易云）都能读到。**飘悠番茄不打包任何第三方插件**——BetterNCM / InfinityLink 在帮助文档列为「想听网易云？请装这个」的用户侧前置条件。

6. **不做桌面端独占功能**（同 2026-06-23 第一条对云同步「避免本地版降级为试用版」的红线）。桌面端只做形态差异化，不做产品功能差异化——避免 Web 端用户被边缘化。

7. **启动条件**：Web V1.0 上线 + V1.1 + V1.2 + V2.0（含番茄音乐模式前端）全部交付后才开桌面端工。理由：刚脱掉鸿蒙双线（2026-06-22 修订），不能马上又开新双线；音频生态先在 Web 验证，桌面端复用而非重发明。

8. **数据互通**：沿用 2026-06-23 第一条云同步决策——本地纯净、不互通。桌面端与 Web 端各自独立存数据，UI 层明示。

**沉淀**：
- 新增 [13-desktop-roadmap.md](13-desktop-roadmap.md) 作桌面端单一信源，含选型 / 数据流 / UI / 风险 / 工作量（9~10 天）/ 启动条件
- [README.md](README.md) 文档索引追加第 13 行
- [11-future-ideas.md](11-future-ideas.md) 路线小节追加「Desktop V1.0 桌面端（Tauri）」一行，详情指向 13
- [01-product-vision.md](01-product-vision.md) V2.0「番茄音乐模式」段落追加跳转——具体形态见 13

**不沉淀**（保持现状）：
- V1.0 ~ V1.2 范围、技术栈、铁律、设计 token 全部不动
- 现有 `src/` 代码结构暂不重构——桌面端启动时一次性迁 monorepo，避免现阶段为"未来可能"做预测性返工（CLAUDE.md 准则 2 简单优先）

**下一步**：本决策仅落文档，**不动代码**。回到 V1.1 主线（音效 + 振动 → 白噪音 MVP → 统计时间线 → 成就）。

---

## 2026-06-23 — V1.1 #2 白噪音音源选定：moodist，音频随仓库分发

**背景**：V1.1 #2 白噪音 MVP 初版使用 Mixkit 音轨（CDN URL + `npm run fetch-audio` 拉取，音频不进 git），实测**音质不佳**。

**决策**：

1. **音源切换为 [moodist](https://github.com/remvze/moodist)**（MIT 代码 + Pixabay/CC0 音频）。映射 15 段到 moodist 84 段精选库（rain/nature/places/noise 4 类）。
2. **音频进 git**（`public/audio/` 纳入版本控制，~33MB）：
   - License 上无差异——Web 应用部署后音频本就以 standalone URL 暴露，是否进 git 不改变法律姿态
   - moodist 自身 5k stars 公开 2 年同模式分发，未被 takedown 视作先例
   - 工程便利：clone 即跑、git checkout 任意 commit 完整可重现
   - 未来扩展白噪音混合（V1.2+ 候选）需从 moodist 继续拉取更多音轨，进 git 后增量友好
3. **保留 `npm run fetch-audio` 工具链**作「换/补音轨」专用，不再是部署必需步骤。
4. **致谢文档** [docs/AUDIO_CREDITS.md](AUDIO_CREDITS.md)：标 15 段映射 + 双 license 边界 + moodist 整理工作。

**不沉淀**：
- 当前 15 段足够 V1.1 MVP，**不预测性扩 30/60 段**——等用户反馈/混音需求落地再补（CLAUDE.md 准则 2 简单优先）
- UI 与播放逻辑不复用 moodist 代码

**沉淀**：
- [.gitignore](../.gitignore) 删除 `public/audio/` 排除规则
- [docs/12-deployment.md](12-deployment.md) 部署命令删 `npm run fetch-audio` 必跑步骤，移至「换/补音轨」可选小节
- [docs/AUDIO_CREDITS.md](AUDIO_CREDITS.md) 顶部声明「音频随仓库分发」
- [scripts/audio-manifest.json](../scripts/audio-manifest.json) URL 切到 moodist raw，license 字段更新
- [src/service/whitenoiseTracks.ts](../src/service/whitenoiseTracks.ts) 3 段噪音文件 `.mp3` → `.wav`（moodist 原始格式）

**反思**：初版「license 红线 → 不进 git」是过度保守判断，被 Pixabay License 字面条款震慑，没看到「Web 应用本质上必然 standalone 暴露音频」的现实。moodist 先例是关键解锁——开源生态已有清晰共识。

---

## 2026-06-23 — V1.1 #4 极克制成就系统：实施口径与边界

**背景**：V1.1 #4 进入实施前，对 8 条里程碑选择 / 触发时机 / 反馈策略 / 性能取舍做最终拍板。

**决策**：

1. **8 条里程碑全保留**（首次 1 + 累计 10/50/100 + 时长 1h/24h + 节奏 7 天连续 + 彩蛋 8 点前 5 个）：
   - 维度组合：首次 / 累计 / 时长 / 节奏 / 习惯彩蛋——避免单一线性成长曲线
   - 彩蛋 `early-bird` 是"不期而遇"型，奖励早起者但不施压所有人；契合"克制且有温度"
   - **不做**「30 天连续」「完成率 90%」等过严或惩罚型条目——与"中断不要紧、下一次再来"调性冲突

2. **双触发点 + 首扫静默**：
   - 番茄完成（`sessionEnd + completed`）→ 评估 + 弹 toast
   - 应用启动 IIFE → 评估**但不弹 toast**（避免久不开 app 后一次性 5+ toast 排队骚扰，违背原则 A 不打扰）
   - 用户语义：toast 是"发生在你眼前的庆祝"，历史成就靠成就墙被动陈列发现，"延迟满足"更高级

3. **可关后追溯**：
   - 设置页 `achievementsEnabled` 开关默认 true
   - 关闭后**不评估、不弹 toast**；成就墙入口仍展示（数据是事实，开关只控告知）
   - 重新开启会触发一次补扫，**补齐期间已达成项**——用户重启订阅 = 重新接收事实通告
   - 不暴露"清空成就"入口——避免暗黑模式自我清零，保持成就的"既成事实"语义

4. **时区铁律**：
   - `byDay` key 走本地时间字符串 `YYYY-MM-DD`（自行拼，禁用 `toISOString()` 跑去 UTC）
   - `early-bird` 用 `new Date(startAt).getHours() < 8` 本地小时
   - 不防作弊（用户改手机时间）——单机应用"防君子不防小人"，逻辑自洽即可

5. **toast 微交互**：
   - 3 秒自动消，Q 弹 spring 入场
   - `pointerEnter` 暂停倒计时，`pointerLeave` 恢复（防"还没看清就消失"）
   - **不可点击**——保持被动陈列，禁"查看详情"按钮
   - 多条堆叠最多 3 条，超出 FIFO 顶替

6. **性能：当前不做缓存表**：
   - 评估函数 O(n) 全表扫，session < 几千条 < 30ms 无感知
   - 增量缓存表（`statsCache`）虽是经典优化，但属"预测性优化"——违反 CLAUDE.md 准则 2"简单优先"
   - 真出问题时再加（profile-driven，<2h 工作量）；当前为它付出"两表一致性维护"代价不值
   - 留作 V1.x 后期升级候选，触发条件：profile evaluate > 50ms 或用户反馈卡顿

**沉淀**：
- [04-data-model.md](04-data-model.md) 新增 `AchievementRecord` 类型 + Dexie `version(2)` 升级 + 「成就系统（V1.1 #4）」专节（8 条规则、时区铁律、评估算法、性能升级路径）；`ExportPayload.schemaVersion` bump 至 2 并加 `achievements` 字段
- [06-implementation-phases.md](06-implementation-phases.md) V1.1 #4 小节扩写为完整实施清单（数据/触发/UI/开关/性能边界/验证）

**不沉淀**：
- 成就墙具体视觉规范（emoji 选型、卡片间距等）——属设计稿层细节，代码 + 02 设计 token 落实即可
- "清空成就"功能——CLAUDE.md 准则 2 简单优先，用户没要求

**下一步**：先文档（本条 + 04 + 06）→ 类型定义 → 服务层 → UI → 测试 → commit。

---

## 2026-06-23 — V1.2 #1 番茄日记规格定档

**背景**：V1.1 4 项收尾完成后启动 V1.2，按 [06-implementation-phases.md](06-implementation-phases.md) 4 子项拆解，#1 番茄日记最独立、产品风险最高（侵入计时流程），优先做。文档 [01-product-vision.md:136](01-product-vision.md) 原话只有「每个番茄结束后可选写两句感想 + 心情标签（5 档表情），可关闭」，落地前必须把交互/数据/风险细节钉死。

**4 个产品拍板**：

1. **触发时机**：3 触发器全要，由用户在设置 segment 中三选一（A 弹窗 / B 浮卡 / C 关闭主动弹），C「时间线补写」永远兜底
   - 选 segment 不选 checkbox：A/B 解决同一问题（提醒写日记）只是侵入程度不同，同开属严重交互冗余违背「不打扰」铁律
   - 默认 `card`（B，非阻塞浮卡）—— 在「不打扰」与「不被遗忘」间最平衡
   - 选 `off` 仍保留 C 入口，保证用户永远可写

2. **心情形态**：颜文字 5 档（非 emoji 表情）—— 符合极克制 + 中文友好气质
   - DB 存 `Mood` 枚举（`sad/down/calm/happy/excited`），颜文字仅前端 `MOOD_KAOMOJI` 映射
   - 选枚举不存字符串：未来想换成 emoji / 圆点只改前端，不需 DB migration 洗历史
   - 选用「日系经典」一套：见 [04-data-model.md 番茄日记](04-data-model.md#番茄日记v12-1) 颜文字表

3. **字数限制**：500 字（中等空间，足够一小段反思，仍不至变博客）

4. **数据结构**：新建 `pomodoroDiary` 表 + `sessionId` 外键关联
   - 选独立表不扩 `PomodoroSession.diary?`：扩 session schema 会影响 BackupService + 所有读 session 的地方都要兼容 undefined；独立表干净分离

**4 个改进采纳**（来自 reviewer 反馈）：

5. **Toast / Modal 撞车规避**：sessionSink 内 `if (newly.length > 0) setTimeout(triggerDiary, 3500) else triggerDiary()`
   - 3.5s = 成就 Toast 3s 自动消 + 0.5s 缓冲，让「双喜临门」有从容感
   - B card 形态本身非阻塞理论可与 Toast 共存，但同样错开以保留「成就先看清」语义

6. **pomodoroDiary.sessionId 强制索引**：`pomodoroDiary: 'id, sessionId, createdAt, ...'`
   - Trigger C 每行渲染都要查「该 session 是否已写」，无索引 = N 行 × 全表扫
   - Dexie 二级索引零成本

7. **柔性 500 字反馈**（非硬截断）：
   - 正常态：右下角 `N / 500` 灰色
   - ≥ 450：橙色提醒
   - \> 500：保存按钮禁用 + 计数红色 + 超出字符高亮（输入不阻塞）
   - 柔性比硬截断 UX 友好得多，实现成本仅 className 切换

8. **孤儿日记防御 — 级联删除**：`SessionDao.delete()` 内追加 `await db.pomodoroDiary.where('sessionId').equals(id).delete()`
   - 仅硬删除触发级联；软删（`deletedAt`）保留日记 + 补写入口
   - 1 行代码避免数据库长期累积无关联孤儿

**沉淀**：
- [04-data-model.md](04-data-model.md) 新增 `DiaryRecord` 类型 + `Mood` 枚举 + Dexie `version(3)` 升级 + 「番茄日记（V1.2 #1）」专节（5 档心情/3 触发/撞车规避/级联删除/柔性字数/幂等/关闭语义）；`ExportPayload.schemaVersion` bump 至 3 并加 `diaries` 字段
- [06-implementation-phases.md](06-implementation-phases.md) V1.2 段从「详见 01」扩写为 4 子项拆解 + #1 番茄日记完整实施清单

**不沉淀**：
- 日记墙 UI（按月/按心情聚合展示）—— V1.2 #1 只做写入与单条查看，墙留 V1.2 后续或 V2.x
- 日记搜索 / 标签云 / 导出 markdown —— 重度功能违反极克制，留未来评估
- 「同时启用 A 和 B」选项 —— 见拍板 1，segment 单选不开放

**下一步**：本条目 + 04 + 06 三处文档 commit → 数据层（types/DB/DAO/Backup/preferences）commit → UI 三触发器 + sessionSink 集成 commit → Playwright 测试 → 不 push。

---
