// useViewTransition — 共享元素转场封装
// 依 docs/02-design-system.md 共享元素转场：View Transitions API 优先 + Framer Motion 降级
// 用法：const navigate = useViewTransition(); navigate(() => routerNavigate('/focus'))
import { useCallback } from 'react'

/** 包一层 startViewTransition；不支持时直接执行回调（降级靠 Framer Motion `layoutId`） */
export function useViewTransition() {
  return useCallback((update: () => void) => {
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(update)
    } else {
      update()
    }
  }, [])
}

/** 判断当前浏览器是否支持 View Transitions API */
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function'
  )
}
