# 点评Lite 使用说明

## 1. 运行环境
- Node.js：已在本项目环境中验证可用
- 包管理器：推荐 `pnpm`
- 数据库/认证：Supabase（PostgreSQL + Auth）

## 2. 本地运行

1) 安装依赖
- `pnpm install`

2) 配置环境变量
- 复制 `.env.example` 为 `.env`
- 填入 Supabase 配置：
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

3) 启动开发服务
- `pnpm run dev`
- 前端：`http://localhost:5173/`
- 后端：`http://localhost:3001/api/health`

## 3. 功能操作指南

### 3.1 访客
- 首页可看到推荐商家
- 顶部搜索框输入关键词可进入搜索页
- 点击商家卡片进入详情页，查看商家信息与评价

### 3.2 用户注册/登录
- 进入 `/auth`
- 使用“邮箱+密码”注册与登录
  - 若 Supabase 项目开启“邮箱确认”，注册成功后需要先去邮箱确认再登录
- 登录成功后右上角出现用户菜单，可进入“商家管理”或退出

### 3.3 发布/删除评价
- 在商家详情页登录后可选择星级评分并提交文字评价
- 仅作者本人可删除自己的评价

### 3.4 商家身份与商家管理
- 进入 `/merchant-admin`
- 若当前是普通用户，点击“立即成为商家”切换角色
- 在“商家资料”中创建或编辑商家信息（名称/分类/地址/营业时间/电话/经纬度/简介）
- 在“评价列表”中可对评价进行商家回复

## 4. 预置数据
- 数据库迁移已插入 3 条示例商家数据，用于首页与搜索展示
- 示例商家不绑定真实登录用户，因此不可在商家管理台编辑（需自己创建商家）

## 5. 常见问题

### 5.1 API 返回 401
- 确认已登录且请求携带 `Authorization: Bearer <access_token>`

### 5.2 API 返回 DB_ERROR / Missing env var
- 确认 `.env` 已配置 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`（后端必需）
