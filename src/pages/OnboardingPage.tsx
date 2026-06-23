// OnboardingPage — 首启动引导（3 页极简 Swiper）
// 依 docs/06 阶段 5 任务 6：数据驱动可扩展（PAGES 数组改一处加 N 页）
//
// 交互：
// - 拖左/拖右切页（drag-x，阈值 80px 切换）
// - 点底部指示器直跳
// - 上一页/下一页按钮（键盘 ← → 也响应）
// - 右上「跳过」直接结束
// - 末页主按钮「开始使用」→ 写 ONBOARDED_KEY + navigate('/')
//
// 首启动判定：localStorage 不带 floattomato:onboarded → 重定向到 /onboarding
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, ListTodo, BarChart3, ArrowRight, ArrowLeft, type LucideIcon } from 'lucide-react'
import { MOTION } from '@/theme/motion'
import { ONBOARDED_KEY } from '@/constants/onboarding'

// 重新导出以保持向后兼容（其他位置可能从 OnboardingPage 取）
export { ONBOARDED_KEY }

/** 引导页面数据 — 加页直接在此 push */
interface PageDef {
  icon: LucideIcon
  title: string
  body: string
}
const PAGES: PageDef[] = [
  {
    icon: Timer,
    title: '专注 25 分钟',
    body: '番茄工作法的核心 — 一段专注 + 一段短休，循环带你穿越分心',
  },
  {
    icon: ListTodo,
    title: '为任务计时',
    body: '把每个番茄绑到具体任务上，事后看分布、看趋势，做时间的主人',
  },
  {
    icon: BarChart3,
    title: '本地存储 · 零追踪',
    body: '所有数据存在你的浏览器；可一键导出 JSON 备份、跨设备迁移',
  },
]

/** 拖拽切页阈值（px） */
const SWIPE_THRESHOLD = 80

export function OnboardingPage() {
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  const isFirst = page === 0
  const isLast = page === PAGES.length - 1

  const goto = (next: number) => {
    if (next < 0 || next > PAGES.length - 1) return
    setDirection(next > page ? 1 : -1)
    setPage(next)
  }

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1')
    } catch {
      // localStorage 失败也不阻塞流程
    }
    // 硬跳转重置 App 状态：App.tsx 的 useState 初始化是一次性的，
    // 不硬跳就会被首次 false 锁死再次重定向回 /onboarding 形成循环
    window.location.replace('/')
  }

  // 键盘 ← → 切页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goto(page - 1)
      else if (e.key === 'ArrowRight') goto(page + 1)
      else if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const current = PAGES[page]
  const Icon = current.icon

  return (
    <div
      data-testid="onboarding-page"
      className="flex min-h-screen flex-col bg-surface text-neutral-800 dark:text-neutral-100"
    >
      {/* 顶部跳过 */}
      <div className="flex justify-end px-xl py-lg">
        <button
          type="button"
          onClick={finish}
          data-testid="btn-onboarding-skip"
          className="text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
        >
          跳过
        </button>
      </div>

      {/* 主体（drag 切页） */}
      <motion.div
        className="flex flex-1 cursor-grab items-center justify-center px-xl active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD) goto(page + 1)
          else if (info.offset.x > SWIPE_THRESHOLD) goto(page - 1)
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={MOTION.pressSpring}
            className="flex max-w-md flex-col items-center text-center"
          >
            <div className="mb-2xl flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon size={48} />
            </div>
            <h1 className="mb-md text-2xl font-bold">{current.title}</h1>
            <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* 底部：指示器 + 控制 */}
      <div className="flex flex-col items-center gap-xl px-xl pb-3xl">
        {/* 圆点指示器 */}
        <div
          className="flex items-center gap-sm"
          role="tablist"
          aria-label="引导页指示器"
        >
          {PAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`第 ${i + 1} 页`}
              onClick={() => goto(i)}
              data-testid={`dot-${i}`}
              className={`h-2 rounded-full transition-all ${
                i === page
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* 上一页 / 下一页 / 开始使用 */}
        <div className="flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            onClick={() => goto(page - 1)}
            disabled={isFirst}
            data-testid="btn-onboarding-prev"
            className="flex items-center gap-xs text-sm text-neutral-500 hover:text-primary disabled:opacity-30 dark:text-neutral-400"
          >
            <ArrowLeft size={16} /> 上一页
          </button>
          {isLast ? (
            <motion.button
              whileTap={MOTION.pressScale}
              transition={MOTION.pressSpring}
              type="button"
              onClick={finish}
              data-testid="btn-onboarding-finish"
              className="rounded-md bg-primary px-xl py-sm text-sm text-surface"
            >
              开始使用
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={() => goto(page + 1)}
              data-testid="btn-onboarding-next"
              className="flex items-center gap-xs rounded-md bg-primary px-lg py-sm text-sm text-surface"
            >
              下一页 <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
