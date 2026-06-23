// WhiteNoiseBar — 白噪音音轨选择 + 音量滑块
// 依 docs/06 V1.1 任务 #2：HomePage 圆环下方水平滚动 chips
//
// 设计要点：
// - 4 组分类显示（雨声 / 自然 / 环境 / 噪音）
// - 当前选中 chip 高亮 + status 反馈（loading/missing/playing）
// - 「关闭」chip = 停止播放
// - 音量滑块仅在有选中音轨时显示
// - 文件缺失（用户没下载）→ chip 灰显 + tooltip 提示

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, X as XIcon, Loader2, AlertCircle } from 'lucide-react'
import { whiteNoiseService, type WhiteNoiseState } from '@/service/WhiteNoiseService'
import { TRACKS, GROUP_LABELS, tracksByGroup, type TrackId } from '@/service/whitenoiseTracks'
import { usePreferencesStore } from '@/store/preferencesStore'
import { pressScale, pressSpring, reducedMotion } from '@/theme/motion'

export function WhiteNoiseBar() {
  const trackId = usePreferencesStore((s) => s.whitenoiseTrack)
  const setTrack = usePreferencesStore((s) => s.setWhitenoiseTrack)
  const volume = usePreferencesStore((s) => s.whitenoiseVolume)
  const setVolume = usePreferencesStore((s) => s.setWhitenoiseVolume)
  // 铁律 #9：reduced-motion 跳按压回弹
  const reduce = useReducedMotion()

  const [serviceState, setServiceState] = useState<WhiteNoiseState>(
    whiteNoiseService.getState(),
  )

  // 订阅 service 状态（loading / missing / playing）
  useEffect(() => {
    const unsub = whiteNoiseService.subscribe(setServiceState)
    // 冷启动：store 持久化了 trackId 但 service 是 idle（浏览器策略需手势才能自动播放），
    // 清掉 store 状态保证 UI 与 service 一致。用户需重新点 chip 启播。
    if (
      usePreferencesStore.getState().whitenoiseTrack !== null &&
      whiteNoiseService.getState().status === 'idle'
    ) {
      usePreferencesStore.setState({ whitenoiseTrack: null })
    }
    return unsub
  }, [])

  const grouped = tracksByGroup()
  const groups: Array<keyof typeof grouped> = ['rain', 'nature', 'urban', 'noise']

  const handleSelect = (id: TrackId) => {
    if (trackId === id) {
      // 再次点击当前音轨 = 关闭
      setTrack(null)
    } else {
      setTrack(id)
    }
  }

  const isPlaying = trackId !== null
  const currentTrack = TRACKS.find((t) => t.id === trackId)
  const isMissing = serviceState.status === 'missing'

  return (
    <div className="flex w-full flex-col gap-md" data-testid="whitenoise-bar">
      {/* 状态条 + 音量（仅有选中音轨时显示） */}
      {isPlaying && currentTrack && (
        <div className="flex items-center gap-md px-md">
          {isMissing ? (
            <AlertCircle size={14} className="text-amber-500" />
          ) : serviceState.status === 'loading' ? (
            <Loader2 size={14} className="animate-spin text-primary" />
          ) : (
            <Volume2 size={14} className="text-primary" />
          )}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {isMissing
              ? `音轨缺失：${currentTrack.name}（请运行 npm run fetch-audio）`
              : serviceState.status === 'loading'
                ? `加载中：${currentTrack.name}`
                : `正在播放：${currentTrack.name}`}
          </span>
          {/* 音量滑块（缺失时禁用） */}
          {!isMissing && (
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              data-testid="whitenoise-volume"
              aria-label="白噪音音量"
              className="ml-auto h-1 w-24 accent-primary"
            />
          )}
          {/* 停止 */}
          <button
            type="button"
            onClick={() => setTrack(null)}
            aria-label="停止白噪音"
            data-testid="btn-whitenoise-stop"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 text-neutral-500 hover:border-primary hover:text-primary dark:border-neutral-700"
          >
            <XIcon size={12} />
          </button>
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
                const selected = trackId === t.id
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    whileTap={reduce ? undefined : pressScale}
                    transition={reduce ? reducedMotion : pressSpring}
                    onClick={() => handleSelect(t.id)}
                    data-testid={`btn-track-${t.id}`}
                    aria-pressed={selected}
                    className={`shrink-0 rounded-full border px-md py-xs text-xs transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
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
