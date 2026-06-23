// 成就墙 — V1.1 #4
// 依 docs/06-implementation-phases.md V1.1 #4「UI 入口」段
// - 手机 2 列 / PC 4 列网格
// - 解锁 = 彩色 emoji + 日期；未解锁 = 灰度 + 条件描述
// - 顶部「已解锁 X / 8」小汇总
// - 不进 TabLayout，避免 Tab 膨胀；从设置页入口进入
import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { achievementService } from '@/service/AchievementService'
import type { AchievementView } from '@/types/AchievementTypes'

/** 格式化解锁日期为 YYYY-MM-DD（本地） */
function formatUnlockedDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AchievementsPage() {
  const [views, setViews] = useState<AchievementView[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    achievementService
      .listView()
      .then((v) => {
        if (alive) {
          setViews(v)
          setLoaded(true)
        }
      })
      .catch((err) => {
        console.error('[Achievement] 加载失败', err)
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const unlockedCount = useMemo(
    () => views.filter((v) => v.unlocked).length,
    [views],
  )

  return (
    <ResponsivePage>
      <header className="flex items-center gap-md py-xl">
        <Trophy size={24} className="shrink-0 text-primary" aria-hidden />
        <div className="flex-1">
          <h1 className="text-xl font-bold">成就</h1>
          <p
            className="mt-xs text-xs text-neutral-500 dark:text-neutral-400"
            data-testid="achievements-summary"
          >
            已解锁 {unlockedCount} / {views.length}
          </p>
        </div>
      </header>

      {!loaded ? (
        <div className="py-xl text-center text-sm text-neutral-400">
          加载中…
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4"
          data-testid="achievements-grid"
        >
          {views.map((v) => (
            <li
              key={v.def.id}
              data-testid={`achievement-card-${v.def.id}`}
              data-unlocked={v.unlocked ? 'true' : 'false'}
              className={`flex flex-col items-center gap-xs rounded-xl border px-sm py-md text-center transition-colors ${
                v.unlocked
                  ? 'border-primary/30 bg-surface dark:bg-surface/80'
                  : 'border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/60'
              }`}
            >
              <span
                className={`text-3xl ${v.unlocked ? '' : 'grayscale opacity-40'}`}
                aria-hidden
              >
                {v.def.emoji}
              </span>
              <span className="text-sm font-medium">{v.def.title}</span>
              {v.unlocked && v.unlockedAt !== null ? (
                <span className="text-xs text-primary">
                  {formatUnlockedDate(v.unlockedAt)}
                </span>
              ) : (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {v.def.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </ResponsivePage>
  )
}
