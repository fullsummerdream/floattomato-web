// TimerDigits — 倒计时数字
// 依 docs/02-design-system.md 4 套数字样式
//   classic     — Bold 等宽
//   thin        — Light 字重，细线
//   flip        — 机械翻牌（逐位 CSS transform + Framer Motion 200ms）
//   dotmatrix   — 数码管点阵（text-shadow 多层叠加发光）
import { AnimatePresence, motion } from 'framer-motion'
import { DIGIT_FLIP_MS } from '@/theme/motion'

export type NumberStyle = 'classic' | 'thin' | 'flip' | 'dotmatrix'

interface TimerDigitsProps {
  /** mm:ss 格式字符串 */
  text: string
  style?: NumberStyle
}

const FONT_SIZE = '3.5rem'

/** 单个字符翻牌：旧字符向上翻出 + 新字符自下翻入 */
function FlipChar({ ch }: { ch: string }) {
  // ":" 不翻牌，固定显示（视觉稳定）
  if (ch === ':') {
    return (
      <span style={{ display: 'inline-block', width: '0.5em', textAlign: 'center' }}>
        :
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.6em',
        height: '1em',
        position: 'relative',
        verticalAlign: 'middle',
        perspective: '300px',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={ch}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: DIGIT_FLIP_MS / 1000, ease: 'easeOut' }}
          style={{
            display: 'inline-block',
            position: 'absolute',
            inset: 0,
            textAlign: 'center',
            transformOrigin: 'center',
            backfaceVisibility: 'hidden',
          }}
        >
          {ch}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function TimerDigits({ text, style = 'classic' }: TimerDigitsProps) {
  if (style === 'thin') {
    return (
      <span
        className="font-mono font-light tracking-tight text-primary"
        style={{ fontSize: FONT_SIZE }}
      >
        {text}
      </span>
    )
  }

  if (style === 'flip') {
    return (
      <span
        className="font-mono font-bold tracking-tight text-primary"
        style={{ fontSize: FONT_SIZE, display: 'inline-flex', alignItems: 'center' }}
      >
        {text.split('').map((ch, i) => (
          // i 作 key 锚定位置；FlipChar 内部按 ch 触发 AnimatePresence
          <FlipChar key={i} ch={ch} />
        ))}
      </span>
    )
  }

  if (style === 'dotmatrix') {
    // text-shadow 多层叠加发光（数码管风）
    return (
      <span
        className="font-mono font-bold tracking-tight"
        style={{
          fontSize: FONT_SIZE,
          color: 'var(--color-accent)',
          textShadow:
            '0 0 4px var(--color-accent), 0 0 10px var(--color-accent), 0 0 20px var(--color-accent), 0 0 40px rgba(255,107,53,0.4)',
          letterSpacing: '0.05em',
        }}
      >
        {text}
      </span>
    )
  }

  // classic — Bold 等宽
  return (
    <span
      className="font-mono font-bold tracking-tight text-primary"
      style={{ fontSize: FONT_SIZE }}
    >
      {text}
    </span>
  )
}
