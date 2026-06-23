// PwaService — beforeinstallprompt 拦截 + 主动 prompt 触发安装
// 依 docs/06 阶段 4 任务 7 + docs/05 PWA 安装策略
//
// 铁律：
// - beforeinstallprompt 只在 Chromium 系（Chrome/Edge/Android）触发
// - iOS Safari 无此事件，需引导用户用「添加到主屏幕」（UI 层提示）
// - 必须在事件回调中 preventDefault 才能保存 prompt 供后续手动调起
// - 已安装（standalone display-mode）时不再展示安装入口

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Listener = () => void

class PwaService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private listeners = new Set<Listener>()
  private installed = false

  constructor() {
    if (typeof window === 'undefined') return
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent
      this.emit()
    })
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null
      this.installed = true
      this.emit()
    })
    // 启动时判定是否已经 standalone（已安装）
    this.installed = this.isStandalone()
  }

  /** 是否处于 standalone（已安装从桌面/应用列表打开） */
  isStandalone(): boolean {
    if (typeof window === 'undefined') return false
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
    // iOS Safari 兼容字段
    const nav = window.navigator as Navigator & { standalone?: boolean }
    return nav.standalone === true
  }

  /** 是否可调起安装（仅 Chromium 系且已拿到 prompt） */
  canInstall(): boolean {
    return this.deferredPrompt !== null && !this.installed
  }

  /** 是否已安装 */
  isInstalled(): boolean {
    return this.installed || this.isStandalone()
  }

  /** 调起安装弹窗（必须在用户手势内）返回 outcome */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable'
    try {
      await this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice
      // prompt 只能用一次；用完丢弃
      this.deferredPrompt = null
      this.emit()
      return outcome
    } catch {
      return 'unavailable'
    }
  }

  /** 订阅 prompt 可用性变化 */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    this.listeners.forEach((fn) => fn())
  }
}

export const pwaService = new PwaService()
