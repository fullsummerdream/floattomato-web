// 偏好行为状态 — 音效音量 / 振动 / 暂停限时 / 白噪音混音
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

/** 番茄日记触发模式（V1.2 #1）
 *  - modal：完成番茄后立即弹模态（阻塞短休息开始）
 *  - card：进入短休息后角落浮卡（非阻塞，默认）
 *  - off：A 和 B 都不触发；时间线补写永远可用（C 不受此控制）
 */
export type DiaryTriggerMode = 'modal' | 'card' | 'off'

/** 白噪音混音轨条目（V1.2 #3） — 多轨同时播 + 独立音量 */
export interface MixEntry {
  trackId: TrackId
  /** per-track 音量 0-100，独立于 master */
  volume: number
}

/** 同时混音上限（移动端 slider 列表过长 + 电量/CPU 考虑） */
export const MAX_MIX_TRACKS = 3

export interface PreferencesState {
  /** 音量档位 0=静音 1=低 2=中 3=高 */
  volume: VolumeLevel
  /** 振动开关（移动端 Android） */
  vibrateEnabled: boolean
  /** 暂停限时（秒，0 = 不限） */
  pauseLimit: PauseLimitSeconds
  /** 白噪音 master 总音量 0-100（旧字段名沿用，向后兼容 persist） */
  whitenoiseVolume: number
  /** V1.2 #3 — 混音轨列表（持久化；刷新后 UI 显示选中态，但不自动播放：浏览器策略需手势） */
  whitenoiseMix: MixEntry[]
  /** 成就反馈开关（V1.1 #4）— 关后不评估、不弹 toast；成就墙仍可查阅 */
  achievementsEnabled: boolean
  /** 番茄日记触发模式（V1.2 #1）— 默认 card；off 仅关 A/B，C 时间线补写永远可用 */
  diaryTriggerMode: DiaryTriggerMode
  setVolume: (v: VolumeLevel) => void
  setVibrate: (on: boolean) => void
  setPauseLimit: (s: PauseLimitSeconds) => void
  setWhitenoiseVolume: (v: number) => void
  /** 加入一轨到 mix（已达上限或已存在则 no-op） */
  addWhitenoiseTrack: (id: TrackId) => void
  /** 从 mix 移除一轨 */
  removeWhitenoiseTrack: (id: TrackId) => void
  /** 切某轨独立音量 */
  setWhitenoiseTrackVolume: (id: TrackId, volume: number) => void
  /** 全清 */
  clearWhitenoiseMix: () => void
  setAchievementsEnabled: (on: boolean) => void
  setDiaryTriggerMode: (m: DiaryTriggerMode) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      volume: 2,
      vibrateEnabled: true,
      pauseLimit: 300,
      whitenoiseVolume: 60,
      whitenoiseMix: [],
      achievementsEnabled: true,
      diaryTriggerMode: 'card',
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
        whiteNoiseService.setMasterVolume(v)
        set({ whitenoiseVolume: v })
      },
      addWhitenoiseTrack: (id) => {
        const mix = get().whitenoiseMix
        if (mix.some((m) => m.trackId === id)) return
        if (mix.length >= MAX_MIX_TRACKS) return
        const initialVolume = 80
        whiteNoiseService.addTrack(id, initialVolume)
        set({ whitenoiseMix: [...mix, { trackId: id, volume: initialVolume }] })
      },
      removeWhitenoiseTrack: (id) => {
        whiteNoiseService.removeTrack(id)
        set({ whitenoiseMix: get().whitenoiseMix.filter((m) => m.trackId !== id) })
      },
      setWhitenoiseTrackVolume: (id, volume) => {
        const v = Math.max(0, Math.min(100, volume))
        whiteNoiseService.setTrackVolume(id, v)
        set({
          whitenoiseMix: get().whitenoiseMix.map((m) =>
            m.trackId === id ? { ...m, volume: v } : m,
          ),
        })
      },
      clearWhitenoiseMix: () => {
        whiteNoiseService.clearMix()
        set({ whitenoiseMix: [] })
      },
      setAchievementsEnabled: (on) => set({ achievementsEnabled: on }),
      setDiaryTriggerMode: (m) => set({ diaryTriggerMode: m }),
    }),
    {
      name: 'floattomato:preferences',
      version: 1,
      // v0 → v1：单轨 whitenoiseTrack: TrackId | null → 多轨 whitenoiseMix: MixEntry[]
      // 旧用户数据：把 whitenoiseTrack 转成 mix 单元素；丢弃旧字段
      migrate: (persistedState, fromVersion) => {
        const s = (persistedState ?? {}) as Record<string, unknown> & {
          whitenoiseTrack?: TrackId | null
          whitenoiseMix?: MixEntry[]
        }
        if (fromVersion < 1 && !s.whitenoiseMix) {
          const old = s.whitenoiseTrack ?? null
          const oldVol = typeof s.whitenoiseVolume === 'number' ? s.whitenoiseVolume : 60
          s.whitenoiseMix = old ? [{ trackId: old, volume: oldVol }] : []
          delete s.whitenoiseTrack
        }
        return s as unknown as PreferencesState
      },
      // hydration 后把值灌进 service 单例
      // 不自动恢复 mix：浏览器自动播放策略需用户手势，硬启会被 reject
      // mix 保持持久化态供 UI 显示（选中 chip），用户重新点 chip 触发播放
      onRehydrateStorage: () => (state) => {
        if (!state) return
        audioService.volume = state.volume
        audioService.vibrateEnabled = state.vibrateEnabled
        timerService.pauseLimit = state.pauseLimit
        timerService.pauseLimitUnlimited = state.pauseLimit === 0
        whiteNoiseService.setMasterVolume(state.whitenoiseVolume)
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
