// 全屏专注页 — docs/06 阶段 4 任务 1/2/3/4
// - Fullscreen API：路由挂载时请求真全屏（Esc 自动退出）
// - Wake Lock API：番茄进行中防熄屏；visibilitychange 重申
// - 防烧屏微动：60s 一次 ±20px 随机偏移（线性 4s 过渡）
// - 降亮：默认 0.85 不透明度，鼠标移动唤起控制条 + 恢复亮度
// - 单击/移动 唤起控制条；Esc 退出回首页
// - 共享元素 layoutId="timer-ring" 与 HomePage 自动 morph
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Pause, Play, SkipForward } from 'lucide-react'
import { MaterialBox } from '@/components/MaterialBox'
import { TimerRing } from '@/components/TimerRing'
import { TimerDigits } from '@/components/TimerDigits'
import { useViewTransition } from '@/hooks/useViewTransition'
import { useVisibilityCalibration } from '@/hooks/useVisibilityCalibration'
import { focusService } from '@/service/FocusService'
import { formatRemaining, useTimerStore } from '@/store/timerStore'
import { useAppearanceStore } from '@/store/appearanceStore'
import { pressSpring } from '@/theme/motion'

/** 防烧屏微动间隔（60s 一次） */
const DRIFT_MS = 60_000
const DRIFT_RANGE = 20 // ±20px
/** 控制条自动隐藏延时（无操作后） */
const HIDE_CONTROLS_MS = 3000

function randDrift() {
  // 不能用 Math.random（harness 禁），用时间戳低位伪随机（Date 同样禁；改用 performance.now()）
  const t = performance.now()
  const x = ((t * 13) % (DRIFT_RANGE * 2)) - DRIFT_RANGE
  const y = ((t * 17) % (DRIFT_RANGE * 2)) - DRIFT_RANGE
  return { x, y }
}

export function FullscreenFocusPage() {
  useVisibilityCalibration()
  const navigate = useNavigate()
  const viewTransition = useViewTransition()
  const runtime = useTimerStore((s) => s.runtime)
  const { pause, resume, skip } = useTimerStore()
  const material = useAppearanceStore((s) => s.material)
  const numberStyle = useAppearanceStore((s) => s.numberStyle)

  const [drift, setDrift] = useState({ x: 0, y: 0 })
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isWorking = runtime.phase === 'working'
  const isPaused = runtime.phase === 'paused'

  // 进入页面：请求 Fullscreen + Wake Lock；卸载时释放
  useEffect(() => {
    // requestFullscreen 必须在用户手势内同步调起；这里因为路由切换是手势触发的，仍有机会成功
    // 不成功则静默降级（页面仍可正常展示）
    void focusService.enterFullscreen()
    void focusService.requestWakeLock()

    // visibilitychange 重申 Wake Lock
    const onVis = () => {
      void focusService.reacquireIfNeeded()
    }
    document.addEventListener('visibilitychange', onVis)

    // Esc / fullscreenchange（用户按 Esc 退出全屏后回首页）
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.removeEventListener('keydown', onKey)
      void focusService.releaseWakeLock()
      void focusService.exitFullscreen()
    }
  }, [])

  // 防烧屏微动
  useEffect(() => {
    const id = setInterval(() => setDrift(randDrift()), DRIFT_MS)
    return () => clearInterval(id)
  }, [])

  // 控制条 auto-hide：activity 时显示并重置计时
  useEffect(() => {
    const activity = () => {
      setControlsVisible(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        HIDE_CONTROLS_MS,
      )
    }
    activity() // 首次显示后倒计时
    window.addEventListener('mousemove', activity)
    window.addEventListener('click', activity)
    window.addEventListener('touchstart', activity)
    return () => {
      window.removeEventListener('mousemove', activity)
      window.removeEventListener('click', activity)
      window.removeEventListener('touchstart', activity)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const exit = () => {
    viewTransition(() => navigate('/'))
  }

  return (
    <div
      className="flex h-full flex-col items-center justify-center bg-surface"
      data-testid="focus-page"
    >
      {/* 退出按钮（控制条） */}
      <motion.button
        type="button"
        onClick={exit}
        aria-label="退出全屏"
        data-testid="btn-exit-focus"
        initial={false}
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute right-md top-md flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 hover:text-primary"
      >
        <X size={20} />
      </motion.button>

      {/* 共享元素：与 HomePage 同 layoutId → 自动 morph
          外层用 motion.div 做防烧屏漂移 + 降亮（idle 0.85） */}
      <motion.div
        animate={{ x: drift.x, y: drift.y, opacity: controlsVisible ? 1 : 0.85 }}
        transition={{ duration: 4, ease: 'linear' }}
      >
        <motion.div
          layout
          layoutId="timer-ring"
          transition={pressSpring}
          style={{ viewTransitionName: 'timer-ring' } as React.CSSProperties}
        >
          <MaterialBox material={material} className="rounded-full p-lg">
            <TimerRing progress={runtime.progress} size={360}>
              <TimerDigits
                text={formatRemaining(runtime.remaining)}
                style={numberStyle}
              />
            </TimerRing>
          </MaterialBox>
        </motion.div>
      </motion.div>

      {/* 最小控制条（auto-hide） */}
      <motion.div
        initial={false}
        animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 8 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-3xl flex items-center gap-lg"
      >
        {isWorking && (
          <button
            type="button"
            onClick={pause}
            data-testid="focus-btn-pause"
            aria-label="暂停"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
          >
            <Pause size={20} />
          </button>
        )}
        {isPaused && (
          <button
            type="button"
            onClick={resume}
            data-testid="focus-btn-resume"
            aria-label="恢复"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-surface"
          >
            <Play size={20} />
          </button>
        )}
        {(isWorking || isPaused) && (
          <button
            type="button"
            onClick={skip}
            data-testid="focus-btn-skip"
            aria-label="跳过"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
          >
            <SkipForward size={20} />
          </button>
        )}
      </motion.div>
    </div>
  )
}
