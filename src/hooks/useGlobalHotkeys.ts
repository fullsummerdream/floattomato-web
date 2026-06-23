// useGlobalHotkeys — 全局键盘快捷键
// 依 docs/06 阶段 5 任务 5
//
// 快捷键清单（HotKeyDef 同步在设置页可见）：
//   Space  启停（idle→start, working→pause, paused→resume）
//   S      跳过当前阶段
//   F      进入全屏专注页
//   T      跳到任务页
//   ,      跳到设置页
//
// 避让铁律：
// - target 是 INPUT/TEXTAREA/SELECT/contentEditable → 不响应
// - 有修饰键（Ctrl/Meta/Alt）→ 不响应（避免与浏览器冲突）
// - 全屏页（/focus）只允许 Space/S（暂停/跳过），其余路由跳转禁用避免误触
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTimerStore } from '@/store/timerStore'

export interface HotKeyDef {
  /** 用户可见的键名（如 Space / S / ,） */
  key: string
  /** 对应 KeyboardEvent.key 或自定义判定函数 */
  match: (e: KeyboardEvent) => boolean
  /** 中文说明 */
  description: string
}

export const HOTKEYS: HotKeyDef[] = [
  { key: 'Space', match: (e) => e.code === 'Space' || e.key === ' ', description: '启动 / 暂停 / 恢复' },
  { key: 'S', match: (e) => e.key === 's' || e.key === 'S', description: '跳过当前阶段' },
  { key: 'F', match: (e) => e.key === 'f' || e.key === 'F', description: '进入全屏专注' },
  { key: 'T', match: (e) => e.key === 't' || e.key === 'T', description: '跳到任务页' },
  { key: ',', match: (e) => e.key === ',', description: '跳到设置页' },
]

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

export function useGlobalHotkeys() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 编辑控件焦点 → 全部放行
      if (isEditable(e.target)) return
      // 任何修饰键 → 放行
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // 拿当前 store 状态（直接 getState，避免 hook 闭包陈旧）
      const { runtime, start, pause, resume, skip } = useTimerStore.getState()
      const phase = runtime.phase
      const onFocusPage = location.pathname === '/focus'

      // Space 启停
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault() // 阻止页面滚动
        if (phase === 'idle') start(null)
        else if (phase === 'working') pause()
        else if (phase === 'paused') resume()
        else if (phase === 'shortBreak' || phase === 'longBreak') {
          // 休息中按空格 = 跳过休息（语义贴近用户预期）
          skip()
        }
        return
      }

      // S 跳过
      if (e.key === 's' || e.key === 'S') {
        if (phase === 'idle') return
        e.preventDefault()
        skip()
        return
      }

      // 全屏页 → 仅允许上面两个键，路由跳转禁用（防误触；退出走 Esc）
      if (onFocusPage) return

      // F 进入全屏
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        navigate('/focus')
        return
      }
      // T 任务页
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        navigate('/tasks')
        return
      }
      // , 设置页
      if (e.key === ',') {
        e.preventDefault()
        navigate('/settings')
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, location.pathname])
}

/** 空组件 — 仅挂载 hook，便于放在 BrowserRouter 内 */
export function GlobalHotkeys() {
  useGlobalHotkeys()
  return null
}
