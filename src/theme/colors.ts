// 8 套主题色定义 — 依 docs/02-design-system.md
// 切换主题 = 改 CSS 变量根值，全应用实时跟随

export type ThemeId =
  | 'mono' // 极简黑灰（默认）
  | 'tomato' // 番茄橙
  | 'ocean' // 静谧蓝
  | 'forest' // 森林绿
  | 'sakura' // 樱花粉
  | 'twilight' // 暮光紫
  | 'beige' // 米白原木
  | 'deepblue' // 深空蓝

export interface ThemePalette {
  id: ThemeId
  name: string
  /** 浅色模式变量值 */
  light: ThemeVars
  /** 深色模式变量值 */
  dark: ThemeVars
}

export interface ThemeVars {
  /** 主色：导航/按钮/强调文字 */
  '--color-primary': string
  /** 强调色：仅关键时刻（番茄完成、阶段标识） */
  '--color-accent': string
}

export const THEMES: ThemePalette[] = [
  {
    id: 'mono',
    name: '极简黑灰',
    light: { '--color-primary': '#1A1A1A', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#F5F5F5', '--color-accent': '#FF6B35' },
  },
  {
    id: 'tomato',
    name: '番茄橙',
    light: { '--color-primary': '#FF6B35', '--color-accent': '#E05A2B' },
    dark: { '--color-primary': '#FF7A4D', '--color-accent': '#FF6B35' },
  },
  {
    id: 'ocean',
    name: '静谧蓝',
    light: { '--color-primary': '#4A90E2', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#6BA5EA', '--color-accent': '#FF6B35' },
  },
  {
    id: 'forest',
    name: '森林绿',
    light: { '--color-primary': '#4A7C59', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#6A9C79', '--color-accent': '#FF6B35' },
  },
  {
    id: 'sakura',
    name: '樱花粉',
    light: { '--color-primary': '#E8A0BF', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#F0B8CE', '--color-accent': '#FF6B35' },
  },
  {
    id: 'twilight',
    name: '暮光紫',
    light: { '--color-primary': '#6B5B95', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#8B7BB5', '--color-accent': '#FF6B35' },
  },
  {
    id: 'beige',
    name: '米白原木',
    light: { '--color-primary': '#8B7355', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#B89A77', '--color-accent': '#FF6B35' },
  },
  {
    id: 'deepblue',
    name: '深空蓝',
    light: { '--color-primary': '#2E4374', '--color-accent': '#FF6B35' },
    dark: { '--color-primary': '#5E73A4', '--color-accent': '#FF6B35' },
  },
]

export const DEFAULT_THEME: ThemeId = 'mono'

export function getTheme(id: ThemeId): ThemePalette {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
