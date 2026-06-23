// DiaryEditor — 番茄日记共用编辑器（V1.2 #1）
// 依 docs/06 V1.2 #1「UI 层 → DiaryEditor.tsx 共用编辑器」+ docs/04 字数柔性反馈表
//
// 设计：
// - 三处复用：DiaryModal（A）/ DiaryFloatCard（B）/ SessionTimeline 补写（C）
// - 颜文字 5 档 segment（DB 存枚举，颜文字仅展示）
// - textarea 500 字柔性反馈：450 橙 → 500+ 红 + 禁保存（输入不阻塞）
// - upsertBySessionId 幂等保存：已存在则更新内容（用户改了就重存）
// - 已存在记录 → 编辑态预填；否则新建态空
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DiaryDao } from '@/service/DiaryDao'
import {
  MAX_NOTE_LEN,
  MOOD_KAOMOJI,
  MOOD_LABEL,
  MOOD_ORDER,
  WARN_NOTE_LEN,
  type Mood,
} from '@/types/DiaryTypes'
import { pressScale, pressSpring, reducedMotion } from '@/theme/motion'

interface DiaryEditorProps {
  sessionId: string
  /** 顶部任务名（A/B 触发器传入；C 触发器从 row 取） */
  taskName?: string
  /** 保存成功后回调（撤销 pending、关闭 modal/card） */
  onSave: () => void
  /** 用户主动取消（关闭 modal/card） */
  onCancel: () => void
  /** 自动获取 textarea 焦点（modal 默认 true，card/timeline 默认 false） */
  autoFocus?: boolean
}

export function DiaryEditor({
  sessionId,
  taskName,
  onSave,
  onCancel,
  autoFocus = false,
}: DiaryEditorProps) {
  const [mood, setMood] = useState<Mood>('calm')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 铁律 #9：reduced-motion 关 spring 按压
  const reduce = useReducedMotion()

  // 预填已存在记录（幂等编辑态）
  useEffect(() => {
    let alive = true
    DiaryDao.getBySessionId(sessionId)
      .then((rec) => {
        if (!alive) return
        if (rec) {
          setMood(rec.mood)
          setNote(rec.note)
        }
        setLoaded(true)
      })
      .catch((err) => {
        console.error('[Diary] 预填失败', err)
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [sessionId])

  // 自动聚焦（modal 入场用）
  useEffect(() => {
    if (autoFocus && loaded) {
      textareaRef.current?.focus()
    }
  }, [autoFocus, loaded])

  const len = note.length
  const overLimit = len > MAX_NOTE_LEN
  const warn = len >= WARN_NOTE_LEN
  // 计数颜色 — 正常灰 / 预警橙 / 超限红
  const counterCls = overLimit
    ? 'text-danger'
    : warn
      ? 'text-amber-500'
      : 'text-neutral-400'

  const handleSave = async () => {
    if (overLimit || saving) return
    setSaving(true)
    try {
      await DiaryDao.upsertBySessionId({ sessionId, mood, note })
      onSave()
    } catch (err) {
      console.error('[Diary] 保存失败', err)
      setSaving(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-md"
      data-testid="diary-editor"
      data-session-id={sessionId}
    >
      {taskName && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          为「{taskName}」写两句感想
        </div>
      )}

      {/* 心情 segment — 5 档颜文字 */}
      <fieldset>
        <legend className="sr-only">心情</legend>
        <div className="flex justify-between gap-xs" role="radiogroup">
          {MOOD_ORDER.map((m) => {
            const selected = mood === m
            return (
              <motion.button
                key={m}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={MOOD_LABEL[m]}
                whileTap={reduce ? undefined : pressScale}
                transition={reduce ? reducedMotion : pressSpring}
                onClick={() => setMood(m)}
                data-testid={`diary-mood-${m}`}
                data-selected={selected}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-xs py-sm text-center transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600'
                }`}
              >
                <span className="font-mono text-base leading-none">{MOOD_KAOMOJI[m]}</span>
                <span className="text-[10px] leading-tight">{MOOD_LABEL[m]}</span>
              </motion.button>
            )
          })}
        </div>
      </fieldset>

      {/* 文字 textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="写两句感想…"
          rows={4}
          data-testid="diary-note"
          className={`w-full resize-none rounded-lg border bg-transparent px-sm py-sm text-sm outline-none transition-colors focus:border-primary dark:text-white ${
            overLimit
              ? 'border-danger/50'
              : 'border-neutral-200 dark:border-neutral-700'
          }`}
        />
        <span
          className={`absolute bottom-1.5 right-2 text-xs tabular-nums ${counterCls}`}
          data-testid="diary-counter"
        >
          {len} / {MAX_NOTE_LEN}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-sm">
        <motion.button
          type="button"
          whileTap={reduce ? undefined : pressScale}
          transition={reduce ? reducedMotion : pressSpring}
          onClick={onCancel}
          data-testid="diary-cancel"
          className="rounded-md px-md py-xs text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          取消
        </motion.button>
        <motion.button
          type="button"
          whileTap={reduce || overLimit ? undefined : pressScale}
          transition={reduce ? reducedMotion : pressSpring}
          onClick={() => void handleSave()}
          disabled={overLimit || saving}
          data-testid="diary-save"
          className="rounded-md bg-primary px-md py-xs text-sm text-white shadow-sm disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
        >
          {saving ? '保存中…' : '保存'}
        </motion.button>
      </div>
    </div>
  )
}
