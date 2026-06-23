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
```

**说明**：
- 所有表从 V1.0 起带 `updatedAt` / `deletedAt` / `syncStatus`，为 V1.1 云同步预留
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

  constructor() {
    super('floattomato')
    this.version(1).stores({
      tasks: 'id, uid, archived, updatedAt, deletedAt, syncStatus',
      sessions: 'id, uid, taskId, startAt, status, updatedAt, deletedAt, syncStatus',
      presets: 'id, uid, isDefault, updatedAt, syncStatus'
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

**版本迁移**：Dexie `version(N).stores(...).upgrade(...)`，逐版本递进（铁律 3）。V1.0 起始 version(1)，未来加字段 bump version + upgrade 函数。

---

## 数据备份与迁移

**导出格式**（应用自有 schemaVersion）：
```typescript
interface ExportPayload {
  app: 'FloatTomato'
  version: string              // '1.0'
  exportedAt: number
  schemaVersion: 1
  tasks: Task[]
  sessions: PomodoroSession[]
  presets: PomodoroPreset[]
  appearance: AppearanceSnapshot
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

## localStorage 键名规范

| key | 内容 | 类型 |
|---|---|---|
| `floattomato:timer_state` | PersistedTimerState JSON | string |
| `floattomato:appearance` | AppearanceProfile 7 字段 | string |
| `floattomato:settings` | Settings | string |
| `floattomato:has_seen_onboarding` | 首启动标记 | 'true'/'false' |

**前缀 `floattomato:`** 避免与其他应用冲突。封装 `PersistenceService` 统一读写，禁散写 `localStorage.getItem`。
