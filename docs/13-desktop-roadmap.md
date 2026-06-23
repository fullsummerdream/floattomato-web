# 13 — 桌面端规划（Desktop Roadmap）

> **状态**：规划期。Web 端 V1.x 完成并稳定后启动。本文档是桌面端的产品 / 技术 / 实施 单一信源。
>
> **决策入口**：[10-decisions-log.md](10-decisions-log.md) 2026-06-23「桌面端纳入路线，独立形态、Web 端稳定后启动」。

---

## 1. 定位与差异化

桌面端**不是 Web 端的套壳**，而是利用桌面环境特有能力的形态扩展。Web 端继续保持"任意浏览器打开即用、纯本地零追踪"的极简定位；桌面端作为 Web 端的**增强形态**存在，二者数据互不相通（沿用 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 云同步决策——纯本地、不互通）。

**桌面端的核心差异化能力**——做 Web 端做不到的事：

1. **音乐番茄钟**（一大卖点）：读取系统媒体控件（SMTC / MPRIS / NowPlaying）的当前播放——歌名、艺人、专辑、封面、进度、播放状态；番茄圆环可叠加封面，番茄结束可向播放器发"暂停"指令。
2. **托盘常驻**：关闭主窗口不退出，托盘图标显示剩余时间，右键菜单快速控制。
3. **全局快捷键**：跨应用快捷键启动 / 暂停 / 跳过，无需切回番茄钟窗口。
4. **真后台精确计时**：脱离浏览器后台节流，桌面进程持续运行，番茄进行中无须依赖可见性校准。
5. **本地通知更稳定**：脱离浏览器通知权限链路，番茄完成的系统通知 100% 触达。
6. **自启动**：开机自启选项。

**Web 端依然做**：所有跨平台核心（计时 / 任务 / 统计 / 热力图 / 外观 / 专注 / 备份 / 引导）。这些功能在桌面端 100% 复用，**不另写一遍**。

---

## 2. 技术选型

**结论：Tauri**。

| 选项 | 是否选 | 理由 |
|---|---|---|
| Tauri | ✅ | Rust 后端，吃 Vite 产物零迁移；安装包 ~5MB；内存 ~30MB；与 React + Vite + TS 现栈无缝接驳 |
| Electron | ❌ | 80MB+ 安装包、150MB+ 内存，对长驻型番茄钟不友好；除非 Tauri 上某 Windows API 跑不通才回退 |
| 浏览器扩展 | ❌ | 沙箱限制读不到其他进程播放信息，与桌面端定位不符 |
| 鸿蒙原生 | 历史方案 | 与本项目脱钩（[10-decisions-log.md](10-decisions-log.md) 2026-06-22 修订），不在本路线 |

**Rust 侧依赖**（Tauri commands）：
- Windows：`windows-rs` crate 调 `Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager`
- macOS：`core-foundation` + `MPNowPlayingInfoCenter`（需评估签名 / 私有 API 风险）
- Linux：D-Bus + MPRIS 协议（`zbus` crate）

**首发只锁定 Windows**，理由见 §5「现实风险」。

---

## 3. 与 Web 端的代码关系

**原则：单仓库 + 平台抽象层**，禁止双 git 分支 / 双 build target（沿用 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 第一条对"双线维护"的红线）。

**目标结构**（启动桌面端时迁移现仓库到此布局）：

```
floattomato/
├── packages/
│   ├── core/           # 纯逻辑：状态机 / Dexie / 业务规则。零 UI、零平台依赖
│   ├── ui/             # React 组件，平台无关
│   └── platform/       # 平台抽象接口 + 双实现
│       ├── index.ts        # 接口：Notification / Storage / MusicSource / WakeLock / Shortcut
│       ├── web.ts          # Web 实现（Notification API / IndexedDB / mediaSession / Wake Lock API / 文档级 keydown）
│       └── desktop.ts      # Desktop 实现（Tauri Command 调 SMTC / Tauri Store / Tauri 全局快捷键）
└── apps/
    ├── web/            # 现在的 floattomato-web，几乎不动
    └── desktop/        # Tauri 壳 + src-tauri/（Rust）
```

**平台抽象接口（设计草案）**：

```ts
export interface MusicSource {
  /** 订阅当前播放变化；Web 端实现返回常量 null 流；桌面端实现接 SMTC */
  subscribe(cb: (info: NowPlaying | null) => void): () => void
  pause(): Promise<void>
  resume(): Promise<void>
}

export interface NowPlaying {
  title: string
  artist: string
  album: string
  thumbnail: string | null  // 封面 base64 / blob URL
  position: number          // 毫秒
  duration: number          // 毫秒
  state: 'playing' | 'paused'
}
```

**UI 层降级**：`if (!nowPlaying) hide('music panel')`——Web 端用户感知不到该功能存在，桌面端用户自然看到。

---

## 4. 音乐番茄钟的具体实现

### 4.1 数据来源（Windows）

**消费 SMTC，不写入 SMTC**。任何接入 SMTC 的播放器都能被读到：

| 播放器 | 是否原生支持 SMTC | 备注 |
|---|---|---|
| Spotify | ✅ | 安装即可读 |
| QQ 音乐 | ⚠️ | 部分版本需配合插件 |
| 网易云音乐 | ❌ → ✅ | 需用户安装 [BetterNCM](https://microblock.cc/betterncm) + [InfinityLink](https://github.com/BetterNCM/InfinityLink) 插件——这是**用户侧前置条件**，不打包到飘悠番茄 |
| Foobar2000 | ✅ | 默认开启 |
| 浏览器内的 YouTube / Bilibili | ✅ | Chrome / Edge 自动接入 SMTC |
| Apple Music for Windows | ✅ | 默认开启 |

**飘悠番茄不打包 InfinityLink 或任何第三方插件**。在帮助文档列出"想听网易云？请装 InfinityLink"作为引导即可。

### 4.2 数据流

```
[第三方播放器] → SMTC → [Tauri Rust 后端订阅] → IPC Event → [React 前端]
                                                              ↓
                                            番茄圆环渲染封面 / 显示歌词条
                                                              ↓
                                  番茄结束 → invoke('pause_smtc') → Rust 调 SMTC → 播放器暂停
```

### 4.3 UI 表现

- **番茄圆环背景**：当前播放封面（高斯模糊 + 暗化），无封面或无音乐时回退到当前主题色径向渐变
- **歌词条**：圆环下方一行，仅显示歌名 + 艺人（不内嵌歌词解析，避免版权 / 复杂度——歌词解析交给播放器本体）
- **番茄结束自动暂停**：默认关，设置页可开启；开启后番茄完成事件触发 `MusicSource.pause()`
- **休息阶段联动**：可选——休息阶段自动恢复播放（同样默认关）

### 4.4 隐私边界

- **不上传任何播放信息**：与 [01-product-vision.md](01-product-vision.md) "纯本地零追踪" 一脉相承
- **不记录播放历史**：仅当前播放在内存中，不入 IndexedDB
- 设置页可一键关闭「读取系统媒体控件」整个功能，开关位于「外观 / 番茄音乐模式」

---

## 5. 现实风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| macOS `MPNowPlayingInfoCenter` 私有 API、签名复杂 | macOS 版上架 App Store 风险 | **首发只发 Windows**，macOS 推到桌面 V1.1 评估 |
| Linux MPRIS 实现碎片化（不同发行版 D-Bus 行为差异） | Linux 版稳定性低 | 桌面 V1.0 不出 Linux 版；社区呼声大再做 |
| BetterNCM 在网易云客户端更新后偶尔失效 | 用户报"读不到网易云" | 文档明示这是用户侧前置条件，**不承诺自动支持网易云** |
| Tauri 上读 Windows SMTC 没有现成 crate，需 `windows-rs` 手写 | 工作量加 1~2 天 | 接受；Rust 侧封装为 `music_source.rs` 单文件 |
| 抽 `packages/platform` 时，现有 Web 代码大量 import 改路径 | 一次性返工 | **不抽**直接动手——见 §6 工作量评估，先在 `apps/web` 原地做 platform 抽象，桌面端启动时再迁 monorepo |
| 用户两端都用，数据不同步 | 用户预期落差 | 沿用 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 决策——不互通；UI 上明示「桌面端与网页端数据本地各自独立」 |

---

## 6. 工作量评估

> 单人全栈估时，含调试。**Web 端 V1.x 稳定上线后**才开工，本表为路线参考，不是当前 sprint。

| 阶段 | 任务 | 估时 |
|---|---|---|
| D0 | Tauri 壳子搭起、Vite 产物接入、Windows 打包跑通 | 0.5 天 |
| D1 | `service/MusicSource.ts` 抽象 + Web 端 stub 实现 | 1 天 |
| D2 | Rust 侧 `windows-rs` 调 SMTC + IPC Event 推送到前端 | 1~2 天 |
| D3 | 番茄圆环叠加封面 UI + 歌词条组件 | 2 天 |
| D4 | 番茄结束自动暂停 + 休息恢复联动 + 设置页开关 | 1 天 |
| D5 | 托盘图标 + 剩余时间显示 + 右键菜单 | 1 天 |
| D6 | 全局快捷键（Tauri `globalShortcut`） | 0.5 天 |
| D7 | 开机自启 + 自动更新（Tauri Updater） | 1 天 |
| D8 | Windows 安装包签名 + 分发渠道（首发 GitHub Release） | 0.5 天 |
| D9 | 帮助文档：BetterNCM 引导、SMTC 兼容播放器清单 | 0.5 天 |

**合计 9~10 天**。中途任何 Rust 侧卡点单独评估，最坏回退到 Electron + Node WinRT 包（保留为 escape hatch，不作首选）。

---

## 7. 启动条件

**必须满足全部**才能开工：

1. ✅ Web 端 V1.0 已上线并跑过至少一轮真实用户使用
2. ✅ Web 端 V1.1（本地体验深化，见 [01-product-vision.md](01-product-vision.md)）已交付
3. ✅ Web 端 V1.2（音频深化 + 番茄日记）已交付——音频生态先在 Web 验证，桌面端复用而非重发明
4. ✅ Web 端 V2.0（高级自定义，含**番茄音乐模式**）已在 Web 上做完前端部分——桌面端只需替换数据源即可

**理由**：桌面端是 Web 端的增强形态，不能在 Web 端尚不完善时开第二战线，重复 2026-06-22 已被脱掉的"双线维护陷阱"。

---

## 8. 不做的

- **桌面端独占功能**：不做 Web 端没有的产品功能（避免 Web 端降级为"免费试用版"——同 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 第二条对云同步的红线）
- **打包第三方插件**：不内嵌 BetterNCM / InfinityLink / 任何破解版客户端，仅在文档引导
- **写入 SMTC**：飘悠番茄是**消费者**，不是**生产者**——不向 SMTC 暴露"飘悠番茄正在播 XXX"（番茄钟没在播音乐，没意义）
- **跨设备同步**：本身就在 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 第二条排除
- **mobile 端原生壳**：不做 React Native / Capacitor 移动壳，PWA 已经满足移动用户

---

## 9. 与产品愿景路线的关系

| 版本 | 形态 | 桌面端关系 |
|---|---|---|
| Web V1.0 ~ V1.2 | Web / PWA | 桌面端不开工 |
| Web V2.0 | Web / PWA（含"番茄音乐模式"前端） | 桌面端启动条件之一 |
| **Desktop V1.0** | Tauri Windows | 利用 SMTC 让番茄音乐模式真正可用；其余功能复用 Web V2.0 |
| Desktop V1.1 | Tauri Windows + macOS | macOS 评估通过后追加 |
| Web V2.x | Web + 同步插件 | 桌面端不参与同步——保持本地纯净（开放讨论） |
| Desktop V1.x | 持续优化 | 跟随 Web 端版本节奏，UI / 业务变更同步合并到 monorepo |

---

## 10. 沉淀来源

- 2026-06-23 与用户的桌面端可行性讨论：选 Tauri、首发 Windows、复用 Web V2.0、不打包第三方插件
- 信息源分析（[10-decisions-log.md](10-decisions-log.md) 2026-06-23 桌面端条目）：InfinityLink 是 BetterNCM 插件，向 SMTC 写入网易云播放信息；飘悠番茄消费 SMTC 即可读到任何接入 SMTC 的播放器
- 与现有路线的衔接（[01-product-vision.md](01-product-vision.md) V2.0「番茄音乐模式」）：原文已写"V1.2 频谱能力的延伸"，本文档把它具体化为桌面端形态
