// timerStore — Zustand 订阅 TimerService 事件，暴露 React 可用 hooks
// 依 docs/03-architecture.md 职责边界：store 订阅 service 事件
import { create } from 'zustand'
import { timerService } from '@/service/TimerService'
import { audioService } from '@/service/AudioService'
import { notificationService } from '@/service/NotificationService'
import { PersistenceService } from '@/service/PersistenceService'
import { SessionDao } from '@/service/SessionDao'
import { PresetDao } from '@/service/PresetDao'
import { ensureDefaultPreset } from '@/service/DatabaseService'
import type { TimerRuntimeState, TimerPhase } from '@/types/TimerTypes'

interface TimerStoreState {
  /** 运行时派生态（由 service tick 推送） */
  runtime: TimerRuntimeState
  /** 当前临时任务（阶段 1 内置，阶段 2 接 DatabaseService） */
  taskId: string | null
  /** 操作 action */
  start: (taskId: string | null) => void
  pause: () => void
  resume: () => void
  skip: () => void
  abandon: () => void
}

/** 阶段中文标签 */
export const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: '准备开始',
  working: '专注中',
  paused: '已暂停',
  shortBreak: '短休息',
  longBreak: '长休息',
}

// ---------- 接线：注入持久化与会话 sink ----------
timerService.setPersistence((s) => PersistenceService.saveTimerState(s))
// 番茄完成 → 自动写 PomodoroSession 入库（fire-and-forget，不阻塞 UI）
timerService.setSessionSink((session) => {
  SessionDao.add({
    taskId: session.taskId,
    startAt: session.startAt,
    endAt: session.endAt,
    plannedDuration: session.plannedDuration,
    actualDuration: session.actualDuration,
    pausedDuration: session.pausedDuration,
    status: session.status,
    presetId: session.presetId,
  }).catch((err) => console.error('[SessionDao] 写入失败', err))
})

// 应用启动：初始化默认预设（幂等），随后把上次激活的预设注入 TimerService
void (async () => {
  await ensureDefaultPreset()
  const activeId = localStorage.getItem('floattomato:active-preset') ?? 'preset-default'
  const all = await PresetDao.listAll()
  const active = all.find((p) => p.id === activeId) ?? all[0]
  if (active) timerService.setActivePreset(active)
})()

export const useTimerStore = create<TimerStoreState>((set) => ({
  runtime: timerService.getRuntime(),
  taskId: null,

  start: (taskId) => {
    audioService.unlock() // 用户手势解锁音频
    timerService.start(taskId)
    set({ taskId })
  },
  pause: () => timerService.pause(),
  resume: () => {
    audioService.unlock()
    timerService.resume()
  },
  skip: () => timerService.skip(),
  abandon: () => timerService.abandon(),
}))

// 订阅事件 → 推送 store + 副作用（必须在 useTimerStore 创建之后）
timerService.subscribe((e) => {
  if (e.type === 'tick' || e.type === 'phaseChange') {
    useTimerStore.setState({ runtime: e.state, taskId: e.state.taskId })
  }
  if (e.type === 'phaseChange') {
    // 进入工作/休息 → 轻提示
    if (e.state.phase === 'working' || e.state.phase === 'shortBreak' || e.state.phase === 'longBreak') {
      audioService.playTick()
    }
  }
  if (e.type === 'sessionEnd') {
    if (e.status === 'completed') {
      audioService.notifyComplete()
      // 番茄自然完成 → 桌面通知（仅标签页不可见时发；NotificationService 内部判断）
      const isWorkComplete = e.session.plannedDuration >= 60
      notificationService.notifyComplete(
        isWorkComplete ? '番茄完成 🍅' : '休息结束',
        isWorkComplete ? '该休息一下了' : '回来专注吧',
      )
    }
  }
})

// ---------- 冷启动恢复（订阅就绪后） ----------
const persisted = PersistenceService.loadTimerState()
if (persisted && persisted.phase !== 'idle') {
  timerService.restore(persisted)
}

/** 便捷 selector：是否运行中 */
export const useIsRunning = () =>
  useTimerStore((s) => s.runtime.phase === 'working')

/** 便捷 selector：格式化剩余 mm:ss */
export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
