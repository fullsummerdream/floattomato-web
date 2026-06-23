// TaskPage — 任务列表 CRUD（名称 + 颜色 + 归档 + 软删）
// 依 docs/06 阶段 2 任务 3
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Archive, ArchiveRestore, Trash2, Check, X } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'
import { useTaskStore } from '@/store/taskStore'
import { MOTION } from '@/theme/motion'

/** 可选颜色板 */
const COLORS = [
  '#FF6B35', '#4A90E2', '#4A7C59', '#E8A0BF',
  '#6B5B95', '#8B7355', '#2E4374', '#F44336',
]

export function TaskPage() {
  const { tasks, loading, load, create, update, remove } = useTaskStore()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await create(newName.trim(), newColor)
    setNewName('')
    setNewColor(COLORS[0])
    setAdding(false)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    await update(id, { name: editName.trim() })
    setEditingId(null)
  }

  const activeTasks = tasks.filter((t) => !t.archived)
  const archivedTasks = tasks.filter((t) => t.archived)

  return (
    <ResponsivePage>
      <div className="flex items-center justify-between py-xl">
        <h1 className="text-xl font-bold">任务</h1>
        {!adding && (
          <motion.button
            whileTap={MOTION.pressScale}
            transition={MOTION.pressSpring}
            onClick={() => setAdding(true)}
            className="flex items-center gap-0.5 rounded-md bg-primary px-md py-sm text-sm text-surface"
          >
            <Plus size={16} /> 新建
          </motion.button>
        )}
      </div>

      {/* 新建表单 */}
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
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="任务名称"
              aria-label="新任务名称"
              className="w-full rounded-md border border-neutral-200 bg-transparent px-md py-sm text-sm outline-none focus:border-primary dark:border-neutral-700"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <div className="mt-md flex flex-wrap gap-sm">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  aria-label={`选择颜色 ${c}`}
                  aria-pressed={newColor === c ? 'true' : 'false'}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    newColor === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{ backgroundColor: c, boxShadow: newColor === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
            <div className="mt-md flex gap-sm">
              <button
                onClick={handleCreate}
                className="flex items-center gap-0.5 rounded-md bg-primary px-md py-sm text-sm text-surface"
              >
                <Check size={14} /> 确定
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex items-center gap-0.5 rounded-md border border-neutral-200 px-md py-sm text-sm dark:border-neutral-700"
              >
                <X size={14} /> 取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 任务列表 */}
      {loading ? (
        <p className="py-xl text-center text-sm text-neutral-400">加载中…</p>
      ) : activeTasks.length === 0 && !adding ? (
        <p className="py-3xl text-center text-sm text-neutral-400">
          还没有任务，点右上角「新建」创建一个
        </p>
      ) : (
        <motion.ul
          variants={MOTION.stagger}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-sm"
        >
          {activeTasks.map((t) => (
            <motion.li
              key={t.id}
              variants={MOTION.staggerItem}
              className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md dark:border-neutral-800"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {editingId === t.id ? (
                <input
                  autoFocus
                  value={editName}
                  aria-label="编辑任务名称"
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(t.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 rounded-md border border-primary bg-transparent px-sm py-sm text-sm outline-none"
                />
              ) : (
                <button
                  onClick={() => {
                    setEditingId(t.id)
                    setEditName(t.name)
                  }}
                  className="flex-1 text-left text-sm"
                >
                  {t.name}
                </button>
              )}
              {editingId === t.id ? (
                <button
                  onClick={() => handleSaveEdit(t.id)}
                  className="text-neutral-500 hover:text-primary"
                  aria-label="保存"
                >
                  <Check size={16} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => update(t.id, { archived: true })}
                    className="text-neutral-400 hover:text-primary"
                    aria-label="归档"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="text-neutral-400 hover:text-danger"
                    aria-label="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}

      {/* 已归档 */}
      {archivedTasks.length > 0 && (
        <section className="mt-3xl">
          <h2 className="mb-md text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            已归档（{archivedTasks.length}）
          </h2>
          <ul className="flex flex-col gap-sm">
            {archivedTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-md rounded-lg border border-neutral-200 px-md py-md opacity-60 dark:border-neutral-800"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="flex-1 text-sm">{t.name}</span>
                <button
                  onClick={() => update(t.id, { archived: false })}
                  className="text-neutral-400 hover:text-primary"
                  aria-label="取消归档"
                >
                  <ArchiveRestore size={16} />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-neutral-400 hover:text-danger"
                  aria-label="删除"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ResponsivePage>
  )
}
