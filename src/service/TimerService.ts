// TimerService — 计时核心状态机（项目核心逻辑，单一信源）
// 依 docs/03-architecture.md 状态机 + docs/07-pitfalls.md 铁律 1/2
//
// 铁律：
// - 纯 TS 单例，禁 import React（03 职责边界）
// - 计时用 Date.now() 算剩余，禁 setInterval 累加（铁律 2）
// - setInterval 仅作 1Hz UI 刷新触发，后台被节流不影响准确性（回前台校准）
// - 状态变更立即持久化（铁律）
import type {
  PersistedTimerState,
  TimerPhase,
  TimerRuntimeState,
  PomodoroSession,
  SessionStatus,
} from '@/types/TimerTypes'
import { DEFAULT_PRESET } from '@/service/presetConstants'

/** 状态机事件 */
export type TimerEvent =
  | { type: 'tick'; state: TimerRuntimeState }
  | { type: 'phaseChange'; state: TimerRuntimeState }
  | {
      type: 'sessionEnd'
      status: SessionStatus
      session: PomodoroSession
      nextPhase: TimerPhase
    }
  | { type: 'error'; message: string }

type Listener = (e: TimerEvent) => void

/** 暂停限时默认 300 秒（可配置，0 = 不限时） */
const DEFAULT_PAUSE_LIMIT = 300

class TimerService {
  private state: PersistedTimerState
  private listeners = new Set<Listener>()
  private tickHandle: ReturnType<typeof setInterval> | null = null
  private pauseTimeoutHandle: ReturnType<typeof setTimeout> | null = null

  /** 当前生效预设（默认即 DEFAULT_PRESET，可由 store 通过 setActivePreset 切换） */
  private activePreset = DEFAULT_PRESET

  /** 暂停限时（秒），0 = 不限时 */
  pauseLimit = DEFAULT_PAUSE_LIMIT
  pauseLimitUnlimited = false

  /** 持久化回调（由 PersistenceService 注入，避免直接耦合 localStorage） */
  private persistFn: ((s: PersistedTimerState) => void) | null = null
  /** 会话结束入库回调（阶段 2 由 DatabaseService 注入） */
  private onSessionEndFn: ((s: PomodoroSession) => void) | null = null

  constructor() {
    this.state = this.freshIdle()
  }

  /** 初始 Idle 态 */
  private freshIdle(): PersistedTimerState {
    return {
      phase: 'idle',
      startAt: 0,
      pauseStartedAt: null,
      accumulatedPause: 0,
      roundCount: 0,
      presetId: DEFAULT_PRESET.id,
      taskId: null,
      totalSeconds: 0,
      updatedAt: 0,
    }
  }

  // ---------- 订阅 ----------
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(e: TimerEvent) {
    this.listeners.forEach((l) => l(e))
  }

  // ---------- 依赖注入 ----------
  setPersistence(fn: (s: PersistedTimerState) => void) {
    this.persistFn = fn
  }
  setSessionSink(fn: (s: PomodoroSession) => void) {
    this.onSessionEndFn = fn
  }
  /** 切换生效预设（仅 idle 态允许，避免破坏进行中的状态机） */
  setActivePreset(preset: typeof DEFAULT_PRESET) {
    if (this.state.phase !== 'idle') return
    this.activePreset = preset
  }
  /** 取当前生效预设（store 读 longBreakInterval 显示用） */
  getActivePreset() {
    return this.activePreset
  }

  // ---------- 派生运行时态 ----------
  /** 用 Date.now() 算剩余 — 核心校准逻辑 */
  getRuntime(now = Date.now()): TimerRuntimeState {
    const s = this.state
    if (s.phase === 'idle') {
      // Idle 态预览工作番茄时长（待开始）
      return {
        phase: 'idle',
        remaining: DEFAULT_PRESET.workDuration,
        totalSeconds: DEFAULT_PRESET.workDuration,
        roundCount: s.roundCount,
        taskId: s.taskId,
        presetId: s.presetId,
        progress: 0,
      }
    }

    // 暂停态：剩余冻结在暂停那一刻
    if (s.phase === 'paused') {
      const elapsedAtPause =
        (s.pauseStartedAt! - s.startAt - s.accumulatedPause) / 1000
      const remaining = Math.max(0, s.totalSeconds - elapsedAtPause)
      return {
        phase: 'paused',
        remaining,
        totalSeconds: s.totalSeconds,
        roundCount: s.roundCount,
        taskId: s.taskId,
        presetId: s.presetId,
        progress: s.totalSeconds > 0 ? 1 - remaining / s.totalSeconds : 0,
      }
    }

    // 进行中态（working / shortBreak / longBreak）
    const elapsed = (now - s.startAt - s.accumulatedPause) / 1000
    const remaining = Math.max(0, s.totalSeconds - elapsed)
    return {
      phase: s.phase,
      remaining,
      totalSeconds: s.totalSeconds,
      roundCount: s.roundCount,
      taskId: s.taskId,
      presetId: s.presetId,
      progress: s.totalSeconds > 0 ? 1 - remaining / s.totalSeconds : 0,
    }
  }

  // ---------- 持久化 ----------
  private persist() {
    this.state.updatedAt = Date.now()
    this.persistFn?.(this.state)
  }

  // ---------- 1Hz tick ----------
  private startTick() {
    if (this.tickHandle) return
    this.tickHandle = setInterval(() => {
      const rt = this.getRuntime()
      this.emit({ type: 'tick', state: rt })
      // 进行中检测是否到点
      if (
        rt.phase !== 'idle' &&
        rt.phase !== 'paused' &&
        rt.remaining <= 0
      ) {
        this.completeCurrentPhase()
      }
    }, 1000)
  }

  private stopTick() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle)
      this.tickHandle = null
    }
  }

  // ---------- 暂停限时 ----------
  private armPauseLimit() {
    this.clearPauseLimit()
    if (this.pauseLimitUnlimited || this.pauseLimit <= 0) return
    if (this.state.phase !== 'paused') return
    this.pauseTimeoutHandle = setTimeout(() => {
      // 超时未恢复 → 自动 Interrupted
      this.interrupt('暂停超时自动放弃')
    }, this.pauseLimit * 1000)
  }

  private clearPauseLimit() {
    if (this.pauseTimeoutHandle) {
      clearTimeout(this.pauseTimeoutHandle)
      this.pauseTimeoutHandle = null
    }
  }

  // ---------- 公共操作 ----------

  /** 开始工作番茄 */
  start(taskId: string | null, preset = this.activePreset) {
    if (this.state.phase !== 'idle') return
    this.activePreset = preset
    const now = Date.now()
    this.state = {
      phase: 'working',
      startAt: now,
      pauseStartedAt: null,
      accumulatedPause: 0,
      roundCount: this.state.roundCount,
      presetId: preset.id,
      taskId,
      totalSeconds: preset.workDuration,
      updatedAt: now,
    }
    this.persist()
    this.startTick()
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  /** 暂停（仅 Working 可暂停） */
  pause() {
    if (this.state.phase !== 'working') return
    this.state.phase = 'paused'
    this.state.pauseStartedAt = Date.now()
    this.persist()
    this.armPauseLimit()
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  /** 恢复 */
  resume() {
    if (this.state.phase !== 'paused') return
    const now = Date.now()
    // 暂停时长累加
    this.state.accumulatedPause += now - (this.state.pauseStartedAt ?? now)
    this.state.pauseStartedAt = null
    this.state.phase = 'working'
    this.persist()
    this.clearPauseLimit()
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  /** 跳过当前阶段（直接 done，记实际时长） */
  skip() {
    if (this.state.phase === 'idle') return
    this.completeCurrentPhase(true)
  }

  /** 放弃当前番茄 → Idle，status = abandoned */
  abandon() {
    if (this.state.phase === 'idle') return
    this.endSession('abandoned')
    this.resetToIdle()
  }

  /** 暂停超时/异常中断 → Interrupted */
  interrupt(_reason: string) {
    if (this.state.phase === 'idle') return
    this.endSession('interrupted')
    this.resetToIdle()
  }

  // ---------- 内部：阶段完成 ----------

  /** 当前阶段到点或被跳过 */
  private completeCurrentPhase(skipped = false) {
    const finishedPhase = this.state.phase
    if (finishedPhase === 'idle' || finishedPhase === 'paused') return

    // working 完成 → 记一条 completed session
    if (finishedPhase === 'working') {
      this.endSession(skipped ? 'interrupted' : 'completed')
    }
    // 休息阶段结束不产 session

    // 推进下一阶段
    const next = this.computeNextPhase(finishedPhase)
    this.transitionTo(next)
  }

  /** 计算下一相位 */
  private computeNextPhase(cur: TimerPhase): TimerPhase {
    if (cur === 'working') {
      // 每长休间隔轮后进长休
      const completed = this.state.roundCount + 1
      if (completed % this.activePreset.longBreakInterval === 0) {
        return 'longBreak'
      }
      return 'shortBreak'
    }
    // 休息结束 → 回到 working（新一轮）
    return 'working'
  }

  /** 切到新相位并启动计时 */
  private transitionTo(next: TimerPhase) {
    const now = Date.now()
    const preset = this.activePreset

    if (next === 'working') {
      // 新一轮工作
      this.state = {
        ...this.state,
        phase: 'working',
        startAt: now,
        pauseStartedAt: null,
        accumulatedPause: 0,
        roundCount: this.state.roundCount + 1,
        totalSeconds: preset.workDuration,
        updatedAt: now,
      }
    } else {
      // 进入休息
      const breakSeconds =
        next === 'longBreak' ? preset.longBreak : preset.shortBreak
      this.state = {
        ...this.state,
        phase: next,
        startAt: now,
        pauseStartedAt: null,
        accumulatedPause: 0,
        totalSeconds: breakSeconds,
        updatedAt: now,
      }
    }

    this.persist()
    this.startTick()
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  /** 产出 PomodoroSession 并交给 sink 入库 */
  private endSession(status: SessionStatus) {
    if (this.state.phase === 'idle') return
    const now = Date.now()
    const startAt = this.state.startAt
    const pausedDuration = Math.round(this.state.accumulatedPause / 1000)
    const actualDuration = Math.round(
      (now - startAt - this.state.accumulatedPause) / 1000,
    )
    const session: PomodoroSession = {
      id: `${now}-${crypto.randomUUID()}`,
      uid: 'local',
      taskId: this.state.taskId,
      startAt,
      endAt: now,
      plannedDuration: this.state.totalSeconds,
      actualDuration: Math.max(0, actualDuration),
      pausedDuration,
      status,
      presetId: this.state.presetId,
      note: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'local',
    }
    this.onSessionEndFn?.(session)
    this.emit({
      type: 'sessionEnd',
      status,
      session,
      nextPhase: this.computeNextPhase(this.state.phase),
    })
  }

  private resetToIdle() {
    this.stopTick()
    this.clearPauseLimit()
    this.state = {
      ...this.freshIdle(),
      roundCount: this.state.roundCount, // 保留轮次计数
    }
    this.persist()
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  // ---------- 冷启动恢复 ----------

  /** 从持久化态恢复（应用启动时调用） */
  restore(persisted: PersistedTimerState) {
    this.state = { ...persisted }
    // 校准：若进行中但已超时，按规则推进
    const rt = this.getRuntime()
    if (
      rt.phase !== 'idle' &&
      rt.phase !== 'paused' &&
      rt.remaining <= 0
    ) {
      // 离线期间已到点 → 工作阶段记 completed（回前台补记）
      if (rt.phase === 'working') {
        this.endSession('completed')
      }
      const next = this.computeNextPhase(rt.phase)
      this.transitionTo(next)
    } else if (rt.phase !== 'idle') {
      this.startTick()
      if (rt.phase === 'paused') this.armPauseLimit()
    }
    this.emit({ type: 'phaseChange', state: this.getRuntime() })
  }

  /** 后台回前台校准入口（useVisibilityCalibration 调用） */
  calibrate() {
    const rt = this.getRuntime()
    if (rt.phase === 'idle' || rt.phase === 'paused') return
    if (rt.remaining <= 0) {
      this.completeCurrentPhase()
    } else {
      this.emit({ type: 'tick', state: rt })
    }
  }

  /** 当前持久化态快照 */
  getPersisted(): PersistedTimerState {
    return { ...this.state }
  }
}

// 单例
export const timerService = new TimerService()
