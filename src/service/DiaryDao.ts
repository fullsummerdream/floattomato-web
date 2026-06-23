// DiaryDao — 番茄日记 CRUD（V1.2 #1）
// 依 docs/04-data-model.md 「番茄日记」+ docs/06 V1.2 #1 数据层
// 设计：
//   1. upsertBySessionId 幂等 —— 同一 sessionId 只允许一条日记，存在则更新（3 触发器都先查再写）
//   2. softDelete 走墓碑（与 sessions 一致）；硬删走 deleteBySessionId（SessionDao.hardDelete 级联用）
//   3. listAll 仅过滤 deletedAt == null，备份 / 时间线已写态查询通用
import { db, genId } from './DatabaseService'
import type { DiaryRecord, Mood } from '@/types/DiaryTypes'

const NOW = () => Date.now()

export interface DiaryInput {
  sessionId: string
  mood: Mood
  note: string
}

export const DiaryDao = {
  /** 按 id 取单条 */
  async get(id: string): Promise<DiaryRecord | undefined> {
    return db.pomodoroDiary.get(id)
  },

  /** 按 sessionId 取（幂等查询，3 触发器入口共用） */
  async getBySessionId(sessionId: string): Promise<DiaryRecord | undefined> {
    const all = await db.pomodoroDiary
      .where('sessionId')
      .equals(sessionId)
      .toArray()
    // 防御：理论上 upsert 保证唯一，万一历史脏数据多条取最新 updatedAt
    return all
      .filter((d) => d.deletedAt === null)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  },

  /**
   * 按 sessionId 写入/更新 —— 已存在则保留 id / createdAt 更新内容；不存在则新建
   * 3 触发器（modal / card / timeline）保存按钮都走此入口，幂等可重入
   */
  async upsertBySessionId(input: DiaryInput): Promise<DiaryRecord> {
    const now = NOW()
    const existing = await this.getBySessionId(input.sessionId)
    if (existing) {
      const updated: DiaryRecord = {
        ...existing,
        mood: input.mood,
        note: input.note,
        updatedAt: now,
        // 编辑时若历史被软删，复活
        deletedAt: null,
      }
      await db.pomodoroDiary.put(updated)
      return updated
    }
    const record: DiaryRecord = {
      id: genId(),
      uid: 'local',
      sessionId: input.sessionId,
      mood: input.mood,
      note: input.note,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'local',
    }
    await db.pomodoroDiary.put(record)
    return record
  },

  /** 软删除（与 sessions 软删一致，UI 删除走此处） */
  async softDelete(id: string): Promise<void> {
    const now = NOW()
    await db.pomodoroDiary.update(id, { deletedAt: now, updatedAt: now })
  },

  /** 全部未删除（备份 / 时间线已写态批查） */
  async listAll(): Promise<DiaryRecord[]> {
    const all = await db.pomodoroDiary.toArray()
    return all.filter((d) => d.deletedAt === null)
  },

  /**
   * 硬删一个 session 的全部日记（SessionDao.hardDelete 级联调用）
   * 区别于 softDelete：直接物理删除，不留墓碑（孤儿数据无意义）
   */
  async deleteBySessionId(sessionId: string): Promise<void> {
    await db.pomodoroDiary.where('sessionId').equals(sessionId).delete()
  },
}
