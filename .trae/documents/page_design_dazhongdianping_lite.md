# 简化版大众点评原型 - 页面设计说明（桌面端优先）

## 全局规范（适用于所有页面）
- Layout：桌面端 1200px 容器居中（max-width: 1200px），两侧留白；栅格使用 CSS Grid（12 列）+ 区块内 Flex；响应式断点：≥1200（桌面）、768-1199（平板）、<768（移动，单列堆叠）。
- Meta：站点级 title 模板 `{{pageTitle}} - 点评Lite`；description 为页面核心内容摘要；Open Graph：`og:title/og:description/og:type=website`。
- Global Styles（设计 Token）
  - 背景：`--bg: #F7F8FA`；卡片：`--surface: #FFFFFF`；边框：`--border: #E5E7EB`
  - 主色：`--primary: #F97316`（按钮/高亮）；辅色：`--accent: #2563EB`（链接）
  - 字体：系统字体栈；字号：12/14/16/20/24；标题加粗 600
  - Button：Primary（橙底白字），Hover 提亮 5%；Secondary（白底橙边橙字）
  - Link：蓝色下划线 hover；状态提示：success/ danger 使用绿色/红色
- 通用组件
  - TopNav：Logo（左）、全局搜索框（中）、用户区（右：登录/头像下拉）
  - MerchantCard：封面缩略图、名称、分类、评分、评价数、地址
  - Pagination / LoadMore：页码或“加载更多”按钮（原型优先 LoadMore）

---

## 页面 1：首页
- Meta
  - title：`首页`
  - description：展示推荐商家与搜索入口
- Page Structure：顶部导航 + 头部搜索 Hero + 推荐列表（卡片网格）
- Sections & Components
  1. TopNav
     - Logo 点击回首页
     - 搜索框（输入关键词，回车跳转 `/search?q=...`）
     - 用户区：未登录显示“登录/注册”；登录显示头像+下拉（退出登录）
  2. Hero 搜索区
     - 大标题（产品定位一句话）
     - 主搜索框（更大）+ 搜索按钮
  3. 推荐商家区
     - Grid：桌面 4 列、平板 2 列、移动 1 列
     - MerchantCard 点击进入详情 `/merchant/:id`

---

## 页面 2：搜索结果页
- Meta
  - title：`搜索`
  - description：根据关键词展示商家列表
- Layout：上方筛选条（sticky 可选）+ 下方列表区；列表使用 Grid
- Sections & Components
  1. 条件栏（FilterBar）
     - 关键词输入（与 URL 同步）
     - 筛选：分类下拉、区域下拉（至少实现一个）
     - 排序：评分优先/热度优先
  2. 结果列表（MerchantGrid）
     - 空状态：无结果提示与返回首页按钮
     - 加载状态：骨架屏（可选）
  3. LoadMore
     - 点击加载下一页（保留筛选与排序条件）

---

## 页面 3：商家详情页
- Meta
  - title：`商家名称`
  - description：商家信息与用户评价
  - Open Graph：`og:title=商家名称`，`og:image=封面图`
- Page Structure：顶部信息卡 + 两栏（左评价，右商家信息）
- Sections & Components
  1. Header 信息区（MerchantHeader）
     - 封面图（16:9）+ 名称、分类、地址
     - 评分汇总：平均分、评价数
  2. 评价区（ReviewPanel，主列）
     - 发布评价（ReviewComposer）
       - 未登录：提示登录按钮（跳转 `/auth?redirect=...`）
       - 已登录：评分选择（1-5 星）+ 文本框（最多 1000）+ 提交
     - 评价列表（ReviewList）
       - 单条：作者名、时间、评分、正文
       - 操作：若作者本人显示“删除”
     - LoadMore / 分页
  3. 侧栏（MerchantAside）
     - 详细地址、营业时间（可选）、简介

---

## 页面 4：登录/注册页
- Meta
  - title：`登录/注册`
  - description：邮箱密码认证
- Layout：居中单卡片（max-width 420）
- Sections & Components
  1. AuthCard
     - Tab：登录 / 注册
     - 表单：邮箱、密码（注册可增加确认密码可选）
     - 提交按钮 + 错误提示区
  2. 登录后跳转
     - 若带 `redirect` 参数则返回来源页；否则回首页

---

## 页面 5：商家管理台
- Meta
  - title：`商家管理`
  - description：维护商家信息与查看评价
- Layout：左侧菜单 + 右侧内容（两栏布局）
- Sections & Components
  1. Sidebar
     - 菜单：商家资料、评价列表
  2. 商家资料（MerchantForm）
     - 字段：名称、分类、地址、封面图（URL 或上传二选一）、简介
     - 保存按钮；保存成功提示
  3. 评价列表（MerchantReviews）
     - 只读表格/列表：评分、内容摘要、时间

---

## 交互与状态（关键约束）
- 需要登录的动作：发布评价、删除自己的评价、进入商家管理台。
- 错误处理：表单提交错误在卡片顶部显示；列表请求失败显示重试按钮。
- 动效：按钮 hover、卡片 hover 提升阴影（transition 150ms）。
