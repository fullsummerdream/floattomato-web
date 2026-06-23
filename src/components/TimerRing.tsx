// TimerRing — SVG 圆环进度
// 依 docs/02-design-system.md：圆环进度 1000ms linear（CSS transition 平滑）
import { motion } from 'framer-motion'
import { RING_UPDATE_MS } from '@/theme/motion'

interface TimerRingProps {
  /** 进度 0-1（已用占比） */
  progress: number
  /** 圆环直径（px） */
  size?: number
  /** 描边宽度 */
  stroke?: number
  /** 相位色（工作/休息区分） */
  color?: string
  children?: React.ReactNode
}

export function TimerRing({
  progress,
  size = 280,
  stroke = 8,
  color = 'var(--color-accent)',
  children,
}: TimerRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // 进度环：剩余 = 1 - 已用
  const remaining = Math.max(0, Math.min(1, 1 - progress))
  const dashOffset = circumference * (1 - remaining)

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* 背景轨道 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-neutral-200 dark:stroke-neutral-800"
        />
        {/* 进度环 — CSS transition 平滑（1000ms linear） */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: RING_UPDATE_MS / 1000, ease: 'linear' }}
        />
      </svg>
      {/* 中心内容（数字） */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
