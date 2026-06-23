// statsStore — 统计聚合（今日/本周/本月/总计 + 任务分布）
// 依 docs/06 阶段 2 任务 5
import { create } from 'zustand'
import { SessionDao } from '@/service/SessionDao'
import { TaskDao } from '@/service/TaskDao'
import type { PomodoroSession, Task } from '@/types/TimerTypes'

export type StatsRange = 'today' | 'week' | 'month' | 'all'

export interface StatsSummary {
  /** 完成番茄数 */
  count: number
  /** 专注总秒数 */
  totalSeconds: number
  /** 中断/放弃数 */
  interrupted: number
}

export interface TaskDistItem {
  taskId: string | null
  taskName: string
  taskColor: string
  seconds: number
  /** 占比 0-1 */
  ratio: number
}

interface StatsStoreState {
  range: StatsRange
  summary: StatsSummary
  distribution: TaskDistItem[]
  loading: boolean
  setRange: (r: StatsRange) => void
  refresh: () => Promise<void>
}

function rangeBounds(range: StatsRange): { start: number; end: number } {
  const end = Date.now()
  switch (range) {
    case 'today':
      return { start: SessionDao.startOfToday(), end }
    case 'week':
      return { start: SessionDao.startOfThisWeek(), end }
    case 'month':
      return { start: SessionDao.startOfThisMonth(), end }
    case 'all':
      return { start: 0, end }
  }
}

async function buildDistribution(
  sessions: PomodoroSession[],
): Promise<TaskDistItem[]> {
  // 聚合 by taskId
  const map = new Map<string, number>()
  sessions
    .filter((s) => s.status === 'completed')
    .forEach((s) => {
      const key = s.taskId ?? '__no_task__'
      map.set(key, (map.get(key) ?? 0) + s.actualDuration)
    })

  const total = [...map.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return []

  // 取任务名/色
  const allTasks = await TaskDao.listActive(true)
  const taskMap = new Map<string, Task>(allTasks.map((t) => [t.id, t]))

  return [...map.entries()]
    .map(([taskId, seconds]) => {
      const task = taskId === '__no_task__' ? null : taskMap.get(taskId)
      return {
        taskId: taskId === '__no_task__' ? null : taskId,
        taskName: task?.name ?? '未关联任务',
        taskColor: task?.color ?? '#7A7A7A',
        seconds,
        ratio: seconds / total,
      }
    })
    .sort((a, b) => b.seconds - a.seconds)
}

export const useStatsStore = create<StatsStoreState>((set, get) => ({
  range: 'today',
  summary: { count: 0, totalSeconds: 0, interrupted: 0 },
  distribution: [],
  loading: true,

  setRange: (range) => {
    set({ range })
    void get().refresh()
  },

  refresh: async () => {
    set({ loading: true })
    const { range } = get()
    const { start, end } = rangeBounds(range)
    const sessions =
      range === 'all'
        ? await SessionDao.queryAll()
        : await SessionDao.queryByRange(start, end)

    const completed = sessions.filter((s) => s.status === 'completed')
    const interrupted = sessions.filter(
      (s) => s.status === 'interrupted' || s.status === 'abandoned',
    )
    const totalSeconds = completed.reduce((a, s) => a + s.actualDuration, 0)

    const distribution = await buildDistribution(sessions)

    set({
      summary: {
        count: completed.length,
        totalSeconds,
        interrupted: interrupted.length,
      },
      distribution,
      loading: false,
    })
  },
}))
