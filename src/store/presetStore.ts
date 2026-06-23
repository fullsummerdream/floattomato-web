// presetStore — 番茄预设状态管理
// 依 docs/06 阶段 3 任务（PresetEditorPage） + 已就绪 PresetDao
import { create } from 'zustand'
import { PresetDao } from '@/service/PresetDao'
import { timerService } from '@/service/TimerService'
import type { PomodoroPreset } from '@/types/TimerTypes'

interface PresetStoreState {
  presets: PomodoroPreset[]
  /** 当前生效预设 id（持久化到 localStorage，独立 key） */
  activeId: string
  loading: boolean
  load: () => Promise<void>
  create: (input: {
    name: string
    workDuration: number
    shortBreak: number
    longBreak: number
    longBreakInterval: number
  }) => Promise<void>
  update: (
    id: string,
    patch: Partial<
      Pick<
        PomodoroPreset,
        'name' | 'workDuration' | 'shortBreak' | 'longBreak' | 'longBreakInterval'
      >
    >,
  ) => Promise<void>
  remove: (id: string) => Promise<void>
  /** 切换生效预设（idle 才生效，已在 service 内拦） */
  setActive: (id: string) => Promise<void>
}

const ACTIVE_KEY = 'floattomato:active-preset'

function loadActiveId(): string {
  return localStorage.getItem(ACTIVE_KEY) ?? 'preset-default'
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export const usePresetStore = create<PresetStoreState>((set, get) => ({
  presets: [],
  activeId: loadActiveId(),
  loading: true,

  load: async () => {
    set({ loading: true })
    const presets = await PresetDao.listAll()
    // 同步 active preset 到 TimerService
    const active = presets.find((p) => p.id === get().activeId) ?? presets[0]
    if (active) {
      timerService.setActivePreset(active)
      set({ activeId: active.id })
    }
    set({ presets, loading: false })
  },

  create: async (input) => {
    await PresetDao.create(input)
    await get().load()
  },

  update: async (id, patch) => {
    await PresetDao.update(id, patch)
    // 若改的是当前生效预设，同步给 service（仅 idle 生效）
    if (id === get().activeId) {
      const updated = await PresetDao.listAll()
      const active = updated.find((p) => p.id === id)
      if (active) timerService.setActivePreset(active)
    }
    await get().load()
  },

  remove: async (id) => {
    await PresetDao.delete(id)
    // 若删的是当前生效预设，回退到默认
    if (id === get().activeId) {
      saveActiveId('preset-default')
      set({ activeId: 'preset-default' })
    }
    await get().load()
  },

  setActive: async (id) => {
    const preset = get().presets.find((p) => p.id === id)
    if (!preset) return
    timerService.setActivePreset(preset)
    saveActiveId(id)
    set({ activeId: id })
  },
}))
