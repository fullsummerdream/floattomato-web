// 响应式断点 hook — 依 docs/02-design-system.md 响应式断点表
// sm < 768 / md 768-1024 / lg ≥ 1024
import { useEffect, useState } from 'react'

export type Breakpoint = 'sm' | 'md' | 'lg'

export interface BreakpointState {
  /** 当前断点 */
  bp: Breakpoint
  /** 是否手机（< 768） */
  isMobile: boolean
  /** 是否平板（768-1024） */
  isTablet: boolean
  /** 是否桌面（≥ 1024） */
  isDesktop: boolean
}

function compute(): BreakpointState {
  const w = window.innerWidth
  if (w >= 1024) return { bp: 'lg', isMobile: false, isTablet: false, isDesktop: true }
  if (w >= 768) return { bp: 'md', isMobile: false, isTablet: true, isDesktop: false }
  return { bp: 'sm', isMobile: true, isTablet: false, isDesktop: false }
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() =>
    typeof window === 'undefined'
      ? { bp: 'sm', isMobile: true, isTablet: false, isDesktop: false }
      : compute(),
  )

  useEffect(() => {
    const onResize = () => setState(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return state
}
