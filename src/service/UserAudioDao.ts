// UserAudioDao — 用户上传音频 CRUD（V1.2 #4）
// 依 docs/04 数据库铁律：异步 / 不软删（Blob 单价高直接硬删）

import { db, genId } from './DatabaseService'
import {
  USER_AUDIO_MAX_SIZE,
  USER_AUDIO_MAX_SIZE_LABEL,
  type UserAudio,
} from '@/types/UserAudioTypes'

export class UserAudioUploadError extends Error {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    message: string,
    public reason: 'too-large' | 'not-audio' | 'idb-fail',
  ) {
    super(message)
  }
}

export const UserAudioDao = {
  /** 从 File 上传一条音频，返回新建的 UserAudio（含 user-<uuid> id） */
  async add(file: File, displayName?: string): Promise<UserAudio> {
    if (file.size > USER_AUDIO_MAX_SIZE) {
      throw new UserAudioUploadError(
        `单个文件超过 ${USER_AUDIO_MAX_SIZE_LABEL}`,
        'too-large',
      )
    }
    // 粗校验音频类型（浏览器 file.type 偶尔为空，仅 hint 不强约束）
    if (file.type && !file.type.startsWith('audio/')) {
      throw new UserAudioUploadError('不是音频文件', 'not-audio')
    }
    const stripped = displayName ?? file.name.replace(/\.[^.]+$/, '')
    const record: UserAudio = {
      id: `user-${genId()}`,
      name: stripped || '未命名',
      blob: file,
      size: file.size,
      addedAt: Date.now(),
    }
    try {
      await db.userAudios.put(record)
    } catch (err) {
      throw new UserAudioUploadError(
        `IDB 写入失败: ${(err as Error).message}`,
        'idb-fail',
      )
    }
    return record
  },

  /** 列出全部，新加的排前 */
  async listAll(): Promise<UserAudio[]> {
    return db.userAudios.orderBy('addedAt').reverse().toArray()
  },

  /** 取 blob 用于解码到 AudioBuffer */
  async getBlob(id: string): Promise<Blob | null> {
    const rec = await db.userAudios.get(id)
    return rec ? rec.blob : null
  },

  /** 按 id 取完整记录（UI 用） */
  async get(id: string): Promise<UserAudio | undefined> {
    return db.userAudios.get(id)
  },

  /** 硬删（Blob 单价高，不软删） */
  async delete(id: string): Promise<void> {
    await db.userAudios.delete(id)
  },
}
