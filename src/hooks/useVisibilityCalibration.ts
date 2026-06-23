// useVisibilityCalibration — 后台回前台校准
// 依 docs/03-architecture.md 通知与可见性校准机制 + docs/07 铁律 1
// visibilitychange / focus 触发时，由 TimerService 用 Date.now() 重算剩余
import { useEffect } from 'react'
import { timerService } from '@/service/TimerService'

export function useVisibilityCalibration() {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        timerService.calibrate()
      }
    }
    const onFocus = () => timerService.calibrate()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
