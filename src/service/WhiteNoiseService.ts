// WhiteNoiseService — 白噪音 / 专注音轨播放（Web Audio API 单轨）
// 依 docs/06 V1.2 #2 多轨混音底座：HTML5 audio → Web Audio API 重写
//
// 设计要点：
// - 单 master GainNode 控音量；每次 setTrack 创建一个新的 BufferSourceNode（一次性 + loop=true）
// - 通过 fetch + decodeAudioData 把每条 track 解码缓存到 bufferCache，二次切回秒级响应
// - 加载失败 / decode 失败 / 404 → emit 'missing' 态
// - 浏览器手势策略：ctx.state==='suspended' 走 resume；NotAllowedError 由 AudioContext 内部消化
// - 对外 API 与上一版完全一致（setTrack / setVolume / stop / subscribe / getState），UI/store 零改动
// - 不复用 AudioService.ctx（避免提示音/白噪音耦合）；V1.2 #3 真做多轨混音时再抽 master ctx

import { TRACKS, type TrackId } from './whitenoiseTracks'

export type WhiteNoiseStatus = 'idle' | 'loading' | 'playing' | 'missing' | 'error'

export interface WhiteNoiseState {
  trackId: TrackId | null
  volume: number // 0-100
  status: WhiteNoiseStatus
}

type Listener = (s: WhiteNoiseState) => void

class WhiteNoiseService {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private source: AudioBufferSourceNode | null = null
  /** 解码后 AudioBuffer 缓存（id → buffer），二次切回同一音轨无需重新 fetch/decode */
  private bufferCache = new Map<TrackId, AudioBuffer>()
  /** 进行中的 load Promise，避免同一 track 重复并发请求 */
  private loadingPromise = new Map<TrackId, Promise<AudioBuffer | null>>()
  /** 用于忽略「旧 load 完成时新 track 已切走」的过期回调 */
  private currentLoadToken = 0
  private listeners = new Set<Listener>()
  private state: WhiteNoiseState = {
    trackId: null,
    volume: 60,
    status: 'idle',
  }

  /** 确保 AudioContext + master gain 就绪（首次用户手势触发） */
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
      this.masterGain.gain.value = this.state.volume / 100
      this.masterGain.connect(this.ctx.destination)
    }
    // 浏览器策略：suspended 状态需 resume（用户手势上下文中安全调用）
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

  private update(patch: Partial<WhiteNoiseState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((fn) => fn(this.state))
  }

  getState(): WhiteNoiseState {
    return this.state
  }

  /** 加载 + 解码一条 track 到 buffer（命中缓存直接返回） */
  private async loadBuffer(track: { id: TrackId; src: string }): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(track.id)
    if (cached) return cached
    const pending = this.loadingPromise.get(track.id)
    if (pending) return pending

    const ctx = this.ensureCtx()
    if (!ctx) return null

    const p = (async () => {
      try {
        const resp = await fetch(track.src)
        if (!resp.ok) return null // 404 = 用户未下载
        const arr = await resp.arrayBuffer()
        // decodeAudioData 兼容 Safari 老 callback 形态：用 Promise 包一层
        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          ctx.decodeAudioData(arr, resolve, reject)
        })
        this.bufferCache.set(track.id, buffer)
        return buffer
      } catch {
        return null
      } finally {
        this.loadingPromise.delete(track.id)
      }
    })()
    this.loadingPromise.set(track.id, p)
    return p
  }

  /** 停掉当前 source（不动 ctx / masterGain，复用） */
  private stopSource() {
    if (this.source) {
      try {
        this.source.stop()
      } catch {
        /* 未启动的 source stop 会抛 InvalidStateError，忽略 */
      }
      this.source.disconnect()
      this.source = null
    }
  }

  /** 切到指定音轨；传 null 则停止 */
  setTrack(trackId: TrackId | null) {
    if (trackId === null) {
      this.stop()
      return
    }
    const track = TRACKS.find((t) => t.id === trackId)
    if (!track) return

    const ctx = this.ensureCtx()
    if (!ctx || !this.masterGain) return

    // 同一音轨已在播 → no-op
    if (this.state.trackId === trackId && this.source) return

    // 切轨：停旧 source，进 loading 态
    this.stopSource()
    this.update({ trackId, status: 'loading' })
    const token = ++this.currentLoadToken

    void this.loadBuffer(track).then((buffer) => {
      // 过期 token：用户已切走或停掉，丢弃本次结果
      if (token !== this.currentLoadToken) return
      if (!buffer) {
        this.update({ status: 'missing' })
        return
      }
      // 此处可能 ensureCtx 后 ctx 仍 suspended（无手势），不阻塞 start——
      // start 在 suspended ctx 上排队，resume 后会接着播；不需特殊处理。
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      src.connect(this.masterGain!)
      try {
        src.start(0)
      } catch {
        // start 已被调用过的极端竞态：直接当 error
        this.update({ status: 'error' })
        return
      }
      this.source = src
      this.update({ status: 'playing' })
    })
  }

  /** 停止播放 */
  stop() {
    this.currentLoadToken++ // 让进行中的 load 回调失效
    this.stopSource()
    this.update({ trackId: null, status: 'idle' })
  }

  /** 设置音量（0-100） */
  setVolume(volume: number) {
    const v = Math.max(0, Math.min(100, volume))
    if (this.masterGain && this.ctx) {
      // setTargetAtTime 5ms 软过渡，避免数字突变 click 杂音
      this.masterGain.gain.setTargetAtTime(v / 100, this.ctx.currentTime, 0.005)
    }
    this.update({ volume: v })
  }
}

export const whiteNoiseService = new WhiteNoiseService()
