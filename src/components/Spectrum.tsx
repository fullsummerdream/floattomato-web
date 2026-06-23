// Spectrum — 真实音频频谱可视化（V1.2 #3）
// 依 docs/01：「全屏专注页底部叠加可视化」
//
// 设计要点：
// - 从 whiteNoiseService.getAnalyser() 取 AnalyserNode（fftSize 256 → 128 bin）
// - 取前 64 bin（人耳敏感低中频）画 64 柱
// - requestAnimationFrame 驱动；unmount 立即停 rAF（防熄屏期省电）
// - reduced-motion：只画一次静态零线，不开 rAF
// - analyser 为 null（无用户手势 AudioContext 未建）→ 画零线占位
// - 颜色用 CSS 变量 --color-primary 跟随主题
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { whiteNoiseService } from '@/service/WhiteNoiseService'

interface SpectrumProps {
  /** canvas 高度 px（宽度 100% 父容器） */
  height?: number
  /** 柱数（默认 64；与 fftSize 256 前半段对齐） */
  bars?: number
}

export function Spectrum({ height = 64, bars = 64 }: SpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设备像素比适配，避免移动端模糊
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.scale(dpr, dpr)
    }
    resize()

    // 取 CSS 变量 --color-primary 当前值（跟随主题）
    const getColor = () => {
      const root = getComputedStyle(document.documentElement)
      return root.getPropertyValue('--color-primary').trim() || '#ff6b6b'
    }

    const drawZero = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = getColor()
      const gap = 2
      const barWidth = (w - gap * (bars - 1)) / bars
      // 静态底线 2px，提示「频谱区域存在」
      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + gap)
        ctx.globalAlpha = 0.25
        ctx.fillRect(x, h - 2, barWidth, 2)
      }
      ctx.globalAlpha = 1
    }

    const draw = () => {
      const analyser = whiteNoiseService.getAnalyser()
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      if (!analyser) {
        drawZero()
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const binCount = analyser.frequencyBinCount // = fftSize / 2 = 128
      const data = new Uint8Array(binCount)
      analyser.getByteFrequencyData(data)

      ctx.clearRect(0, 0, w, h)
      const color = getColor()
      const gap = 2
      const barWidth = (w - gap * (bars - 1)) / bars

      // 取前 bars 个 bin（低中频），值域 0-255 → 0-h
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255
        const barH = Math.max(2, v * h)
        const x = i * (barWidth + gap)
        const y = h - barH
        // 顶部稍亮的渐变 + 整体跟主题色
        ctx.fillStyle = color
        ctx.globalAlpha = 0.35 + v * 0.5 // 强度越大越实
        ctx.fillRect(x, y, barWidth, barH)
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }

    if (reduce) {
      // reduced-motion：画一次静态零线，不开 rAF
      drawZero()
    } else {
      draw()
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [bars, reduce])

  return (
    <canvas
      ref={canvasRef}
      data-testid="spectrum-canvas"
      aria-hidden
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  )
}
