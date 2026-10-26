# Supabase Postgres + Render 免费部署

这是当前项目已经适配的免费方案：

- **Supabase Free**：托管 PostgreSQL，500MB 数据库，2 个活跃项目，免费。
- **Render Free**：运行 Express，无持久化磁盘也可以，因为数据在 Supabase。
- 不再使用 SQLite 文件；本地开发仍默认 SQLite，互不影响。

> Supabase 免费项目 **7 天无活动会暂停**；Render 免费服务空闲后会休眠，首次访问可能需要几十秒冷启动。

---

## 1. 创建 Supabase 项目

1. 打开 <https://supabase.com/dashboard>，注册/登录。
2. **New project**，选择区域（离用户近即可），设置数据库密码并保存好。
3. 等待项目初始化完成（约 1–2 分钟）。

免费额度：

- 500MB 数据库
- 50,000 MAU
- 5GB egress
- 2 个活跃项目
- 7 天无活动自动暂停

---

## 2. 获取连接字符串

### 数据库密码从哪里来

`DATABASE_URL` 里的密码是 **Supabase 数据库密码**，不是：

- ❌ Supabase 账号登录密码
- ❌ `anon` key
- ❌ `service_role` key
- ❌ JWT Secret

它是在 **创建 Supabase 项目时设置的那个数据库密码**。Supabase 之后不会再次明文显示；如果当时没有保存，只能重置：

1. Supabase 控制台 → 选择项目
2. **Project Settings → Database**
3. 找到 **Database password** → **Reset database password**
4. 设置一个只含字母和数字的强密码（避免 URL 编码问题）
5. 复制新密码，更新连接串和 Render 环境变量

重置密码不会删除数据，但所有使用旧密码的客户端都需要更新。

### 获取 Session Pooler URI

Supabase 控制台 → **Project Settings → Database → Connection string**。

选择 **Session pooler**（会话池，端口通常是 `5432`），复制 URI：

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

说明：

- **Session pooler** 对 `pg`、事务和 DDL 最稳，推荐。
- **Transaction pooler**（端口 `6543`）也可以，但会话级特性较少；本项目使用事务，优先 Session pooler。
- 密码中有 `@`、`#`、`/` 等字符时，必须 URL 编码。
- 不要把连接字符串提交到 Git，也不要放到前端。

---

## 3. 部署到 Render（免费）

1. 登录 [Render](https://render.com/)。
2. **New → Blueprint**，连接 GitHub 仓库 `lebin2025/studyFlowAI`。
3. Render 会读取根目录的 [`render.yaml`](../render.yaml)：
   - Free Web Service
   - Node 24
   - 无磁盘（数据库在 Supabase）
4. 在环境变量提示中填写：
   - `DATABASE_URL`：上一步的 Session pooler URI
   - `DEEPSEEK_API_KEY`：你的 DeepSeek Key
5. 点击 **Apply / Deploy**。

`render.yaml` 已经设置：

- `NODE_ENV=production`
- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `JWT_SECRET` 自动生成
- `DATABASE_SSL=true`
- `DB_POOL_MAX=5`
- 健康检查 `/api/health`

部署完成后访问：

```text
https://<service-name>.onrender.com/api/health
```

期望：

```json
{"status":"ok","database":"ok","aiConfigured":true}
```

首次启动会自动创建 PostgreSQL 表；不需要手动执行 SQL。

---

## 4. 本地连接 Supabase 验证（可选）

在本地 `.env` 临时加入：

```dotenv
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

然后：

```bash
npm run db:migrate
npm run dev:server
```

本地默认不设置 `DATABASE_URL` 时仍使用 SQLite，不影响日常开发。

> 本地连接 Supabase 会直接操作云端数据库，测试前请确认不是生产数据。

---

## 5. 免费额度和暂停规则

### Supabase

- 500MB 数据库，超过需要清理或升级。
- 7 天无活动自动暂停；在 Supabase 控制台点击 **Restore / Resume** 恢复。
- 免费项目没有长期备份，重要数据请定期导出：

```bash
pg_dump "$DATABASE_URL" > studyflow-backup.sql
```

### Render

- 免费 Web Service 空闲后休眠，首次请求会冷启动。
- 没有持久化磁盘也没关系：应用不写本地数据库，只写 Supabase。
- 单实例运行；`DB_POOL_MAX=5` 避免占满免费连接数。

---

## 6. 数据层说明

项目现在支持双数据库：

| 环境 | 数据库 |
| --- | --- |
| 本地未设置 `DATABASE_URL` | SQLite（`server/data/studyflow.db`） |
| 设置 `DATABASE_URL` | PostgreSQL / Supabase |

- SQLite 使用 `better-sqlite3`
- PostgreSQL 使用 `pg` 连接池
- 两套 schema 分别位于 `server/db/schema.sql` 和 `server/db/schema.postgres.sql`
- 所有查询通过统一的异步适配器执行；UTC 时间仍以 ISO 字符串保存
- Postgres 启动时自动建表，并用 advisory lock 防止多实例并发建表

---

## 7. 安全

- `DATABASE_URL` 只存在 Render 环境变量 / 本地 `.env`，不提交 Git。
- 不需要 Supabase `anon key` 或 `service_role key`；后端直接用数据库连接串。
- 不要把数据库密码、连接串、DeepSeek Key 写进前端或 GitHub Pages。
- 如果连接串曾泄露，立即在 Supabase 重置数据库密码并更新 Render。
- Supabase 的 RLS 不参与这条链路：Express 通过数据库用户直接访问；用户隔离仍由后端 `user_id` 条件保证。

---

## 8. 常见问题

### `password authentication failed`
连接串密码错误或未 URL 编码。重新复制 Session pooler URI，替换 `<password>`。

### `password authentication failed for user "postgres"` (28P01)
如果用的是 Session pooler，用户名必须是 `postgres.<project-ref>`，不是 `postgres`。错误信息里显示 `user "postgres"`，通常说明手动改了主机名但没改用户名，或者复制了 Direct connection 的 URI。

回到 Supabase **Connect → Session pooler** 完整复制 URI，不要只替换主机名。密码如有特殊字符要 URL 编码；不确定就重置成字母数字密码。

### `connect ENETUNREACH 2406:...:5432`
说明 `DATABASE_URL` 用的是 **Direct connection**，它解析到 IPv6 地址；Render 免费实例没有 IPv6 出网，所以连接被拒绝。

改用 **Session pooler**：

- 主机名必须包含 `.pooler.supabase.com`
- 端口通常是 `5432`
- 用户名形如 `postgres.<project-ref>`
- 不是 `db.<project-ref>.supabase.co:5432`（这是 Direct connection，IPv6）

在 Supabase 控制台 **Connect → Session pooler** 重新复制 URI，更新 Render 的 `DATABASE_URL`，再 Manual Deploy。

### `getaddrinfo ENOTFOUND` / IPv6 连接失败
不要使用 Direct connection（IPv6）；使用 **Session pooler** 的 IPv4 主机名。

### `too many connections`
免费实例连接数有限。保持 `DB_POOL_MAX=5`，不要把 Render 扩成多实例。

### 部署后 `/api/health` 的 `database` 是 `error`
查看 Render Logs：通常是 `DATABASE_URL` 未设置、SSL 被关闭、或 Supabase 项目已暂停。

### 第一次访问很慢
Render 免费实例在冷启动；属正常现象。

### Supabase 项目暂停后打不开
登录 Supabase 控制台恢复项目，再刷新 Render 站点。免费项目 7 天无活动会暂停。

---

参考：

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Free Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Render Free](https://render.com/docs/free)
