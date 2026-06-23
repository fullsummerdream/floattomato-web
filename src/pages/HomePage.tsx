// HomePage — 主计时页
// 依 docs/02-design-system.md 首页线框 + docs/06 阶段 1 任务
// 圆环 + 数字 + 启停/跳过/放弃 + 任务 chip + 阶段标签
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipForward, X, Maximize2 } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { MaterialBox } from '@/components/MaterialBox'
import { TimerRing } from '@/components/TimerRing'
import { TimerDigits } from '@/components/TimerDigits'
import { useVisibilityCalibration } from '@/hooks/useVisibilityCalibration'
import { useViewTransition } from '@/hooks/useViewTransition'
import {
  formatRemaining,
  PHASE_LABELS,
  useTimerStore,
} from '@/store/timerStore'
import { useTaskStore } from '@/store/taskStore'
import { useAppearanceStore } from '@/store/appearanceStore'
import { pressSpring, hoverScale, pressScale } from '@/theme/motion'

/** 相位 → 圆环色 */
function phaseColor(phase: string): string {
  if (phase === 'shortBreak' || phase === 'longBreak') {
    return 'var(--color-success)'
  }
  return 'var(--color-accent)'
}

export function HomePage() {
  useVisibilityCalibration()
  const navigate = useNavigate()
  const viewTransition = useViewTransition()
  const { runtime, start, pause, resume, skip, abandon } = useTimerStore()
  const { tasks, load } = useTaskStore()
  const material = useAppearanceStore((s) => s.material)
  const numberStyle = useAppearanceStore((s) => s.numberStyle)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const goFocus = () => {
    // View Transitions API 优先（Chrome 111+），降级走 Framer Motion layoutId 自动 morph
    viewTransition(() => navigate('/focus'))
  }

  // 首次加载任务列表
  useEffect(() => {
    void load()
  }, [load])

  // 默认选中第一个未归档任务
  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) {
      const firstActive = tasks.find((t) => !t.archived)
      if (firstActive) setSelectedTaskId(firstActive.id)
    }
  }, [tasks, selectedTaskId])

  const phase = runtime.phase
  const isWorking = phase === 'working'
  const isPaused = phase === 'paused'
  const isBreak = phase === 'shortBreak' || phase === 'longBreak'
  const isIdle = phase === 'idle'

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null
  const roundInSet = runtime.roundCount % 4 || (isIdle ? 0 : 4)
  const activeTasks = tasks.filter((t) => !t.archived)

  const handlePrimary = () => {
    if (isIdle) {
      start(selectedTaskId)
    } else if (isWorking) {
      pause()
    } else if (isPaused) {
      resume()
    } else if (isBreak) {
      // 休息态主按钮 = 跳过休息，进入下一轮工作
      skip()
    }
  }

  /** 主按钮标签 */
  const primaryLabel = isIdle
    ? '开始'
    : isWorking
      ? '暂停'
      : isPaused
        ? '恢复'
        : '跳过休息'
  const PrimaryIcon = isIdle || isPaused ? Play : isWorking ? Pause : SkipForward

  return (
    <ResponsivePage>
      <div className="flex flex-col items-center gap-2xl py-3xl">
        {/* 阶段标签 + 轮次 */}
        <div className="flex flex-col items-center gap-xs">
          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-xs text-neutral-400">
            第 {Math.max(1, runtime.roundCount + (isIdle ? 1 : 0))} 个番茄 · 本轮 {roundInSet}/4
          </span>
        </div>

        {/* 圆环 + 数字（外壳走 MaterialBox，材质从 store 取）
            layoutId="timer-ring" → 跨页面 Framer Motion 自动 morph（兼容 View Transitions API 降级路径） */}
        <motion.div
          layout
          layoutId="timer-ring"
          transition={pressSpring}
          style={{ viewTransitionName: 'timer-ring' } as React.CSSProperties}
        >
          <MaterialBox material={material} className="rounded-full p-md">
            <TimerRing progress={runtime.progress} color={phaseColor(phase)}>
              <TimerDigits
                text={formatRemaining(runtime.remaining)}
                style={numberStyle}
              />
            </TimerRing>
          </MaterialBox>
        </motion.div>

        {/* 任务 chip（Idle 时可选；工作进行中锁定不可改） */}
        {isIdle && (
          <div className="flex flex-wrap justify-center gap-sm">
            {activeTasks.length === 0 && (
              <span className="text-sm text-neutral-400">
                还没有任务，去「任务」页创建一个吧
              </span>
            )}
            {activeTasks.map((t) => (
              <motion.button
                key={t.id}
                type="button"
                whileTap={pressScale}
                transition={pressSpring}
                onClick={() => setSelectedTaskId(t.id)}
                className={`flex items-center gap-0.5 rounded-full border px-md py-sm text-sm transition-all ${
                  selectedTaskId === t.id
                    ? 'border-primary text-primary'
                    : 'border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </motion.button>
            ))}
          </div>
        )}
        {!isIdle && selectedTask && (
          <div className="flex items-center gap-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: selectedTask.color }}
            />
            {selectedTask.name}
            <span className="ml-sm text-xs text-neutral-400">（任务锁定中）</span>
          </div>
        )}

        {/* 主控制 */}
        <div className="flex items-center gap-xl">
          {/* 跳过（左，仅工作/暂停态显示；休息态主按钮承担跳过） */}
          {(isWorking || isPaused) && (
            <motion.button
              whileHover={hoverScale}
              whileTap={pressScale}
              transition={pressSpring}
              onClick={skip}
              data-testid="btn-skip"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
              aria-label="跳过"
            >
              <SkipForward size={20} />
            </motion.button>
          )}

          {/* 启停（主按钮） */}
          <motion.button
            whileHover={hoverScale}
            whileTap={pressScale}
            transition={pressSpring}
            onClick={handlePrimary}
            data-testid="btn-primary"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-surface"
            aria-label={primaryLabel}
          >
            <PrimaryIcon size={28} />
          </motion.button>

          {/* 放弃（右） */}
          {!isIdle && (
            <motion.button
              whileHover={hoverScale}
              whileTap={pressScale}
              transition={pressSpring}
              onClick={abandon}
              data-testid="btn-abandon"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-danger dark:border-neutral-800"
              aria-label="放弃"
            >
              <X size={20} />
            </motion.button>
          )}
        </div>

        {/* 全屏入口（依 docs/02 线框「── 进入全屏模式 ──」，转场走 layoutId + View Transitions API） */}
        <button
          type="button"
          onClick={goFocus}
          data-testid="btn-fullscreen"
          className="flex items-center gap-xs text-xs text-neutral-400 hover:text-primary"
        >
          <Maximize2 size={12} /> 进入全屏模式
        </button>

        {/* 休息阶段提示 */}
        {isBreak && (
          <p className="text-xs text-neutral-400">休息一下，点击跳过可提前进入下一轮</p>
        )}
      </div>
    </ResponsivePage>
  )
}
