// TaskDao — 任务 CRUD + 软删除（deletedAt 墓碑）+ 归档
// 依 docs/04-data-model.md + docs/07 铁律（墓碑机制、异步）
import { db, genId } from './DatabaseService'
import type { Task } from '@/types/TimerTypes'

const NOW = () => Date.now()

export const TaskDao = {
  /** 新建任务 */
  async create(input: {
    name: string
    color: string
  }): Promise<Task> {
    const now = NOW()
    const task: Task = {
      id: genId(),
      uid: 'local',
      name: input.name,
      color: input.color,
      archived: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'local',
    }
    await db.tasks.put(task)
    return task
  },

  /** 更新任务（名称/颜色/归档） */
  async update(
    id: string,
    patch: Partial<Pick<Task, 'name' | 'color' | 'archived'>>,
  ): Promise<void> {
    const task = await db.tasks.get(id)
    if (!task || task.deletedAt) return
    await db.tasks.put({
      ...task,
      ...patch,
      updatedAt: NOW(),
    })
  },

  /** 软删除（墓碑）—— 历史记录保留 */
  async softDelete(id: string): Promise<void> {
    const task = await db.tasks.get(id)
    if (!task) return
    await db.tasks.put({
      ...task,
      deletedAt: NOW(),
      updatedAt: NOW(),
    })
  },

  /** 查所有未删除任务（可选含归档） */
  async listActive(includeArchived = false): Promise<Task[]> {
    const all = await db.tasks.toArray()
    return all
      .filter((t) => t.deletedAt === null)
      .filter((t) => includeArchived || !t.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  /** 单个任务 */
  async get(id: string): Promise<Task | undefined> {
    return db.tasks.get(id)
  },
}
