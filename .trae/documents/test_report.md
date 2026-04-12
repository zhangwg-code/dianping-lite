# 点评Lite 基础功能测试报告

测试日期：2026-04-12

## 1. 测试范围
- 前端页面：首页 / 搜索 / 商家详情 / 登录注册 / 商家管理
- 后端接口：健康检查、商家列表/详情、评价列表/发布/删除、商家回复、个人信息与角色
- 数据库：表结构、RLS 策略与 anon/authenticated 权限

## 2. 自动化检查
- `pnpm run check`：通过
- `pnpm run lint`：通过

## 3. 手工接口冒烟测试

### 3.1 健康检查
- 请求：`GET /api/health`
- 预期：200，返回 ok
- 实际：通过

### 3.2 商家列表（匿名）
- 请求：`GET /api/merchants?page=1&pageSize=2`
- 预期：200，返回 `items` 数组与 `total`
- 实际：通过（返回示例商家数据）

### 3.3 商家详情（匿名）
- 请求：`GET /api/merchants/:id`
- 预期：200，返回 `merchant`
- 实际：通过

### 3.4 评价列表（匿名）
- 请求：`GET /api/merchants/:id/reviews?page=1&pageSize=10`
- 预期：200，按时间倒序
- 实际：通过

### 3.5 登录后流程（需要 Supabase 可用账号）
- 登录：`POST /api/auth/login`
- 发布评价：`POST /api/merchants/:id/reviews`（需携带 Bearer token）
- 删除评价：`DELETE /api/reviews/:reviewId`（仅作者可删）
- 切换商家身份：`PUT /api/me/role`（role=merchant）
- 创建商家：`POST /api/merchants`
- 商家回复：`PUT /api/reviews/:reviewId/reply`（仅商家 owner 可回）

说明：以上用例依赖真实登录账号与 token，因此在原型交付中提供流程与断言，由部署方执行。

## 4. 数据库校验
- 表：`user_profiles` / `merchants` / `reviews` 已创建
- RLS：三张表均已启用
- 权限：anon 具备 merchants/reviews 的读取权限；authenticated 具备写入与更新权限（受 RLS 限制）

