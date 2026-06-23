// 白噪音音轨清单（15 段，分 4 组）
// 音频文件位于 public/audio/，不进 git（见 .gitignore）
// 用户首次部署需运行 npm run fetch-audio 下载
// 音频来源：moodist 开源项目（详见 docs/AUDIO_CREDITS.md）

export type TrackId =
  // 雨声系
  | 'rain-light'
  | 'rain-medium'
  | 'rain-storm'
  | 'thunder'
  // 自然环境
  | 'ocean'
  | 'stream'
  | 'forest'
  | 'fire'
  | 'wind'
  // 都市环境
  | 'cafe'
  | 'library'
  | 'train'
  // 合成噪音
  | 'white-noise'
  | 'pink-noise'
  | 'brown-noise'

export type TrackGroup = 'rain' | 'nature' | 'urban' | 'noise'

export interface Track {
  id: TrackId
  name: string
  group: TrackGroup
  /** 相对路径（public 根） */
  src: string
}

export const GROUP_LABELS: Record<TrackGroup, string> = {
  rain: '雨声',
  nature: '自然',
  urban: '环境',
  noise: '噪音',
}

export const TRACKS: Track[] = [
  // 雨声系
  { id: 'rain-light', name: '小雨', group: 'rain', src: '/audio/rain-light.mp3' },
  { id: 'rain-medium', name: '中雨', group: 'rain', src: '/audio/rain-medium.mp3' },
  { id: 'rain-storm', name: '暴雨', group: 'rain', src: '/audio/rain-storm.mp3' },
  { id: 'thunder', name: '雷雨', group: 'rain', src: '/audio/thunder.mp3' },
  // 自然
  { id: 'ocean', name: '海浪', group: 'nature', src: '/audio/ocean.mp3' },
  { id: 'stream', name: '溪流', group: 'nature', src: '/audio/stream.mp3' },
  { id: 'forest', name: '森林', group: 'nature', src: '/audio/forest.mp3' },
  { id: 'fire', name: '火堆', group: 'nature', src: '/audio/fire.mp3' },
  { id: 'wind', name: '风声', group: 'nature', src: '/audio/wind.mp3' },
  // 都市环境
  { id: 'cafe', name: '咖啡馆', group: 'urban', src: '/audio/cafe.mp3' },
  { id: 'library', name: '图书馆', group: 'urban', src: '/audio/library.mp3' },
  { id: 'train', name: '火车', group: 'urban', src: '/audio/train.mp3' },
  // 合成噪音（moodist 源为 .wav）
  { id: 'white-noise', name: '白噪音', group: 'noise', src: '/audio/white-noise.wav' },
  { id: 'pink-noise', name: '粉噪音', group: 'noise', src: '/audio/pink-noise.wav' },
  { id: 'brown-noise', name: '棕噪音', group: 'noise', src: '/audio/brown-noise.wav' },
]

/** 按分组返回 */
export function tracksByGroup(): Record<TrackGroup, Track[]> {
  return TRACKS.reduce(
    (acc, t) => {
      acc[t.group].push(t)
      return acc
    },
    { rain: [], nature: [], urban: [], noise: [] } as Record<TrackGroup, Track[]>,
  )
}
