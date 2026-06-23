// DatabaseService — Dexie / IndexedDB 封装
// 依 docs/04-data-model.md Dexie Schema + docs/07 铁律（异步、墓碑、平滑升级）
import Dexie, { type Table } from 'dexie'
import type {
  Task,
  PomodoroSession,
  PomodoroPreset,
} from '@/types/TimerTypes'
import { DEFAULT_PRESET } from '@/service/presetConstants'

export { DEFAULT_PRESET }

class FloatTomatoDB extends Dexie {
  tasks!: Table<Task, string>
  sessions!: Table<PomodoroSession, string>
  presets!: Table<PomodoroPreset, string>

  constructor() {
    super('floattomato')
    // V1.0 起始 schema — 依 04 文档索引设计
    this.version(1).stores({
      tasks: 'id, uid, archived, updatedAt, deletedAt, syncStatus',
      sessions:
        'id, uid, taskId, startAt, status, updatedAt, deletedAt, syncStatus',
      presets: 'id, uid, isDefault, updatedAt, syncStatus',
    })
  }
}

export const db = new FloatTomatoDB()

/** 首次启动初始化默认预设（幂等） */
export async function ensureDefaultPreset(): Promise<void> {
  const existing = await db.presets.get(DEFAULT_PRESET.id)
  if (!existing) {
    const now = Date.now()
    await db.presets.put({ ...DEFAULT_PRESET, createdAt: now, updatedAt: now })
  }
}

/** 生成 UUID（时间戳前缀 + crypto.randomUUID，分布式不冲突） */
export function genId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`
}
