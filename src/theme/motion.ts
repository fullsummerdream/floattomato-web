// 动效 token — 依 docs/02-design-system.md 动效规范表
// 禁散写魔法数值，所有动效从此导入
import type { Transition, Variants } from 'framer-motion'

/** spring 物理参数：启停/按压，带轻微 overshoot */
export const pressSpring: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 18,
  mass: 0.8,
}

/** 状态切换（工作↔休息） */
export const stateSwitchSpring: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 20,
  mass: 0.8,
}

/** 页面/路由切换 — 方向化 slide */
export const pageTransition: Transition = {
  duration: 0.32,
  ease: [0.2, 0, 0, 1],
}

/** 模态入场（280ms spring） */
export const modalIn: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 18,
  mass: 0.8,
}

/** 模态出场（180ms ease-in，比入场快 ~65%） */
export const modalOut: Transition = {
  duration: 0.18,
  ease: 'easeIn',
}

/** 列表项 stagger 入场（30–50ms 间隔） */
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

/** 卡片悬浮/按压 */
export const hoverScale = { scale: 1.02 }
export const pressScale = { scale: 0.96 }

/** 黏土 Q 弹按压回弹 — cubic-bezier(0.34, 1.56) soft bounce */
export const clayPress: Transition = {
  duration: 0.28,
  ease: [0.34, 1.56, 0.64, 1],
}

/** 圆环进度 — 1000ms linear（CSS transition 落地，此处仅作常量参考） */
export const RING_UPDATE_MS = 1000
/** 倒计时数字翻动 — 200ms ease-out */
export const DIGIT_FLIP_MS = 200

/** reduced-motion 降级：≤150ms 线性 */
export const reducedMotion: Transition = {
  duration: 0.15,
  ease: 'linear',
}

/** 统一导出 */
export const MOTION = {
  pressSpring,
  stateSwitchSpring,
  pageTransition,
  modalIn,
  modalOut,
  stagger,
  staggerItem,
  hoverScale,
  pressScale,
  clayPress,
  RING_UPDATE_MS,
  DIGIT_FLIP_MS,
  reducedMotion,
} as const
