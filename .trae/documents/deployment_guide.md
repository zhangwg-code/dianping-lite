# 点评Lite 部署指南

本原型依赖 Supabase 作为云数据库与认证服务；部署时主要将 Web（Vite 静态资源）与 API（Express，Vercel Serverless 入口已提供）上线。

## 方案 A：Vercel 一体化部署（推荐原型）

### 1) 前置条件
- 已创建并完成迁移的 Supabase 项目
- 一个 Vercel 账号

### 2) 环境变量
在 Vercel 项目设置中配置（Project Settings → Environment Variables）：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

说明：
- 前端不直接使用 Supabase Key，所有数据操作走 `/api`。
- `SUPABASE_SERVICE_ROLE_KEY` 仅用于服务端；本原型目前主要依赖 anonKey + 用户 JWT 走 RLS，服务角色 key 可留空，但建议保留以备后续扩展。

### 3) 部署
- 将本仓库导入 Vercel
- 确认 `vercel.json` 已存在并包含 rewrite：
  - `/api/*` → `/api/index`
  - `/*` → `/index.html`
- Build Command：`pnpm run build`
- Output Directory：`dist`

### 4) 性能建议（原型级）
- 启用 Vercel Edge Cache（默认静态资源已缓存）
- 生产环境建议开启 gzip/brotli（Vercel 默认处理）
- 数据层依赖 Supabase 扩缩容

## 方案 B：云服务器（VM）+ Docker（可选）

适用于需要部署到自建云服务器的情况。

### 1) 运行方式
- VM 上安装 Node.js + pnpm，直接运行：
  - `pnpm install`
  - 配置 `.env`
  - `pnpm run build`
  - 生产模式可通过进程管理器（PM2 等）启动 API，并用 Nginx 反向代理静态资源与 `/api`。

### 2) 反向代理建议
- `/` → 静态资源（`dist/`）
- `/api` → Node API（默认 3001 端口）

## 数据库迁移
- 迁移文件：`supabase/migrations/init_schema.sql`
- 在 Supabase 控制台或 CI 中应用迁移（本项目已在集成环境中验证可用）

