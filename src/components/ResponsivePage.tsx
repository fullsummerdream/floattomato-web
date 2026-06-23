// 限宽居中包装 — 依 docs/02 响应式断点
// 手机全宽；平板/PC 限宽居中
import { type ReactNode } from 'react'

export function ResponsivePage({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`mx-auto w-full max-w-3xl px-md py-xl md:px-lg lg:max-w-5xl ${className}`}
    >
      {children}
    </div>
  )
}
