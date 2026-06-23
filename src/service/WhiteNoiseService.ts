// WhiteNoiseService — 白噪音 / 专注音轨播放（HTML5 audio 循环）
// 依 docs/06 V1.1 任务 #2：15 段内置音轨，独立于番茄状态，独立音量
//
// 设计要点：
// - 单 <audio> 元素复用，切换 src 时旧实例 pause + new src + play
// - loop=true 浏览器原生无缝循环
// - 音轨文件 404（用户未下载）→ emit error 事件，UI 显示「音轨缺失」
// - 音量 0-100 连续值，映射 audio.volume 0-1
// - 与 audioService（提示音）完全独立，避免互相干扰

import { TRACKS, type TrackId } from './whitenoiseTracks'

export type WhiteNoiseStatus = 'idle' | 'loading' | 'playing' | 'missing' | 'error'

export interface WhiteNoiseState {
  trackId: TrackId | null
  volume: number // 0-100
  status: WhiteNoiseStatus
}

type Listener = (s: WhiteNoiseState) => void

class WhiteNoiseService {
  private audio: HTMLAudioElement | null = null
  private listeners = new Set<Listener>()
  private state: WhiteNoiseState = {
    trackId: null,
    volume: 60,
    status: 'idle',
  }

  /** 初始化（首次用户交互时调用，浏览器策略需手势） */
  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.loop = true
      this.audio.preload = 'auto'
      this.audio.volume = this.state.volume / 100
      // 加载失败 = 用户没下载该文件 → missing 态
      // 守卫：stop() 内 removeAttribute('src') + load() 会异步触发空 src 的 error，
      // 此时 trackId 已置 null，不应误标 missing 覆盖 idle 态。
      this.audio.addEventListener('error', () => {
        if (this.state.trackId === null) return
        this.update({ status: 'missing' })
      })
      this.audio.addEventListener('canplay', () => {
        if (this.state.status === 'loading') {
          this.update({ status: 'playing' })
        }
      })
    }
    return this.audio
  }

  /** 订阅状态变更 */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private update(patch: Partial<WhiteNoiseState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((fn) => fn(this.state))
  }

  getState(): WhiteNoiseState {
    return this.state
  }

  /** 切到指定音轨；传 null 则停止 */
  setTrack(trackId: TrackId | null) {
    if (trackId === null) {
      this.stop()
      return
    }
    const track = TRACKS.find((t) => t.id === trackId)
    if (!track) return

    const audio = this.ensureAudio()
    if (!audio) return

    // 同一音轨切换不重载
    if (this.state.trackId === trackId && !audio.paused) return

    audio.pause()
    audio.src = track.src
    audio.currentTime = 0
    this.update({ trackId, status: 'loading' })
    audio.play().catch((err: unknown) => {
      // NotAllowedError = 浏览器自动播放策略阻止（缺少用户手势），用户手动点会再次触发，留在 loading 不合适 → 回 idle
      // 其他错误（src 还未就绪等）由 error 事件统一标 missing，这里不重复
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError') {
        this.update({ status: 'idle', trackId: null })
      }
    })
  }

  /** 停止播放 */
  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
    }
    this.update({ trackId: null, status: 'idle' })
  }

  /** 设置音量（0-100） */
  setVolume(volume: number) {
    const v = Math.max(0, Math.min(100, volume))
    if (this.audio) this.audio.volume = v / 100
    this.update({ volume: v })
  }
}

export const whiteNoiseService = new WhiteNoiseService()
