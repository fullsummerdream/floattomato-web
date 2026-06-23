// SessionTimeline — V1.1 #3 最近番茄记录时间线
// 依 docs/06 V1.1 #3：StatsPage 最下方独立模块
//
// 设计要点：
// - 联动当前 stats range（today/week/month/all）
// - 内置「全部 / 已完成 / 中断放弃」状态筛选
// - 每条 = 状态 icon + 任务色点 + 任务名 + 时长 + 起止时间（相对/绝对）+ 删除
// - 软删除：点删除 → inline 红色「确认删除？」3 秒窗口，再点真删（无 toast 依赖）

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, AlertTriangle, X, Trash2, PenLine } from 'lucide-react'
import {
  useStatsStore,
  type TimelineFilter,
  type TimelineItem,
} from '@/store/statsStore'
import type { SessionStatus } from '@/types/TimerTypes'
import { DiaryDao } from '@/service/DiaryDao'
import { DiaryEditor } from './DiaryEditor'
import { modalIn, modalOut, pressScale, pressSpring, reducedMotion } from '@/theme/motion'

const FILTERS: { value: TimelineFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'completed', label: '已完成' },
  { value: 'interrupted', label: '中断/放弃' },
]

/** 秒 → "Xm Ys" / "Xh Ym" */
function formatActual(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}小时${m % 60}分`
  }
  if (m === 0) return `${s}秒`
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}

/** ts → "HH:mm" */
function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * ts → 智能日期前缀：今日省略、昨日「昨天」、其它「M月D日」
 * 配合 fmtTime 拼成 "今天 14:30" / "昨天 09:15" / "6月20日 14:30"
 */
function fmtDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (isSameDay(d, now)) return '今天'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(d, yesterday)) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 状态 → 图标 + 颜色类 */
function statusVisual(status: SessionStatus) {
  switch (status) {
    case 'completed':
      return {
        Icon: Check,
        cls: 'text-success',
        label: '完成',
      }
    case 'interrupted':
      return {
        Icon: AlertTriangle,
        cls: 'text-amber-500',
        label: '中断',
      }
    case 'abandoned':
      return {
        Icon: X,
        cls: 'text-neutral-400',
        label: '放弃',
      }
  }
}

/** 单条记录行 — 内部管理「待确认删除」短窗口状态 + V1.2 #1 日记补写入口 */
function TimelineRow({
  item,
  hasDiary,
  onOpenDiary,
}: {
  item: TimelineItem
  /** 该 session 是否已写日记（控制 ✎ icon 填充/空心） */
  hasDiary: boolean
  /** 点击 ✎ → 打开日记编辑器（父组件统一管理 modal 状态） */
  onOpenDiary: (item: TimelineItem) => void
}) {
  const deleteSession = useStatsStore((s) => s.deleteSession)
  const [confirming, setConfirming] = useState(false)
  const timer = useRef<number | null>(null)
  const { Icon, cls, label } = statusVisual(item.status)
  // 铁律 #9：reduced-motion 关 layout 重排 + 按压回弹
  const reduce = useReducedMotion()

  // 3 秒未确认自动收回（防误触卡住）
  useEffect(() => {
    if (!confirming) return
    timer.current = window.setTimeout(() => setConfirming(false), 3000)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [confirming])

  const handleDeleteClick = () => {
    if (confirming) {
      void deleteSession(item.id)
    } else {
      setConfirming(true)
    }
  }

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
      transition={reduce ? reducedMotion : pressSpring}
      data-testid={`timeline-row-${item.id}`}
      className="flex items-center gap-md border-b border-neutral-100 py-sm last:border-0 dark:border-neutral-800"
    >
      {/* 状态 icon */}
      <Icon
        size={16}
        className={`shrink-0 ${cls}`}
        aria-label={label}
      />

      {/* 任务色点 + 名 */}
      <div className="flex min-w-0 flex-1 items-center gap-xs">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: item.taskColor }}
        />
        <span className="truncate text-sm">{item.taskName}</span>
      </div>

      {/* 时长 */}
      <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {formatActual(item.actualDuration)}
      </span>

      {/* 时间 — 「今天 14:30 - 14:55」/「6月20日 14:30」 */}
      <span className="hidden shrink-0 text-xs tabular-nums text-neutral-400 sm:inline">
        {fmtDate(item.startAt)} {fmtTime(item.startAt)} - {fmtTime(item.endAt)}
      </span>

      {/* V1.2 #1 — 日记补写入口（Trigger C，永远可用，与 settings.diaryTriggerMode 无关） */}
      <motion.button
        type="button"
        whileTap={reduce ? undefined : pressScale}
        transition={reduce ? reducedMotion : pressSpring}
        onClick={() => onOpenDiary(item)}
        data-testid={`btn-diary-${item.id}`}
        data-has-diary={hasDiary ? 'true' : 'false'}
        aria-label={hasDiary ? '编辑日记' : '补写日记'}
        title={hasDiary ? '编辑日记' : '补写日记'}
        className={`shrink-0 rounded-md px-sm py-0.5 transition-colors ${
          hasDiary
            ? 'text-primary hover:bg-primary/10'
            : 'text-neutral-400 hover:bg-neutral-100 hover:text-primary dark:hover:bg-neutral-800'
        }`}
      >
        <PenLine size={14} aria-hidden fill={hasDiary ? 'currentColor' : 'none'} />
      </motion.button>

      {/* 删除 */}
      <motion.button
        type="button"
        whileTap={reduce ? undefined : pressScale}
        transition={reduce ? reducedMotion : pressSpring}
        onClick={handleDeleteClick}
        data-testid={`btn-delete-${item.id}`}
        aria-label={confirming ? '点击确认删除' : '删除记录'}
        className={`shrink-0 rounded-md px-sm py-0.5 text-xs transition-colors ${
          confirming
            ? 'bg-danger/10 text-danger'
            : 'text-neutral-400 hover:bg-neutral-100 hover:text-danger dark:hover:bg-neutral-800'
        }`}
      >
        {confirming ? (
          '确认删除？'
        ) : (
          <Trash2 size={14} aria-hidden />
        )}
      </motion.button>
    </motion.li>
  )
}

export function SessionTimeline() {
  const timeline = useStatsStore((s) => s.timeline)
  const total = useStatsStore((s) => s.timelineTotal)
  const filter = useStatsStore((s) => s.timelineFilter)
  const loading = useStatsStore((s) => s.timelineLoading)
  const setFilter = useStatsStore((s) => s.setTimelineFilter)
  const loadMore = useStatsStore((s) => s.loadMoreTimeline)
  // V1.2 #1 — 哪些 session 已有日记（控制 ✎ icon 填充/空心）
  // 简单 N 次 getBySessionId 查询；timeline 默认 20 条 + sessionId 索引，无性能压力
  const [diarySet, setDiarySet] = useState<Set<string>>(new Set())
  // V1.2 #1 — 当前打开补写编辑器的 row（null = 关闭）
  const [openItem, setOpenItem] = useState<TimelineItem | null>(null)
  const reduce = useReducedMotion()

  // timeline 变更时重查 diary 已写态（saveDiary / 切换筛选都会触发）
  useEffect(() => {
    let alive = true
    const ids = timeline.map((t) => t.id)
    Promise.all(ids.map((id) => DiaryDao.getBySessionId(id)))
      .then((recs) => {
        if (!alive) return
        const next = new Set<string>()
        recs.forEach((r, i) => {
          if (r) next.add(ids[i])
        })
        setDiarySet(next)
      })
      .catch((err) => console.error('[Timeline/Diary] 已写态查询失败', err))
    return () => {
      alive = false
    }
  }, [timeline])

  const handleDiarySaved = () => {
    // 保存成功 → 标记该 session 已有日记 + 关闭 modal
    if (openItem) {
      setDiarySet((prev) => {
        const next = new Set(prev)
        next.add(openItem.id)
        return next
      })
    }
    setOpenItem(null)
  }

  const canLoadMore = timeline.length < total

  return (
    <section data-testid="session-timeline">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          最近记录
          <span className="ml-sm text-xs font-normal text-neutral-400">
            （{total} 条 · 跟随上方区间）
          </span>
        </h2>
        <div className="flex gap-xs rounded-md bg-neutral-100 p-0.5 dark:bg-neutral-800">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              data-testid={`timeline-filter-${f.value}`}
              className={`rounded-sm px-sm py-0.5 text-xs transition-colors ${
                filter === f.value
                  ? 'bg-surface text-primary shadow-sm dark:bg-neutral-700'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 px-md dark:border-neutral-800">
        {timeline.length === 0 && !loading ? (
          <p className="py-2xl text-center text-sm text-neutral-400">
            当前区间还没有专注记录
          </p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {timeline.map((item) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  hasDiary={diarySet.has(item.id)}
                  onOpenDiary={setOpenItem}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {canLoadMore && (
          <div className="py-sm text-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              data-testid="btn-timeline-more"
              className="text-xs text-neutral-500 hover:text-primary disabled:opacity-50 dark:text-neutral-400"
            >
              {loading ? '加载中…' : `加载更多（剩 ${total - timeline.length} 条）`}
            </button>
          </div>
        )}
      </div>

      {/* V1.2 #1 — Trigger C 补写编辑器（局部模态，独立于 A/B 全局队列） */}
      <AnimatePresence>
        {openItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: reduce ? reducedMotion : modalOut }}
            transition={reduce ? reducedMotion : { duration: 0.2 }}
            onClick={() => setOpenItem(null)}
            data-testid="diary-timeline-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-md backdrop-blur-sm"
          >
            <motion.div
              initial={
                reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }
              }
              animate={
                reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                reduce
                  ? { opacity: 0, transition: reducedMotion }
                  : { opacity: 0, y: 10, scale: 0.97, transition: modalOut }
              }
              transition={reduce ? reducedMotion : modalIn}
              onClick={(e) => e.stopPropagation()}
              data-testid="diary-timeline-modal"
              className="w-full max-w-md rounded-2xl bg-surface p-md shadow-2xl dark:bg-surface/95"
            >
              <h2 className="mb-md text-base font-semibold">
                {diarySet.has(openItem.id) ? '编辑日记' : '补写日记'}
              </h2>
              <DiaryEditor
                sessionId={openItem.id}
                taskName={openItem.taskName}
                autoFocus
                onSave={handleDiarySaved}
                onCancel={() => setOpenItem(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
