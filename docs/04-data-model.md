# 04 — 数据模型

> 类型定义 / 字段名 / 业务含义为本项目核心数据契约。导出 JSON 可用于备份与跨设备迁移。

## 存储载体分工

| 数据类型 | 载体 | 说明 |
|---|---|---|
| 番茄记录 / 任务 / 预设 | IndexedDB（Dexie） | 大数据量、结构化 |
| 计时态（运行中） | localStorage | 单 key JSON，高频读写 |
| 外观偏好 | localStorage | 7 个 key |
| 首启动标记 | localStorage | 单 boolean |

**为何 IndexedDB 而非 localStorage 存番茄记录**：localStorage 容量 5-10MB 且同步阻塞，番茄记录随时间无限增长会撑爆；IndexedDB 容量大（数百 MB+）、异步、可索引，适合流水表。

---

## 类型定义

```typescript
interface Task {
  id: string
  uid: string                 // V1.0 全为 'local'
  name: string
  color: string
  archived: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null    // 软删除（墓碑）
  syncStatus: 'local' | 'syncing' | 'synced'
}

interface PomodoroSession {
  id: string
  uid: string
  taskId: string | null
  startAt: number
  endAt: number
  plannedDuration: number     // 秒
  actualDuration: number
  pausedDuration: number      // 累计暂停
  status: 'completed' | 'interrupted' | 'abandoned'
  presetId: string | null
  note: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  syncStatus: 'local' | 'syncing' | 'synced'
}

interface PomodoroPreset {
  id: string
  uid: string
  name: string
  workDuration: number
  shortBreak: number
  longBreak: number
  longBreakInterval: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
  syncStatus: 'local' | 'syncing' | 'synced'
}

interface AppearanceProfile {
  uid: string
  themeId: string
  numberStyle: string
  backgroundType: 'solid' | 'gradient' | 'image'
  backgroundValue: string
  cardCoverId: string
  materialStyle: 'flat' | 'glass' | 'frosted' | 'mica'
  updatedAt: number
  syncStatus: 'local' | 'syncing' | 'synced'
}

// 计时状态持久化（localStorage 单 key JSON）
interface PersistedTimerState {
  phase: 'idle' | 'working' | 'paused' | 'shortBreak' | 'longBreak'
  startAt: number
  pauseStartedAt: number | null
  accumulatedPause: number
  roundCount: number
  presetId: string
  taskId: string | null
  totalSeconds: number        // 当前阶段总时长（校准用）
  updatedAt: number
}

interface Settings {
  uid: string
  pauseLimit: number
  pauseLimitUnlimited: boolean
  keepScreenOn: boolean
  soundEnabled: boolean
  vibrateEnabled: boolean
  fullscreenAntiBurnIn: boolean
  defaultThemeId: string
  updatedAt: number
  syncStatus: 'local' | 'syncing' | 'synced'
}

// V1.1 #4 极克制成就系统 — 解锁记录
// 设计：表中**存在即解锁**，未解锁项不存行（避免 8 条固定枚举与表数据双源）
interface AchievementRecord {
  id: AchievementId           // 主键，固定枚举（见 src/types/AchievementTypes.ts）
  unlockedAt: number          // Date.now() at unlock
}

type AchievementId =
  | 'first-tomato' | 'ten-tomatoes' | 'fifty-tomatoes' | 'hundred-tomatoes'
  | 'focus-hour' | 'focus-day' | 'seven-day-streak' | 'early-bird'
```

**说明**：
- 所有表从 V1.0 起带 `updatedAt` / `deletedAt` / `syncStatus`，为 V2.x 云同步预留
- 所有 ID 用 UUID（时间戳前缀 + `crypto.randomUUID()`），分布式不冲突
- `PersistedTimerState` 含 `totalSeconds`，冷启动校准用

---

## Dexie Schema

```typescript
// src/service/DatabaseService.ts
import Dexie, { Table } from 'dexie'

class FloatTomatoDB extends Dexie {
  tasks!: Table<Task, string>
  sessions!: Table<PomodoroSession, string>
  presets!: Table<PomodoroPreset, string>
  achievements!: Table<AchievementRecord, string>  // V1.1 #4

  constructor() {
    super('floattomato')
    this.version(1).stores({
      tasks: 'id, uid, archived, updatedAt, deletedAt, syncStatus',
      sessions: 'id, uid, taskId, startAt, status, updatedAt, deletedAt, syncStatus',
      presets: 'id, uid, isDefault, updatedAt, syncStatus'
    })
    // V1.1 #4 成就系统 — bump 到 version(2)，新增 achievements 表，无既有数据迁移
    this.version(2).stores({
      achievements: 'id, unlockedAt'
    })
  }
}

const db = new FloatTomatoDB()
```

**索引设计**：
- `sessions.startAt` 索引：热力图按天聚合 + 统计区间查询主力索引
- `sessions.taskId` 索引：任务维度专注分布查询
- `tasks.archived` / `tasks.deletedAt`：任务列表过滤
- 所有表 `updatedAt` / `syncStatus` 索引：V1.1 同步队列查询
- `achievements.id` 主键 + `unlockedAt` 二级索引（按解锁时间排序展示用）

**版本迁移**：Dexie `version(N).stores(...).upgrade(...)`，逐版本递进（铁律 3）。V1.0 起始 version(1)，未来加字段 bump version + upgrade 函数。

---

## 数据备份与迁移

**导出格式**（应用自有 schemaVersion）：
```typescript
interface ExportPayload {
  app: 'FloatTomato'
  version: string              // '1.1'
  exportedAt: number
  schemaVersion: 2             // V1.1 #4 bump 到 2（新增 achievements）
  tasks: Task[]
  sessions: PomodoroSession[]
  presets: PomodoroPreset[]
  appearance: AppearanceSnapshot
  achievements: AchievementRecord[]   // V1.1 #4 — 缺省视为空数组（导入旧版兼容）
}
```

**用途**：本地数据备份、跨设备迁移（导出文件 → 另一台设备导入还原）。

**导入冲突处理（V1.0）**：
- ID 冲突（同 id 不同内容）→ `updatedAt` 大者胜（LWW）
- 同步字段保留，导入数据 `syncStatus = 'local'`
- 导入前弹确认框，显示将导入的任务/记录数，用户确认后执行

### 版本兼容规则

- **导入向下兼容最近 2 个大版本**：遇到旧 `schemaVersion` 自动执行 migration 脚本升级到当前版本
- **不支持跨大版本逆向导出**：如 V2 数据不直接导出为 V1 格式
- bump `schemaVersion` 时必须同步维护 migration 函数（`migrate(fromVersion, payload) → payload`），无 migration 的旧版本导入报错并提示用户升级应用
- migration 只增不删：保留旧字段以支持回退排查，但不写入新逻辑路径

---

## 成就系统（V1.1 #4）

**8 条固定里程碑**：

| id | emoji | 标题 | 解锁条件 | 维度 |
|---|---|---|---|---|
| `first-tomato` | 🍅 | 第一颗番茄 | 累计 `completed` ≥ 1 | 首次 |
| `ten-tomatoes` | 🌱 | 十颗起步 | 累计 `completed` ≥ 10 | 累计 |
| `fifty-tomatoes` | 🌿 | 五十常客 | 累计 `completed` ≥ 50 | 累计 |
| `hundred-tomatoes` | 🌳 | 一百达成 | 累计 `completed` ≥ 100 | 累计 |
| `focus-hour` | ⏱️ | 专注一小时 | 累计 `actualDuration` ≥ 3600s | 时长 |
| `focus-day` | 📚 | 专注 24 小时 | 累计 `actualDuration` ≥ 86400s | 时长 |
| `seven-day-streak` | 🔥 | 七日连续 | 最近 7 个**本地自然日**每天 ≥ 1 个 `completed` | 节奏 |
| `early-bird` | 🌅 | 晨型番茄 | 累计在**本地 08:00 前**完成 ≥ 5 个 `completed` | 习惯彩蛋 |

**时区铁律**（防跨时区/夏令时坑）：
- `byDay` key 必须用**本地时间**生成 `YYYY-MM-DD`，禁用 `toISOString()`（默认走 UTC）
- `early-bird` 用 `new Date(startAt).getHours() < 8`（本地时间）

**评估算法（O(n) 全表扫一遍）**：
1. `SessionDao.queryAll()` 拿全部未删除 sessions
2. 一次循环构建 `SessionSnapshot`：`total / totalSeconds / byDay: Map / earlyMorningCount`
3. 读 `achievements` 表已解锁 id 集合
4. 遍历 8 条 `AchievementDef`：未解锁 + `check(snapshot)` 通过 → 新解锁
5. `bulkPut` 入库 + 返回本次新解锁列表

**幂等 & 并发锁**：
- 已解锁项跳过 check → 跑 N 遍只在首次跨越阈值那次返回非空数组
- `isEvaluating` 类成员标志位防 `async` 期间二次进入

**双触发点**：
- 番茄完成（`'sessionEnd' + status === 'completed'`）→ 评估并弹 toast（若开关开）
- 应用启动 IIFE → 评估**但不弹 toast**（首扫静默，避免开 app 时排队骚扰）

**关闭语义**：
- 设置页开关 `achievementsEnabled` 关闭后：番茄完成时**不评估、不弹 toast**；成就墙入口仍显示（数据是事实，开关只控告知）
- 再次开启会触发一次补扫（重开 = 重新订阅事实通告，应补齐期间已达成项）

**性能升级路径**（后续 V1.x 重构候选，**当前不做**）：
- 当前 O(n) 全表扫，session 在几百-几千量级（< 30ms）无感知
- 用户积累 1 年以上（>5000 条 session）可能出现轻微卡顿
- 升级方向：新建 `statsCache` 表缓存 `total / totalSeconds / 各 byDay 行`，番茄完成时**增量更新**；仅在导入/迁移/异常时全量重算
- 触发条件：用户反馈卡顿 或 profile 发现 evaluate > 50ms

---

## localStorage 键名规范

| key | 内容 | 类型 |
|---|---|---|
| `floattomato:timer_state` | PersistedTimerState JSON | string |
| `floattomato:appearance` | AppearanceProfile 7 字段 | string |
| `floattomato:settings` | Settings | string |
| `floattomato:has_seen_onboarding` | 首启动标记 | 'true'/'false' |

**前缀 `floattomato:`** 避免与其他应用冲突。封装 `PersistenceService` 统一读写，禁散写 `localStorage.getItem`。
