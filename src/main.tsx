// 入口 — 挂载根组件
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
// 引入 preferencesStore 触发 hydration（把 volume/vibrate/pauseLimit 灌进 service 单例）
import '@/store/preferencesStore'

// PWA SW 注册（autoUpdate：新版可用时静默接管，下次打开生效）
if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
