// 外观偏好状态 — 依 docs/03-architecture.md（appearanceStore）+ docs/06 阶段 3
// 持久化到 localStorage；ThemeProvider 订阅并注入 CSS 变量
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_THEME, type ThemeId } from '@/theme/colors'
import type { Material } from '@/components/MaterialBox'
import type { NumberStyle } from '@/components/TimerDigits'
import type { BackgroundPreset } from '@/components/BackgroundCarousel'

/** 深色模式三档：跟随系统 / 强制浅 / 强制深 */
export type DarkMode = 'system' | 'light' | 'dark'

export interface AppearanceState {
  themeId: ThemeId
  darkMode: DarkMode
  /** 主卡片材质（番茄圆环外壳） */
  material: Material
  /** 倒计时数字样式 */
  numberStyle: NumberStyle
  /** 背景渐变预设 */
  background: BackgroundPreset
  setTheme: (id: ThemeId) => void
  setDarkMode: (mode: DarkMode) => void
  setMaterial: (m: Material) => void
  setNumberStyle: (n: NumberStyle) => void
  setBackground: (b: BackgroundPreset) => void
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME,
      darkMode: 'system',
      material: 'flat',
      numberStyle: 'classic',
      background: 'off',
      setTheme: (themeId) => set({ themeId }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setMaterial: (material) => set({ material }),
      setNumberStyle: (numberStyle) => set({ numberStyle }),
      setBackground: (background) => set({ background }),
    }),
    {
      name: 'floattomato:appearance',
    },
  ),
)

/** 计算实际生效的深色态（system → matchMedia） */
export function resolveDark(mode: DarkMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}
