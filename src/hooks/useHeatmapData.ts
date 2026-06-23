// useHeatmapData — 拉指定月数区间的 sessions，按日聚合
// 依 docs/06 阶段 5 任务 1（FocusHeatmap）
// 输出：
// - days: 按日聚合的 {dateKey, count, seconds}（仅含有数据的日子，便于查表）
// - cells: 连续日期序列（含 0 数据日），按周分组成 7×N 二维网格
// - totals: 区间合计（番茄数 / 时长 / 活跃天数）
// - maxCount: 区间内单日最大 count，用作强度分档基线
import { useCallback, useEffect, useState } from 'react'
import { SessionDao } from '@/service/SessionDao'
import type { PomodoroSession } from '@/types/TimerTypes'

export type HeatmapRange = '3M' | '6M' | '1Y'

export interface HeatmapDay {
  /** YYYY-MM-DD 本地时区 */
  dateKey: string
  /** 该日零点时间戳 */
  ts: number
  /** 完成番茄数 */
  count: number
  /** 累计专注秒数 */
  seconds: number
}

/** 按周列分组的二维网格：cells[weekIndex][dayOfWeek 0-6（周一=0,周日=6）] */
export interface HeatmapGrid {
  weeks: (HeatmapDay | null)[][]
  /** 每周第一天的月份 label（每月第一周显示一次） */
  monthLabels: { weekIndex: number; label: string }[]
}

export interface HeatmapTotals {
  count: number
  seconds: number
  activeDays: number
  maxCount: number
}

const MS_DAY = 24 * 60 * 60 * 1000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dateKey(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 周一=0, 周日=6（与 ISO 一致） */
function dayOfWeekMon0(ts: number): number {
  const d = new Date(ts)
  const js = d.getDay() // 0=Sun..6=Sat
  return (js + 6) % 7
}

function rangeMonths(range: HeatmapRange): number {
  return range === '3M' ? 3 : range === '6M' ? 6 : 12
}

function buildGrid(days: HeatmapDay[], startTs: number, endTs: number): HeatmapGrid {
  // 由 startTs 向前补到当周周一
  const startDow = dayOfWeekMon0(startTs)
  const gridStart = startTs - startDow * MS_DAY
  // 由 endTs 向后补到当周周日
  const endDow = dayOfWeekMon0(endTs)
  const gridEnd = endTs + (6 - endDow) * MS_DAY

  const byKey = new Map<string, HeatmapDay>()
  for (const d of days) byKey.set(d.dateKey, d)

  const weeks: (HeatmapDay | null)[][] = []
  const monthLabels: { weekIndex: number; label: string }[] = []
  let cur = gridStart
  let lastMonth = -1
  let weekIndex = 0
  while (cur <= gridEnd) {
    const week: (HeatmapDay | null)[] = []
    for (let i = 0; i < 7; i++) {
      const ts = cur + i * MS_DAY
      if (ts < startTs || ts > endTs) {
        week.push(null)
      } else {
        const k = dateKey(ts)
        week.push(
          byKey.get(k) ?? { dateKey: k, ts, count: 0, seconds: 0 },
        )
      }
    }
    // 月份 label：本周第一个非 null 日，月份与上次不同时记一次
    const firstReal = week.find((x): x is HeatmapDay => x !== null)
    if (firstReal) {
      const m = new Date(firstReal.ts).getMonth()
      if (m !== lastMonth) {
        monthLabels.push({
          weekIndex,
          label: `${m + 1}月`,
        })
        lastMonth = m
      }
    }
    weeks.push(week)
    cur += 7 * MS_DAY
    weekIndex++
  }
  return { weeks, monthLabels }
}

export interface HeatmapData {
  days: HeatmapDay[]
  grid: HeatmapGrid
  totals: HeatmapTotals
  /** 区间起讫（含） */
  startTs: number
  endTs: number
  loading: boolean
  refresh: () => Promise<void>
}

export function useHeatmapData(range: HeatmapRange): HeatmapData {
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [grid, setGrid] = useState<HeatmapGrid>({ weeks: [], monthLabels: [] })
  const [totals, setTotals] = useState<HeatmapTotals>({
    count: 0,
    seconds: 0,
    activeDays: 0,
    maxCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [bounds, setBounds] = useState<{ start: number; end: number }>(() => {
    const end = startOfDay(Date.now())
    const startD = new Date(end)
    startD.setMonth(startD.getMonth() - rangeMonths(range))
    return { start: startD.getTime(), end }
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    const end = startOfDay(Date.now())
    const startD = new Date(end)
    startD.setMonth(startD.getMonth() - rangeMonths(range))
    const start = startD.getTime()
    setBounds({ start, end })

    // 拉区间记录（仅 completed 计入热力强度）
    const sessions: PomodoroSession[] = await SessionDao.queryByRange(
      start,
      end + MS_DAY - 1,
    )
    const byKey = new Map<string, HeatmapDay>()
    for (const s of sessions) {
      if (s.status !== 'completed') continue
      const dayTs = startOfDay(s.startAt)
      const k = dateKey(dayTs)
      const prev = byKey.get(k) ?? { dateKey: k, ts: dayTs, count: 0, seconds: 0 }
      prev.count += 1
      prev.seconds += s.actualDuration
      byKey.set(k, prev)
    }
    const dayArr = [...byKey.values()].sort((a, b) => a.ts - b.ts)
    const newGrid = buildGrid(dayArr, start, end)
    const totalCount = dayArr.reduce((a, d) => a + d.count, 0)
    const totalSeconds = dayArr.reduce((a, d) => a + d.seconds, 0)
    const maxCount = dayArr.reduce((a, d) => Math.max(a, d.count), 0)

    setDays(dayArr)
    setGrid(newGrid)
    setTotals({
      count: totalCount,
      seconds: totalSeconds,
      activeDays: dayArr.length,
      maxCount,
    })
    setLoading(false)
  }, [range])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { days, grid, totals, startTs: bounds.start, endTs: bounds.end, loading, refresh }
}

/** count → 强度档（0-4），用作渲染色阶
 *  分档策略：基于 maxCount 五分位，1 番茄起步 ≥ Lv1，避免全 0 → 全亮 */
export function intensityLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (maxCount <= 1) return 1
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}
