// WhiteNoiseService — 白噪音 / 专注音轨混音（V1.2 #3 多轨 + AnalyserNode）
// 依 docs/06 V1.2 #3：在 #2 Web Audio 底座上扩多轨混音 + 频谱接入点
//
// 设计要点：
// - 内部以 Map<TrackId, ActiveTrack> 维护已激活音轨；每条独立 BufferSourceNode + GainNode
// - master GainNode 控总音量；master → AnalyserNode（旁路）→ destination
// - AnalyserNode 长期存在（lazy 创建），Spectrum 组件按需取数据
// - 对外保留旧 API（setTrack/setVolume/stop）作为 deprecated wrapper；
//   新 API：addTrack / removeTrack / setTrackVolume / getMix / getAnalyser
// - bufferCache 沿用 #2，多轨切换零额外解码开销

import { TRACKS, isUserTrack, type TrackId } from './whitenoiseTracks'
import { UserAudioDao } from './UserAudioDao'

export type WhiteNoiseStatus = 'idle' | 'loading' | 'playing' | 'missing' | 'error'

export interface MixTrackState {
  trackId: TrackId
  /** per-track 音量 0-100 */
  volume: number
  status: 'loading' | 'playing' | 'missing' | 'error'
}

export interface WhiteNoiseState {
  /** 当前激活的混音条目（顺序 = 添加顺序，用于 UI 列表稳定） */
  mix: MixTrackState[]
  /** 全局总音量 0-100（master gain） */
  masterVolume: number
  /** 派生：是否有任一轨在播 —— UI 用来判断是否显示状态条 */
  isPlaying: boolean
}

interface ActiveTrack {
  source: AudioBufferSourceNode | null
  gain: GainNode
  volume: number
  status: 'loading' | 'playing' | 'missing' | 'error'
  /** 用于丢弃过期 load 回调 */
  loadToken: number
}

type Listener = (s: WhiteNoiseState) => void

class WhiteNoiseService {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private active = new Map<TrackId, ActiveTrack>()
  /** AudioBuffer 解码缓存（id → buffer），二次激活同一轨直接复用 */
  private bufferCache = new Map<TrackId, AudioBuffer>()
  private loadingPromise = new Map<TrackId, Promise<AudioBuffer | null>>()
  private listeners = new Set<Listener>()
  private masterVolume = 60

  /** 确保 AudioContext + master + Analyser 就绪（首次用户手势触发） */
  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this.masterVolume / 100
      // analyser 拓扑：master → analyser → destination
      // fftSize 256 → 频域 128 bin，64 柱可视化用前半段（人耳敏感低中频）
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.75
      this.masterGain.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* noop — 没手势就 resume 不动，下次手势再触发 */
      })
    }
    return this.ctx
  }

  /** 订阅状态变更 */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    const s = this.getState()
    this.listeners.forEach((fn) => fn(s))
  }

  getState(): WhiteNoiseState {
    const mix: MixTrackState[] = []
    this.active.forEach((a, trackId) => {
      mix.push({ trackId, volume: a.volume, status: a.status })
    })
    const isPlaying = mix.some((m) => m.status === 'playing')
    return { mix, masterVolume: this.masterVolume, isPlaying }
  }

  /** 提供给 Spectrum 组件做频谱可视化（mix 空时仍存在，画零线即可） */
  getAnalyser(): AnalyserNode | null {
    // 不在此触发 ensureCtx —— 没用户手势时强建 AudioContext 会被浏览器警告
    return this.analyser
  }

  /** 加载 + 解码一条 track 到 AudioBuffer（命中缓存直接返回）
   *  内置音轨走 fetch /audio/*.mp3；V1.2 #4 用户音轨走 IDB blob */
  private async loadBuffer(trackId: TrackId): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(trackId)
    if (cached) return cached
    const pending = this.loadingPromise.get(trackId)
    if (pending) return pending

    const ctx = this.ensureCtx()
    if (!ctx) return null

    const p = (async () => {
      try {
        let arr: ArrayBuffer
        if (isUserTrack(trackId)) {
          // 用户上传：从 IDB 取 blob
          const blob = await UserAudioDao.getBlob(trackId)
          if (!blob) return null
          arr = await blob.arrayBuffer()
        } else {
          const track = TRACKS.find((t) => t.id === trackId)
          if (!track) return null
          const resp = await fetch(track.src)
          if (!resp.ok) return null // 404 = 用户未跑 fetch-audio
          arr = await resp.arrayBuffer()
        }
        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arr, resolve, reject)
        })
        this.bufferCache.set(trackId, buffer)
        return buffer
      } catch {
        return null
      } finally {
        this.loadingPromise.delete(trackId)
      }
    })()
    this.loadingPromise.set(trackId, p)
    return p
  }

  // ============ V1.2 #3 新 API ============

  /** 加入一条 track 到混音；若已在 mix 中则 no-op
   *  内置音轨需在 TRACKS 表里；user-* 跳过表校验（从 IDB 取） */
  addTrack(trackId: TrackId, initialVolume = 80) {
    if (this.active.has(trackId)) return
    if (!isUserTrack(trackId)) {
      const track = TRACKS.find((t) => t.id === trackId)
      if (!track) return
    }
    const ctx = this.ensureCtx()
    if (!ctx || !this.masterGain) return

    const gain = ctx.createGain()
    gain.gain.value = initialVolume / 100
    gain.connect(this.masterGain)

    const entry: ActiveTrack = {
      source: null,
      gain,
      volume: initialVolume,
      status: 'loading',
      loadToken: 0,
    }
    this.active.set(trackId, entry)
    this.emit()

    const token = ++entry.loadToken
    void this.loadBuffer(trackId).then((buffer) => {
      // 过期检查：可能已 removeTrack
      const current = this.active.get(trackId)
      if (!current || current.loadToken !== token) return
      if (!buffer) {
        current.status = 'missing'
        this.emit()
        return
      }
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      src.connect(current.gain)
      try {
        src.start(0)
      } catch {
        current.status = 'error'
        this.emit()
        return
      }
      current.source = src
      current.status = 'playing'
      this.emit()
    })
  }

  /** 从混音中移除一条 track（停止 source + 断开 gain） */
  removeTrack(trackId: TrackId) {
    const entry = this.active.get(trackId)
    if (!entry) return
    entry.loadToken++ // 让进行中的 load 回调失效
    if (entry.source) {
      try {
        entry.source.stop()
      } catch {
        /* 未启动的 source stop 会抛 InvalidStateError，忽略 */
      }
      entry.source.disconnect()
    }
    entry.gain.disconnect()
    this.active.delete(trackId)
    this.emit()
  }

  /** 切某轨独立音量（0-100），5ms 软过渡防 click */
  setTrackVolume(trackId: TrackId, volume: number) {
    const entry = this.active.get(trackId)
    if (!entry || !this.ctx) return
    const v = Math.max(0, Math.min(100, volume))
    entry.volume = v
    entry.gain.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.005)
    this.emit()
  }

  /** 全清（V1.2 #3：取代单轨 stop 的语义） */
  clearMix() {
    Array.from(this.active.keys()).forEach((id) => this.removeTrack(id))
  }

  /** 失效 buffer 缓存（V1.2 #4：用户删除上传音频后调） */
  invalidateBuffer(trackId: TrackId) {
    this.bufferCache.delete(trackId)
  }

  /** 设置 master 总音量（0-100），5ms 软过渡 */
  setMasterVolume(volume: number) {
    const v = Math.max(0, Math.min(100, volume))
    this.masterVolume = v
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.005)
    }
    this.emit()
  }

  // ============ 兼容旧 API（V1.2 #2 之前的单轨形态） ============
  // preferencesStore 老代码可能仍调；hydration 时也用到 setVolume。
  // 仅作 wrapper，不改语义。

  /** @deprecated 使用 addTrack/removeTrack；保留单轨切换语义 */
  setTrack(trackId: TrackId | null) {
    this.clearMix()
    if (trackId !== null) this.addTrack(trackId)
  }

  /** @deprecated 使用 setMasterVolume */
  setVolume(volume: number) {
    this.setMasterVolume(volume)
  }

  /** @deprecated 使用 clearMix */
  stop() {
    this.clearMix()
  }
}

export const whiteNoiseService = new WhiteNoiseService()
