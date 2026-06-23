// useDeviceTier — 设备档位判定
// 依 docs/02-design-system.md 「低端设备降级阈值」：
//   navigator.hardwareConcurrency ≤ 4 或 navigator.deviceMemory ≤ 4 → low
//   prefers-reduced-motion: reduce → low（视为最低档强制降级）
import { useEffect, useState } from 'react'

export type DeviceTier = 'high' | 'low'

interface NavigatorDM extends Navigator {
  deviceMemory?: number
}

/** SSR/无 navigator 时回退到 high；浏览器端按硬件判定 */
function detect(): DeviceTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'high'
  }
  const nav = navigator as NavigatorDM
  const cores = nav.hardwareConcurrency ?? 8
  const mem = nav.deviceMemory ?? 8
  if (cores <= 4 || mem <= 4) return 'low'
  // reduced-motion 也视为低端档（材质降级 + 动画降级一致策略）
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'low'
  }
  return 'high'
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(() => detect())

  useEffect(() => {
    // 监听 reduced-motion 变化，实时切换档位
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setTier(detect())
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return tier
}
