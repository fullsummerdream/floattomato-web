// AchievementService — 极克制成就系统（V1.1 #4）
// 依 docs/04-data-model.md 「成就系统（V1.1 #4）」节
//
// 核心契约：
// 1. 表中存在即解锁 — 未解锁项不存行
// 2. evaluate 幂等：跑 N 次只在首次跨越阈值那次返回非空
// 3. isEvaluating 单一锁防 async 二次进入
// 4. 时区铁律：byDay 走本地 YYYY-MM-DD（localDayKey），early-bird 走本地 getHours()
//
// 性能边界：当前 O(n) 全表扫，session 几千条 < 30ms。升级路径见 04 文档「性能升级路径」节。
import { db } from './DatabaseService'
import { SessionDao } from './SessionDao'
import { ALL_ACHIEVEMENTS, localDayKey } from './achievementDefs'
import type { PomodoroSession } from '@/types/TimerTypes'
import type {
  AchievementId,
  AchievementRecord,
  AchievementView,
  EvaluateResult,
  SessionSnapshot,
} from '@/types/AchievementTypes'

/** 一次扫一遍 sessions 构建评估快照 */
export function buildSnapshot(sessions: PomodoroSession[]): SessionSnapshot {
  let total = 0
  let totalSeconds = 0
  let earlyMorningCount = 0
  const byDay = new Map<string, number>()

  for (const s of sessions) {
    if (s.status !== 'completed') continue
    total += 1
    totalSeconds += s.actualDuration
    // 本地日 key（禁 toISOString，会 UTC 漂移）
    const startDate = new Date(s.startAt)
    const day = localDayKey(startDate)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
    // 早晨彩蛋：本地 08:00 前完成（endAt 算更严谨，但 startAt 也在 08 前必然有清晨语义）
    if (new Date(s.endAt).getHours() < 8) {
      earlyMorningCount += 1
    }
  }
  return { total, totalSeconds, byDay, earlyMorningCount }
}

class AchievementServiceImpl {
  /** 并发锁 — 防 async 期间二次进入导致重复 bulkPut */
  private isEvaluating = false

  /** 列出已解锁记录（不存在的 = 未解锁） */
  async listUnlocked(): Promise<AchievementRecord[]> {
    return db.achievements.toArray()
  }

  /** 评估并写库；返回**本次新解锁** ID 列表 */
  async evaluate(): Promise<EvaluateResult> {
    if (this.isEvaluating) return []
    this.isEvaluating = true
    try {
      const sessions = await SessionDao.queryAll()
      const snapshot = buildSnapshot(sessions)
      const unlockedSet = new Set<AchievementId>(
        (await this.listUnlocked()).map((r) => r.id),
      )
      const newly: AchievementId[] = []
      for (const def of ALL_ACHIEVEMENTS) {
        if (unlockedSet.has(def.id)) continue
        if (def.check(snapshot)) newly.push(def.id)
      }
      if (newly.length > 0) {
        const now = Date.now()
        await db.achievements.bulkPut(
          newly.map((id) => ({ id, unlockedAt: now })),
        )
      }
      return newly
    } finally {
      this.isEvaluating = false
    }
  }

  /** 成就墙渲染数据 — 8 条 def 与解锁状态合并 */
  async listView(): Promise<AchievementView[]> {
    const records = await this.listUnlocked()
    const map = new Map<AchievementId, number>(
      records.map((r) => [r.id, r.unlockedAt]),
    )
    return ALL_ACHIEVEMENTS.map((def) => ({
      def,
      unlocked: map.has(def.id),
      unlockedAt: map.get(def.id) ?? null,
    }))
  }

  /** 测试 / 重置工具：清空全部已解锁（仅供 e2e 用，UI 层不暴露） */
  async __resetForTest(): Promise<void> {
    await db.achievements.clear()
  }
}

export const achievementService = new AchievementServiceImpl()
