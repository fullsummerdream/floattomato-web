// 成就解锁 Toast — V1.1 #4
// 设计依据：docs/10-decisions-log 「2026-06-23 V1.1 #4」决策 5「toast 微交互」
// - 3 秒倒计时自动消，Q 弹 spring 入场（modalIn token）
// - pointerEnter 暂停倒计时，pointerLeave 恢复
// - 不可点击（被动陈列原则，禁查看详情按钮）
// - 多条堆叠最多 3 条（FIFO 在 store 层处理）
// - 手机底部居中（< sm），PC 右下角
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useAchievementToastStore,
  type AchievementToastItem,
} from '@/store/achievementToastStore'
import { ALL_ACHIEVEMENTS } from '@/service/achievementDefs'
import { modalIn, modalOut } from '@/theme/motion'

/** toast 显示时长（毫秒） */
const TOAST_DURATION = 3000

/** 单条 toast 卡片 — 自管倒计时 + hover 暂停 */
function ToastCard({ item }: { item: AchievementToastItem }) {
  const remove = useAchievementToastStore((s) => s.remove)
  const def = ALL_ACHIEVEMENTS.find((d) => d.id === item.id)
  // 倒计时控制：剩余 ms + hover 暂停
  const [paused, setPaused] = useState(false)
  // 用 ref 存"剩余 ms" 与 "上次 tick 时间"，避免 setState 重渲染抖
  const remainingRef = useRef(TOAST_DURATION)
  const lastTickRef = useRef(Date.now())

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const now = Date.now()
      if (!paused) {
        remainingRef.current -= now - lastTickRef.current
      }
      lastTickRef.current = now
      if (remainingRef.current <= 0) {
        remove(item.key)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, item.key, remove])

  if (!def) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95, transition: modalOut }}
      transition={modalIn}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      data-testid="achievement-toast"
      data-achievement-id={item.id}
      className="pointer-events-auto flex items-center gap-md rounded-xl border border-primary/30 bg-surface px-md py-sm shadow-lg backdrop-blur-md dark:bg-surface/90"
      role="status"
      aria-live="polite"
    >
      <span className="text-2xl shrink-0" aria-hidden>
        {def.emoji}
      </span>
      <div className="flex flex-col">
        <span className="text-xs text-primary">🎯 解锁成就</span>
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {def.title}
        </span>
      </div>
    </motion.div>
  )
}

/** Toast 容器 — 全局挂载一次（App.tsx），渲染队列 */
export function AchievementToastContainer() {
  const items = useAchievementToastStore((s) => s.items)
  return (
    <div
      data-testid="achievement-toast-container"
      // 手机底部居中 + 安全区，PC 右下角；pointer-events-none 让容器不挡操作，卡片自己开
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-sm px-md sm:left-auto sm:bottom-6 sm:right-6 sm:items-end sm:px-0"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.key} item={item} />
        ))}
      </AnimatePresence>
    </div>
  )
}
