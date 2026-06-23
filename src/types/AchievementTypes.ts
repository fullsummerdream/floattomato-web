// 成就系统类型定义 — 依 docs/04-data-model.md 「成就系统（V1.1 #4）」
// 设计：表中**存在即解锁**（未解锁不存行），8 条固定 ID 枚举与 achievementDefs.ts 一一对应

/** 8 条固定里程碑 ID（与 achievementDefs.ts ALL_ACHIEVEMENTS 一一对应） */
export type AchievementId =
  | 'first-tomato'
  | 'ten-tomatoes'
  | 'fifty-tomatoes'
  | 'hundred-tomatoes'
  | 'focus-hour'
  | 'focus-day'
  | 'seven-day-streak'
  | 'early-bird'

/** 解锁记录 — 表中存在即解锁 */
export interface AchievementRecord {
  id: AchievementId
  /** Date.now() at unlock */
  unlockedAt: number
}

/**
 * 评估快照 — `queryAll()` 后一次循环构建，供 8 条 check 共用
 * 时区铁律：byDay key 用本地时间 YYYY-MM-DD（禁 toISOString）；earlyMorningCount 用 getHours() < 8
 */
export interface SessionSnapshot {
  /** completed 总数 */
  total: number
  /** completed actualDuration 累计（秒） */
  totalSeconds: number
  /** 本地日期字符串 → 当天 completed 数（七日连续判定用） */
  byDay: Map<string, number>
  /** 本地 08:00 前完成的 completed 数 */
  earlyMorningCount: number
}

/** 成就规则定义 — 视觉静态字段 + 解锁判定函数 */
export interface AchievementDef {
  id: AchievementId
  emoji: string
  title: string
  /** 未解锁时展示的条件描述 */
  description: string
  /** 维度归类（统计墙分组用） */
  dimension: '首次' | '累计' | '时长' | '节奏' | '彩蛋'
  /** 解锁判定 — 已解锁项调用前应跳过；本函数纯函数无副作用 */
  check: (snapshot: SessionSnapshot) => boolean
}

/** 评估结果 — 新解锁的成就 ID 列表（已解锁的不重复返回） */
export type EvaluateResult = AchievementId[]

/** 视图模型 — 成就墙单卡片渲染数据 */
export interface AchievementView {
  def: AchievementDef
  unlocked: boolean
  unlockedAt: number | null
}
