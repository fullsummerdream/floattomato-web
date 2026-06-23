// ThemeProvider — 依 docs/02-design-system.md
// 职责：根据外观偏好注入 CSS 变量（主题色 + 灰阶）+ toggle .dark class
import { useEffect } from 'react'
import { getTheme } from '@/theme/colors'
import {
  resolveDark,
  useAppearanceStore,
} from '@/store/appearanceStore'

const root = document.documentElement

/** 浅色模式灰阶（9 级）— 400/500 提至 WCAG AA 4.5:1 合格 */
const NEUTRAL_LIGHT: Record<string, string> = {
  '--color-neutral-50': '#FAFAFA',
  '--color-neutral-100': '#F5F5F5',
  '--color-neutral-200': '#F0F0F0',
  '--color-neutral-300': '#D8D8D8',
  '--color-neutral-400': '#767676', // vs #FFF 对比 4.54（原 #B0B0B0 仅 2.17）
  '--color-neutral-500': '#6B6B6B', // vs #FFF 对比 5.33（原 #7A7A7A 仅 4.29）
  '--color-neutral-600': '#4A4A4A',
  '--color-neutral-700': '#2D2D2D',
  '--color-neutral-800': '#1A1A1A',
  '--color-neutral-900': '#0F0F0F',
}

/** 深色模式灰阶（反转，禁纯 #000000 → #0F0F0F 起）— 400 对深底提至 5.85 */
const NEUTRAL_DARK: Record<string, string> = {
  '--color-neutral-50': '#0F0F0F',
  '--color-neutral-100': '#1A1A1A',
  '--color-neutral-200': '#2D2D2D',
  '--color-neutral-300': '#4A4A4A',
  '--color-neutral-400': '#8E8E8E', // vs #0F0F0F 对比 5.85（原 #7A7A7A 仅 4.47）
  '--color-neutral-500': '#B0B0B0', // 对深底已 8.84 ✓
  '--color-neutral-600': '#D8D8D8',
  '--color-neutral-700': '#F0F0F0',
  '--color-neutral-800': '#F5F5F5',
  '--color-neutral-900': '#FAFAFA',
}

/** 浅色 surface */
const SURFACE_LIGHT = {
  '--color-surface': '#FFFFFF',
  '--color-surface-variant': '#F5F5F5',
  '--color-success': '#4CAF50',
  '--color-warning': '#FF9800',
  '--color-danger': '#F44336',
}

/** 深色 surface（禁纯 #000000，用 #0F0F0F） */
const SURFACE_DARK = {
  '--color-surface': '#0F0F0F',
  '--color-surface-variant': '#1A1A1A',
  '--color-success': '#4CAF50',
  '--color-warning': '#FF9800',
  '--color-danger': '#F44336',
}

function applyVars(vars: Record<string, string>) {
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useAppearanceStore((s) => s.themeId)
  const darkMode = useAppearanceStore((s) => s.darkMode)

  useEffect(() => {
    const isDark = resolveDark(darkMode)
    const palette = getTheme(themeId)
    const themeVars = isDark ? palette.dark : palette.light

    // 主题色 + 灰阶 + surface 一次性注入
    applyVars({
      ...themeVars,
      ...(isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT),
      ...(isDark ? SURFACE_DARK : SURFACE_LIGHT),
    })

    // Tailwind darkMode: 'class' — toggle .dark
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
  }, [themeId, darkMode])

  // 跟随系统时，监听系统主题变化实时更新
  useEffect(() => {
    if (darkMode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const palette = getTheme(themeId)
      const isDark = mql.matches
      applyVars({
        ...palette.dark,
        ...NEUTRAL_DARK,
        ...SURFACE_DARK,
      })
      root.classList.toggle('dark', isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [darkMode, themeId])

  return <>{children}</>
}
