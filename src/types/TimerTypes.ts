// 计时类型定义 — 依 docs/04-data-model.md
// 状态机单一信源，禁散写相位/状态字面量

/** 计时相位（状态机的 5 个状态） */
export type TimerPhase =
  | 'idle' // 空闲
  | 'working' // 工作中
  | 'paused' // 暂停（仅 Working 可暂停）
  | 'shortBreak' // 短休息
  | 'longBreak' // 长休息

/** 番茄记录状态 */
export type SessionStatus = 'completed' | 'interrupted' | 'abandoned'

/** 计时状态持久化（localStorage 单 key JSON） */
export interface PersistedTimerState {
  phase: TimerPhase
  startAt: number
  pauseStartedAt: number | null
  accumulatedPause: number
  roundCount: number
  presetId: string
  taskId: string | null
  /** 当前阶段总时长（秒，校准用） */
  totalSeconds: number
  updatedAt: number
}

/** 运行时派生态（不持久化，由 Date.now() 实时算） */
export interface TimerRuntimeState {
  phase: TimerPhase
  /** 当前阶段剩余秒数 */
  remaining: number
  /** 当前阶段总秒数 */
  totalSeconds: number
  roundCount: number
  taskId: string | null
  presetId: string
  /** 进度 0-1（已用 / 总） */
  progress: number
}

/** 番茄预设 */
export interface PomodoroPreset {
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

/** 番茄记录（阶段 2 入库，阶段 1 仅在内存流转） */
export interface PomodoroSession {
  id: string
  uid: string
  taskId: string | null
  startAt: number
  endAt: number
  plannedDuration: number
  actualDuration: number
  pausedDuration: number
  status: SessionStatus
  presetId: string | null
  note: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  syncStatus: 'local' | 'syncing' | 'synced'
}

/** 任务（阶段 2 入库） */
export interface Task {
  id: string
  uid: string
  name: string
  color: string
  archived: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  syncStatus: 'local' | 'syncing' | 'synced'
}
