// DiaryModal — 番茄日记触发 A：全屏阻塞模态（V1.2 #1）
// 依 docs/06 V1.2 #1「UI 层 → DiaryModal.tsx」+ docs/04 触发 A
//
// 设计：
// - 用户在设置 segment 选 'modal' 时，完成番茄后立即弹模态（阻塞短休息开始）
// - AnimatePresence 入场 scale+fade，遵循 reduced-motion 降级
// - 全局挂载一次（App.tsx），订阅 diaryQueueStore + preferencesStore
// - 仅 diaryTriggerMode === 'modal' 时消费队列；其它模式下不渲染
// - 关闭语义：点取消或保存都调 queue.clear()，等同放弃此次（可走 C 时间线补写）
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { DiaryEditor } from './DiaryEditor'
import { useDiaryQueueStore } from '@/store/diaryQueueStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { modalIn, modalOut, reducedMotion } from '@/theme/motion'

export function DiaryModal() {
  const pending = useDiaryQueueStore((s) => s.pending)
  const clear = useDiaryQueueStore((s) => s.clear)
  const mode = usePreferencesStore((s) => s.diaryTriggerMode)
  const reduce = useReducedMotion()

  // 仅 modal 模式消费；其它模式（card/off）此组件透明
  const show = mode === 'modal' && pending !== null

  return (
    <AnimatePresence>
      {show && pending && (
        <motion.div
          // 阻塞蒙层
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: reduce ? reducedMotion : modalOut }}
          transition={reduce ? reducedMotion : { duration: 0.2 }}
          onClick={clear}
          data-testid="diary-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-md backdrop-blur-sm"
        >
          <motion.div
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }
            }
            animate={
              reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              reduce
                ? { opacity: 0, transition: reducedMotion }
                : { opacity: 0, y: 10, scale: 0.97, transition: modalOut }
            }
            transition={reduce ? reducedMotion : modalIn}
            onClick={(e) => e.stopPropagation()}
            data-testid="diary-modal"
            className="w-full max-w-md rounded-2xl bg-surface p-md shadow-2xl dark:bg-surface/95"
          >
            <h2 className="mb-md text-base font-semibold">写一句今天的感想</h2>
            <DiaryEditor
              sessionId={pending.sessionId}
              taskName={pending.taskName}
              autoFocus
              onSave={clear}
              onCancel={clear}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
