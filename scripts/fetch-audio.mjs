#!/usr/bin/env node
// 白噪音音轨下载脚本 — 读 scripts/audio-manifest.json，并发下载到 public/audio/
// 用法：npm run fetch-audio
//
// 设计：
// - 已存在文件跳过（幂等）
// - 失败的下载累计报告，不抛 — 让用户看到全貌
// - 并发 4 个连接（不打满本地带宽）

import { readFileSync, existsSync, mkdirSync, createWriteStream, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { get } from 'node:https'
import { get as httpGet } from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const manifestPath = resolve(__dirname, 'audio-manifest.json')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
const outputDir = resolve(ROOT, manifest.outputDir)

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

console.log(`音轨下载 — 共 ${manifest.tracks.length} 段`)
console.log(`目标：${outputDir}`)
console.log(`License：${manifest.license}\n`)

/**
 * 单文件下载（带重定向支持）
 * @returns {Promise<{file: string, ok: boolean, bytes: number, error?: string}>}
 */
function download(track, attempt = 0) {
  return new Promise((resolveP) => {
    const target = resolve(outputDir, track.file)
    if (existsSync(target) && statSync(target).size > 1024) {
      resolveP({ file: track.file, ok: true, bytes: statSync(target).size, skipped: true })
      return
    }

    const fetcher = track.url.startsWith('https') ? get : httpGet
    const req = fetcher(track.url, { timeout: 30000 }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && attempt < 3) {
        resolveP(download({ ...track, url: res.headers.location }, attempt + 1))
        return
      }
      if (res.statusCode !== 200) {
        resolveP({ file: track.file, ok: false, bytes: 0, error: `HTTP ${res.statusCode}` })
        return
      }
      const stream = createWriteStream(target)
      let bytes = 0
      res.on('data', (chunk) => (bytes += chunk.length))
      res.pipe(stream)
      stream.on('finish', () => {
        stream.close()
        resolveP({ file: track.file, ok: true, bytes })
      })
      stream.on('error', (e) => {
        resolveP({ file: track.file, ok: false, bytes: 0, error: e.message })
      })
    })
    req.on('error', (e) => {
      resolveP({ file: track.file, ok: false, bytes: 0, error: e.message })
    })
    req.on('timeout', () => {
      req.destroy()
      resolveP({ file: track.file, ok: false, bytes: 0, error: 'timeout' })
    })
  })
}

/** 并发限制为 4 */
async function runBatched(tasks, concurrency = 4) {
  const results = []
  const queue = [...tasks]
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const task = queue.shift()
      if (!task) break
      const r = await download(task)
      results.push(r)
      const status = r.ok ? (r.skipped ? '已存在' : '完成') : `失败 ${r.error}`
      const kb = r.ok ? `${Math.round(r.bytes / 1024)}KB` : ''
      console.log(`  ${r.ok ? '✓' : '✗'} ${r.file.padEnd(22)} ${kb.padStart(8)}  ${status}`)
    }
  })
  await Promise.all(workers)
  return results
}

const results = await runBatched(manifest.tracks)
const ok = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok)
const totalKB = Math.round(results.reduce((s, r) => s + (r.bytes || 0), 0) / 1024)

console.log(`\n完成：${ok}/${manifest.tracks.length}  总计 ${totalKB}KB`)
if (failed.length) {
  console.error(`\n失败 ${failed.length} 项：`)
  failed.forEach((r) => console.error(`  - ${r.file}: ${r.error}`))
  console.error(`\n部分失败不影响其它音轨使用；可单独 curl 重下。`)
  process.exit(1)
}
