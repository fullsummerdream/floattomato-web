# 12 — 部署指南

> 本应用是**纯静态 SPA + PWA**，部署 = 把 `dist/` 目录交给任意静态服务器。
> 域名 / HTTPS / 防火墙 / 备案均交由云服务商处理，本文档只关心**应用层**。

---

## 一、构建产物

```bash
npm ci             # 装依赖
npm run fetch-audio # 下载白噪音音轨（首次必跑；详见下方「音频资源」）
npm run build      # 出包到 dist/
```

`dist/` 体积 ~511KB（precache），首屏 gzip ~50KB。所有路由懒加载、静态资源带 hash。

### 音频资源（V1.1）

V1.1 引入 15 段白噪音音轨（雨/自然/环境/噪音 4 组）。出于 license 风险考虑，**音频文件不进 git**：

- 清单：[`scripts/audio-manifest.json`](../scripts/audio-manifest.json)
- 下载：`npm run fetch-audio` 自动并发下载到 `public/audio/`（~5MB，并发 4，幂等）
- License：Mixkit Sound Effects Free License（免费免商用免署名）
- 音频走 PWA runtime cache（首次播放后离线可用），不进 precache（5MB 拖慢首屏）

> 没跑 `npm run fetch-audio` 也不影响应用启动 — 白噪音 chip 点击会显示「音轨缺失：xxx」提示。

---

## 二、两种部署路径

### 路径 A：直接 Nginx 上传 dist/（推荐 — 最轻）

1. 上传 `dist/` 到服务器，例如 `/var/www/floattomato/`
2. 复制 [`deploy/nginx.conf.example`](../deploy/nginx.conf.example) 到 `/etc/nginx/conf.d/floattomato.conf`
3. 替换占位：
   - `server_name floattomato.example.com` → 你的域名
   - `root /var/www/floattomato` → 实际目录
4. `nginx -t && systemctl reload nginx`

### 路径 B：Docker 镜像（推荐 — 一键起 + 一键回滚）

```bash
# 本地构建
docker build -t floattomato-web .

# 单机直跑（80 端口）
docker run -d -p 80:80 --name floattomato --restart unless-stopped floattomato-web

# 看健康
docker ps        # 应看到 STATUS = healthy
docker logs floattomato
```

镜像大小 ~30MB（builder stage 编译丢弃，runner 仅 nginx:alpine + dist）。

---

## 三、关键 Nginx 设计 — 为什么这么配

| 资源 | 缓存策略 | 理由 |
|---|---|---|
| `index.html` | **no-cache** | PWA 入口；缓存了就拿不到新版本 |
| `sw.js` / `workbox-*.js` | **no-cache** | Service Worker 注册脚本；必须每次拉取以触发更新 |
| `manifest.webmanifest` | no-cache + MIME 修正 | 浏览器对 manifest 类型敏感 |
| `/assets/*.js .css` | **1 年 immutable** | vite 带 8 位 hash，改动即文件名变，永远不会撞 |
| 图标/字体 | 30 天 | 极少变；改 favicon 重启即可 |
| 其他 | SPA fallback → index.html | React Router 接管路由 |

**安全 header**：`X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` 最小集；如需 CSP 自己加（PWA 与 SW 对 CSP 严格，建议先观察再上）。

---

## 四、部署前 checklist — 占位域名替换

代码里 4 处含占位 `https://floattomato.example.com`：

| 文件 | 数量 |
|---|---|
| `index.html` | 5 处（canonical / og:url / og:image / twitter:image / JSON-LD url） |
| `public/sitemap.xml` | 6 处（每个路由 `<loc>`） |
| `public/robots.txt` | 1 处（Sitemap 行） |
| `deploy/nginx.conf.example` | 1 处（server_name） |

**Linux 一键替换**（先 dry-run，确认无误再 `-i`）：

```bash
# Dry run
grep -rn "floattomato.example.com" index.html public/ deploy/

# 真改（替换 your-domain.com 为你的域名）
sed -i 's/floattomato\.example\.com/your-domain.com/g' \
    index.html public/sitemap.xml public/robots.txt deploy/nginx.conf.example

npm run build  # 改后重新出包
```

---

## 五、上线后自检

| 项 | 怎么验 |
|---|---|
| HTTPS 跳转 | `curl -I http://你的域名/` 应 301/302 到 https |
| SPA fallback | 直接访问 `https://你的域名/stats` 不应 404 |
| Service Worker 注册 | F12 → Application → Service Workers，应有 activated |
| PWA 可安装 | 地址栏右侧应出现 ⊕ 图标 |
| Lighthouse | F12 → Lighthouse，移动端 Perf ≥ 95、A11y / BP / SEO ≥ 100 |
| 离线可用 | F12 → Network → Offline，刷新页面应仍可加载 |
| sitemap.xml | `curl https://你的域名/sitemap.xml` 返 200，6 条 URL |
| robots.txt | `curl https://你的域名/robots.txt` 返 Sitemap 行 |

---

## 六、更新部署（CI 之外的手动流程）

### Nginx 路径：
```bash
npm run build
rsync -avz --delete dist/ user@server:/var/www/floattomato/
# nginx 无需 reload — index.html 是 no-cache，下次刷新自动拿新版
```

### Docker 路径：
```bash
docker build -t floattomato-web:$(git rev-parse --short HEAD) -t floattomato-web:latest .
docker stop floattomato && docker rm floattomato
docker run -d -p 80:80 --name floattomato --restart unless-stopped floattomato-web:latest
```

---

## 七、不会做 / 不建议做

- **❌ 不在镜像里申请 SSL 证书** — 留给外层反代或云面板。镜像保持「拿来就跑」无副作用
- **❌ 不带后端** — 当前是纯前端，IndexedDB 存数据。未来联网版按 [10-decisions-log.md](10-decisions-log.md) 2026-06-23 路线决策，走运行时插件而非编译时分叉
- **❌ 不内嵌 CDN** — 部署到自有服务器与 CDN 直分发互斥；要 CDN 在反代层做
