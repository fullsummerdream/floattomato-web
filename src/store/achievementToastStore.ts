// 成就 Toast 队列 — V1.1 #4
// 队列 FIFO 最多 3 条；新解锁 push，3 秒后自动消（pointer enter 暂停倒计时，leave 恢复）
// 设计：被动陈列原则，Toast 不可点击；存储侧仅维护 ID + 入队时间，渲染层负责动效
import { create } from 'zustand'
import type { AchievementId } from '@/types/AchievementTypes'

/** 队列最大长度，超出 FIFO 顶替 */
export const TOAST_MAX = 3

export interface AchievementToastItem {
  /** 唯一 key —— `${id}-${pushedAt}` 防同 id 二次入队 React 冲突（理论上同 id 不会重复解锁，但兜底） */
  key: string
  id: AchievementId
  pushedAt: number
}

interface AchievementToastState {
  items: AchievementToastItem[]
  /** 批量入队（evaluate 一次可能返回多个） */
  push: (ids: AchievementId[]) => void
  /** 移除单条 */
  remove: (key: string) => void
  /** 全清（开关关闭 / 路由切换时调用） */
  clear: () => void
}

export const useAchievementToastStore = create<AchievementToastState>(
  (set) => ({
    items: [],
    push: (ids) =>
      set((s) => {
        if (ids.length === 0) return s
        const now = Date.now()
        const next: AchievementToastItem[] = ids.map((id, idx) => ({
          key: `${id}-${now}-${idx}`,
          id,
          pushedAt: now + idx, // 同批次轻微错开排序
        }))
        // FIFO：旧 + 新 取最后 TOAST_MAX
        const merged = [...s.items, ...next]
        return { items: merged.slice(-TOAST_MAX) }
      }),
    remove: (key) =>
      set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
    clear: () => set({ items: [] }),
  }),
)
