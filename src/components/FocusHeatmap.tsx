// FocusHeatmap — GitHub 风格 365 格热力图
// 依 docs/02 设计规范（格子 12px / 间隙 3px / 5 档色阶）+ docs/06 阶段 5 任务 1
// - 7 行（周一→周日）× N 列（每列一周）
// - 横向滚动（手机）/ 自适应宽度（PC）
// - hover/tap 弹气泡（绝对定位，相对 cell）
// - 0 数据日仍渲染（最低亮度色），保留视觉网格
// - 月份 label 顶置（每月首周一次）
import { memo, useCallback, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { intensityLevel, type HeatmapDay, type HeatmapGrid } from '@/hooks/useHeatmapData'

interface FocusHeatmapProps {
  grid: HeatmapGrid
  maxCount: number
  /** 单格边长 px */
  cellSize?: number
  /** 单格间隙 px */
  gap?: number
}

const DOW_LABELS = ['一', '', '三', '', '五', '', '日']

/** 强度档 → 背景色（CSS 变量降级走默认） */
const LEVEL_BG: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'rgba(120, 120, 120, 0.10)', // 0 番茄（保留网格）
  1: 'rgba(231, 76, 60, 0.30)',
  2: 'rgba(231, 76, 60, 0.55)',
  3: 'rgba(231, 76, 60, 0.78)',
  4: 'rgba(231, 76, 60, 1.00)',
}

function fmtDate(dateKey: string): string {
  // YYYY-MM-DD → M月D日
  const [, m, d] = dateKey.split('-')
  return `${parseInt(m, 10)}月${parseInt(d, 10)}日`
}

function fmtMinutes(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}分钟`
  return `${Math.floor(m / 60)}小时${m % 60}分钟`
}

/** 单格 — memo 防止 hover 状态变化引发 365 格全量重渲染（热点） */
interface CellProps {
  day: HeatmapDay | null
  level: 0 | 1 | 2 | 3 | 4
  cellSize: number
  onHoverEnter: (day: HeatmapDay, el: HTMLElement) => void
  onHoverLeave: () => void
  onTap: (day: HeatmapDay, el: HTMLElement) => void
}
const Cell = memo(function Cell({
  day,
  level,
  cellSize,
  onHoverEnter,
  onHoverLeave,
  onTap,
}: CellProps) {
  if (!day) {
    return <div style={{ width: cellSize, height: cellSize }} aria-hidden />
  }
  return (
    <div
      role="img"
      aria-label={`${fmtDate(day.dateKey)} ${day.count} 个番茄`}
      data-date={day.dateKey}
      data-count={day.count}
      style={{
        width: cellSize,
        height: cellSize,
        background: LEVEL_BG[level],
        borderRadius: 2,
      }}
      onMouseEnter={(e) => onHoverEnter(day, e.currentTarget)}
      onMouseLeave={onHoverLeave}
      onClick={(e) => onTap(day, e.currentTarget)}
    />
  )
})

export function FocusHeatmap({
  grid,
  maxCount,
  cellSize = 12,
  gap = 3,
}: FocusHeatmapProps) {
  const [hover, setHover] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null)

  /** hover/tap 共享坐标计算 — useCallback 稳定引用，Cell 才能真正 memo */
  const computePos = useCallback(
    (el: HTMLElement): { x: number; y: number } => {
      const rect = el.getBoundingClientRect()
      const parent = el.closest(
        '[data-testid="focus-heatmap"]',
      ) as HTMLElement | null
      const prect = parent?.getBoundingClientRect() ?? rect
      return {
        x: rect.left - prect.left + cellSize / 2,
        y: rect.top - prect.top,
      }
    },
    [cellSize],
  )
  const handleHoverEnter = useCallback(
    (day: HeatmapDay, el: HTMLElement) => {
      setHover({ day, ...computePos(el) })
    },
    [computePos],
  )
  const handleHoverLeave = useCallback(() => setHover(null), [])
  const handleTap = useCallback(
    (day: HeatmapDay, el: HTMLElement) => {
      // 移动端 tap = toggle 同格气泡
      setHover((prev) =>
        prev?.day.dateKey === day.dateKey ? null : { day, ...computePos(el) },
      )
    },
    [computePos],
  )

  const cellStyle = (level: 0 | 1 | 2 | 3 | 4): CSSProperties => ({
    width: cellSize,
    height: cellSize,
    background: LEVEL_BG[level],
    borderRadius: 2,
  })

  return (
    <div className="relative">
      <div className="flex gap-xs overflow-x-auto pb-md" data-testid="focus-heatmap">
        {/* 周几标签列 */}
        <div
          className="flex shrink-0 flex-col text-[10px] text-neutral-400"
          style={{ gap, paddingTop: cellSize + gap + 14 /* 留 month label 高度 */ }}
        >
          {DOW_LABELS.map((l, i) => (
            <div
              key={i}
              style={{ height: cellSize, lineHeight: `${cellSize}px` }}
              className="w-3"
            >
              {l}
            </div>
          ))}
        </div>

        {/* 主体网格 */}
        <div className="relative">
          {/* 月份标签行 */}
          <div className="relative h-4 text-[10px] text-neutral-400">
            {grid.monthLabels.map((m) => (
              <span
                key={`${m.weekIndex}-${m.label}`}
                className="absolute"
                style={{ left: m.weekIndex * (cellSize + gap) }}
              >
                {m.label}
              </span>
            ))}
          </div>
          {/* 7 × N 格子 */}
          <div className="flex" style={{ gap }}>
            {grid.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap }}>
                {week.map((day, di) => (
                  <Cell
                    key={di}
                    day={day}
                    level={day ? intensityLevel(day.count, maxCount) : 0}
                    cellSize={cellSize}
                    onHoverEnter={handleHoverEnter}
                    onHoverLeave={handleHoverLeave}
                    onTap={handleTap}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 色阶图例 */}
      <div className="mt-sm flex items-center justify-end gap-xs text-[10px] text-neutral-400">
        <span>少</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <span
            key={lvl}
            style={cellStyle(lvl)}
            className="inline-block"
            aria-hidden
          />
        ))}
        <span>多</span>
      </div>

      {/* 气泡 */}
      <AnimatePresence>
        {hover && (
          <motion.div
            key={hover.day.dateKey}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            data-testid="heatmap-tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-neutral-900 px-sm py-xs text-xs text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900"
            style={{ left: hover.x, top: hover.y - 6 }}
          >
            <div className="font-medium">{fmtDate(hover.day.dateKey)}</div>
            <div>
              {hover.day.count > 0
                ? `${hover.day.count} 个番茄 · ${fmtMinutes(hover.day.seconds)}`
                : '无记录'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
