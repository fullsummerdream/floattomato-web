// MaterialBox — 6 材质统一封装
// 依 docs/02-design-system.md 材质规范表 + 低端设备降级阈值
// flat / glass / frosted / mica / clay / neumorph
// 低端档全部降级为 flat（box-shadow + 1px border 维持层级）
import { type CSSProperties, type ReactNode, forwardRef } from 'react'
import { useDeviceTier } from '@/hooks/useDeviceTier'

export type Material = 'flat' | 'glass' | 'frosted' | 'mica' | 'clay' | 'neumorph'

interface MaterialBoxProps {
  material?: Material
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** 透传 click（黏土按压回弹由 motion.button 包外层实现，不在此组件内） */
  onClick?: () => void
  /** 渲染元素，默认 div */
  as?: 'div' | 'section' | 'article'
}

/** 材质 → 内联样式（CSS 变量化，不写魔法数字到具体颜色） */
function buildStyle(material: Material): CSSProperties {
  switch (material) {
    case 'glass':
      return {
        backdropFilter: 'blur(15px) saturate(140%)',
        WebkitBackdropFilter: 'blur(15px) saturate(140%)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)',
        border: '1px solid rgba(255,255,255,0.20)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.30)',
      }
    case 'frosted':
      return {
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
      }
    case 'mica':
      // 半透明 + SVG 微噪声 + 微妙渐变（噪声用内联 svg dataURL，无外部资源）
      return {
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 100%), var(--color-surface)',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\"), linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-variant) 100%)",
        border: '1px solid var(--color-neutral-200)',
      }
    case 'clay':
      // 双向阴影 + 柔和渐变填充；按压回弹由调用方包 motion.button 处理
      return {
        background:
          'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-variant) 100%)',
        borderRadius: '20px',
        boxShadow:
          'inset -2px -2px 8px rgba(0,0,0,0.08), inset 2px 2px 4px rgba(255,255,255,0.50), 4px 4px 12px rgba(0,0,0,0.10), -2px -2px 6px rgba(255,255,255,0.40)',
      }
    case 'neumorph':
      // 同色系凸阴影（仅浅色推荐；深色下视觉退化由调用方控制）
      return {
        background: 'var(--color-surface)',
        borderRadius: '14px',
        boxShadow:
          '6px 6px 12px rgba(0,0,0,0.10), -6px -6px 12px rgba(255,255,255,0.70)',
        border: '1px solid var(--color-neutral-100)',
      }
    case 'flat':
    default:
      // 低端降级档：box-shadow + 1px border 维持视觉层级
      return {
        background: 'var(--color-surface)',
        border: '1px solid var(--color-neutral-200)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }
  }
}

export const MaterialBox = forwardRef<HTMLDivElement, MaterialBoxProps>(
  function MaterialBox(
    { material = 'flat', as = 'div', children, className, style, onClick },
    ref,
  ) {
    const tier = useDeviceTier()
    // 低端档：全部降级为 flat（docs/02 铁律）
    const effective: Material = tier === 'low' ? 'flat' : material
    const materialStyle = buildStyle(effective)
    const Tag = as
    return (
      <Tag
        ref={ref as never}
        onClick={onClick}
        className={className}
        style={{ ...materialStyle, ...style }}
        data-material={effective}
      >
        {children}
      </Tag>
    )
  },
)
