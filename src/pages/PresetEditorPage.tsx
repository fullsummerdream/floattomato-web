// PresetEditorPage — 番茄预设方案 CRUD
// 依 docs/06 阶段 3 任务（预设 CRUD UI，阶段 2 推迟到此处）
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, X, Trash2, Pencil, Star } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { usePresetStore } from '@/store/presetStore'
import { MOTION } from '@/theme/motion'
import type { PomodoroPreset } from '@/types/TimerTypes'

interface DraftForm {
  name: string
  /** 分钟，UI 输入用 */
  workMin: number
  shortMin: number
  longMin: number
  longInterval: number
}

const EMPTY: DraftForm = {
  name: '',
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longInterval: 4,
}

function presetToDraft(p: PomodoroPreset): DraftForm {
  return {
    name: p.name,
    workMin: Math.round(p.workDuration / 60),
    shortMin: Math.round(p.shortBreak / 60),
    longMin: Math.round(p.longBreak / 60),
    longInterval: p.longBreakInterval,
  }
}

function draftToInput(d: DraftForm) {
  return {
    name: d.name.trim(),
    workDuration: Math.max(1, d.workMin) * 60,
    shortBreak: Math.max(1, d.shortMin) * 60,
    longBreak: Math.max(1, d.longMin) * 60,
    longBreakInterval: Math.max(1, Math.min(10, d.longInterval)),
  }
}

/** 数字输入（min 1） */
function NumField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  testId?: string
}) {
  return (
    <label className="flex flex-1 flex-col gap-xs">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value || '1', 10)))}
        className="rounded-md border border-neutral-200 bg-transparent px-md py-sm text-sm outline-none focus:border-primary dark:border-neutral-700"
      />
    </label>
  )
}

export function PresetEditorPage() {
  const { presets, activeId, loading, load, create, update, remove, setActive } =
    usePresetStore()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftForm>(EMPTY)

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async () => {
    if (!draft.name.trim()) return
    if (editingId) {
      await update(editingId, draftToInput(draft))
    } else {
      await create(draftToInput(draft))
    }
    setDraft(EMPTY)
    setAdding(false)
    setEditingId(null)
  }

  const startEdit = (p: PomodoroPreset) => {
    setEditingId(p.id)
    setDraft(presetToDraft(p))
    setAdding(true)
  }

  const cancel = () => {
    setDraft(EMPTY)
    setAdding(false)
    setEditingId(null)
  }

  return (
    <ResponsivePage>
      <div className="flex items-center justify-between py-xl">
        <h1 className="text-xl font-bold">预设方案</h1>
        {!adding && (
          <motion.button
            type="button"
            whileTap={MOTION.pressScale}
            transition={MOTION.pressSpring}
            onClick={() => {
              setEditingId(null)
              setDraft(EMPTY)
              setAdding(true)
            }}
            data-testid="btn-add-preset"
            className="flex items-center gap-0.5 rounded-md bg-primary px-md py-sm text-sm text-surface"
          >
            <Plus size={16} /> 新建
          </motion.button>
        )}
      </div>

      {/* 编辑表单 */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={MOTION.modalOut}
            className="mb-lg overflow-hidden rounded-lg border border-neutral-200 p-md dark:border-neutral-800"
          >
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="预设名称（如：长番茄 / 短冲刺）"
              aria-label="预设名称"
              data-testid="input-preset-name"
              className="w-full rounded-md border border-neutral-200 bg-transparent px-md py-sm text-sm outline-none focus:border-primary dark:border-neutral-700"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <div className="mt-md flex flex-wrap gap-md">
              <NumField
                label="工作（分钟）"
                value={draft.workMin}
                testId="input-work-min"
                onChange={(n) => setDraft({ ...draft, workMin: n })}
              />
              <NumField
                label="短休息"
                value={draft.shortMin}
                testId="input-short-min"
                onChange={(n) => setDraft({ ...draft, shortMin: n })}
              />
              <NumField
                label="长休息"
                value={draft.longMin}
                testId="input-long-min"
                onChange={(n) => setDraft({ ...draft, longMin: n })}
              />
              <NumField
                label="长休间隔（轮）"
                value={draft.longInterval}
                testId="input-long-interval"
                onChange={(n) => setDraft({ ...draft, longInterval: n })}
              />
            </div>
            <div className="mt-md flex gap-sm">
              <button
                type="button"
                onClick={handleSubmit}
                data-testid="btn-confirm-preset"
                className="flex items-center gap-0.5 rounded-md bg-primary px-md py-sm text-sm text-surface"
              >
                <Check size={14} /> {editingId ? '保存' : '创建'}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="flex items-center gap-0.5 rounded-md border border-neutral-200 px-md py-sm text-sm dark:border-neutral-700"
              >
                <X size={14} /> 取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 预设列表 */}
      {loading ? (
        <p className="py-xl text-center text-sm text-neutral-400">加载中…</p>
      ) : (
        <motion.ul
          variants={MOTION.stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-sm"
        >
          {presets.map((p) => {
            const isActive = p.id === activeId
            return (
              <motion.li
                key={p.id}
                variants={MOTION.staggerItem}
                data-testid={`preset-${p.id}`}
                className={`flex items-center gap-md rounded-lg border px-md py-md transition-colors ${
                  isActive
                    ? 'border-primary'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(p.id)}
                  className="flex flex-1 flex-col items-start gap-xs text-left"
                  data-testid={`btn-activate-${p.id}`}
                >
                  <span className="flex items-center gap-xs text-sm font-medium">
                    {isActive && <Star size={14} className="fill-primary text-primary" />}
                    {p.name}
                    {p.isDefault && (
                      <span className="rounded-full bg-neutral-100 px-sm py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        默认
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400">
                    工作 {p.workDuration / 60} 分 · 短休 {p.shortBreak / 60} 分 · 长休{' '}
                    {p.longBreak / 60} 分 · 每 {p.longBreakInterval} 轮
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-neutral-400 hover:text-primary"
                  aria-label="编辑"
                  data-testid={`btn-edit-${p.id}`}
                >
                  <Pencil size={16} />
                </button>
                {!p.isDefault && (
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="text-neutral-400 hover:text-danger"
                    aria-label="删除"
                    data-testid={`btn-delete-${p.id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.li>
            )
          })}
        </motion.ul>
      )}

      <p className="mt-3xl text-xs text-neutral-400">
        切换/编辑预设仅在计时空闲时生效；进行中需先放弃当前番茄。
      </p>
    </ResponsivePage>
  )
}
