// AnimatedOutlet — 路由切换转场封装
// 依 docs/02-design-system.md 动效表：路由切换 320ms cubic-bezier(0.2,0,0,1)
//
// 实现要点：
// - useLocation().pathname 作 key，path 一变 AnimatePresence 触发 exit/enter
// - mode="wait"：出场先放完再入场（防两页面叠加抖动）
// - 8px 向上 slide + fade，方向与首页/纵向滚动一致
// - prefers-reduced-motion：纯 fade，无位移（useDeviceTier 已统一判 low 档）
//
// 不在 Routes 外包 AnimatePresence 的原因：
// - 此项目用 lazy + Suspense，AnimatePresence 包 Suspense 边界会让 fallback 也参与转场
// - 此处仅包 Outlet（已是 Suspense 边界内），与懒加载兼容
import { useLocation, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MOTION } from '@/theme/motion'
import { useDeviceTier } from '@/hooks/useDeviceTier'

export function AnimatedOutlet() {
  const location = useLocation()
  const tier = useDeviceTier()
  // 低端 / reduced-motion：纯 fade（位移降级为 0）
  const yOffset = tier === 'low' ? 0 : 8

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: yOffset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -yOffset }}
        transition={tier === 'low' ? MOTION.reducedMotion : MOTION.pageTransition}
        className="h-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
