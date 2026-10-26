# StudyFlow AI

> 把大目标，拆成今天的一小步。

**在线演示**：<https://studyflow-ai-hntk.onrender.com>

> Render 免费实例空闲后会休眠，首次打开可能需要 30–60 秒；Supabase 免费项目 7 天无活动会暂停，恢复后数据仍在。

StudyFlow AI 是一个基于大语言模型的个性化学习规划与任务管理平台。它不是又一个待办清单：它真实调用 DeepSeek API，把学习目标拆成阶段、每日任务、完成标准与复习安排，并把「今天该做什么」放在第一位。

- 前端：Vue 3 + Vite + JavaScript + Vue Router + Pinia + Axios
- 后端：Node.js + Express + SQLite（本地）/ PostgreSQL（Supabase，生产）
- AI：DeepSeek 官方 API（`deepseek-flash` / `deepseek-v4-pro`），JSON Output
- 样式：原生 CSS、CSS Variables、完整 Design System，无 UI 框架
- 测试：Vitest + Supertest + 真实 HTTP 冒烟测试 + 浏览器交互验收

> API 文档核对时间：2026-10-25。DeepSeek 官方文档当前的模型名为 `deepseek-flash` 与 `deepseek-v4-pro`，Base URL 为 `https://api.deepseek.com`，支持 `response_format: {"type":"json_object"}`。

---

## 1. 已实现功能

### 首页
- 产品介绍、核心能力、工作方式、适用场景与 CTA
- 桌面 / 移动响应式导航
- 界面示例明确标注「界面示例」，不伪装成真实用户数据

### 用户系统
- 注册、登录、退出、登录状态管理
- 表单即时校验、密码强度提示、密码可见性切换
- HttpOnly Cookie 会话（JWT），受保护路由
- 修改密码后轮换 Token 版本，其他设备自动失效
- 所有数据接口在后端校验身份与数据归属

### 学习仪表盘
- 今日任务（待完成 / 已完成）、今日计划时长、连续学习、整体完成率
- 当前学习计划与真实进度
- 最近 7 天节奏、接下来 7 天任务
- 空状态、加载骨架、错误重试
- 任务完成即时同步计划与统计

### AI 学习计划生成
- 三步向导：目标与基础 → 时间约束 → 偏好与确认
- 真实调用 DeepSeek；后端校验 API Key、超时、重试与输出结构
- 表单自动保存到本地（刷新不丢），生成失败保留全部输入
- 取消生成、失败重试、重复提交保护、Idempotency（同一 requestId 不重复计费）
- 生成后进入可编辑预览：计划名称、目标、策略、阶段、任务、时长、优先级、完成标准
- 必须点击保存才写入数据库；不使用假数据冒充 AI 结果

### 学习计划管理
- 创建、列表、详情、编辑、删除、搜索、状态 / 科目筛选、日期 / 进度排序
- 计划进度、阶段进度、每日任务分组
- 删除计划级联删除阶段和任务
- 计划卡片、空状态、空搜索状态

### 学习任务管理
- 新增、编辑、删除、标记完成 / 取消完成
- 日期、优先级、完成状态、所属计划筛选与关键词搜索
- 任务字段：名称、描述、日期、预计时长、优先级、完成标准、复习标记、实际用时
- 完成 / 取消完成同步计划进度；全部完成时计划自动变为已完成

### AI 修改计划
- 自然语言调整：缩短每日时长、任务拆细、增加复习、降低难度、修改周期等
- 先预览、后应用；不会直接覆盖原计划
- 明确展示「保留已完成 / 保留手动任务 / 替换未完成任务 / 新增任务」
- 默认保留已完成和手动任务，取消保留时有明确风险提示
- 应用后阶段与任务在同一事务中重建

### 学习进度统计
- 任务总数、已完成、完成率、预计学习时长、登记实际用时
- 每日趋势图、按星期完成情况、科目分布、连续学习
- 全部来自真实任务记录；无数据时只显示空状态，不伪造历史
- 统计口径在页面明确标注（预计时长 ≠ 实际用时）

### 个人设置
- 个人资料、学习偏好、默认每日时长、默认可学习日、学习方式
- 修改密码、退出登录
- 最近 30 天 AI 调用次数、Token、估算费用与最近调用记录

---

## 2. 快速开始

### 环境要求
- Node.js **>= 22.12.0**（推荐 24 LTS）
- npm 10+
- Windows / macOS / Linux

### 本地开发

```bash
npm install

# Windows PowerShell
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

编辑 `.env`：

```ini
JWT_SECRET=用随机字符串替换（至少 32 位）
DEEPSEEK_API_KEY=sk-你的密钥
```

生成 JWT Secret：

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

启动：

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:8787
- 数据库：本地默认 `server/data/studyflow.db`；设置 `DATABASE_URL` 后使用 PostgreSQL / Supabase（首次启动自动建表）
- Vite 已将 `/api` 代理到后端，无需额外配置 CORS

### 生产模式（单进程同时提供 API 与静态页面）

```bash
npm run build
npm start
```

访问 http://localhost:8787 。

生产环境务必：

```ini
NODE_ENV=production
COOKIE_SECURE=true
APP_ORIGIN=https://你的域名
TRUST_PROXY=1   # 仅在可信反向代理后面
```

### 数据库初始化 / 迁移

通常无需手动操作，应用启动时会自动执行：

- 本地 SQLite：`server/db/schema.sql`
- PostgreSQL / Supabase：`server/db/schema.postgres.sql`

手动执行：

```bash
npm run db:migrate
```

本地 SQLite 不存在时会创建；已存在时仅补齐缺失的表和索引（`PRAGMA user_version = 1`）。PostgreSQL 使用 `CREATE TABLE IF NOT EXISTS`，并通过事务级 advisory lock 防止多实例并发建表。

---

## 3. DeepSeek API 接入说明

### 调用链路

```
浏览器表单
  → POST /api/ai/plans（不会携带 API Key）
  → 后端校验身份、输入、时间约束、每小时额度
  → 组装中文结构化 Prompt
  → POST https://api.deepseek.com/chat/completions
       model: deepseek-flash（可通过 DEEPSEEK_MODEL 切换）
       response_format: { type: "json_object" }
       thinking: { type: "disabled" }（可配置开启）
  → 解析 JSON，服务端二次校验与归一化
  → 记录真实 Token 用量与估算费用
  → 返回可编辑草稿（此时不写数据库）
  → 用户保存 → POST /api/plans → SQLite / PostgreSQL
```

### 官方文档核对结果

| 项目 | 当前实现 |
| --- | --- |
| Base URL | `https://api.deepseek.com` |
| 模型 | `deepseek-flash`（默认）、`deepseek-v4-pro` |
| 接口 | OpenAI 兼容 `/chat/completions` |
| 鉴权 | `Authorization: Bearer <DEEPSEEK_API_KEY>` |
| 结构化输出 | `response_format: { type: "json_object" }` |
| Thinking | 默认关闭；`DEEPSEEK_THINKING=enabled` 可开启，并设置 `reasoning_effort` |
| 超时 | 默认 180 秒，`DEEPSEEK_TIMEOUT_MS` 可调 |
| 重试 | 超时 / 网络 / 5xx / 空内容自动重试（默认 2 次）；401/402/400 不重试 |
| 错误码 | 400 / 401 / 402 / 422 / 429 / 500 / 503 映射为明确的中文错误 |

### 关键可靠性设计

- **API Key 只在后端**：前端、构建产物、日志中都不会出现；`/api/ai/status` 只返回 `configured` 与模型名。
- **输出结构校验**：Zod 校验顶层结构，随后 `normalizePlan` 再校验阶段、任务、日期、优先级、每日时长、任务数量、重复任务。
- **时间约束**：任务只会被安排到可学习日；超出计划日期的任务会被移回范围；每日总时长超过上限时会按比例缩放，必要时移除低优先级任务，并在预览中列出「系统自动调整」。
- **不允许 AI 决定权限**：模型只产生计划内容，所有写入都经过用户身份、计划归属、字段白名单校验，绝不执行模型给出的指令。
- **Idempotency**：`requestId` + 用户缓存已生成的草稿（默认 30 分钟）。网络中断后重试不会重复调用模型；调整计划的缓存键还包含计划 ID。
- **成本控制**：每用户每小时 AI 调用限额、最大输出 Token、最多 160 个 AI 任务、无法配置 Key 时直接返回 503。
- **真实用量**：读取 DeepSeek 返回的 `prompt_tokens`、`completion_tokens`、`prompt_cache_hit_tokens`、`prompt_cache_miss_tokens`，按 `.env` 中的价格计算并写入 `ai_usage`。价格默认取 Flash 高峰价（偏保守），可在 `.env` 调整。

### 验证真实连通性

配置 Key 后运行：

```bash
npm run verify:ai
```

它会发起一次最小的真实 JSON Output 请求，打印模型、延迟、Token 与缓存命中情况；不会打印 Key。

> 已使用真实 Key 完成验证（2026-10-25，`deepseek-flash`）：
> - JSON 连通性：727 ms，111 tokens，返回合法 JSON
> - 真实计划生成：3 个阶段 / 10 个任务，9.6 s，2375 tokens；每日总时长未超过 45 分钟，服务端校验后成功落库
> - 真实 AI 调整：每日 60 → 30 分钟、周期 5 → 7 天；预览保留 1 个已完成任务，应用后共 12 个任务，8.0 s，2492 tokens
>
> Key 只保存在本机 `.env`（已被 `.gitignore` 忽略）；前端构建产物、接口响应和日志中都不包含 Key。

---

## 4. 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | 否 | `development` / `production` |
| `PORT` | 否 | 后端端口，默认 `8787` |
| `APP_TIMEZONE` | 否 | 统计与「今天」的时区，默认 `Asia/Shanghai` |
| `DATABASE_URL` | 生产推荐 | PostgreSQL / Supabase 连接串；为空时使用 SQLite |
| `DATABASE_SSL` | 否 | Supabase 设为 `true`；本地 PostgreSQL 无 TLS 时设 `false` |
| `DB_POOL_MAX` | 否 | PostgreSQL 连接池上限，默认 `5` |
| `DB_PATH` | 否 | SQLite 路径，默认 `./server/data/studyflow.db`；设置 `DATABASE_URL` 后忽略 |
| `JWT_SECRET` | 生产必填 | JWT 签名密钥，至少 32 位随机字符串 |
| `JWT_EXPIRES_IN` | 否 | 会话有效期，默认 `7d` |
| `COOKIE_NAME` | 否 | 会话 Cookie 名，默认 `sf_session` |
| `COOKIE_SECURE` | 生产建议 | HTTPS 下必须为 `true` |
| `APP_ORIGIN` | 生产建议 | 允许跨域携带 Cookie 的前端 Origin |
| `TRUST_PROXY` | 否 | 在 Nginx/Render 等代理后设为 `1` |
| `DEEPSEEK_API_KEY` | AI 必填 | 仅保存在后端 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | `deepseek-flash` / `deepseek-v4-pro` |
| `DEEPSEEK_THINKING` | 否 | `disabled`（默认）/ `enabled` |
| `DEEPSEEK_REASONING_EFFORT` | 否 | `low` / `high` / `max` |
| `DEEPSEEK_TIMEOUT_MS` | 否 | 单次上游请求超时 |
| `DEEPSEEK_MAX_TOKENS` | 否 | 单次最大输出 Token |
| `DEEPSEEK_MAX_RETRIES` | 否 | 失败重试次数 |
| `AI_PRICE_INPUT_MISS` | 否 | 输入（缓存未命中）每百万 Token 美元价 |
| `AI_PRICE_INPUT_HIT` | 否 | 输入（缓存命中）每百万 Token 美元价 |
| `AI_PRICE_OUTPUT` | 否 | 输出每百万 Token 美元价 |
| `AI_RATE_LIMIT_PER_HOUR` | 否 | 每用户每小时 AI 调用上限，默认 8 |
| `AI_DRAFT_TTL_SECONDS` | 否 | 草稿缓存时长，默认 1800 秒 |

`.env` 已被 `.gitignore` 忽略；`.env.example` 可安全提交。

---

## 5. 数据库结构

本地 SQLite（WAL 模式、外键开启）与 PostgreSQL / Supabase 双支持。完整定义见 `server/db/schema.sql` 和 `server/db/schema.postgres.sql`。

| 表 | 作用 | 关键约束 |
| --- | --- | --- |
| `users` | 账户 | 邮箱大小写不敏感唯一；密码为 bcrypt 哈希；`token_version` 用于会话失效 |
| `user_preferences` | 学习偏好 | 与用户 1:1，级联删除 |
| `plans` | 学习计划 | 日期范围、每日时长、状态、科目、水平、风险、AI 建议 |
| `plan_stages` | 学习阶段 | 属于计划，级联删除 |
| `tasks` | 学习任务 | 属于计划与用户；`stage_id` 可为空；完成、复习、实际用时、来源 |
| `ai_usage` | AI 调用与成本 | 真实 Token、缓存命中、费用、延迟、成功/失败 |
| `ai_drafts` | AI 幂等缓存 | `(user_id, request_id)` 主键，带过期时间 |

- 删除计划 → 阶段与任务 `ON DELETE CASCADE`
- 删除阶段 → 任务 `stage_id` 置空（保留用户数据）
- 删除用户 → 其偏好、计划、任务、AI 记录级联删除
- 主要索引：计划状态、任务日期、任务完成状态、AI 用量时间

数据模型与请求流程详见 [`docs/architecture.md`](docs/architecture.md)。

---

## 6. 安全与可靠性

- 密码使用 bcrypt（cost 12）哈希；登录失败使用固定哈希做时序均衡
- JWT 使用 HS256、Issuer / Audience 校验、7 天过期；HttpOnly + SameSite=Lax Cookie
- 修改密码递增 `token_version`，旧设备 Token 立即失效
- 所有数据接口 `requireAuth`，所有查询按 `user_id` 限定；跨用户读取返回 404
- Zod 校验所有 body / query / params，限制字符串长度、数组规模与日期有效性
- SQL 全部参数化；搜索对 `%` `_` `\` 转义；排序字段白名单
- Helmet 安全头与生产环境 CSP；CORS 允许列表；非 GET 请求 Origin 校验
- 全局限流、登录限流、每用户 AI 限流（内存实现，单进程）
- 请求体上限 256KB；错误响应统一为 `{ error: { code, message, details?, requestId } }`
- 日志脱敏：密码、Cookie、Authorization、API Key 不会进入日志
- 前端不使用 `v-html`，AI 输出以纯文本渲染，避免 XSS
- AI 输出绝不能决定权限或直接执行操作；写入前全部二次校验

---

## 7. 测试与验收

### 可复现命令

```bash
npm run build            # 生产构建
npm run test:server      # 后端 API / 权限 / AI mock 测试
npm run test:unit -- --run  # 前端组件与工具测试
npm run smoke            # 真实 HTTP + 临时 SQLite + 重启持久化
npm run verify:ai        # 真实 DeepSeek 连通性（需要 Key）
```

### 本次实际执行结果

| 项目 | 结果 |
| --- | --- |
| 生产构建 | ✅ 通过（Vite 8，无编译错误） |
| 后端测试 | ✅ SQLite + PostgreSQL（本地 18 / CI 17）各 4 个文件、23 个用例通过 |
| 前端测试 | ✅ 5 个文件、18 个用例通过 |
| 端到端 Smoke | ✅ 25 项检查通过（注册 / 登录 / 计划 / 任务 / 统计 / 越权 / 静态页面 / 重启持久化 / AI 未配置错误） |
| 浏览器交互验收 | ✅ 任务弹窗新增/编辑/删除、AI 预览编辑保存、AI 调整预览应用、计划删除 |
| 视觉验收 | ✅ 1440×1000 桌面与 390×844 移动端共 26 张截图，无横向溢出、无控制台错误 |
| 真实 DeepSeek 调用 | ✅ 已通过：连通性 727ms / 111 tokens；真实生成 9.6s / 2375 tokens；真实调整 8.0s / 2492 tokens |
| 真实 AI + PostgreSQL | ✅ 生成 12 个任务、调整保留 1 个已完成任务；6560 tokens / `$0.00521` |

### 覆盖的关键场景

- 未登录访问受保护页面 → 跳转登录
- 重复邮箱注册、弱密码、错误密码、退出登录
- 修改密码后其他设备 Token 失效
- 用户 A 无法读取 / 修改 / 删除用户 B 的计划与任务
- 计划日期冲突、任务越界、非法优先级 / 时长
- 完成任务后计划进度与统计同步；全部完成自动标记计划完成
- AI 输出非法 JSON / 结构缺失 → 502，不写假数据
- AI 超时 → 504；未配置 Key → 503 `AI_NOT_CONFIGURED`
- 同一 `requestId` 重复生成 → 命中缓存，不重复调用
- AI 调整保留已完成任务与手动任务
- 服务重启后计划与完成记录仍然存在

---

## 8. 项目目录

```text
studyFlowAI/
├─ server/
│  ├─ app.js                  # Express 应用、静态托管、SPA fallback
│  ├─ index.js                # 启动与优雅退出
│  ├─ config/env.js           # 环境变量集中解析与生产校验
│  ├─ db/                     # schema.sql、连接、迁移
│  ├─ middleware/             # 鉴权、校验、限流、安全、错误处理
│  ├─ routes/                 # auth / users / plans / tasks / stats / ai
│  ├─ services/               # 业务逻辑、AI 编排、DeepSeek 客户端、统计
│  ├─ prompts/planPrompts.js  # AI 规划 / 调整 Prompt
│  ├─ schemas/                # Zod 输入校验
│  ├─ utils/                  # 日期、文本、成本、日志、错误
│  └─ __tests__/              # 后端测试
├─ src/
│  ├─ api/                    # Axios 实例与统一 API 模块
│  ├─ assets/styles/          # tokens.css / base.css / forms.css
│  ├─ components/             # ui / layout / plans / tasks / charts / illustrations
│  ├─ composables/            # 滚动揭示
│  ├─ layouts/                # AppShell、AuthLayout
│  ├─ stores/                 # Pinia：auth / ui toast
│  ├─ utils/                  # 日期、格式化、校验
│  ├─ views/                  # 首页、登录、仪表盘、计划、任务、统计、设置
│  └─ router/
├─ scripts/
│  ├─ smoke-test.mjs          # 真实 HTTP 冒烟测试
│  └─ verify-deepseek.mjs     # 真实 DeepSeek 连通性验证
├─ docs/                      # 架构、API、部署、简历描述
├─ .env.example
├─ vite.config.js
└─ package.json
```

---

## 9. 已知限制

1. 真实 DeepSeek 调用已在开发机验证（`deepseek-flash`）；但模型输出具有不确定性，生产环境仍需观察额度、延迟与内容质量。
2. 没有邮箱验证、找回密码、OAuth、账户注销。
3. 只有一个 7 天 JWT 会话；退出会清 Cookie，但不会把已泄露的 Token 加入黑名单（修改密码会使其失效）。
4. 本地 SQLite 适合单实例；生产可使用 Supabase PostgreSQL。当前限流和 AI 草稿缓存仍基于单实例/数据库，真正水平扩展还需要 Redis 限流和任务队列。
5. Supabase 免费项目 7 天无活动会暂停；Render 免费服务空闲后会休眠，首次访问可能冷启动。
6. AI 计划在结构、日期与时长上被严格校验，但内容的教育合理性仍需要用户判断；不保证完全符合考试大纲。
7. AI 费用是估算值：按 DeepSeek 返回的真实 Token × `.env` 价格计算，未自动识别峰谷价，也不替代官方账单。
8. AI 调整预览只可确认，不直接在预览中逐项编辑；应用后可以继续在计划详情中编辑。
9. 实际学习用时需要用户手动填写；未填写时统计会明确显示「尚未登记」，不会把预计时长冒充实际时长。
10. 服务端时区固定为 `APP_TIMEZONE`（默认 Asia/Shanghai），跨时区用户看到的「今天」可能与本地略有差异。
11. 没有提醒推送、日历导出、离线模式、深色模式。
12. AI 请求为非流式 JSON；长计划可能需要 20–60 秒，超时可在 `.env` 调整。
13. 单计划最多 366 天、200 个任务（AI 生成最多 160 个）。
14. 提供了 `Dockerfile` / `docker-compose.yml`，但当前环境没有安装 Docker，未实际构建镜像；直接 Node 部署已完整验证。

---

## 10. 部署

**免费推荐：[Supabase Postgres + Render Free](docs/supabase.md)**。Supabase 免费托管 PostgreSQL（500MB），Render 免费运行 Express；不需要 Render 持久化磁盘，数据在 Supabase，免费额度内 0 美元。注意 Supabase 免费项目 7 天无活动会暂停，Render 免费实例会休眠。

如果不想用外部数据库，也可以用 [Alwaysdata Free](docs/alwaysdata.md)：1GB 持久化磁盘 + SQLite，256MB 内存。

其他方式详见 [`docs/deployment.md`](docs/deployment.md)。核心步骤：

```bash
npm ci
npm run build
NODE_ENV=production \
DATABASE_URL=postgresql://... \
DATABASE_SSL=true \
JWT_SECRET=... \
DEEPSEEK_API_KEY=... \
COOKIE_SECURE=true \
APP_ORIGIN=https://your-domain.com \
TRUST_PROXY=1 \
node server/index.js
```

生产环境建议 Nginx / Caddy 反向代理 + HTTPS。使用 Supabase 时无需本地数据库文件；使用 SQLite 时把文件放在持久化磁盘并定期备份。单实例仍是最简单可靠的部署方式。

### GitHub 仓库与一键部署

仓库已包含：

- `.github/workflows/ci.yml`：推送 / PR 自动构建、SQLite 与 PostgreSQL 双后端测试、18 个前端测试、25 项冒烟检查
- `render.yaml`：Render 免费 Web Service + Supabase Postgres（无磁盘、无付费实例）
- `docs/supabase.md`：Supabase 建库、Session Pooler、Render 部署和免费额度说明（推荐）
- `docs/alwaysdata.md`：Alwaysdata Free + SQLite 的免费备用方案
- `docs/github.md`：从创建仓库、推送、GitHub Actions 到云端部署的完整步骤

推荐路径：**GitHub 托管代码 + Supabase 托管数据库 + Render Free 运行 Express**。GitHub Pages 只能托管静态文件，无法运行 Express、数据库和 DeepSeek 服务端调用，因此不要用 Pages 部署本项目。

---

## 11. 项目介绍（可用于简历）

详见 [`docs/resume.md`](docs/resume.md)。一句话版本：

> StudyFlow AI：一个真实接入 DeepSeek 的个性化学习规划平台。独立完成 Vue 3 + Express + SQLite/PostgreSQL 全栈开发，设计完整 Design System；实现结构化 AI 输出、时间约束归一化、请求幂等与 Token 成本追踪；通过 41 个自动化测试、25 项端到端冒烟检查与桌面/移动视觉验收。

---

## 12. 文档索引

- [架构与技术决策](docs/architecture.md)
- [API 文档](docs/api.md)
- [部署指南](docs/deployment.md)
- [Supabase + Render 免费部署（推荐）](docs/supabase.md)
- [Alwaysdata 免费部署（备用）](docs/alwaysdata.md)
- [GitHub 推送与云端部署](docs/github.md)
- [简历项目描述与技术亮点](docs/resume.md)
- [环境变量示例](.env.example)
