// 偏好行为状态 — 音效音量 / 振动 / 暂停限时 / 白噪音
// 与外观分离：appearanceStore = 视觉，preferencesStore = 行为
// 持久化 localStorage key: floattomato:preferences
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audioService, type VolumeLevel } from '@/service/AudioService'
import { timerService } from '@/service/TimerService'
import { whiteNoiseService } from '@/service/WhiteNoiseService'
import type { TrackId } from '@/service/whitenoiseTracks'

/** 暂停限时档位（秒） */
export const PAUSE_LIMIT_OPTIONS = [30, 60, 180, 300, 0] as const
/** 0 = 不限时 */
export type PauseLimitSeconds = (typeof PAUSE_LIMIT_OPTIONS)[number]

export interface PreferencesState {
  /** 音量档位 0=静音 1=低 2=中 3=高 */
  volume: VolumeLevel
  /** 振动开关（移动端 Android） */
  vibrateEnabled: boolean
  /** 暂停限时（秒，0 = 不限） */
  pauseLimit: PauseLimitSeconds
  /** 白噪音音量 0-100（与提示音独立） */
  whitenoiseVolume: number
  /** 上次选中的白噪音音轨（持久化；刷新后 UI 显示选中态，但不自动播放：浏览器策略需手势） */
  whitenoiseTrack: TrackId | null
  /** 成就反馈开关（V1.1 #4）— 关后不评估、不弹 toast；成就墙仍可查阅 */
  achievementsEnabled: boolean
  setVolume: (v: VolumeLevel) => void
  setVibrate: (on: boolean) => void
  setPauseLimit: (s: PauseLimitSeconds) => void
  setWhitenoiseVolume: (v: number) => void
  setWhitenoiseTrack: (id: TrackId | null) => void
  setAchievementsEnabled: (on: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      volume: 2,
      vibrateEnabled: true,
      pauseLimit: 300,
      whitenoiseVolume: 60,
      whitenoiseTrack: null,
      achievementsEnabled: true,
      setVolume: (volume) => {
        audioService.volume = volume
        set({ volume })
      },
      setVibrate: (on) => {
        audioService.vibrateEnabled = on
        set({ vibrateEnabled: on })
      },
      setPauseLimit: (pauseLimit) => {
        timerService.pauseLimit = pauseLimit
        timerService.pauseLimitUnlimited = pauseLimit === 0
        set({ pauseLimit })
      },
      setWhitenoiseVolume: (v) => {
        whiteNoiseService.setVolume(v)
        set({ whitenoiseVolume: v })
      },
      setWhitenoiseTrack: (id) => {
        whiteNoiseService.setTrack(id)
        set({ whitenoiseTrack: id })
      },
      setAchievementsEnabled: (on) => set({ achievementsEnabled: on }),
    }),
    {
      name: 'floattomato:preferences',
      // hydration 后把值灌进 service 单例（不自动播放：浏览器策略需用户手势）
      onRehydrateStorage: () => (state) => {
        if (!state) return
        audioService.volume = state.volume
        audioService.vibrateEnabled = state.vibrateEnabled
        timerService.pauseLimit = state.pauseLimit
        timerService.pauseLimitUnlimited = state.pauseLimit === 0
        whiteNoiseService.setVolume(state.whitenoiseVolume)
      },
    },
  ),
)

/** 暂停限时档位中文标签 */
export const PAUSE_LIMIT_LABELS: Record<PauseLimitSeconds, string> = {
  30: '30 秒',
  60: '1 分钟',
  180: '3 分钟',
  300: '5 分钟',
  0: '不限',
}

/** 音量档位中文标签 */
export const VOLUME_LABELS: Record<VolumeLevel, string> = {
  0: '静音',
  1: '低',
  2: '中',
  3: '高',
}
