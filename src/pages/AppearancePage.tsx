// 外观自定义 — 主题色 + 深色模式 + 材质 + 数字样式
// 依 docs/02-design-system.md + docs/06 阶段 3 任务 9
import { ResponsivePage } from '@/components/ResponsivePage'
import { MaterialBox, type Material } from '@/components/MaterialBox'
import type { NumberStyle } from '@/components/TimerDigits'
import { TimerDigits } from '@/components/TimerDigits'
import type { BackgroundPreset } from '@/components/BackgroundCarousel'
import { THEMES, type ThemeId } from '@/theme/colors'
import {
  resolveDark,
  useAppearanceStore,
  type DarkMode,
} from '@/store/appearanceStore'
import { Sun, Moon, Monitor } from 'lucide-react'

const DARK_MODES: { value: DarkMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]

const MATERIALS: { value: Material; label: string }[] = [
  { value: 'flat', label: '扁平' },
  { value: 'glass', label: '毛玻璃' },
  { value: 'frosted', label: '厚毛玻璃' },
  { value: 'mica', label: '云母' },
  { value: 'clay', label: '黏土' },
  { value: 'neumorph', label: '新拟态' },
]

const NUMBER_STYLES: { value: NumberStyle; label: string; preview: string }[] = [
  { value: 'classic', label: '经典', preview: '25:00' },
  { value: 'thin', label: '细线', preview: '25:00' },
  { value: 'flip', label: '翻牌', preview: '25:00' },
  { value: 'dotmatrix', label: '点阵', preview: '25:00' },
]

const BACKGROUNDS: { value: BackgroundPreset; label: string; swatch: string }[] = [
  { value: 'off', label: '关闭', swatch: 'transparent' },
  { value: 'sunrise', label: '日出', swatch: 'linear-gradient(135deg,#FFE5B4,#FF8E72)' },
  { value: 'ocean', label: '海洋', swatch: 'linear-gradient(135deg,#A8D8EA,#3A6B96)' },
  { value: 'forest', label: '森林', swatch: 'linear-gradient(135deg,#C9E4CA,#4A7C59)' },
  { value: 'twilight', label: '暮光', swatch: 'linear-gradient(135deg,#C8B6E2,#4A3F7A)' },
  { value: 'random', label: '随机', swatch: 'conic-gradient(from 0deg,#FFE5B4,#A8D8EA,#C9E4CA,#C8B6E2,#FFE5B4)' },
]

export function AppearancePage() {
  const themeId = useAppearanceStore((s) => s.themeId)
  const darkMode = useAppearanceStore((s) => s.darkMode)
  const material = useAppearanceStore((s) => s.material)
  const numberStyle = useAppearanceStore((s) => s.numberStyle)
  const background = useAppearanceStore((s) => s.background)
  const setTheme = useAppearanceStore((s) => s.setTheme)
  const setDarkMode = useAppearanceStore((s) => s.setDarkMode)
  const setMaterial = useAppearanceStore((s) => s.setMaterial)
  const setNumberStyle = useAppearanceStore((s) => s.setNumberStyle)
  const setBackground = useAppearanceStore((s) => s.setBackground)

  return (
    <ResponsivePage>
      <h1 className="py-xl text-xl font-bold">外观</h1>

      {/* 主题色 */}
      <section className="flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          主题色
        </h2>
        <div className="grid grid-cols-4 gap-md">
          {THEMES.map((t) => {
            const isDark = resolveDark(darkMode)
            const swatch = isDark ? t.dark['--color-primary'] : t.light['--color-primary']
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id as ThemeId)}
                data-testid={`theme-${t.id}`}
                className={`flex flex-col items-center gap-sm rounded-lg border p-md transition-all ${
                  themeId === t.id
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <span
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: swatch }}
                />
                <span className="text-xs">{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 深色模式 */}
      <section className="mt-3xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          深色模式
        </h2>
        <div className="flex gap-md">
          {DARK_MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDarkMode(value)}
              data-testid={`dark-${value}`}
              className={`flex flex-1 items-center justify-center gap-sm rounded-lg border px-md py-lg transition-all ${
                darkMode === value
                  ? 'border-primary text-primary'
                  : 'border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400'
              }`}
            >
              <Icon size={16} />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 材质 */}
      <section className="mt-3xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          主卡片材质
        </h2>
        <div className="grid grid-cols-3 gap-md">
          {MATERIALS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMaterial(value)}
              data-testid={`material-${value}`}
              className={`flex flex-col items-center gap-sm rounded-lg border-2 p-sm transition-all ${
                material === value
                  ? 'border-primary'
                  : 'border-transparent'
              }`}
            >
              <MaterialBox
                material={value}
                className="flex h-16 w-full items-center justify-center rounded-md"
              >
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {label}
                </span>
              </MaterialBox>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          低端设备（核心数 ≤4 / 内存 ≤4G / reduced-motion）自动降级为扁平
        </p>
      </section>

      {/* 数字样式 */}
      <section className="mt-3xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          数字样式
        </h2>
        <div className="grid grid-cols-2 gap-md">
          {NUMBER_STYLES.map(({ value, label, preview }) => (
            <button
              key={value}
              type="button"
              onClick={() => setNumberStyle(value)}
              data-testid={`number-${value}`}
              className={`flex flex-col items-center gap-sm rounded-lg border p-md transition-all ${
                numberStyle === value
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <div className="flex h-16 items-center justify-center" style={{ fontSize: '1.5rem' }}>
                {/* 用小号字体预览，仍调真实组件保证样式一致 */}
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}>
                  <TimerDigits text={preview} style={value} />
                </div>
              </div>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 背景渐变 */}
      <section className="mt-3xl flex flex-col gap-md">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          背景渐变
        </h2>
        <div className="grid grid-cols-3 gap-md">
          {BACKGROUNDS.map(({ value, label, swatch }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBackground(value)}
              data-testid={`bg-${value}`}
              className={`flex flex-col items-center gap-sm rounded-lg border p-md transition-all ${
                background === value
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <span
                className="h-10 w-full rounded-md border border-neutral-200 dark:border-neutral-700"
                style={{ background: swatch }}
              />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          随机档每 12s 切换；低端档自动降为静态淡底
        </p>
      </section>

      <p className="mt-3xl text-sm text-neutral-400">
        共享元素转场（专注页）留下一轮
      </p>
    </ResponsivePage>
  )
}
