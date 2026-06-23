// 计时预设常量 — 单一信源
// TimerService（纯逻辑）与 DatabaseService（入库）共享，避免双源不一致
import type { PomodoroPreset } from '@/types/TimerTypes'

/** 默认预设：经典番茄 25/5/15/4 */
export const DEFAULT_PRESET: PomodoroPreset = {
  id: 'preset-default',
  uid: 'local',
  name: '经典番茄',
  workDuration: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  longBreakInterval: 4,
  isDefault: true,
  createdAt: 0,
  updatedAt: 0,
  syncStatus: 'local',
}
