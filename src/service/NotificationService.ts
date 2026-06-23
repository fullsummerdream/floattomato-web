// NotificationService — Notification API 番茄完成桌面通知
// 依 docs/06 阶段 4 任务 8 + docs/05 权限策略（静默降级）
//
// 铁律：
// - 仅在用户手势触发 requestPermission（不主动弹权限）
// - default/denied 静默降级（不抛错、不打扰用户）
// - 标签页可见时不发通知（用户已经看到了）

class NotificationService {
  enabled = true

  /** 当前权限状态 */
  permission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  }

  /** 请求授权（必须在用户手势内调用） */
  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    if (Notification.permission === 'granted') return 'granted'
    try {
      const result = await Notification.requestPermission()
      return result
    } catch {
      return 'denied'
    }
  }

  /** 番茄完成通知（标签页可见时不发，避免打扰） */
  notifyComplete(title: string, body: string) {
    if (!this.enabled) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    // 标签页处于可见状态时不发：用户已看到完成动画
    if (document.visibilityState === 'visible') return
    try {
      new Notification(title, {
        body,
        // 默认 favicon 已够用，PWA 图标留下一轮
        tag: 'pomodoro-complete', // 同 tag 替换旧通知，避免堆叠
      })
    } catch {
      /* noop */
    }
  }
}

export const notificationService = new NotificationService()
