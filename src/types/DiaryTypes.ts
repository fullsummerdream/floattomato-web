// 番茄日记类型定义 — 依 docs/04-data-model.md 「番茄日记（V1.2 #1）」
// 设计要点：
//   1. 独立表（不侵入 PomodoroSession schema），sessionId 外键关联，硬删 session 时级联清理日记
//   2. mood 存枚举（非颜文字字符串）—— 未来改视觉（emoji / 圆点）只动 MOOD_KAOMOJI 映射，DB 不需迁移
//   3. 字数柔性限制 —— 仅 UI 层提示与禁保存，DB 不强校验

/** 5 档心情枚举（DB 字段） */
export type Mood = 'sad' | 'down' | 'calm' | 'happy' | 'excited'

/** 颜文字映射（日系经典一套，仅前端展示，DB 不存） */
export const MOOD_KAOMOJI: Record<Mood, string> = {
  sad: '(´；ω；`)',
  down: '(´・_・`)',
  calm: '(＿ ＿)',
  happy: '(*´∀`*)',
  excited: '٩(◕‿◕)۶',
}

/** 心情中文标签（无障碍 aria-label 用） */
export const MOOD_LABEL: Record<Mood, string> = {
  sad: '伤心',
  down: '沮丧',
  calm: '平静',
  happy: '愉快',
  excited: '兴奋',
}

/** 5 档心情有序列表（segment 渲染用，顺序固定：差→好） */
export const MOOD_ORDER: Mood[] = ['sad', 'down', 'calm', 'happy', 'excited']

/** 字数硬上限（>500 禁保存 + 计数标红） */
export const MAX_NOTE_LEN = 500
/** 字数预警阈值（≥450 计数变橙提醒） */
export const WARN_NOTE_LEN = 450

/** 日记记录 — DB 表行 */
export interface DiaryRecord {
  /** UUID */
  id: string
  /** V1.0 全为 'local'（为 V2.x 云同步预留） */
  uid: string
  /** 外键 → PomodoroSession.id；硬删 session 时级联删此记录 */
  sessionId: string
  /** 5 档心情枚举 */
  mood: Mood
  /** 文字感想，柔性 ≤ 500 字（UI 层提示与禁保存，DB 不强校验） */
  note: string
  createdAt: number
  updatedAt: number
  /** 软删除墓碑（与其他表对齐） */
  deletedAt: number | null
  /** 同步状态预留（V1.0 全为 'local'） */
  syncStatus: 'local' | 'syncing' | 'synced'
}
