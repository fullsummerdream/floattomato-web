// UserAudioTypes — 用户上传本地音频（V1.2 #4）
// Blob 存 IDB；id 走 'user-<uuid>' 前缀以与内置 TrackId 区分

export interface UserAudio {
  /** `user-<uuid>` 形态；同时作为 TrackId 在 WhiteNoiseService 内使用 */
  id: string
  /** 用户可见名（默认取文件名去后缀） */
  name: string
  /** 原始音频 blob（IDB 原生支持） */
  blob: Blob
  /** 字节数（冗余字段，避免每次读 blob.size） */
  size: number
  /** 上传时间戳（用作 ORDER BY，新加的排前面） */
  addedAt: number
}

/** 单个文件上限：5MB（≈ 1-2 分钟低码率 mp3） */
export const USER_AUDIO_MAX_SIZE = 5 * 1024 * 1024
/** 单个文件最大友好提示 */
export const USER_AUDIO_MAX_SIZE_LABEL = '5MB'
/** 总条数软上限（IDB 没强制；UI 提示用） */
export const USER_AUDIO_MAX_COUNT = 10
