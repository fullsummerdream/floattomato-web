// SessionDao — 番茄记录 CRUD + 按区间/任务聚合查询
// 依 docs/04-data-model.md（sessions.startAt 主索引）+ docs/06 阶段 2 统计需求
import { db, genId } from './DatabaseService'
import type { PomodoroSession, SessionStatus } from '@/types/TimerTypes'

const NOW = () => Date.now()

export interface SessionInput {
  taskId: string | null
  startAt: number
  endAt: number
  plannedDuration: number
  actualDuration: number
  pausedDuration: number
  status: SessionStatus
  presetId: string | null
}

export const SessionDao = {
  /** 写入一条番茄记录（TimerService sessionSink 调用） */
  async add(input: SessionInput): Promise<PomodoroSession> {
    const now = NOW()
    const session: PomodoroSession = {
      id: genId(),
      uid: 'local',
      taskId: input.taskId,
      startAt: input.startAt,
      endAt: input.endAt,
      plannedDuration: input.plannedDuration,
      actualDuration: input.actualDuration,
      pausedDuration: input.pausedDuration,
      status: input.status,
      presetId: input.presetId,
      note: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'local',
    }
    await db.sessions.put(session)
    return session
  },

  /** 按时间区间查未删除记录（startAt 索引） */
  async queryByRange(start: number, end: number): Promise<PomodoroSession[]> {
    return db.sessions
      .where('startAt')
      .between(start, end, true, true)
      .filter((s) => s.deletedAt === null)
      .toArray()
  },

  /** 某任务的所有记录 */
  async queryByTask(taskId: string): Promise<PomodoroSession[]> {
    return db.sessions
      .where('taskId')
      .equals(taskId)
      .filter((s) => s.deletedAt === null)
      .toArray()
  },

  /** 今日零点时间戳 */
  startOfToday(): number {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  },

  /** 本周零点（周一）时间戳 */
  startOfThisWeek(): number {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const day = d.getDay() || 7 // 周日=7
    d.setDate(d.getDate() - day + 1)
    return d.getTime()
  },

  /** 本月零点 */
  startOfThisMonth(): number {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(1)
    return d.getTime()
  },

  /** 全部未删除记录（统计总计用） */
  async queryAll(): Promise<PomodoroSession[]> {
    const all = await db.sessions.toArray()
    return all.filter((s) => s.deletedAt === null)
  },

  /** 任务专注时长分布 — 聚合 actualDuration by taskId（仅 completed） */
  async distribution(
    start?: number,
    end?: number,
  ): Promise<Map<string, number>> {
    const sessions =
      start !== undefined && end !== undefined
        ? await this.queryByRange(start, end)
        : (await db.sessions.toArray()).filter((s) => s.deletedAt === null)
    const map = new Map<string, number>()
    sessions
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        const key = s.taskId ?? '__no_task__'
        map.set(key, (map.get(key) ?? 0) + s.actualDuration)
      })
    return map
  },

  /**
   * 时间线分页查询 — 按 startAt 倒序，支持区间 + 状态筛选
   * 注：startAt 索引 desc 走 reverse().sortBy 不可用（Dexie 限制），
   * 用 toArray() + sort，量级（百-千条）下 OK；超大量后续可改 cursor 分页
   */
  async queryRecent(opts: {
    /** 起始 ts（包含），undefined = 不限 */
    start?: number
    /** 结束 ts（包含），undefined = 不限 */
    end?: number
    /** 状态白名单；空数组 / undefined = 全部 */
    statuses?: SessionStatus[]
    /** offset（已加载条数） */
    offset: number
    /** 单次条数 */
    limit: number
  }): Promise<{ items: PomodoroSession[]; total: number }> {
    const base =
      opts.start !== undefined && opts.end !== undefined
        ? await this.queryByRange(opts.start, opts.end)
        : await this.queryAll()
    const filtered =
      opts.statuses && opts.statuses.length > 0
        ? base.filter((s) => opts.statuses!.includes(s.status))
        : base
    const sorted = filtered.sort((a, b) => b.startAt - a.startAt)
    return {
      items: sorted.slice(opts.offset, opts.offset + opts.limit),
      total: sorted.length,
    }
  },

  /** 软删除（写墓碑，统计聚合自动剔除） */
  async softDelete(id: string): Promise<void> {
    const now = NOW()
    await db.sessions.update(id, { deletedAt: now, updatedAt: now })
  },
}
