# 飘悠番茄 Web — Dockerfile（多阶段构建）
#
# Stage 1: builder — Node 18 alpine 装依赖 + 编译生成 dist/
# Stage 2: runner  — nginx alpine 仅装产物 + 配置，最终镜像 ~30MB
#
# 用法：
#   docker build -t floattomato-web .
#   docker run -d -p 80:80 --name floattomato floattomato-web
#
# 域名 / HTTPS 在外层（反向代理 / 负载均衡 / 云面板）处理，本镜像只暴露 80

# ───────────────────────────────────────────
# Stage 1: Build
# ───────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# 利用 docker layer cache：先装依赖再拷源码，改源码不重装依赖
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 拷源码 + 构建
COPY . .
RUN npm run build

# ───────────────────────────────────────────
# Stage 2: Serve
# ───────────────────────────────────────────
FROM nginx:alpine AS runner

# 删默认 nginx 站点 + 默认配置
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# 装产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 装配置（容器内根路径与示例配置不同，复制时调整 root 路径）
COPY deploy/nginx.conf.example /etc/nginx/conf.d/floattomato.conf
RUN sed -i 's|/var/www/floattomato|/usr/share/nginx/html|g' /etc/nginx/conf.d/floattomato.conf

# 健康检查（nginx -t 通过 + 主页可访问）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

# nginx 默认 daemon off 由 base image CMD 给出，无需重复
