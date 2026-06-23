// taskStore — 任务状态管理
// 依 docs/03-architecture.md（store 订阅 service）+ docs/06 阶段 2
import { create } from 'zustand'
import { TaskDao } from '@/service/TaskDao'
import type { Task } from '@/types/TimerTypes'

interface TaskStoreState {
  tasks: Task[]
  loading: boolean
  /** 从数据库加载未删除任务 */
  load: () => Promise<void>
  /** 新建任务 */
  create: (name: string, color: string) => Promise<void>
  /** 更新任务 */
  update: (
    id: string,
    patch: Partial<Pick<Task, 'name' | 'color' | 'archived'>>,
  ) => Promise<void>
  /** 软删除任务 */
  remove: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  loading: true,

  load: async () => {
    set({ loading: true })
    const tasks = await TaskDao.listActive(true)
    set({ tasks, loading: false })
  },

  create: async (name, color) => {
    await TaskDao.create({ name, color })
    await get().load()
  },

  update: async (id, patch) => {
    await TaskDao.update(id, patch)
    await get().load()
  },

  remove: async (id) => {
    await TaskDao.softDelete(id)
    await get().load()
  },
}))
