# 线上部署指南

本文档说明如何将 **GitHub Trending+** 部署到生产环境。推荐方案为 **Vercel（前端 + Cron）+ Neon/Supabase（Postgres）**，可在免费额度内运行 MVP。

## 架构概览

```
┌─────────────┐     Cron (定时)      ┌──────────────────────────┐
│   Vercel    │ ──────────────────► │ POST /api/cron/ingest     │
│  Next.js 15 │                     │  → packages/github 摄取   │
│  ISR + API  │ ◄────────────────── │  → Postgres 写入榜单      │
└──────┬──────┘                     └────────────┬─────────────┘
       │                                         │
       │  DATABASE_URL                           │
       └────────────────────────────────────────►│ Neon / Supabase │
                                                 └─────────────────┘
       GITHUB_TOKEN ──► GitHub GraphQL API（仅服务端）
```

| 组件 | 生产方案 | 说明 |
|------|----------|------|
| 应用托管 | [Vercel](https://vercel.com) Hobby | Next.js 15 App Router、ISR、Cron Jobs |
| 数据库 | [Neon](https://neon.tech) 或 [Supabase](https://supabase.com) 免费层 | Postgres 16+ |
| 域名 | `*.vercel.app` 或自有域名 CNAME | 需与 `NEXT_PUBLIC_SITE_URL` 一致 |
| 密钥 | Vercel Environment Variables | 不入库、不暴露到浏览器 |

---

## 前置条件

- 拥有 GitHub 仓库的 Admin 权限（用于连接 Vercel）
- Node.js **20+**、pnpm **9+**（本地执行迁移与首次摄取时）
- GitHub **Personal Access Token (PAT)**，至少包含 `public_repo`（或 Fine-grained 等价读权限）
- 已开通 Neon 或 Supabase 项目

---

## 1. 准备 Postgres

### 1.1 创建数据库

**Neon（推荐）**

1. 新建 Project → 选择区域（建议离用户近的区域，如 `aws-ap-southeast-1`）
2. 复制 **Connection string**（勾选 *Pooled connection* 用于 Serverless）
3. 格式示例：`postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

**Supabase**

1. Project Settings → Database → Connection string（URI）
2. 生产环境建议使用 **Transaction pooler** 连接串（端口 6543）

### 1.2 初始化表结构

在**本地**（能访问公网数据库即可）执行：

```bash
# 克隆仓库后
cp .env.example .env
# 编辑 .env，将 DATABASE_URL 设为生产库连接串

pnpm install
pnpm db:push
```

`pnpm db:push` 使用 Drizzle 将 `packages/db` 中的 schema 同步到 Postgres，无需单独 migration 文件。

> **注意**：`db:push` 会直接修改生产库结构，首次部署前执行；后续 schema 变更请在维护窗口操作并备份。

### 1.3 模糊搜索（pg_trgm）

关键词模糊搜索依赖 Postgres 扩展 `pg_trgm` 与 GIN 索引。在 `db:push` 之后执行：

```bash
pnpm db:trgm
```

该命令运行 `packages/db/scripts/pg_trgm_search.sql`（`CREATE EXTENSION` + trigram 索引）。

**生产注意**：

- Neon / Supabase 通常已预装 `pg_trgm`；若 `CREATE EXTENSION` 失败，请在控制台启用扩展或由 DBA 预装后再跑 `pnpm db:trgm`。
- 需要数据库用户具备 `CREATE EXTENSION` 权限（Neon 主角色一般可以）。
- 可选环境变量 `SEARCH_FUZZY_THRESHOLD`（默认 `0.25`）调节相似度阈值，见 `.env.example`。

---

## 2. 准备 GitHub Token

1. GitHub → Settings → Developer settings → Personal access tokens
2. 创建 Classic PAT 或 Fine-grained token，确保能调用 **GraphQL API** 读取公开仓库
3. 将 token 存入密码管理器，**仅**配置在 Vercel 环境变量 `GITHUB_TOKEN` 中

速率限制：摄取作业会按语言轮询候选仓库；若触发 `403/429`，日志会出现 `rate_limit` 字段，作业会跳过当前语言并继续。

---

## 3. 部署到 Vercel

### 3.1 导入项目

1. [Vercel Dashboard](https://vercel.com/new) → Import Git Repository
2. 选择本 monorepo
3. **Root Directory** 设为 `apps/web`
4. Framework Preset：**Next.js**（自动检测）
5. 若未自动识别 monorepo，确认 **Include source files outside of the Root Directory** 已启用（pnpm workspace 依赖 `packages/*`）

### 3.2 构建配置

| 设置项 | 推荐值 |
|--------|--------|
| Install Command | `cd ../.. && pnpm install` 或留空由 Vercel 自动处理 |
| Build Command | `cd ../.. && pnpm --filter @github-trending/web build` |
| Output Directory | 默认（Next.js） |
| Node.js Version | 20.x |

也可在仓库根目录保持 Root Directory 为空，Build Command 使用 `pnpm --filter @github-trending/web build`；以 Vercel 导入向导实际检测为准。

### 3.3 环境变量

在 Vercel → Project → Settings → Environment Variables 中配置（**Production** 与 **Preview** 按需区分）：

| 变量 | 必填 | 说明 |
|------|:----:|------|
| `DATABASE_URL` | ✅ | Postgres 连接串（Neon pooled URL 优先） |
| `GITHUB_TOKEN` | ✅ | GitHub PAT，仅服务端 |
| `CRON_SECRET` | ✅ | 随机长字符串（`openssl rand -hex 32`） |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 生产站点完整 URL，如 `https://your-domain.com`（无尾斜杠） |
| `PRODUCTHUNT_API_KEY` | 可选 | PH OAuth 应用 API Key（与 `PRODUCTHUNT_API_SECRET` 成对） |
| `PRODUCTHUNT_API_SECRET` | 可选 | PH OAuth 应用 Secret |
| `PRODUCTHUNT_DEVELOPER_TOKEN` | 可选 | PH Developer Token（若设置则优先于 Key/Secret） |
| `PH_INGEST_LOOKBACK_DAYS` | 可选 | 默认 `7` |
| `PH_INGEST_TOPICS` | 可选 | 默认 `developer-tools,open-source` |
| `PH_INGEST_PAGE_SIZE` | 可选 | 默认 `50` |

`.env.example` 与 `apps/web/README.md` 中有相同说明。

未配置任何 `PRODUCTHUNT_*` 时，`/api/cron/ph-ingest` 返回 `{ skipped: true }`，前端不展示 PH 徽章。

### 3.4 Cron 定时任务

`apps/web/vercel.json` 已定义：

| 调度 | 路径 | 作用 |
|------|------|------|
| `0 8 * * *` | `/api/cron/ingest?ranking=true` | 每日 08:00 UTC 摄取快照、生成正式榜单并刷新 RSS |
| `0 9 * * *` | `/api/cron/ph-ingest` | 每日 09:00 UTC 摄取 Product Hunt 发布并关联仓库 |

> **Vercel Hobby**：每个 cron 表达式每天最多执行一次；`*/6` 等高频调度需 Pro。快照与榜单合并为上述每日任务；若需额外摄取，可手动 `curl` 或本地 `pnpm ingest:once`。

**鉴权**：Vercel 在调用 Cron 时会自动在请求头附带 `Authorization: Bearer <CRON_SECRET>`（需已在环境变量中设置 `CRON_SECRET`）。

**HTTP 方法**：Vercel Cron 使用 **GET** 触发；`/api/cron/ingest` 同时支持 **GET** 与 **POST**（逻辑相同）。手动触发可使用任一种方法。

**函数超时**：路由声明 `maxDuration = 300`（5 分钟）。Vercel **Hobby** 计划 Serverless 函数最长约 **60 秒**；若摄取超时，可：

- 在本地对生产库执行 `pnpm ingest:once`（`DATABASE_URL` 指向生产库）；
- 或升级 Pro 计划以支持更长执行时间；
- 或减少 `packages/github` 中 `INGEST_LANGUAGES` / 候选上限（需改代码）。

### 3.5 部署

连接 `main` 分支后，推送到 `main` 即触发部署。也可在 Vercel 控制台手动 **Redeploy**。

CI（`.github/workflows/ci.yml`）在 PR / push 时执行 `typecheck`、`lint`、`test`，**不**自动部署；部署由 Vercel Git 集成完成。

---

## 4. 一次性历史 Star 日序列补全（推荐）

若仓库池已写入 `repositories`，但 `week` / `month` / `halfYear` / `year` 榜单为空，可**一次性**从 [OSS Insight](https://ossinsight.io/docs/api/stargazers-history) 拉取各仓约 400 天日粒度 Star 历史，写入 `repo_star_daily` 表，并重算全周期排名。之后每日 ingest 仍会追加 `repository_snapshots`，并 upsert **当天**的 `repo_star_daily`（`source=github`），与历史 OSS 数据分层、互不覆盖。

```bash
# 本地，DATABASE_URL 指向目标库（无需 GITHUB_TOKEN）
# 先确保 schema 含 repo_star_daily：pnpm db:push

# 全池日序列 + 全周期排名（推荐）
pnpm backfill:star-daily:ranking

# 仅补日序列、不重算榜单
pnpm backfill:star-daily

# 试跑前 10 个仓库
pnpm --filter @github-trending/github backfill:star-daily --limit 10 --ranking

# 强制覆盖已有日序列（慎用）
pnpm --filter @github-trending/github backfill:star-daily --force --ranking
```

**说明**：

- OSS Insight 公开 API 约 **600 次/小时/IP**；默认请求间隔 6.2s。全池约 2500 仓时预计 **4–5 小时**，建议在稳定网络下本地执行。
- 已具备约 365 天日序列覆盖的仓库会跳过（`--force` 可重跑）。
- 补全后日常 Cron ingest（`ranking=true`）会更新排名；**无需重复**全量 star-daily backfill。
- **新仓入池**：该仓首次出现在 `repositories` 后，应对其执行一次 `backfill:star-daily`（或 `--limit` 试跑），否则长周期 baseline 可能缺失。
- 仓库详情页支持 `?period=week|month|halfYear|year`，与首页 Feed 周期一致。

### 4.1 旧版 4 锚点 backfill（已弃用）

以下命令向 `repository_snapshots` 写入 7/30/180/365 天前锚点，**请改用** `backfill:star-daily`：

```bash
pnpm backfill:ranking   # deprecated：请用 backfill:star-daily:ranking
pnpm backfill:once      # deprecated
```

---

## 5. 首次数据灌入

部署完成且环境变量、数据库就绪后，**必须**至少执行一次带排名的摄取，否则首页/API 无榜单数据。

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

或在本地（`DATABASE_URL` 指向生产库）：

```bash
pnpm ingest:once --ranking
```

成功时响应 JSON 含 `ok: true`、`reposIngested`、`rankingRunIds` 等字段。

**Product Hunt 摄取**（需配置 `PRODUCTHUNT_*`）：

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/ph-ingest" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# 或本地
pnpm ph-ingest:once
```

验证：

- 浏览器打开 `https://YOUR_DOMAIN`
- `GET https://YOUR_DOMAIN/api/feed?view=velocity&period=today`
- `GET https://YOUR_DOMAIN/feeds/all.xml`

---

## 6. 自定义域名（可选）

1. Vercel → Project → Settings → Domains → 添加域名
2. 按提示配置 DNS（CNAME 到 `cname.vercel-dns.com` 或 A 记录）
3. 更新环境变量 `NEXT_PUBLIC_SITE_URL` 为 `https://你的域名`
4. **Redeploy** 使 RSS / canonical 链接生效

---

## 7. 运维与监控

### 6.1 日志

在 Vercel → Project → Logs 中筛选函数日志，摄取作业输出结构化 JSON：

| 消息 | 含义 |
|------|------|
| `cron_ingest_start` | 任务开始（含 `ranking` 布尔值） |
| `cron_ingest_complete` | 成功结束（`durationMs`、`reposIngested`、`errors`） |
| `cron_ingest_failed` | 异常失败（`reason`） |
| `ingest_failed` + `GITHUB_TOKEN missing` | 未配置 Token |

### 6.2 失败与回滚

- 每日排名批次失败时，**上一批** `ranking_run` 仍会由 API / RSS 继续服务（设计见 OpenSpec `deployment-ops`）。
- 修复后重新 `POST .../api/cron/ingest?ranking=true` 即可。

### 6.3 公开 API 限流

以下路由对单 IP **60 次/分钟**（内存桶，多实例下为尽力而为）：

- `GET /api/feed`
- `GET /api/repos/{owner}/{name}`
- `GET /api/compare`

超限返回 **429**，body 含 `retryAfter`（秒）。

### 6.4 健康检查清单

| 检查项 | 预期 |
|--------|------|
| 首页可访问 | 200，有榜单卡片 |
| `/api/feed` | 200，`items` 非空（灌入后） |
| `/feeds/all.xml` | `application/rss+xml` |
| 无 Token 调用 Cron | 401 |
| Vercel Cron 最近运行 | Logs 有 `cron_ingest_complete` |

---

## 8. 安全清单

- [ ] `GITHUB_TOKEN`、`CRON_SECRET`、`DATABASE_URL` 仅存在于 Vercel **Server** 环境变量
- [ ] 不在客户端代码或 `NEXT_PUBLIC_*` 中放置密钥
- [ ] `CRON_SECRET` 足够随机，不提交到 Git
- [ ] 生产 `DATABASE_URL` 使用 SSL（`?sslmode=require`）
- [ ] GitHub Token 定期轮换
- [ ] `/about` 页保留非官方免责声明

---

## 9. 环境对照表

| 项目 | 本地开发 | 生产 |
|------|----------|------|
| 数据库 | `docker compose up -d`（`localhost:5432`） | Neon / Supabase |
| 应用 | `pnpm dev` → `http://localhost:3000` | Vercel |
| 摄取 | `pnpm ingest:once [--ranking]` | Cron 或 `curl POST /api/cron/ingest` |
| 环境文件 | 根目录 `.env` | Vercel Environment Variables |

本地快速启动见 `apps/web/README.md`。

---

## 10. 常见问题

### Q: 部署后页面空白 / 无仓库列表

尚未执行首次 `?ranking=true` 摄取，或 `DATABASE_URL` 指向错误库。按「§5 首次数据灌入」操作。

### Q: week/month/year 榜单为空

执行一次性历史补全（§4），或确认 `repository_snapshots` 是否含 365 天前的锚点快照。

### Q: Cron 一直 401

`CRON_SECRET` 未设置或与请求头 `Authorization: Bearer ...` 不一致。Vercel 自动 Cron 依赖环境变量中的同一 secret。

### Q: 摄取中途失败 / 超时

查看 Logs 中 `cron_ingest_failed`；常见原因：GitHub 限流、DB 连接超时、函数执行超过计划上限。可本地对生产库跑 `pnpm ingest:once --ranking` 作为补救。

### Q: RSS 链接指向 localhost

`NEXT_PUBLIC_SITE_URL` 未设为生产域名，或未 Redeploy。

### Q: 如何更新数据库 schema

```bash
# 本地 DATABASE_URL 指向目标库
pnpm db:push
```

重大变更前在 Neon/Supabase 控制台备份。

---

## 11. 相关文件

| 文件 | 用途 |
|------|------|
| `.env.example` | 环境变量模板 |
| `apps/web/vercel.json` | Cron 调度 |
| `apps/web/src/app/api/cron/ingest/route.ts` | 摄取 HTTP 入口 |
| `docker-compose.yml` | 本地 Postgres |
| `openspec/.../deployment-ops/spec.md` | 部署需求规格 |

---

## 附录：一键检查脚本（可选）

```bash
DOMAIN="https://your-domain.com"
SECRET="your-cron-secret"

# 健康：feed
curl -sf "$DOMAIN/api/feed?view=velocity&period=today" | head -c 200

# 触发摄取（生产慎用频率）
curl -X POST "$DOMAIN/api/cron/ingest?ranking=true" \
  -H "Authorization: Bearer $SECRET"
```

将 `DOMAIN`、`SECRET` 替换为实际值后再执行。
