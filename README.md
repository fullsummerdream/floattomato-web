# 飘悠番茄 Web

> 极简专注计时 PWA — 番茄工作法 + 任务管理 + 365 日热力图，离线可用、零追踪、本地存储

## 启动

```bash
npm install      # 装依赖
npm run dev      # 本地开发（http://localhost:5173）
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物（http://localhost:4173）
```

## 技术栈

React 18 + TypeScript(strict) + Vite 5 + Tailwind CSS 3 + Zustand + Dexie(IndexedDB) + Framer Motion + React Router 6。

详见 [docs/05-tech-stack.md](docs/05-tech-stack.md)。

## 项目结构

详见 [docs/03-architecture.md](docs/03-architecture.md)。

## 部署

纯静态 SPA + PWA，部署 = 把 `dist/` 交给静态服务器。两种推荐方式：

```bash
# A) Docker（一键起）
docker build -t floattomato-web .
docker run -d -p 80:80 --name floattomato floattomato-web

# B) Nginx 直部
npm run build
# 上传 dist/ 到服务器，应用 deploy/nginx.conf.example
```

完整流程（含 PWA 缓存策略、占位域名替换、上线自检）见 [docs/12-deployment.md](docs/12-deployment.md)。

## License

[MIT](LICENSE)

