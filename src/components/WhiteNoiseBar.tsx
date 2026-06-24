// WhiteNoiseBar — 白噪音 chips（V1.2 #3 多轨 + V1.2 #4 用户上传）
// 依 docs/06 V1.2 #3 + #4：
// - 4 组内置分类 chip 多选 / 上限 3 / 每轨独立音量 / master 总音量
// - 第 5 组「我的」= IDB userAudios + 「+ 上传」按钮，hover 显示删除
//
// 设计要点：
// - chip = toggle（已选再点 = 移除）
// - 状态条：每条激活轨一行 mini volume slider；底部 master 总音量
// - 达到上限（3）后未选 chip 灰显不可点
// - missing/loading 状态在该轨行显示对应 icon
// - 用户音频删除：硬删 IDB → invalidate buffer → 从 mix 移除（若在）
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Volume2,
  X as XIcon,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
} from 'lucide-react'
import {
  whiteNoiseService,
  type WhiteNoiseState,
} from '@/service/WhiteNoiseService'
import {
  TRACKS,
  GROUP_LABELS,
  tracksByGroup,
  isUserTrack,
  type TrackId,
} from '@/service/whitenoiseTracks'
import { UserAudioDao, UserAudioUploadError } from '@/service/UserAudioDao'
import type { UserAudio } from '@/types/UserAudioTypes'
import {
  USER_AUDIO_MAX_SIZE_LABEL,
  USER_AUDIO_MAX_COUNT,
} from '@/types/UserAudioTypes'
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
  // V1.2 #4 — 我的音频列表
  const [userAudios, setUserAudios] = useState<UserAudio[]>([])
  // 上传错误的 inline 提示（自消 2s）
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // V1.2 #4 — 首次/上传/删除后刷新「我的」列表
  const refreshUserAudios = () => {
    void UserAudioDao.listAll().then(setUserAudios)
  }
  useEffect(() => {
    refreshUserAudios()
  }, [])

  // 上传错误 toast 自消
  useEffect(() => {
    if (!uploadError) return
    const t = window.setTimeout(() => setUploadError(null), 2400)
    return () => window.clearTimeout(t)
  }, [uploadError])

  const grouped = tracksByGroup()
  const groups: Array<keyof typeof grouped> = ['rain', 'nature', 'urban', 'noise']

  const mixSet = new Set(mix.map((m) => m.trackId))
  const atLimit = mix.length >= MAX_MIX_TRACKS
  const hasAny = mix.length > 0
  const atUserAudioLimit = userAudios.length >= USER_AUDIO_MAX_COUNT

  const handleToggle = (id: TrackId) => {
    if (mixSet.has(id)) {
      removeTrack(id)
    } else if (!atLimit) {
      addTrack(id)
    }
    // 已达上限时点未选 chip = no-op
  }

  // V1.2 #4 — 选择文件
  const handlePickFile = () => {
    if (atUserAudioLimit) {
      setUploadError(`最多 ${USER_AUDIO_MAX_COUNT} 条用户音频`)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 立即清 input 值，下次选同名文件也能触发 change
    e.target.value = ''
    if (!file) return
    void UserAudioDao.add(file)
      .then(() => refreshUserAudios())
      .catch((err: unknown) => {
        if (err instanceof UserAudioUploadError) {
          setUploadError(err.message)
        } else {
          setUploadError('上传失败')
        }
      })
  }

  // 删除用户音频：硬删 + invalidate buffer + 从 mix 移除（若在）
  const handleDeleteUser = (id: TrackId) => {
    if (mixSet.has(id)) removeTrack(id)
    whiteNoiseService.invalidateBuffer(id)
    void UserAudioDao.delete(id).then(() => refreshUserAudios())
  }

  /** service 端某轨的实时状态（loading/playing/missing） */
  const serviceStatusOf = (id: TrackId) =>
    serviceState.mix.find((m) => m.trackId === id)?.status

  /** 任意 trackId 的展示名（内置查 TRACKS，user-* 查 userAudios） */
  const nameOf = (id: TrackId): string => {
    if (isUserTrack(id)) {
      return userAudios.find((u) => u.id === id)?.name ?? '我的音频'
    }
    return TRACKS.find((t) => t.id === id)?.name ?? id
  }

  return (
    <div className="flex w-full flex-col gap-md" data-testid="whitenoise-bar">
      {/* 状态条 + 混音轨列表 + master 音量（仅有激活轨时显示） */}
      {hasAny && (
        <div className="flex flex-col gap-xs px-md">
          {mix.map((entry) => {
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
                  {nameOf(entry.trackId)}
                </span>
                {/* 缺失态：占位提示，禁滑块 */}
                {isMissing ? (
                  <span className="flex-1 text-xs text-amber-500">
                    {isUserTrack(entry.trackId)
                      ? '音频数据丢失'
                      : '音轨缺失，请运行 npm run fetch-audio'}
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
                    aria-label={`${nameOf(entry.trackId)} 音量`}
                    className="h-1 flex-1 accent-primary"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeTrack(entry.trackId)}
                  aria-label={`移除 ${nameOf(entry.trackId)}`}
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

      {/* V1.2 #4 — 上传错误 inline 提示（2.4s 自消） */}
      {uploadError && (
        <div
          className="mx-md rounded-md bg-amber-50 px-md py-xs text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          data-testid="upload-error"
          role="alert"
        >
          {uploadError}
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

        {/* V1.2 #4 — 我的（用户上传组）+ + 上传按钮 */}
        <div className="flex shrink-0 flex-col gap-xs" data-testid="whitenoise-group-user">
          <span className="px-xs text-xs text-neutral-400">我的</span>
          <div className="flex gap-xs">
            {userAudios.map((u) => {
              const selected = mixSet.has(u.id)
              const disabled = !selected && atLimit
              return (
                <div key={u.id} className="group relative">
                  <motion.button
                    type="button"
                    whileTap={reduce || disabled ? undefined : pressScale}
                    transition={reduce ? reducedMotion : pressSpring}
                    onClick={() => handleToggle(u.id)}
                    disabled={disabled}
                    data-testid={`btn-track-${u.id}`}
                    aria-pressed={selected}
                    title={disabled ? `已达上限 ${MAX_MIX_TRACKS} 轨` : u.name}
                    className={`shrink-0 rounded-full border py-xs pl-md pr-xl text-xs transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : disabled
                          ? 'border-neutral-200 text-neutral-300 dark:border-neutral-800 dark:text-neutral-600'
                          : 'border-neutral-200 text-neutral-600 hover:border-primary/40 dark:border-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {u.name.length > 10 ? `${u.name.slice(0, 10)}…` : u.name}
                  </motion.button>
                  {/* 删除小按钮 — hover/focus 显示，移动端常显 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUser(u.id)
                    }}
                    aria-label={`删除 ${u.name}`}
                    data-testid={`btn-delete-user-${u.id}`}
                    className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 opacity-60 transition-opacity hover:bg-neutral-100 hover:text-danger hover:opacity-100 focus:opacity-100 dark:hover:bg-neutral-800"
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              )
            })}
            {/* + 上传按钮 */}
            <motion.button
              type="button"
              whileTap={reduce ? undefined : pressScale}
              transition={reduce ? reducedMotion : pressSpring}
              onClick={handlePickFile}
              data-testid="btn-upload-audio"
              title={`上传本地音频（≤ ${USER_AUDIO_MAX_SIZE_LABEL}，最多 ${USER_AUDIO_MAX_COUNT} 条）`}
              className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-neutral-300 px-md py-xs text-xs text-neutral-500 hover:border-primary hover:text-primary dark:border-neutral-700 dark:text-neutral-400"
            >
              <Plus size={12} />
              上传
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              data-testid="input-upload-audio"
              hidden
            />
          </div>
        </div>
      </div>
    </div>
  )
}
