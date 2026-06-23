// Tab 布局 — 依 docs/02 响应式断点表
// sm/md：底部 Tab；lg：侧边 Tab
import { NavLink, Outlet } from 'react-router-dom'
import { Timer, ListTodo, BarChart3, Settings, Palette, SlidersHorizontal } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const TABS = [
  { to: '/', label: '计时', icon: Timer, end: true },
  { to: '/tasks', label: '任务', icon: ListTodo, end: false },
  { to: '/stats', label: '统计', icon: BarChart3, end: false },
  { to: '/presets', label: '预设', icon: SlidersHorizontal, end: false },
  { to: '/appearance', label: '外观', icon: Palette, end: false },
  { to: '/settings', label: '设置', icon: Settings, end: false },
]

export function TabLayout() {
  const { isDesktop } = useBreakpoint()

  if (isDesktop) {
    // 侧边 Tab（PC / 平板横屏）
    return (
      <div className="flex h-full">
        <nav className="flex w-56 shrink-0 flex-col gap-xs border-r border-neutral-200 p-md dark:border-neutral-800">
          <div className="px-sm py-lg text-lg font-bold">飘悠番茄</div>
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-sm rounded-md px-md py-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-surface'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  // 底部 Tab（手机 / 平板竖屏）
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="flex shrink-0 border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] dark:border-neutral-800">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-sm text-xs transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
