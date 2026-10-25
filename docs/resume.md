# 简历项目描述与技术亮点

## 项目名称

**StudyFlow AI · 个性化 AI 学习规划平台**（个人全栈项目）

## 一句话介绍

基于 Vue 3 + Node.js + SQLite/PostgreSQL 的学习规划平台，真实接入 DeepSeek API，把学习目标拆解为阶段、每日任务与复习安排，并完成计划管理、任务追踪、真实统计和自然语言调整。

## 简历项目描述（中文，约 120 字）

> 独立设计并开发 StudyFlow AI：一个真实调用 DeepSeek 的个性化学习规划平台。前端使用 Vue 3 + Vite 构建完整 Design System 与响应式交互；后端使用 Express + SQLite/PostgreSQL 实现 JWT 鉴权、数据隔离、AI 编排、幂等与成本追踪。实现「目标 → 阶段 → 每日任务 → 完成统计 → AI 调整」闭环，并通过 41 个自动化测试（SQLite + PostgreSQL）、25 项端到端冒烟检查及桌面/移动视觉验收。

## 简历要点（可直接放项目经历）

- 独立完成从前端设计系统、后端 API、SQLite/PostgreSQL 数据建模到云端部署的全栈开发。
- 设计双数据库异步数据层：本地 SQLite、生产 Supabase PostgreSQL；统一查询/事务适配、占位符与 `RETURNING id` 转换、启动自动建表与 advisory lock，并在两种数据库上跑通同一套 23 个后端用例。
- 设计并实现 DeepSeek 结构化输出流水线：Prompt → JSON Mode → Zod 校验 → 服务端日期/时长归一化 → 事务落库，保证模型输出不会产生越界日期、超每日时长或非法任务。
- 实现 AI 请求幂等（`requestId` 缓存）、每用户限流、超时重试与 Token 成本记录；Key 仅保存在后端，缺失时返回明确错误而非伪造结果。
- 设计「先预览、后应用」的 AI 计划调整流程，明确区分已完成 / 手动 / 未完成任务，默认保护用户已经投入的时间。
- 基于 HttpOnly Cookie + JWT 实现会话，使用 `token_version` 实现修改密码后其他设备立即失效；所有数据接口在后端校验归属，跨用户访问统一 404。
- 使用原生 CSS Variables 建立完整 Design System，实现桌面、平板、手机三档响应式布局、焦点管理、`prefers-reduced-motion` 与完整空状态。
- 建立自动化质量保障：23 个后端用例（SQLite + PostgreSQL 各跑一遍）、18 个前端用例、25 项真实 HTTP 冒烟检查，并完成 26 张桌面/移动端截图视觉验收。

## 技术栈

`Vue 3` · `Vite` · `JavaScript` · `Vue Router` · `Pinia` · `Axios` · `Node.js` · `Express` · `SQLite` · `better-sqlite3` · `PostgreSQL` · `Supabase` · `pg` · `Zod` · `JWT` · `bcryptjs` · `DeepSeek API` · `Render` · `Vitest` · `Supertest` · `Playwright`（仅验收）

## 技术亮点（面试展开）

### 1. 不信任模型输出

AI 只负责生成内容，不负责决定系统行为。所有输出经过：

1. `response_format: json_object` 确保 JSON 形态；
2. Zod 顶层结构校验；
3. 纯函数 `normalizePlan`：阶段连续、任务落在可学习日、每日时长上限、去重、数量上限、阶段索引重映射；
4. 用户确认后才通过 `POST /plans` 落库，落库前再次 Zod 校验。

这样即使模型返回缺字段、日期越界或超长任务，也不会污染数据库。

### 2. 时间约束优先

学习计划最容易「看起来很好但执行不了」。服务端会把任务吸附到用户选择的可学习日，按每日可用时长缩放或移除低优先级任务，并把所有自动调整作为 `warnings` 返回给前端展示。

### 3. 幂等与成本

- 同一 `requestId` 的重试直接命中草稿缓存，不重复调用模型。
- AI 调整的缓存键包含计划 ID，避免跨计划误用。
- 记录真实 `prompt_tokens` / `completion_tokens` / 缓存命中，并按可配置价格估算费用。
- 每用户每小时调用上限，前端显示「真实调用 / 复用缓存」。

### 4. 安全与数据隔离

- HttpOnly + SameSite Cookie，前端不存储 Token。
- 每个读写接口都按 `user_id` 限定；跨用户统一 404，不泄露资源存在性。
- bcrypt cost 12、登录限流、请求体限制、Zod 长度限制、SQL 参数化、LIKE 转义、排序白名单、CSP、Origin 校验。
- 修改密码递增 `token_version`，旧会话立即失效。

### 5. 真实数据而非装饰

统计页的每个数字都来自 SQLite/PostgreSQL 中的任务记录。没有历史数据时只显示空状态；实际用时只统计用户主动填写的值，不把预计时长冒充实际时长。

### 6. 设计与工程化

- 30+ 个可复用组件；Token 化的颜色、间距、圆角、阴影、动效。
- 自定义 SVG 趋势图与星期图，无图表库依赖。
- 移动端底部导航、弹窗底部抽屉、表单分步、预览编辑、键盘焦点陷阱。
- API 层、Store、页面、组件、工具函数职责分离；统一错误与加载状态。

## 演示脚本（2 分钟）

1. 打开首页，说明产品定位与「今天的一小步」。
2. 注册 / 登录。
3. 在「新建 AI 计划」填写目标、时间、学习日，生成计划；展示加载过程与可编辑预览。
4. 保存后进入计划详情，展示阶段、任务、进度。
5. 完成一个任务，回到仪表盘展示进度与统计同步。
6. 在计划详情点击「AI 调整」，输入「每天只能学 45 分钟」，展示替换 / 保留任务预览并应用。
7. 打开统计页，说明数据来源与空状态。
8. 把窗口缩到手机宽度，展示底部导航与移动端布局。

## 英文版本（可选）

> **StudyFlow AI — AI-powered Study Planning Platform** (Solo Full-Stack Project)
>
> Built a production-style study planner with Vue 3, Express and SQLite/PostgreSQL that genuinely integrates the DeepSeek API. Designed a structured-output pipeline (JSON mode → Zod validation → deterministic date/duration normalization → transactional persistence), request idempotency, per-user rate limits and token-cost tracking. Built an async dual-database layer (SQLite locally, Supabase PostgreSQL in production) and deployed the stack on Render's free tier. Implemented JWT authentication with HttpOnly cookies, per-user data isolation, AI-assisted plan revision with protected completed tasks, and a complete responsive design system. Verified with 41 automated tests across both databases, a 25-check HTTP smoke test, and desktop/mobile visual QA.

## 注意事项

- 项目为个人项目，没有真实用户量或商业数据，简历中不要编造 DAU、付费率等指标。
- 本项目已完成真实 DeepSeek 调用验证（连通性、计划生成、AI 调整）；但项目为个人项目，没有真实用户量或商业数据，简历中不要编造 DAU、付费率等指标。
- 如果面试官要求看代码，优先展示：
  - `server/services/aiPlan.service.js`（归一化与调整事务）
  - `server/services/deepseek.service.js`（重试与错误映射）
  - `server/middleware/auth.js`（会话与 token_version）
  - `src/views/PlanNewView.vue`（生成状态与预览保存）
  - `src/assets/styles/tokens.css`（Design System）
