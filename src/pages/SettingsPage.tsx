// 设置页 — 通知 / PWA 安装 / 数据备份 / 偏好（音效/振动/暂停限时）/ 快捷键说明
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Download, CheckCircle2, Upload, Save, Keyboard, Info, ChevronRight, Volume2, VolumeX, Play, Vibrate, Timer, Trophy } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { notificationService } from '@/service/NotificationService'
import { pwaService } from '@/service/PwaService'
import { backupService, BackupError, type ImportSummary } from '@/service/BackupService'
import { audioService, type VolumeLevel } from '@/service/AudioService'
import { useTimerStore } from '@/store/timerStore'
import {
  usePreferencesStore,
  PAUSE_LIMIT_OPTIONS,
  PAUSE_LIMIT_LABELS,
  VOLUME_LABELS,
  type PauseLimitSeconds,
} from '@/store/preferencesStore'
import { HOTKEYS } from '@/hooks/useGlobalHotkeys'
import { Link } from 'react-router-dom'

/** 导入结果转人类可读 */
function summarizeImport(s: ImportSummary): string {
  const parts: string[] = []
  const fmt = (label: string, c: ImportSummary['taskCount']) => {
    if (c.added + c.updated === 0 && c.skipped === 0) return null
    return `${label} 新增 ${c.added} / 更新 ${c.updated} / 跳过 ${c.skipped}`
  }
  const t = fmt('任务', s.taskCount)
  const e = fmt('记录', s.sessionCount)
  const p = fmt('预设', s.presetCount)
  if (t) parts.push(t)
  if (e) parts.push(e)
  if (p) parts.push(p)
  // V1.1 #4 成就（如有）
  if (
    s.achievementCount &&
    s.achievementCount.added + s.achievementCount.skipped > 0
  ) {
    parts.push(
      `成就 新增 ${s.achievementCount.added} / 跳过 ${s.achievementCount.skipped}`,
    )
  }
  if (s.appearanceRestored) parts.push('外观已还原')
  if (s.fromVersion !== s.toVersion) {
    parts.unshift(`从 v${s.fromVersion} 迁移到 v${s.toVersion}`)
  }
  return parts.length ? parts.join('；') : '无新增数据（全部已存在且本地更新更新）'
}

export function SettingsPage() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    'unsupported',
  )
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(false)

  // 备份状态：idle / exporting / importing / success / error
  type BackupState =
    | { kind: 'idle' }
    | { kind: 'exporting' }
    | { kind: 'importing' }
    | { kind: 'success'; text: string }
    | { kind: 'error'; text: string }
  const [backup, setBackup] = useState<BackupState>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const phase = useTimerStore((s) => s.runtime.phase)

  // 偏好（音效/振动/暂停限时）— 持久化在 preferencesStore
  const volume = usePreferencesStore((s) => s.volume)
  const setVolume = usePreferencesStore((s) => s.setVolume)
  const vibrateEnabled = usePreferencesStore((s) => s.vibrateEnabled)
  const setVibrate = usePreferencesStore((s) => s.setVibrate)
  const pauseLimit = usePreferencesStore((s) => s.pauseLimit)
  const setPauseLimit = usePreferencesStore((s) => s.setPauseLimit)
  // V1.1 #4 — 成就反馈开关
  const achievementsEnabled = usePreferencesStore((s) => s.achievementsEnabled)
  const setAchievementsEnabled = usePreferencesStore(
    (s) => s.setAchievementsEnabled,
  )
  // 振动 API 支持检测（iOS Safari 静默降级）
  const vibrateSupported =
    typeof navigator !== 'undefined' && 'vibrate' in navigator

  const previewSound = () => {
    audioService.unlock()
    audioService.playComplete()
  }
  const previewVibrate = () => {
    if (!vibrateSupported) return
    audioService.vibrate([100, 50, 100, 50, 200])
  }

  useEffect(() => {
    setPerm(notificationService.permission())
    setCanInstall(pwaService.canInstall())
    setInstalled(pwaService.isInstalled())
    const unsub = pwaService.subscribe(() => {
      setCanInstall(pwaService.canInstall())
      setInstalled(pwaService.isInstalled())
    })
    return unsub
  }, [])

  const requestPerm = async () => {
    const result = await notificationService.requestPermission()
    setPerm(result)
  }

  const install = async () => {
    await pwaService.promptInstall()
  }

  const handleExport = async () => {
    try {
      setBackup({ kind: 'exporting' })
      await backupService.downloadJson()
      setBackup({ kind: 'success', text: '导出成功，请检查下载目录' })
    } catch (e) {
      setBackup({ kind: 'error', text: `导出失败：${(e as Error).message}` })
    }
  }

  const handleImportClick = () => {
    // 番茄进行中不导入：会破坏运行时一致性
    if (phase !== 'idle') {
      setBackup({
        kind: 'error',
        text: '请先结束当前番茄/休息再导入（避免数据冲突）',
      })
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChosen = async (file: File) => {
    setBackup({ kind: 'importing' })
    try {
      const summary = await backupService.importFile(file)
      setBackup({ kind: 'success', text: summarizeImport(summary) })
    } catch (e) {
      if (e instanceof BackupError) {
        setBackup({ kind: 'error', text: `[${e.code}] ${e.message}` })
      } else {
        setBackup({ kind: 'error', text: `导入失败：${(e as Error).message}` })
      }
    } finally {
      // 重置 input 以便相同文件可重选
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <ResponsivePage>
      <h1 className="py-xl text-xl font-bold">设置</h1>

      {/* 通知 */}
      <section className="flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          桌面通知
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          {perm === 'granted' ? (
            <Bell size={18} className="shrink-0 text-primary" />
          ) : (
            <BellOff size={18} className="shrink-0 text-neutral-400" />
          )}
          <div className="flex-1">
            <div className="text-sm">
              {perm === 'granted' && '已授权 — 番茄完成会在后台弹通知'}
              {perm === 'denied' && '已拒绝 — 请到浏览器站点设置中开启'}
              {perm === 'default' && '未授权 — 点击授权后台通知'}
              {perm === 'unsupported' && '当前浏览器不支持通知 API'}
            </div>
            <div className="mt-xs text-xs text-neutral-400">
              仅在标签页处于后台时弹出，避免打扰前台专注
            </div>
          </div>
          {perm === 'default' && (
            <button
              type="button"
              onClick={requestPerm}
              data-testid="btn-notify-request"
              className="rounded-md bg-primary px-md py-sm text-sm text-surface"
            >
              授权
            </button>
          )}
        </div>
      </section>

      {/* PWA 安装 */}
      <section className="mt-xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          安装到桌面
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          {installed ? (
            <CheckCircle2 size={18} className="shrink-0 text-primary" />
          ) : (
            <Download size={18} className="shrink-0 text-neutral-400" />
          )}
          <div className="flex-1">
            <div className="text-sm">
              {installed && '已安装 — 可从桌面/应用列表启动'}
              {!installed && canInstall && '可安装为应用 — 离线可用，全屏沉浸'}
              {!installed && !canInstall && '请使用 Chrome/Edge,或在浏览器菜单中选「添加到主屏幕」'}
            </div>
            <div className="mt-xs text-xs text-neutral-400">
              安装后享受 standalone 全屏、桌面图标、离线启动
            </div>
          </div>
          {!installed && canInstall && (
            <button
              type="button"
              onClick={install}
              data-testid="btn-pwa-install"
              className="rounded-md bg-primary px-md py-sm text-sm text-surface"
            >
              安装
            </button>
          )}
        </div>
      </section>

      {/* 数据备份 */}
      <section className="mt-xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          数据备份与迁移
        </h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-md px-md py-md">
            <Save size={18} className="shrink-0 text-neutral-400" />
            <div className="flex-1">
              <div className="text-sm">导出 JSON</div>
              <div className="mt-xs text-xs text-neutral-400">
                导出全部任务/番茄记录/预设/外观设置；备份与跨设备迁移用
              </div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={backup.kind === 'exporting'}
              data-testid="btn-export-json"
              className="rounded-md bg-primary px-md py-sm text-sm text-surface disabled:opacity-60"
            >
              {backup.kind === 'exporting' ? '导出中…' : '导出'}
            </button>
          </div>
          <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex items-center gap-md px-md py-md">
            <Upload size={18} className="shrink-0 text-neutral-400" />
            <div className="flex-1">
              <div className="text-sm">导入 JSON</div>
              <div className="mt-xs text-xs text-neutral-400">
                冲突按时间戳 LWW 解决；旧版本自动 migration；请在 idle 状态下导入
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              aria-label="选择备份 JSON 文件导入"
              className="hidden"
              data-testid="input-import-json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFileChosen(f)
              }}
            />
            <button
              type="button"
              onClick={handleImportClick}
              disabled={backup.kind === 'importing'}
              data-testid="btn-import-json"
              className="rounded-md border border-neutral-300 px-md py-sm text-sm text-neutral-700 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200"
            >
              {backup.kind === 'importing' ? '导入中…' : '选择文件'}
            </button>
          </div>
        </div>
        {/* 操作结果反馈 */}
        {(backup.kind === 'success' || backup.kind === 'error') && (
          <div
            data-testid="backup-result"
            data-state={backup.kind}
            className={`rounded-md px-md py-sm text-xs ${
              backup.kind === 'success'
                ? 'bg-primary/10 text-primary'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {backup.text}
          </div>
        )}
      </section>

      {/* 音效 */}
      <section className="mt-xl flex flex-col gap-md" data-testid="section-sound">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          番茄完成音效
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          {volume === 0 ? (
            <VolumeX size={18} className="text-neutral-400" />
          ) : (
            <Volume2 size={18} className="text-primary" />
          )}
          <div className="flex-1">
            <div className="text-sm">音量</div>
            <div className="mt-xs text-xs text-neutral-400">
              番茄结束/阶段切换时的合成提示音
            </div>
          </div>
          {/* 4 档音量 segment */}
          <div
            className="flex shrink-0 overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700"
            role="group"
            aria-label="音量档位"
            data-testid="volume-segment"
          >
            {([0, 1, 2, 3] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setVolume(lv as VolumeLevel)}
                aria-pressed={volume === lv}
                data-testid={`btn-volume-${lv}`}
                className={`px-md py-xs text-xs ${
                  volume === lv
                    ? 'bg-primary text-surface'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900'
                }`}
              >
                {VOLUME_LABELS[lv as VolumeLevel]}
              </button>
            ))}
          </div>
          {/* 试听 */}
          <button
            type="button"
            onClick={previewSound}
            disabled={volume === 0}
            aria-label="试听提示音"
            data-testid="btn-sound-preview"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:border-primary hover:text-primary disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
          >
            <Play size={14} />
          </button>
        </div>
      </section>

      {/* 振动 */}
      <section className="mt-xl flex flex-col gap-md" data-testid="section-vibrate">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          振动反馈
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          <Vibrate
            size={18}
            className={vibrateEnabled && vibrateSupported ? 'text-primary' : 'text-neutral-400'}
          />
          <div className="flex-1">
            <div className="text-sm">
              番茄完成时振动
              {!vibrateSupported && (
                <span className="ml-sm text-xs text-neutral-400">（当前设备不支持）</span>
              )}
            </div>
            <div className="mt-xs text-xs text-neutral-400">
              Android Chrome 支持；iOS 系统级屏蔽 Vibration API
            </div>
          </div>
          {/* 试振（开启 + 设备支持时显示） */}
          {vibrateEnabled && vibrateSupported && (
            <button
              type="button"
              onClick={previewVibrate}
              aria-label="试振"
              data-testid="btn-vibrate-preview"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:border-primary hover:text-primary dark:border-neutral-700 dark:text-neutral-300"
            >
              <Play size={14} />
            </button>
          )}
          {/* 开关 */}
          <button
            type="button"
            role="switch"
            aria-checked={vibrateEnabled}
            aria-label={vibrateEnabled ? '关闭振动' : '开启振动'}
            disabled={!vibrateSupported}
            onClick={() => setVibrate(!vibrateEnabled)}
            data-testid="switch-vibrate"
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
              vibrateEnabled && vibrateSupported
                ? 'bg-primary'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                vibrateEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 暂停限时 */}
      <section className="mt-xl flex flex-col gap-md" data-testid="section-pause-limit">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          单次暂停限时
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          <Timer size={18} className="shrink-0 text-primary" />
          <div className="flex-1">
            <div className="text-sm">超时未恢复将自动中断当前番茄</div>
            <div className="mt-xs text-xs text-neutral-400">
              当前：{PAUSE_LIMIT_LABELS[pauseLimit]}
            </div>
          </div>
        </div>
        {/* 5 档 segment（30s / 1min / 3min / 5min / 不限） */}
        <div
          className="flex overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700"
          role="group"
          aria-label="暂停限时档位"
          data-testid="pause-limit-segment"
        >
          {PAUSE_LIMIT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPauseLimit(opt as PauseLimitSeconds)}
              aria-pressed={pauseLimit === opt}
              data-testid={`btn-pause-limit-${opt}`}
              className={`flex-1 px-md py-sm text-xs ${
                pauseLimit === opt
                  ? 'bg-primary text-surface'
                  : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900'
              }`}
            >
              {PAUSE_LIMIT_LABELS[opt as PauseLimitSeconds]}
            </button>
          ))}
        </div>
      </section>

      {/* 成就反馈（V1.1 #4） */}
      <section className="mt-xl flex flex-col gap-md" data-testid="section-achievements">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          成就反馈
        </h2>
        <div className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800">
          <Trophy
            size={18}
            className={`shrink-0 ${achievementsEnabled ? 'text-primary' : 'text-neutral-400'}`}
          />
          <div className="flex-1">
            <div className="text-sm">解锁成就时弹提示</div>
            <div className="mt-xs text-xs text-neutral-400">
              关闭后不再弹 toast，成就墙仍可查阅；重开会补齐期间已达成项
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={achievementsEnabled === true}
            aria-label={achievementsEnabled ? '关闭成就提示' : '开启成就提示'}
            onClick={() => setAchievementsEnabled(!achievementsEnabled)}
            data-testid="switch-achievements"
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              achievementsEnabled
                ? 'bg-primary'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                achievementsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 键盘快捷键 */}
      <section className="mt-xl flex flex-col gap-md" data-testid="section-hotkeys">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          键盘快捷键
        </h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-md px-md py-md">
            <Keyboard size={18} className="text-neutral-400" />
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              焦点不在输入框时全局生效；全屏专注页仅 Space / S 可用
            </div>
          </div>
          <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
          <ul className="flex flex-col">
            {HOTKEYS.map((h, i) => (
              <li
                key={h.key}
                className={`flex items-center justify-between px-md py-sm text-sm ${
                  i > 0 ? 'border-t border-neutral-100 dark:border-neutral-900' : ''
                }`}
              >
                <span className="text-neutral-600 dark:text-neutral-300">
                  {h.description}
                </span>
                <kbd className="rounded-md border border-neutral-300 bg-neutral-50 px-sm py-0.5 font-mono text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                  {h.key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 关于（入口）+ 成就墙 */}
      <section className="mt-xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          其他
        </h2>
        {/* V1.1 #4 成就墙入口（在「关于」上方一行） */}
        <Link
          to="/achievements"
          data-testid="link-achievements"
          className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md hover:border-primary dark:border-neutral-800"
        >
          <Trophy size={18} className="shrink-0 text-neutral-400" />
          <div className="flex-1">
            <div className="text-sm">成就墙</div>
            <div className="mt-xs text-xs text-neutral-400">
              查看已解锁与未解锁的里程碑
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-neutral-400" />
        </Link>
        <Link
          to="/about"
          data-testid="link-about"
          className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md hover:border-primary dark:border-neutral-800"
        >
          <Info size={18} className="shrink-0 text-neutral-400" />
          <div className="flex-1">
            <div className="text-sm">关于飘悠番茄</div>
            <div className="mt-xs text-xs text-neutral-400">
              版本信息 · 隐私协议 · 用户协议
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-neutral-400" />
        </Link>
      </section>
    </ResponsivePage>
  )
}
