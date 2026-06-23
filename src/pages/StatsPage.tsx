// StatsPage — 今日/本周/本月/总计 四档 + 任务分布 + 365 格热力图 + 最近记录时间线
// 依 docs/06 阶段 2 任务 5 + 阶段 5 任务 1（FocusHeatmap）+ V1.1 #3 时间线
import { useEffect, useState } from 'react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { FocusHeatmap } from '@/components/FocusHeatmap'
import { SessionTimeline } from '@/components/SessionTimeline'
import { useStatsStore, type StatsRange } from '@/store/statsStore'
import { useHeatmapData, type HeatmapRange } from '@/hooks/useHeatmapData'

const RANGES: { value: StatsRange; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '总计' },
]

const HEATMAP_RANGES: { value: HeatmapRange; label: string }[] = [
  { value: '3M', label: '3 个月' },
  { value: '6M', label: '6 个月' },
  { value: '1Y', label: '1 年' },
]

/** 秒 → "Xh Ym" / "Ym" */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h > 0) return `${h}小时${r}分钟`
  return `${r}分钟`
}

export function StatsPage() {
  const { range, summary, distribution, loading, setRange, refresh } =
    useStatsStore()
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRange>('3M')
  const heatmap = useHeatmapData(heatmapRange)

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <ResponsivePage>
      <h1 className="py-xl text-xl font-bold">统计</h1>

      {/* 范围切换（区间汇总） */}
      <div className="flex gap-xs rounded-lg bg-neutral-100 p-xs dark:bg-neutral-800">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRange(r.value)}
            data-testid={`stats-range-${r.value}`}
            className={`flex-1 rounded-md px-md py-sm text-sm transition-colors ${
              range === r.value
                ? 'bg-surface text-primary shadow-sm dark:bg-neutral-700'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 主统计卡片 */}
      <div className="mt-lg grid grid-cols-3 gap-md">
        <div className="rounded-lg border border-neutral-200 p-md text-center dark:border-neutral-800">
          <div className="text-2xl font-bold text-primary">{summary.count}</div>
          <div className="mt-xs text-xs text-neutral-500 dark:text-neutral-400">
            完成番茄
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-md text-center dark:border-neutral-800">
          <div className="text-2xl font-bold text-primary">
            {formatDuration(summary.totalSeconds)}
          </div>
          <div className="mt-xs text-xs text-neutral-500 dark:text-neutral-400">
            专注时长
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-md text-center dark:border-neutral-800">
          <div className="text-2xl font-bold text-neutral-400">
            {summary.interrupted}
          </div>
          <div className="mt-xs text-xs text-neutral-500 dark:text-neutral-400">
            中断/放弃
          </div>
        </div>
      </div>

      {/* PC 端：分布 + 热力图 两列；手机：上下堆叠 */}
      <div className="mt-3xl grid grid-cols-1 gap-3xl lg:grid-cols-2">
        {/* 任务专注分布 */}
        <section>
          <h2 className="mb-md text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            任务专注分布
          </h2>
          {loading ? (
            <p className="py-lg text-center text-sm text-neutral-400">加载中…</p>
          ) : distribution.length === 0 ? (
            <p className="py-3xl text-center text-sm text-neutral-400">
              还没有专注记录，完成几个番茄来看看吧
            </p>
          ) : (
            <ul className="flex flex-col gap-sm">
              {distribution.map((item) => (
                <li key={item.taskId ?? 'no-task'}>
                  <div className="mb-0.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-0.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.taskColor }}
                      />
                      {item.taskName}
                    </span>
                    <span className="text-neutral-400">
                      {formatDuration(item.seconds)} ·{' '}
                      {Math.round(item.ratio * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(item.ratio * 100)}%`,
                        backgroundColor: item.taskColor,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 专注热力图 */}
        <section>
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              专注热力图
            </h2>
            <div className="flex gap-xs rounded-md bg-neutral-100 p-0.5 dark:bg-neutral-800">
              {HEATMAP_RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setHeatmapRange(r.value)}
                  data-testid={`heatmap-range-${r.value}`}
                  className={`rounded-sm px-sm py-0.5 text-xs transition-colors ${
                    heatmapRange === r.value
                      ? 'bg-surface text-primary shadow-sm dark:bg-neutral-700'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 p-md dark:border-neutral-800">
            {/* 顶部小汇总 */}
            <div className="mb-sm flex gap-lg text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                共{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {heatmap.totals.count}
                </span>{' '}
                个番茄
              </span>
              <span>
                活跃{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {heatmap.totals.activeDays}
                </span>{' '}
                天
              </span>
              <span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                  {formatDuration(heatmap.totals.seconds)}
                </span>
              </span>
            </div>

            {heatmap.loading ? (
              <p className="py-3xl text-center text-sm text-neutral-400">
                加载中…
              </p>
            ) : (
              <FocusHeatmap
                grid={heatmap.grid}
                maxCount={heatmap.totals.maxCount}
              />
            )}
          </div>
        </section>
      </div>

      {/* V1.1 #3 最近记录时间线 — 跟随上方区间，独立状态筛选与软删除 */}
      <div className="mt-3xl">
        <SessionTimeline />
      </div>
    </ResponsivePage>
  )
}
