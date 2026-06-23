# 07 — 关键陷阱与铁律

> Web 平台特有的坑 + 计时/数据/业务共通铁律。开发前必读，违者必返工。

## Web 版特有铁律

1. **后台计时不可靠——靠可见性 API 校准，禁依赖 setInterval 后台跑**——浏览器切后台后 `setTimeout`/`setInterval` 会被节流（Chrome 后台 1Hz 甚至冻结），无法可靠后台计时。**定论**：`visibilitychange` + `focus` 事件触发时用 `Date.now()` 重算剩余，setInterval 仅作前台 1Hz UI 刷新。番茄进行中切后台，回前台后校准，若已超时按规则跳阶段。判别口诀「后台不计时，回前台靠 visibilitychange 重算」。

2. **Service Worker 后台存活有限——SW 定时通知仅短时兜底**——Chrome 对 SW 后台存活限制约 5 分钟，长番茄（25 分钟）期间 SW 可能已被回收。**定论**：番茄完成通知优先用「SW 注册延迟通知」，但必须有「回前台后用 Date.now() 校准 + 弹通知」兜底，不能只靠 SW。判别口诀「SW 通知是辅助，可见性校准是主力」。

3. **IndexedDB 异步——禁在渲染期间同步读**——Dexie 所有操作返回 Promise，直接在组件 render 内 await 会阻塞渲染。**定论**：数据读取放 useEffect + useState，或用 Zustand 的异步 action + 加载态。番茄完成写记录用 fire-and-forget（`.catch` 兜底），不阻塞 UI 反馈。判别口诀「IndexedDB 全异步，渲染期不读，写记录 fire-and-forget」。

4. **localStorage 同步阻塞 + 容量小——只存小量偏好，禁存番茄记录**——localStorage 同步 API 会阻塞主线程，且容量 5-10MB。番茄记录随时间无限增长会撑爆。**定论**：localStorage 仅存计时态（PersistedTimerState 单 key）+ 外观偏好 + 设置 + 首启动标记；番茄记录 / 任务 / 预设全进 IndexedDB。判别口诀「localStorage 存偏好态，流水数据进 IndexedDB」。

5. **`backdrop-filter` 性能开销——低端设备降级扁平**——`backdrop-filter: blur()` 在低端设备 / 大面积使用时掉帧。**定论**：`MaterialBox` 封装统一处理，监听 `prefers-reduced-motion` + 低端设备检测（`navigator.hardwareConcurrency ≤ 4` / `deviceMemory ≤ 4`）降级为扁平。毛玻璃仅用于小面积卡片，禁全屏铺；Flat 靠 `box-shadow` + `1px border` 保层级。判别口诀「backdrop-filter 小面积用，低端降级扁平」。

6. **Wake Lock API 兼容性——不支持的浏览器静默降级**——Wake Lock API 仅 Chrome 84+ / Safari 16.4+ 支持。**定论**：调用前 `if ('wakeLock' in navigator)` 检测，不支持则静默跳过，不报错不阻塞。番茄结束时释放，页面可见性变化时重新请求（wakeLock 会在切后台时自动释放）。判别口诀「Wake Lock 检测后用，不支持静默降级」。

7. **PWA 安装提示——`beforeinstallprompt` 必须捕获自定义按钮**——浏览器自动弹安装提示体验差且时机不可控。**定论**：`beforeinstallprompt` 事件 `e.preventDefault()` 阻止默认提示 + 缓存事件对象，自定义「安装到桌面」按钮点击时 `e.prompt()`。iOS Safari 不支持 `beforeinstallprompt`，需检测 `navigator.standalone` + 手动引导「分享 → 添加到主屏」。判别口诀「beforeinstallprompt 捕获 + 自定义按钮，iOS 手动引导」。

8. **iOS Safari PWA 限制——后台杀进程最快，通知需 iOS 16.4+**——iOS Safari 安装的 PWA 后台存活时间极短（秒级），切后台即可能被杀。**定论**：iOS 不依赖后台计时，纯靠回前台校准；Web Notification 仅 iOS 16.4+ 支持，低版本 iOS 无通知，用页面内提示音 + 振动兜底。判别口诀「iOS 后台必杀，靠回前台校准，通知看版本」。

9. **键盘快捷键冲突——禁劫持浏览器/系统快捷键**——Web 版键盘优先是优势，但劫持 Ctrl+N / Ctrl+T 等浏览器快捷键会被用户反感。**定论**：仅用单字母 + 空格 + Esc（无 Ctrl/Cmd 修饰），输入框聚焦时禁用快捷键（`e.target.tagName !== 'INPUT'`）。判别口诀「快捷键单字母无修饰，输入框聚焦时禁用」。

10. **数据迁移——导出 JSON schemaVersion 必须向下兼容**——应用升级后旧导出 JSON 仍需可导入。**定论**：导入向下兼容最近 2 个大版本，遇旧 `schemaVersion` 自动跑 migration；不支持跨大版本逆向导出。bump `schemaVersion` 必须同步维护迁移函数。判别口诀「导出 JSON 向下兼容 2 版，bump schema 必带 migration」。

11. **`<button>` 内 `absolute` 子元素必须显式 `left`/`right`——禁只设 `top` 靠 translate 定位**——`<button>` UA 样式自带 `text-align: center`，未设 `left`/`right` 的 absolute 子元素按「static position」渲染时会被推到水平居中（约 `(buttonW − childW) / 2`），之后再叠加 `translate-x-*` 会从中心起算而非从左边。**典型现象**：自定义 switch（关闭态看上去贴在右端、再点开按下滑块直接溢出右边框）。**定论**：absolute thumb 必须 `left-0.5 top-0.5`（或显式 `right-*`）锚定起始位置，再用 `translate-x-0` / `translate-x-5` 做位移；禁省略 `left` 而靠 translate 兜底定位。同理适用任何 `<button>`/`<a>` 内带 absolute 浮层的组件（badge、tooltip 钉、状态点）。**边界澄清**：父级是 `flex items-center` / `grid place-items-center` 的容器时，absolute 子项 static 位置由 CSS spec 显式定义为「居中」，**不依赖 UA**，可以安全省略 `left`；只有 `<button>` / `<a>` / 父级 `text-center` 这类靠 `text-align: center` 隐式居中的场景才必须显式 `left`。判别口诀「button 里 absolute 必带 left/right，translate 只做位移；flex/grid 居中的 absolute 子项 spec 保证安全」。

12. **Flex 行内的固定尺寸控件必须 `shrink-0`——禁裸放右侧开关/图标按钮**——`flex` 容器默认 `flex-shrink: 1`，当 flex-1 文字区内容变长时，旁边的固定宽度子项（开关 `w-11`、图标按钮 `w-8`、segment 控件）会被均匀压缩。开关被压扁后内部 absolute thumb 仍按原 translate 渲染 → 溢出错位；图标按钮被压扁后图标也会变形。**定论**:右侧任何「视觉上必须保持固定尺寸」的 flex 子项（switch / icon button / segment / chip 组）一律加 `shrink-0`，让 flex 只压缩文字 flex-1 区。判别口诀「flex 行内固定尺寸子项必 shrink-0，能压的只能是 flex-1 文字」。

13. **路由内 `overflow-auto` 容器必须 `scrollbar-gutter: stable`——禁裸滚动条挤压宽度**——切 Tab 时新页面内容长度不同，垂直滚动条按需出现/消失，会令滚动容器可用宽变 ~15px，内部 `mx-auto` 居中元素被重新算坐标 → 视觉上「页面切换动画结束后整体内容向右一抖」。**定论**：`<main>` / 任何承载路由 Outlet 的 overflow-auto 容器必须加 `[scrollbar-gutter:stable]`，永久保留滚动条槽位，宽度恒定。代价是无滚动条页面右侧会多 ~15px 空白槽，比横跳更可接受。判别口诀「路由滚动容器必 stable，杜绝切页横跳」。

14. **`<AnimatePresence mode="wait">` 必须配 `useOutlet()`——禁直接套 `<Outlet />`**——`<Outlet />` 是实时占位（路由一变立刻显示新页），而 `<AnimatePresence mode="wait">` 会等旧 `motion.div` 的 exit 完成才挂新元素，节奏错开 → 视觉上「新内容闪一下 → 旧框架 fade out → 中间一瞬空 → 新框架 fade in」，再次点同一 Tab 还会复现空白。**定论**：用 `useOutlet()` 拿当前 location 对应的 element 快照（stable ref），AnimatePresence 才能正确把旧 element 留到 exit 完成、再挂新 element 入场。`motion.div` 的 `key` 走 `location.pathname`：同路径再点（NavLink replay）key 不变，不触发 exit/enter，无闪烁。判别口诀「AnimatePresence + 路由动画用 useOutlet，Outlet 是定时炸弹」。

## 共通铁律（摘要）

- **计时用 `Date.now()` 算剩余，禁 setInterval 累加**
- **状态变更立即持久化**
- **冷启动必恢复**（从 localStorage 读 PersistedTimerState 重算）
- **任务锁定**：Working/Paused 后 taskId 不可改
- **长列表虚拟滚动**：>20 项 react-window
- **Token 化**：颜色/间距/动效走 Tailwind config，禁魔法数字
- **数据库平滑升级**：Dexie version + upgrade 逐版本递进，禁 DROP
- **墓碑机制**：`deletedAt` 非空即删除，V1.1 同步优先级高于 updatedAt
- **决策日志只追加不修改**（见维护铁律）
- **想法不进代码**：新点子先写 [11-future-ideas.md](11-future-ideas.md)
