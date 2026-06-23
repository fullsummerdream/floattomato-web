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
import { achievementService } from '@/service/AchievementService'
import { useAchievementToastStore } from '@/store/achievementToastStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { useDiaryQueueStore } from '@/store/diaryQueueStore'
import { TaskDao } from '@/service/TaskDao'
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
// 入库完成后串联成就评估 → toast → 日记触发（V1.2 #1）
// 撞车规避：有新成就则 3.5s 后再触发日记，否则立即（让用户看清成就 toast）
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
  })
    .then(async (savedSession) => {
      // V1.1 #4 — 仅 completed 触发成就评估，开关关时静默
      if (session.status !== 'completed') return
      const enabled = usePreferencesStore.getState().achievementsEnabled
      let newlyCount = 0
      if (enabled) {
        const newly = await achievementService.evaluate()
        if (newly.length > 0) {
          useAchievementToastStore.getState().push(newly)
          newlyCount = newly.length
        }
      }
      // V1.2 #1 — 日记触发：mode === 'off' 不弹；否则按撞车规避入队
      const mode = usePreferencesStore.getState().diaryTriggerMode
      if (mode === 'off') return
      // 查任务名供编辑器顶部显示（无任务返回 undefined，editor 隐藏 taskName 行）
      const taskName = savedSession.taskId
        ? (await TaskDao.get(savedSession.taskId))?.name
        : undefined
      const enqueueDiary = () => {
        useDiaryQueueStore.getState().enqueue({
          sessionId: savedSession.id,
          taskName,
        })
      }
      if (newlyCount > 0) {
        // 成就 toast 3s 自动消 + 0.5s 缓冲，让「双喜临门」有从容感
        window.setTimeout(enqueueDiary, 3500)
      } else {
        enqueueDiary()
      }
    })
    .catch((err) => console.error('[SessionDao/Achievement/Diary] 链失败', err))
})

// 应用启动：初始化默认预设（幂等），随后把上次激活的预设注入 TimerService
void (async () => {
  await ensureDefaultPreset()
  const activeId = localStorage.getItem('floattomato:active-preset') ?? 'preset-default'
  const all = await PresetDao.listAll()
  const active = all.find((p) => p.id === activeId) ?? all[0]
  if (active) timerService.setActivePreset(active)
})()

// 应用启动 IIFE：成就首扫静默（评估但不弹 toast，避免久不开 app 后排队骚扰）
// 设计依据：docs/10-decisions-log 「2026-06-23 V1.1 #4」决策 2「双触发点 + 首扫静默」
void (async () => {
  try {
    await achievementService.evaluate()
  } catch (err) {
    console.error('[Achievement] 启动首扫失败', err)
  }
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
      // 成就评估在 sessionSink → SessionDao.add().then() 链里完成，保证 evaluate 读到新写入
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
