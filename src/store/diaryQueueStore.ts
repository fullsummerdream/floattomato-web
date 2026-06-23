// diaryQueueStore — 待写日记单条队列（V1.2 #1）
// 依 docs/06 V1.2 #1「diaryQueueStore：单待写队列」+ docs/04 撞车规避
//
// 设计：
// - 仅缓存「最近一个待写的 sessionId」+ 任务名（编辑器顶部显示），不堆队列
//   （用户极少在两个番茄间隔内不消费 toast/card；新待写覆盖旧待写）
// - A（modal）与 B（card）共消费同一队列，segment 单选保证不双弹
// - C 时间线补写不走此队列（用户主动点击 icon，sessionId 由 row 提供）
// - timerStore sessionSink 调用 enqueue；DiaryModal/FloatCard 读取后调用 clear
import { create } from 'zustand'

export interface DiaryQueuePayload {
  sessionId: string
  taskName?: string
}

interface DiaryQueueState {
  /** 待写日记的 payload；null = 无待写 */
  pending: DiaryQueuePayload | null
  /** 推入待写（覆盖语义，新覆盖旧） */
  enqueue: (payload: DiaryQueuePayload) => void
  /** 用户保存 / 取消后清空 */
  clear: () => void
}

export const useDiaryQueueStore = create<DiaryQueueState>((set) => ({
  pending: null,
  enqueue: (payload) => set({ pending: payload }),
  clear: () => set({ pending: null }),
}))
