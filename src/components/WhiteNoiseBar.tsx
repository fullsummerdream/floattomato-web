// WhiteNoiseBar — 白噪音 chips（V1.2 #3 多轨混音）
// 依 docs/06 V1.2 #3：4 组分类 chip 多选 / 上限 3 / 每轨独立音量 / master 总音量
//
// 设计要点：
// - chip = toggle（已选再点 = 移除）
// - 状态条：每条激活轨一行 mini volume slider；底部 master 总音量
// - 达到上限（3）后未选 chip 灰显不可点
// - missing/loading 状态在该轨行显示对应 icon
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, X as XIcon, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import {
  whiteNoiseService,
  type WhiteNoiseState,
} from '@/service/WhiteNoiseService'
import { TRACKS, GROUP_LABELS, tracksByGroup, type TrackId } from '@/service/whitenoiseTracks'
import { usePreferencesStore, MAX_MIX_TRACKS } from '@/store/preferencesStore'
import { pressScale, pressSpring, reducedMotion } from '@/theme/motion'

export function WhiteNoiseBar() {
  const mix = usePreferencesStore((s) => s.whitenoiseMix)
  const addTrack = usePreferencesStore((s) => s.addWhitenoiseTrack)
  const removeTrack = usePreferencesStore((s) => s.removeWhitenoiseTrack)
  const setTrackVolume = usePreferencesStore((s) => s.setWhitenoiseTrackVolume)
  const clearMix = usePreferencesStore((s) => s.clearWhitenoiseMix)
  const masterVolume = usePreferencesStore((s) => s.whitenoiseVolume)
  const setMasterVolume = usePreferencesStore((s) => s.setWhitenoiseVolume)
  // 铁律 #9：reduced-motion 跳按压回弹
  const reduce = useReducedMotion()

  const [serviceState, setServiceState] = useState<WhiteNoiseState>(
    whiteNoiseService.getState(),
  )

  // 订阅 service 状态（loading / missing / playing）
  useEffect(() => {
    const unsub = whiteNoiseService.subscribe(setServiceState)
    // 冷启动：store 持久化了 mix 但 service 是空（浏览器策略需手势才能 AudioContext.resume），
    // 清掉 store 的 mix 保持 UI 与 service 一致。用户需重新点 chip 启播。
    if (
      usePreferencesStore.getState().whitenoiseMix.length > 0 &&
      whiteNoiseService.getState().mix.length === 0
    ) {
      usePreferencesStore.setState({ whitenoiseMix: [] })
    }
    return unsub
  }, [])

  const grouped = tracksByGroup()
  const groups: Array<keyof typeof grouped> = ['rain', 'nature', 'urban', 'noise']

  const mixSet = new Set(mix.map((m) => m.trackId))
  const atLimit = mix.length >= MAX_MIX_TRACKS
  const hasAny = mix.length > 0

  const handleToggle = (id: TrackId) => {
    if (mixSet.has(id)) {
      removeTrack(id)
    } else if (!atLimit) {
      addTrack(id)
    }
    // 已达上限时点未选 chip = no-op（视觉上 chip 灰显有提示）
  }

  /** service 端某轨的实时状态（loading/playing/missing） */
  const serviceStatusOf = (id: TrackId) =>
    serviceState.mix.find((m) => m.trackId === id)?.status

  return (
    <div className="flex w-full flex-col gap-md" data-testid="whitenoise-bar">
      {/* 状态条 + 混音轨列表 + master 音量（仅有激活轨时显示） */}
      {hasAny && (
        <div className="flex flex-col gap-xs px-md">
          {mix.map((entry) => {
            const track = TRACKS.find((t) => t.id === entry.trackId)
            if (!track) return null
            const st = serviceStatusOf(entry.trackId)
            const isMissing = st === 'missing'
            const isLoading = st === 'loading'
            return (
              <div
                key={entry.trackId}
                data-testid={`mix-row-${entry.trackId}`}
                className="flex items-center gap-sm"
              >
                {isMissing ? (
                  <AlertCircle size={14} className="shrink-0 text-amber-500" />
                ) : isLoading ? (
                  <Loader2 size={14} className="shrink-0 animate-spin text-primary" />
                ) : (
                  <Volume2 size={14} className="shrink-0 text-primary" />
                )}
                <span className="w-16 shrink-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {track.name}
                </span>
                {/* 缺失态：占位提示，禁滑块 */}
                {isMissing ? (
                  <span className="flex-1 text-xs text-amber-500">
                    音轨缺失，请运行 npm run fetch-audio
                  </span>
                ) : (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={entry.volume}
                    onChange={(e) =>
                      setTrackVolume(entry.trackId, Number(e.target.value))
                    }
                    data-testid={`mix-volume-${entry.trackId}`}
                    aria-label={`${track.name} 音量`}
                    className="h-1 flex-1 accent-primary"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeTrack(entry.trackId)}
                  aria-label={`移除 ${track.name}`}
                  data-testid={`btn-remove-${entry.trackId}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-danger dark:hover:bg-neutral-800"
                >
                  <XIcon size={12} />
                </button>
              </div>
            )
          })}
          {/* master 总音量 + 全清 */}
          <div className="mt-xs flex items-center gap-sm border-t border-neutral-100 pt-xs dark:border-neutral-800">
            <Volume2 size={14} className="shrink-0 text-neutral-400" />
            <span className="w-16 shrink-0 text-xs text-neutral-400">总音量</span>
            <input
              type="range"
              min={0}
              max={100}
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              data-testid="whitenoise-master-volume"
              aria-label="白噪音总音量"
              className="h-1 flex-1 accent-primary"
            />
            <button
              type="button"
              onClick={clearMix}
              aria-label="清空混音"
              data-testid="btn-whitenoise-clear"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 hover:border-primary hover:text-primary dark:border-neutral-700"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      {/* 分组 chips —— 水平滚动 */}
      <div
        className="flex w-full gap-md overflow-x-auto pb-xs"
        data-testid="whitenoise-groups"
        style={{ scrollbarWidth: 'thin' }}
      >
        {groups.map((g) => (
          <div key={g} className="flex shrink-0 flex-col gap-xs">
            <span className="px-xs text-xs text-neutral-400">{GROUP_LABELS[g]}</span>
            <div className="flex gap-xs">
              {grouped[g].map((t) => {
                const selected = mixSet.has(t.id)
                const disabled = !selected && atLimit
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={reduce || disabled ? undefined : pressScale}
                    transition={reduce ? reducedMotion : pressSpring}
                    onClick={() => handleToggle(t.id)}
                    disabled={disabled}
                    data-testid={`btn-track-${t.id}`}
                    aria-pressed={selected}
                    title={disabled ? `已达上限 ${MAX_MIX_TRACKS} 轨` : undefined}
                    className={`shrink-0 rounded-full border px-md py-xs text-xs transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : disabled
                          ? 'border-neutral-200 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600'
                          : 'border-neutral-200 text-neutral-600 hover:border-primary/40 dark:border-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {t.name}
                  </motion.button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
