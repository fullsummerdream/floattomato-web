// FocusService — 全屏专注页用：Fullscreen API + Wake Lock API
// 依 docs/06 阶段 4 任务 1/2/4 + docs/05 权限策略（静默降级）
//
// 铁律：
// - 浏览器策略：requestFullscreen 必须在用户手势内调用（直接同步执行 Promise）
// - Wake Lock 在标签页失活后会被系统释放，需 visibilitychange 重新获取
// - 不支持的浏览器（Safari iOS Wake Lock）静默降级，不抛错

interface DocFS extends Document {
  webkitFullscreenElement?: Element
  webkitExitFullscreen?: () => Promise<void>
}
interface ElFS extends Element {
  webkitRequestFullscreen?: () => Promise<void>
}

class FocusService {
  private wakeLock: WakeLockSentinel | null = null
  private wakeLockRequested = false

  /** 进入全屏（必须在用户手势同步调用栈内） */
  async enterFullscreen(target: Element = document.documentElement): Promise<boolean> {
    const el = target as ElFS
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else {
        return false
      }
      return true
    } catch {
      // 用户拒绝/被浏览器拦截：静默降级
      return false
    }
  }

  /** 退出全屏 */
  async exitFullscreen(): Promise<void> {
    const d = document as DocFS
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (d.webkitFullscreenElement && d.webkitExitFullscreen) {
        await d.webkitExitFullscreen()
      }
    } catch {
      /* noop */
    }
  }

  /** 当前是否全屏 */
  isFullscreen(): boolean {
    const d = document as DocFS
    return !!(document.fullscreenElement || d.webkitFullscreenElement)
  }

  /** 请求 Wake Lock（防熄屏） */
  async requestWakeLock(): Promise<boolean> {
    if (!('wakeLock' in navigator)) return false
    this.wakeLockRequested = true
    try {
      this.wakeLock = await navigator.wakeLock.request('screen')
      // 失活释放时清理引用
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null
      })
      return true
    } catch {
      return false
    }
  }

  /** 释放 Wake Lock */
  async releaseWakeLock(): Promise<void> {
    this.wakeLockRequested = false
    if (this.wakeLock) {
      try {
        await this.wakeLock.release()
      } catch {
        /* noop */
      }
      this.wakeLock = null
    }
  }

  /** 标签页 visible 后自动重申 Wake Lock（如果之前请求过） */
  async reacquireIfNeeded(): Promise<void> {
    if (
      this.wakeLockRequested &&
      !this.wakeLock &&
      document.visibilityState === 'visible'
    ) {
      await this.requestWakeLock()
    }
  }
}

export const focusService = new FocusService()
