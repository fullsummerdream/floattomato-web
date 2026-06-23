// PersistenceService — localStorage 封装（计时态 + 偏好）
// 依 docs/04-data-model.md localStorage 键名规范 + docs/07 铁律 4
// 封装统一读写，禁散写 localStorage.getItem
import type { PersistedTimerState } from '@/types/TimerTypes'

const KEY_TIMER = 'floattomato:timer_state'
const KEY_SETTINGS = 'floattomato:settings'
const KEY_ONBOARDING = 'floattomato:has_seen_onboarding'

/** 安全读 JSON（解析失败返回 null，不抛） */
function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 安全写 JSON（静默失败，不阻塞主线程） */
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 容量满或隐私模式 — 静默降级，不阻塞计时
  }
}

export const PersistenceService = {
  // 计时态
  loadTimerState(): PersistedTimerState | null {
    return readJSON<PersistedTimerState>(KEY_TIMER)
  },
  saveTimerState(state: PersistedTimerState) {
    writeJSON(KEY_TIMER, state)
  },
  clearTimerState() {
    try {
      localStorage.removeItem(KEY_TIMER)
    } catch {
      /* noop */
    }
  },

  // 首启动标记
  hasSeenOnboarding(): boolean {
    return readJSON<boolean>(KEY_ONBOARDING) === true
  },
  markOnboardingSeen() {
    writeJSON(KEY_ONBOARDING, true)
  },

  // 外观/设置（阶段 0 已用 zustand persist 存 appearance，此处仅留接口）
  loadSettings<T>(): T | null {
    return readJSON<T>(KEY_SETTINGS)
  },
  saveSettings<T>(value: T) {
    writeJSON(KEY_SETTINGS, value)
  },
}
