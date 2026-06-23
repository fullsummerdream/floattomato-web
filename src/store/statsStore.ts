// statsStore — 统计聚合（今日/本周/本月/总计 + 任务分布 + 最近记录时间线）
// 依 docs/06 阶段 2 任务 5 + V1.1 #3 时间线
import { create } from 'zustand'
import { SessionDao } from '@/service/SessionDao'
import { TaskDao } from '@/service/TaskDao'
import type { PomodoroSession, SessionStatus, Task } from '@/types/TimerTypes'

export type StatsRange = 'today' | 'week' | 'month' | 'all'
/** 时间线状态筛选 */
export type TimelineFilter = 'all' | 'completed' | 'interrupted'

/** 时间线每页条数 */
const TIMELINE_PAGE = 20

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

/** 时间线条目（含解析后的任务名/色，避免视图层再 lookup） */
export interface TimelineItem {
  id: string
  taskId: string | null
  taskName: string
  taskColor: string
  startAt: number
  endAt: number
  actualDuration: number
  status: SessionStatus
}

interface StatsStoreState {
  range: StatsRange
  summary: StatsSummary
  distribution: TaskDistItem[]
  loading: boolean
  /** 时间线 */
  timeline: TimelineItem[]
  /** 当前已加载条数 = timeline.length；total = 当前 range+filter 下的总数 */
  timelineTotal: number
  timelineFilter: TimelineFilter
  timelineLoading: boolean
  setRange: (r: StatsRange) => void
  refresh: () => Promise<void>
  setTimelineFilter: (f: TimelineFilter) => void
  loadMoreTimeline: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
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

/** filter → SessionStatus 白名单（空数组 = 全部） */
function filterToStatuses(f: TimelineFilter): SessionStatus[] {
  switch (f) {
    case 'completed':
      return ['completed']
    case 'interrupted':
      return ['interrupted', 'abandoned']
    case 'all':
      return []
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

/** 把 PomodoroSession[] 解析为 TimelineItem[]（注入任务名/色） */
async function resolveTimeline(
  sessions: PomodoroSession[],
): Promise<TimelineItem[]> {
  if (sessions.length === 0) return []
  const allTasks = await TaskDao.listActive(true)
  const taskMap = new Map<string, Task>(allTasks.map((t) => [t.id, t]))
  return sessions.map((s) => {
    const task = s.taskId ? taskMap.get(s.taskId) : null
    return {
      id: s.id,
      taskId: s.taskId,
      taskName: task?.name ?? '未关联任务',
      taskColor: task?.color ?? '#7A7A7A',
      startAt: s.startAt,
      endAt: s.endAt,
      actualDuration: s.actualDuration,
      status: s.status,
    }
  })
}

export const useStatsStore = create<StatsStoreState>((set, get) => ({
  range: 'today',
  summary: { count: 0, totalSeconds: 0, interrupted: 0 },
  distribution: [],
  loading: true,
  timeline: [],
  timelineTotal: 0,
  timelineFilter: 'all',
  timelineLoading: false,

  setRange: (range) => {
    set({ range })
    void get().refresh()
  },

  setTimelineFilter: (f) => {
    set({ timelineFilter: f, timeline: [], timelineTotal: 0 })
    void get().loadMoreTimeline()
  },

  refresh: async () => {
    set({ loading: true })
    const { range, timelineFilter } = get()
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

    // 同步重置时间线 — 跟随当前 range
    const { items, total } = await SessionDao.queryRecent({
      start: range === 'all' ? undefined : start,
      end: range === 'all' ? undefined : end,
      statuses: filterToStatuses(timelineFilter),
      offset: 0,
      limit: TIMELINE_PAGE,
    })
    const timeline = await resolveTimeline(items)

    set({
      summary: {
        count: completed.length,
        totalSeconds,
        interrupted: interrupted.length,
      },
      distribution,
      timeline,
      timelineTotal: total,
      loading: false,
    })
  },

  loadMoreTimeline: async () => {
    const { range, timelineFilter, timeline } = get()
    set({ timelineLoading: true })
    const { start, end } = rangeBounds(range)
    const { items, total } = await SessionDao.queryRecent({
      start: range === 'all' ? undefined : start,
      end: range === 'all' ? undefined : end,
      statuses: filterToStatuses(timelineFilter),
      offset: timeline.length,
      limit: TIMELINE_PAGE,
    })
    const more = await resolveTimeline(items)
    set({
      timeline: [...timeline, ...more],
      timelineTotal: total,
      timelineLoading: false,
    })
  },

  deleteSession: async (id) => {
    await SessionDao.softDelete(id)
    // 局部从 timeline 拿掉，并整体重算 summary/distribution（删除影响聚合）
    const { timeline } = get()
    set({
      timeline: timeline.filter((t) => t.id !== id),
      timelineTotal: Math.max(0, get().timelineTotal - 1),
    })
    void get().refresh()
  },
}))
