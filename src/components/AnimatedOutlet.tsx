// AnimatedOutlet — 路由切换转场封装
// 依 docs/02-design-system.md 动效表：路由切换 320ms cubic-bezier(0.2,0,0,1)
//
// 实现要点：
// - useLocation().pathname 作 key，path 一变 AnimatePresence 触发 exit/enter
// - mode="wait"：出场先放完再入场（防两页面叠加抖动）
// - 8px 向上 slide + fade，方向与首页/纵向滚动一致
// - prefers-reduced-motion：纯 fade，无位移（useDeviceTier 已统一判 low 档）
//
// 关键修复（bug：第二次点同 Tab / 切走再回来 → 空白）：
// - 旧版用 <Outlet />，<Outlet /> 是实时占位 —— 路由变了立刻显示新页；
//   而 AnimatePresence mode="wait" 还在等旧 motion.div 的 exit 完成。节奏错开
//   → 视觉上「新内容闪一下 → 旧框架 fade out → 中间一瞬空 → 新框架 fade in」
// - 改为 useOutlet() 拿当前 location 对应的 element 快照（stable ref），
//   AnimatePresence 能正确把旧 element 留到 exit 完成、再挂新 element 入场
// - 同一路径再点 NavLink 时 location.pathname 不变 → key 不变 →
//   AnimatePresence 不触发 exit/enter，无任何闪烁
//
// 不在 Routes 外包 AnimatePresence 的原因：
// - 此项目用 lazy + Suspense，AnimatePresence 包 Suspense 边界会让 fallback 也参与转场
// - 此处仅包 outlet element（已是 Suspense 边界内），与懒加载兼容
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MOTION } from '@/theme/motion'
import { useDeviceTier } from '@/hooks/useDeviceTier'

export function AnimatedOutlet() {
  const location = useLocation()
  const element = useOutlet()
  const tier = useDeviceTier()
  // 低端 / reduced-motion：纯 fade（位移降级为 0）
  const yOffset = tier === 'low' ? 0 : 8

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* key 走 pathname：同路径再点（NavLink replay）时 key 不变 → 不触发 exit/enter，避免空白闪烁 */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: yOffset }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -yOffset }}
        transition={tier === 'low' ? MOTION.reducedMotion : MOTION.pageTransition}
        className="h-full"
      >
        {element}
      </motion.div>
    </AnimatePresence>
  )
}
