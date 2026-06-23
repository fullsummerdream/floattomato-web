// AudioService — 提示音（Web Audio）+ 振动（Vibration API）
// 依 docs/05-tech-stack.md 权限策略 + docs/07 铁律（静默降级）
// 无音频文件，纯合成（避免网络请求 + 包体积）

class AudioService {
  private ctx: AudioContext | null = null
  soundEnabled = true
  vibrateEnabled = true

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
    }
    // 浏览器策略：需用户手势后才能 resume
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* noop */
      })
    }
    return this.ctx
  }

  /** 首次用户手势时调用，解锁音频上下文 */
  unlock() {
    this.getCtx()
  }

  /** 播放提示音 — 三声升调（番茄完成） */
  playComplete() {
    if (!this.soundEnabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    const now = ctx.currentTime
    // 三声升调 660 → 880 → 1100 Hz
    ;[660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.14)
    })
  }

  /** 阶段切换轻提示 — 单声短音 */
  playTick() {
    if (!this.soundEnabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.11)
  }

  /** 振动 — Android Chrome 支持，iOS 静默降级 */
  vibrate(pattern: number | number[] = [100, 50, 100]) {
    if (!this.vibrateEnabled) return
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
    try {
      navigator.vibrate(pattern)
    } catch {
      /* noop */
    }
  }

  /** 番茄完成：提示音 + 振动 */
  notifyComplete() {
    this.playComplete()
    this.vibrate([100, 50, 100, 50, 200])
  }
}

export const audioService = new AudioService()
