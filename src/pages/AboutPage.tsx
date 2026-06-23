// AboutPage — 关于 + 隐私协议 + 用户协议
// 依 docs/01-product-vision.md 与 docs/06 阶段 5 任务 7
// 内联展示，不引入富文本编辑器（纯静态文案）
import { useState } from 'react'
import { Info, Github, Shield, FileText, ExternalLink, type LucideIcon } from 'lucide-react'
import { ResponsivePage } from '@/components/ResponsivePage'

const APP_VERSION = '0.1.0' // 与 package.json / BackupService.appVersion 保持一致
const REPO_URL = 'https://github.com/'

type TabKey = 'about' | 'privacy' | 'terms'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'about', label: '关于', icon: Info },
  { key: 'privacy', label: '隐私协议', icon: Shield },
  { key: 'terms', label: '用户协议', icon: FileText },
]

export function AboutPage() {
  const [tab, setTab] = useState<TabKey>('about')

  return (
    <ResponsivePage>
      <h1 className="py-xl text-xl font-bold">关于飘悠番茄</h1>

      {/* Tab 切换 */}
      <div className="flex gap-xs rounded-lg bg-neutral-100 p-xs dark:bg-neutral-800">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              data-testid={`about-tab-${t.key}`}
              className={`flex flex-1 items-center justify-center gap-xs rounded-md px-md py-sm text-sm transition-colors ${
                tab === t.key
                  ? 'bg-surface text-primary shadow-sm dark:bg-neutral-700'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-lg" data-testid={`about-content-${tab}`}>
        {tab === 'about' && <AboutTab />}
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'terms' && <TermsTab />}
      </div>
    </ResponsivePage>
  )
}

function AboutTab() {
  return (
    <article className="flex flex-col gap-lg text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
      <section className="rounded-lg border border-neutral-200 px-md py-lg dark:border-neutral-800">
        <h2 className="mb-sm text-base font-semibold">飘悠番茄 · Web</h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          极简专注计时 PWA — 把时间还给真正重要的事
        </p>
        <p className="mt-md text-xs text-neutral-400">
          版本 v{APP_VERSION} · 离线可用 · 本地存储 · 零追踪
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">设计哲学</h2>
        <p>
          一段专注 + 一段短休，循环带你穿越分心。我们不做社区、不做云同步、不做付费功能 ——
          所有逻辑全在你的浏览器里跑。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">技术栈</h2>
        <p>
          React 18 · TypeScript · Vite · Tailwind · Framer Motion · Dexie (IndexedDB) ·
          vite-plugin-pwa
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">源代码 / 反馈</h2>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-github"
          className="inline-flex items-center gap-xs text-primary hover:underline"
        >
          <Github size={14} /> GitHub 仓库 <ExternalLink size={12} />
        </a>
      </section>
    </article>
  )
}

function PrivacyTab() {
  return (
    <article className="flex flex-col gap-md text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
      <p className="text-xs text-neutral-400">最近更新：2026 年 6 月</p>

      <section>
        <h2 className="mb-sm font-semibold">一、我们不收集什么</h2>
        <p>
          飘悠番茄 <strong>不向任何服务器发送你的数据</strong>
          。我们没有账号系统，没有埋点，没有第三方分析，没有 cookie 追踪。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">二、本地存储什么</h2>
        <ul className="ml-md flex list-disc flex-col gap-xs">
          <li>
            <strong>IndexedDB</strong>：任务、番茄记录、预设方案
          </li>
          <li>
            <strong>localStorage</strong>：外观偏好、首启动标识、键盘提示等
          </li>
          <li>
            <strong>Service Worker 缓存</strong>：应用资源（JS/CSS/图标），用于离线启动
          </li>
        </ul>
        <p className="mt-sm text-neutral-500 dark:text-neutral-400">
          这些数据全部存在你的浏览器本地，关闭浏览器后仍在；清空浏览器数据后即被删除。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">三、你的控制权</h2>
        <ul className="ml-md flex list-disc flex-col gap-xs">
          <li>设置 → 数据备份：随时导出全部数据为 JSON</li>
          <li>设置 → 数据备份：可导入回任意设备的飘悠番茄</li>
          <li>清空数据：直接在浏览器设置里清除站点数据</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">四、通知权限</h2>
        <p>
          仅用于番茄完成时的桌面通知，仅在你显式授权后启用。本应用不发送任何远程推送，通知由浏览器本地触发。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">五、第三方</h2>
        <p>
          应用通过你的浏览器加载自身 JS/CSS 资源，不嵌入任何第三方 SDK、广告、统计脚本。
        </p>
      </section>
    </article>
  )
}

function TermsTab() {
  return (
    <article className="flex flex-col gap-md text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
      <p className="text-xs text-neutral-400">最近更新:2026 年 6 月</p>

      <section>
        <h2 className="mb-sm font-semibold">一、使用范围</h2>
        <p>
          本应用免费提供专注计时与任务管理功能。你以「按现状」（AS IS）形式使用，不保证适用于任何特定目的。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">二、数据责任</h2>
        <p>
          所有数据存储于你的浏览器本地。请定期使用导出功能备份重要数据。我们无法在浏览器数据丢失（清缓存、换设备、隐私模式）时为你恢复。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">三、禁止行为</h2>
        <ul className="ml-md flex list-disc flex-col gap-xs">
          <li>逆向工程或反编译应用源代码（源代码已开源，无需逆向）</li>
          <li>对本应用进行任何形式的恶意攻击</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">四、变更</h2>
        <p>
          应用会持续迭代。重大功能变更（如开启云同步、增加付费功能）会在引导页/设置页明确告知。
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-semibold">五、联系</h2>
        <p>
          在 GitHub 仓库提 Issue 即可。
        </p>
      </section>
    </article>
  )
}
