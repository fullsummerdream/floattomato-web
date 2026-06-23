// BackupService — 数据备份与迁移（导出/导入 JSON）
// 依 docs/04-data-model.md 数据备份与迁移 + docs/07 铁律 10（schemaVersion 向下兼容 2 版 + migration）
//
// 铁律：
// - 导出格式定为 ExportPayload v1，schemaVersion 为本项目自有
// - 导入冲突解决：LWW（updatedAt 大者胜）
// - 导入向下兼容最近 2 个大版本；migration 通过 SCHEMA_MIGRATIONS 注册
// - migration 缺失或版本超出兼容范围 → 抛 IncompatibleVersionError，不静默丢数据
// - 导入数据 syncStatus 强制改 'local'（保留同步标记会破坏未来同步）
// - 全程不动用户手势之外的 IO；UI 层负责文件下载 / 文件选择
import { db } from './DatabaseService'
import type {
  Task,
  PomodoroPreset,
  PomodoroSession,
} from '@/types/TimerTypes'

/** 当前导出 schema 版本号 — bump 时同步加 migration */
export const CURRENT_SCHEMA_VERSION = 1
/** 向下兼容最近 N 个大版本 */
export const MIN_SUPPORTED_SCHEMA = 1

export interface AppearanceSnapshot {
  themeId: string
  darkMode: 'system' | 'light' | 'dark'
  material: string
  numberStyle: string
  background: string
}

export interface ExportPayload {
  app: 'FloatTomato'
  version: string // 应用版本（package.json，非 schemaVersion）
  exportedAt: number
  schemaVersion: number
  tasks: Task[]
  sessions: PomodoroSession[]
  presets: PomodoroPreset[]
  appearance: AppearanceSnapshot | null
}

export interface ImportSummary {
  fromVersion: number
  toVersion: number
  /** 导入条目数（新增 + LWW 胜出更新） */
  taskCount: { added: number; updated: number; skipped: number }
  sessionCount: { added: number; updated: number; skipped: number }
  presetCount: { added: number; updated: number; skipped: number }
  appearanceRestored: boolean
}

export class BackupError extends Error {
  constructor(public code: BackupErrorCode, message: string) {
    super(message)
    this.name = 'BackupError'
  }
}
export type BackupErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_PAYLOAD'
  | 'INCOMPATIBLE_VERSION'
  | 'MIGRATION_FAILED'

/** Migration 注册表：from N → N+1
 *  bump CURRENT_SCHEMA_VERSION 时务必在此追加 N → N+1 */
type Migration = (payload: ExportPayload) => ExportPayload
const SCHEMA_MIGRATIONS: Record<number, Migration> = {
  // 示例：未来从 1 升 2 的 migration
  // 1: (p) => ({ ...p, sessions: p.sessions.map(s => ({ ...s, newField: defaultValue })), schemaVersion: 2 }),
}

const APPEARANCE_KEY = 'floattomato:appearance'

/** 通用 LWW 合并：相同 id 用 updatedAt 较大方
 *  返回 added / updated / skipped 统计 */
async function mergeLww<T extends { id: string; updatedAt: number }>(
  table: { get: (id: string) => Promise<T | undefined>; put: (rec: T) => Promise<unknown> },
  incoming: T[],
  cleanIncoming: (rec: T) => T,
): Promise<{ added: number; updated: number; skipped: number }> {
  let added = 0
  let updated = 0
  let skipped = 0
  for (const rec of incoming) {
    const cleaned = cleanIncoming(rec)
    const existing = await table.get(rec.id)
    if (!existing) {
      await table.put(cleaned)
      added++
    } else if (cleaned.updatedAt > existing.updatedAt) {
      await table.put(cleaned)
      updated++
    } else {
      skipped++
    }
  }
  return { added, updated, skipped }
}

class BackupService {
  /** 取应用版本（package.json，注入到导出 metadata） */
  private appVersion(): string {
    // import.meta.env 可拿，但需要 vite define；先 hardcode 与 package.json 同步
    return '0.1.0'
  }

  /** 导出当前 DB + 外观到 ExportPayload */
  async export(): Promise<ExportPayload> {
    const [tasks, sessions, presets] = await Promise.all([
      db.tasks.toArray(),
      db.sessions.toArray(),
      db.presets.toArray(),
    ])

    let appearance: AppearanceSnapshot | null = null
    try {
      const raw = localStorage.getItem(APPEARANCE_KEY)
      if (raw) {
        // zustand persist 包了一层 {state, version}，取 state
        const parsed = JSON.parse(raw)
        const state = parsed?.state ?? parsed
        if (state && typeof state === 'object') {
          appearance = {
            themeId: state.themeId,
            darkMode: state.darkMode,
            material: state.material,
            numberStyle: state.numberStyle,
            background: state.background,
          }
        }
      }
    } catch {
      /* 外观失败不阻塞 DB 导出 */
    }

    return {
      app: 'FloatTomato',
      version: this.appVersion(),
      exportedAt: Date.now(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      tasks,
      sessions,
      presets,
      appearance,
    }
  }

  /** 序列化为 JSON 字符串（缩进 2，便于人读） */
  async exportJson(): Promise<string> {
    const payload = await this.export()
    return JSON.stringify(payload, null, 2)
  }

  /** 生成默认文件名 floattomato-backup-YYYYMMDD-HHMM.json */
  filename(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `floattomato-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
  }

  /** 浏览器下载 — 必须在用户手势内调用 */
  async downloadJson(): Promise<string> {
    const json = await this.exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = this.filename()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // 延迟 revoke 防止 Safari 下载中断
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return json
  }

  /** 解析 + 校验 + migration */
  parse(json: string): ExportPayload {
    let raw: unknown
    try {
      raw = JSON.parse(json)
    } catch (e) {
      throw new BackupError('INVALID_JSON', `JSON 解析失败：${(e as Error).message}`)
    }
    if (!isPlainObject(raw)) {
      throw new BackupError('INVALID_PAYLOAD', '导入文件结构非法')
    }
    const p = raw as Record<string, unknown>
    if (p.app !== 'FloatTomato') {
      throw new BackupError('INVALID_PAYLOAD', '不是飘悠番茄的备份文件')
    }
    if (
      typeof p.schemaVersion !== 'number' ||
      !Array.isArray(p.tasks) ||
      !Array.isArray(p.sessions) ||
      !Array.isArray(p.presets)
    ) {
      throw new BackupError('INVALID_PAYLOAD', '必要字段缺失或类型错误')
    }
    const fromVersion = p.schemaVersion
    if (fromVersion > CURRENT_SCHEMA_VERSION) {
      throw new BackupError(
        'INCOMPATIBLE_VERSION',
        `备份文件 schemaVersion=${fromVersion}，高于当前应用支持的 ${CURRENT_SCHEMA_VERSION}，请升级应用后再导入`,
      )
    }
    if (fromVersion < MIN_SUPPORTED_SCHEMA) {
      throw new BackupError(
        'INCOMPATIBLE_VERSION',
        `备份文件 schemaVersion=${fromVersion}，低于最低支持版本 ${MIN_SUPPORTED_SCHEMA}`,
      )
    }

    // 跑 migration 链 fromVersion → CURRENT
    let payload = p as unknown as ExportPayload
    for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
      const mig = SCHEMA_MIGRATIONS[v]
      if (!mig) {
        throw new BackupError(
          'MIGRATION_FAILED',
          `缺失 migration ${v} → ${v + 1}`,
        )
      }
      try {
        payload = mig(payload)
      } catch (e) {
        throw new BackupError(
          'MIGRATION_FAILED',
          `migration ${v} → ${v + 1} 失败：${(e as Error).message}`,
        )
      }
    }
    return payload
  }

  /** 导入 ExportPayload —— LWW 冲突解决 + 写库 + 还原外观 */
  async import(payload: ExportPayload): Promise<ImportSummary> {
    const stripSync = <T extends { syncStatus: PomodoroSession['syncStatus'] }>(rec: T): T => ({
      ...rec,
      syncStatus: 'local',
    })

    const taskCount = await mergeLww<Task>(db.tasks, payload.tasks, stripSync)
    const sessionCount = await mergeLww<PomodoroSession>(
      db.sessions,
      payload.sessions,
      stripSync,
    )
    const presetCount = await mergeLww<PomodoroPreset>(
      db.presets,
      payload.presets,
      stripSync,
    )

    // 还原外观（直接覆盖；外观无 updatedAt，导入即覆盖语义）
    let appearanceRestored = false
    if (payload.appearance) {
      try {
        localStorage.setItem(
          APPEARANCE_KEY,
          JSON.stringify({ state: payload.appearance, version: 0 }),
        )
        appearanceRestored = true
      } catch {
        /* localStorage 写失败不阻塞 */
      }
    }

    return {
      fromVersion: payload.schemaVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      taskCount,
      sessionCount,
      presetCount,
      appearanceRestored,
    }
  }

  /** 一体化导入 JSON 字符串 */
  async importJson(json: string): Promise<ImportSummary> {
    const payload = this.parse(json)
    return this.import(payload)
  }

  /** 从 File 对象读取（设置页 input[type=file] 调用） */
  async importFile(file: File): Promise<ImportSummary> {
    const text = await file.text()
    return this.importJson(text)
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export const backupService = new BackupService()
