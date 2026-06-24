// TimerDigits — 倒计时数字
// 依 docs/02-design-system.md 数字样式（V1.2 #4 扩到 6 种）
//   classic     — Bold 等宽
//   thin        — Light 字重，细线
//   flip        — 机械翻牌（逐位 CSS transform + Framer Motion 200ms）
//   dotmatrix   — 数码管点阵（text-shadow 多层叠加发光）
//   digital     — 七段数显 LCD 风（ghost "888:88" + 实数字叠加，绿色发光）
//   chunky      — 圆润粗黑体（饱满 q 弹气质，与 thin / flip 对比）
import { AnimatePresence, motion } from 'framer-motion'
import { DIGIT_FLIP_MS } from '@/theme/motion'

export type NumberStyle =
  | 'classic'
  | 'thin'
  | 'flip'
  | 'dotmatrix'
  | 'digital'
  | 'chunky'

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

  if (style === 'digital') {
    // 七段数显 LCD 风：ghost "888:88" 暗底 + 实际数字叠加
    // 用 .filter(c => c) 防 split('') 留空；位置由 absolute 容器对齐
    return (
      <span
        className="font-mono font-bold tracking-tight"
        style={{
          fontSize: FONT_SIZE,
          letterSpacing: '0.15em',
          color: '#22ff66',
          textShadow:
            '0 0 6px rgba(34,255,102,0.7), 0 0 14px rgba(34,255,102,0.45)',
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {/* ghost 底层 — 同字符宽度的 8（点亮全段的 LCD 视感） */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            color: 'rgba(34,255,102,0.08)',
            textShadow: 'none',
            pointerEvents: 'none',
          }}
        >
          {text.replace(/\d/g, '8')}
        </span>
        <span style={{ position: 'relative' }}>{text}</span>
      </span>
    )
  }

  if (style === 'chunky') {
    // 圆润粗黑体 — 饱满 q 弹气质，与 thin / flip 形成对比
    // 使用系统字体 ExtraBold + 紧字距 + 微妙阴影
    return (
      <span
        className="tracking-tight text-primary"
        style={{
          fontSize: FONT_SIZE,
          fontWeight: 900,
          fontFamily:
            '"Nunito", "Quicksand", "Source Han Sans CN", -apple-system, system-ui, sans-serif',
          letterSpacing: '-0.04em',
          textShadow: '0 2px 0 rgba(0,0,0,0.06)',
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
