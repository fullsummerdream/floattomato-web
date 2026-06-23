# 飘悠番茄 Web — 项目文档索引

本目录是项目的**单一信源**。所有产品决策、设计规范、架构、实施细节都从这里查。

> 顶层一页式 AI 开发指南：[../CLAUDE.md](../CLAUDE.md)

## 文档清单

| # | 文件 | 内容 |
|---|---|---|
| 01 | [01-product-vision.md](01-product-vision.md) | 定位 + 功能蓝图 + 版本路线 |
| 02 | [02-design-system.md](02-design-system.md) | 设计规范：色彩 / 字体 / 间距 / 动效 / 材质 / 线框 |
| 03 | [03-architecture.md](03-architecture.md) | 模块架构 + 计时状态机 + PWA 机制 |
| 04 | [04-data-model.md](04-data-model.md) | 数据模型 + IndexedDB 落地 + 数据备份与迁移 |
| 05 | [05-tech-stack.md](05-tech-stack.md) | 技术栈 + PWA + 托管 + 权限策略 |
| 06 | [06-implementation-phases.md](06-implementation-phases.md) | 实施路径：阶段 0 → 阶段 6 |
| 07 | [07-pitfalls.md](07-pitfalls.md) | 关键陷阱与铁律 |
| 10 | [10-decisions-log.md](10-decisions-log.md) | 已敲定决策日志（**append-only**） |
| 11 | [11-future-ideas.md](11-future-ideas.md) | 想法暂存：V1.0 期间想到但不做的点子 |

## 维护规则

1. **决策日志只追加不修改**（10-decisions-log.md）。旧条目变化 → 新增「修订」条目。
2. **想法暂存，不进代码**（11-future-ideas.md）。V1.0 开发期间冒出的新功能全记这里。
3. **先改 docs，再改代码**。规范变化必须先在文档落定，不允许代码与文档脱节。
4. **CLAUDE.md ≤ 80 行**。详情写到 `docs/`，CLAUDE.md 只放铁律 + 导航。
