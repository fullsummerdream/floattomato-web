// 根组件 — 路由 + ThemeProvider + 背景轮播
// 路由懒加载：除首页 HomePage 之外按需切割 chunk，缩 LCP
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { TabLayout } from '@/components/TabLayout'
import { BackgroundCarousel } from '@/components/BackgroundCarousel'
import { HomePage } from '@/pages/HomePage'
import { GlobalHotkeys } from '@/hooks/useGlobalHotkeys'
import { useAppearanceStore } from '@/store/appearanceStore'
import { ONBOARDED_KEY } from '@/constants/onboarding'

// 懒加载的非首屏路由 — 各自单 chunk，按访问拉取
const TaskPage = lazy(() =>
  import('@/pages/TaskPage').then((m) => ({ default: m.TaskPage })),
)
const StatsPage = lazy(() =>
  import('@/pages/StatsPage').then((m) => ({ default: m.StatsPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const AppearancePage = lazy(() =>
  import('@/pages/AppearancePage').then((m) => ({ default: m.AppearancePage })),
)
const PresetEditorPage = lazy(() =>
  import('@/pages/PresetEditorPage').then((m) => ({ default: m.PresetEditorPage })),
)
const FullscreenFocusPage = lazy(() =>
  import('@/pages/FullscreenFocusPage').then((m) => ({
    default: m.FullscreenFocusPage,
  })),
)
// 引导/关于 — 用户首启动 + 设置中触达，懒加载
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })),
)

/** 路由切换瞬态 fallback —— 极简文字，避免布局抖动 */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-400">
      加载中…
    </div>
  )
}

/** 首启动判定：localStorage 不带 ONBOARDED_KEY → 首页强重定向到 /onboarding
 *  二次启动跳过；引导页内 finish() 写 flag */
function useShouldShowOnboarding(): boolean {
  // 同步读 localStorage 避免重定向抖动（首次渲染就拿到结果）
  const [show] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(ONBOARDED_KEY)
    } catch {
      // localStorage 不可用直接跳过引导，按访客流程
      return false
    }
  })
  return show
}

export default function App() {
  const background = useAppearanceStore((s) => s.background)
  const showOnboarding = useShouldShowOnboarding()

  return (
    <ThemeProvider>
      <BackgroundCarousel preset={background} />
      <BrowserRouter>
        <GlobalHotkeys />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* 首启动引导 */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            {/* 全屏独立路由（不走 Tab 布局） */}
            <Route path="/focus" element={<FullscreenFocusPage />} />
            {/* Tab 布局路由 */}
            <Route element={<TabLayout />}>
              <Route
                path="/"
                element={
                  showOnboarding ? (
                    <Navigate to="/onboarding" replace />
                  ) : (
                    <HomePage />
                  )
                }
              />
              <Route path="/tasks" element={<TaskPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/appearance" element={<AppearancePage />} />
              <Route path="/presets" element={<PresetEditorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}
