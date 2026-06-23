// PresetDao — 预设方案 CRUD
// 依 docs/04-data-model.md（presets 表）
// 阶段 2 仅提供数据层；PresetEditorPage UI 留阶段 3
import { db, genId, DEFAULT_PRESET } from './DatabaseService'
import type { PomodoroPreset } from '@/types/TimerTypes'

const NOW = () => Date.now()

export const PresetDao = {
  /** 新建预设 */
  async create(input: {
    name: string
    workDuration: number
    shortBreak: number
    longBreak: number
    longBreakInterval: number
  }): Promise<PomodoroPreset> {
    const now = NOW()
    const preset: PomodoroPreset = {
      id: genId(),
      uid: 'local',
      name: input.name,
      workDuration: input.workDuration,
      shortBreak: input.shortBreak,
      longBreak: input.longBreak,
      longBreakInterval: input.longBreakInterval,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'local',
    }
    await db.presets.put(preset)
    return preset
  },

  /** 更新预设 */
  async update(
    id: string,
    patch: Partial<
      Pick<
        PomodoroPreset,
        | 'name'
        | 'workDuration'
        | 'shortBreak'
        | 'longBreak'
        | 'longBreakInterval'
        | 'isDefault'
      >
    >,
  ): Promise<void> {
    const preset = await db.presets.get(id)
    if (!preset) return
    await db.presets.put({ ...preset, ...patch, updatedAt: NOW() })
  },

  /** 删除预设（默认预设不可删） */
  async delete(id: string): Promise<void> {
    const preset = await db.presets.get(id)
    if (!preset || preset.isDefault) return
    await db.presets.delete(id)
  },

  /** 查全部预设 */
  async listAll(): Promise<PomodoroPreset[]> {
    const all = await db.presets.toArray()
    return all.sort((a, b) => {
      // 默认预设置顶，其余按 updatedAt 倒序
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return b.updatedAt - a.updatedAt
    })
  },

  /** 取默认预设 */
  async getDefault(): Promise<PomodoroPreset> {
    const preset = await db.presets.get(DEFAULT_PRESET.id)
    return preset ?? DEFAULT_PRESET
  },
}
