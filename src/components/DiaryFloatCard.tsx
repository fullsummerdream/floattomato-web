// DiaryFloatCard — 番茄日记触发 B：非阻塞角落浮卡（V1.2 #1）
// 依 docs/06 V1.2 #1「UI 层 → DiaryFloatCard.tsx」+ docs/04 触发 B
//
// 设计：
// - 用户在设置 segment 选 'card' 时（默认），完成番茄后右下角浮卡（手机底部居中）
// - 非阻塞：用户可继续操作其它 UI，浮卡常驻直到手动关闭或保存
// - 与 AchievementToast 同区域（不会撞，因 sessionSink 已 setTimeout 3.5s 错开）
// - 全局挂载一次（App.tsx），订阅 diaryQueueStore + preferencesStore
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { DiaryEditor } from './DiaryEditor'
import { useDiaryQueueStore } from '@/store/diaryQueueStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { modalIn, modalOut, pressScale, pressSpring, reducedMotion } from '@/theme/motion'

export function DiaryFloatCard() {
  const pending = useDiaryQueueStore((s) => s.pending)
  const clear = useDiaryQueueStore((s) => s.clear)
  const mode = usePreferencesStore((s) => s.diaryTriggerMode)
  const reduce = useReducedMotion()

  // 仅 card 模式消费；其它模式（modal/off）此组件透明
  const show = mode === 'card' && pending !== null

  return (
    <AnimatePresence>
      {show && pending && (
        <motion.div
          initial={
            reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }
          }
          animate={
            reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
          }
          exit={
            reduce
              ? { opacity: 0, transition: reducedMotion }
              : { opacity: 0, y: 10, scale: 0.96, transition: modalOut }
          }
          transition={reduce ? reducedMotion : modalIn}
          data-testid="diary-float-card"
          // 手机：底部居中（高于 TabLayout 高度 + 安全区），PC：右下角
          className="pointer-events-auto fixed inset-x-md bottom-20 z-40 mx-auto w-auto max-w-sm rounded-2xl border border-neutral-200 bg-surface p-md shadow-xl dark:border-neutral-700 dark:bg-surface/95 sm:left-auto sm:bottom-6 sm:right-6 sm:mx-0"
        >
          {/* 右上角关闭 — 浮卡非阻塞，明示「我不想写」 */}
          <div className="mb-sm flex items-center justify-between">
            <span className="text-xs text-primary">📝 写两句感想</span>
            <motion.button
              type="button"
              whileTap={reduce ? undefined : pressScale}
              transition={reduce ? reducedMotion : pressSpring}
              onClick={clear}
              aria-label="关闭"
              data-testid="diary-card-close"
              className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              <X size={16} aria-hidden />
            </motion.button>
          </div>
          <DiaryEditor
            sessionId={pending.sessionId}
            taskName={pending.taskName}
            onSave={clear}
            onCancel={clear}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
