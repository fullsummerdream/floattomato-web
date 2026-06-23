// BackgroundCarousel — 背景渐变轮播
// 依 docs/06 阶段 3 任务 7：4 套预设 + 随机档；低端档退化为单色（无动画）
// 用 CSS 渐变 + Framer Motion opacity 交叉淡入；不阻塞主线程
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeviceTier } from '@/hooks/useDeviceTier'

export type BackgroundPreset = 'off' | 'sunrise' | 'ocean' | 'forest' | 'twilight' | 'random'

/** 4 套渐变预设：固定方位 + 明确色卡，深浅自适应交给 mix-blend */
const GRADIENTS: Record<Exclude<BackgroundPreset, 'off' | 'random'>, string> = {
  sunrise:
    'linear-gradient(135deg, #FFE5B4 0%, #FFB89B 40%, #FF8E72 100%)',
  ocean:
    'linear-gradient(135deg, #A8D8EA 0%, #6BAACE 50%, #3A6B96 100%)',
  forest:
    'linear-gradient(135deg, #C9E4CA 0%, #87BBA2 50%, #4A7C59 100%)',
  twilight:
    'linear-gradient(135deg, #C8B6E2 0%, #8B7BB5 50%, #4A3F7A 100%)',
}

const ORDER: Exclude<BackgroundPreset, 'off' | 'random'>[] = [
  'sunrise',
  'ocean',
  'forest',
  'twilight',
]

/** 随机档：每 12s 切一张 */
const ROTATE_MS = 12000

interface Props {
  preset: BackgroundPreset
}

export function BackgroundCarousel({ preset }: Props) {
  const tier = useDeviceTier()
  const [idx, setIdx] = useState(0)

  // 随机档：定时轮播
  useEffect(() => {
    if (preset !== 'random') return
    if (tier === 'low') return // 低端不动
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % ORDER.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [preset, tier])

  if (preset === 'off') return null

  const key = preset === 'random' ? ORDER[idx] : preset
  const gradient = GRADIENTS[key]

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        // 低端档：单色 + 低透明，避免大面积渐变绘制
        opacity: tier === 'low' ? 0.10 : 0.22,
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tier === 'low' ? 0 : 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: gradient,
          }}
        />
      </AnimatePresence>
    </div>
  )
}
