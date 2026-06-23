// 成就规则 — 8 条固定里程碑（依 docs/04-data-model.md 「成就系统」节表格）
// 顺序即成就墙展示顺序（首次 → 累计 → 时长 → 节奏 → 彩蛋）
import type { AchievementDef } from '@/types/AchievementTypes'

/** 7 日连续判定用：从今天起回看，最近 7 天每天 ≥ 1 个 completed */
function checkSevenDayStreak(byDay: Map<string, number>): boolean {
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = localDayKey(d)
    if ((byDay.get(key) ?? 0) < 1) return false
  }
  return true
}

/** 本地时间 YYYY-MM-DD（禁 toISOString —— 它走 UTC，跨时区会错位） */
export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-tomato',
    emoji: '🍅',
    title: '第一颗番茄',
    description: '完成你的第 1 个番茄',
    dimension: '首次',
    check: (s) => s.total >= 1,
  },
  {
    id: 'ten-tomatoes',
    emoji: '🌱',
    title: '十颗起步',
    description: '累计完成 10 个番茄',
    dimension: '累计',
    check: (s) => s.total >= 10,
  },
  {
    id: 'fifty-tomatoes',
    emoji: '🌿',
    title: '五十常客',
    description: '累计完成 50 个番茄',
    dimension: '累计',
    check: (s) => s.total >= 50,
  },
  {
    id: 'hundred-tomatoes',
    emoji: '🌳',
    title: '一百达成',
    description: '累计完成 100 个番茄',
    dimension: '累计',
    check: (s) => s.total >= 100,
  },
  {
    id: 'focus-hour',
    emoji: '⏱️',
    title: '专注一小时',
    description: '累计专注满 1 小时',
    dimension: '时长',
    check: (s) => s.totalSeconds >= 3600,
  },
  {
    id: 'focus-day',
    emoji: '📚',
    title: '专注 24 小时',
    description: '累计专注满 24 小时',
    dimension: '时长',
    check: (s) => s.totalSeconds >= 86400,
  },
  {
    id: 'seven-day-streak',
    emoji: '🔥',
    title: '七日连续',
    description: '最近 7 天每天都完成至少 1 个番茄',
    dimension: '节奏',
    check: (s) => checkSevenDayStreak(s.byDay),
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    title: '晨型番茄',
    description: '累计在早晨 08:00 前完成 5 个番茄',
    dimension: '彩蛋',
    check: (s) => s.earlyMorningCount >= 5,
  },
]
