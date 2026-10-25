# 部署指南

> **免费推荐：** [Supabase Postgres + Render Free](supabase.md)（Supabase 500MB 免费数据库，Render 免费 Web Service，无持久化磁盘）。如果不想用外部数据库，可以用 [Alwaysdata Free](alwaysdata.md)（1GB 持久化磁盘 + SQLite）。GitHub Pages 无法运行本项目的 Node 后端。

> 想从 GitHub 自动部署？仓库已提供 `.github/workflows/ci.yml` 与 `render.yaml`，完整步骤见 [github.md](github.md)。

## 1. 构建产物说明

`npm run build` 生成 `dist/`。生产模式下 Express：

- `GET /api/*` 提供 REST API
- 其他路径优先匹配 `dist/` 静态文件
- 未匹配的页面路径回退到 `dist/index.html`（SPA）
- `/api` 未知路径返回 JSON 404，不会被 SPA fallback 吞掉

因此只需要运行一个 Node 进程和一个端口。

---

## 2. 直接部署（Node + systemd）

```bash
# 1. 安装依赖与构建
npm ci
npm run build

# 2. 配置环境
cp .env.example .env
# 编辑 .env：
#   NODE_ENV=production
#   JWT_SECRET=...
#   DEEPSEEK_API_KEY=...
#   COOKIE_SECURE=true
#   APP_ORIGIN=https://your-domain.com
#   TRUST_PROXY=1

# 3. 启动
node server/index.js
```

### systemd 示例

`/etc/systemd/system/studyflow.service`

```ini
[Unit]
Description=StudyFlow AI
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/studyflow
EnvironmentFile=/opt/studyflow/.env
ExecStart=/usr/bin/node /opt/studyflow/server/index.js
Restart=on-failure
RestartSec=3
# 安全加固
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/studyflow/server/data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now studyflow
sudo systemctl status studyflow
```

### PM2 示例

```bash
npm i -g pm2
pm2 start server/index.js --name studyflow --time
pm2 save
pm2 startup
```

> 不要使用 `pm2 cluster`：SQLite 写入和内存限流都按单实例设计。

---

## 3. Nginx + HTTPS

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # AI 生成可能耗时 60 秒以上
        proxy_read_timeout 240s;
        proxy_send_timeout 240s;
    }
}
```

对应 `.env`：

```ini
NODE_ENV=production
TRUST_PROXY=1
COOKIE_SECURE=true
APP_ORIGIN=https://your-domain.com
```

- 反向代理后 `TRUST_PROXY=1` 让 Express 正确识别 HTTPS 与客户端 IP（限流用）
- 同源部署时 CORS 不需要额外配置；如前后端不同域，必须设置 `APP_ORIGIN` 并确保携带 Cookie（`withCredentials`）
- 生产环境 Helmet 会启用 CSP；本项目不需要 CDN 脚本或外部字体

---

## 4. Docker

仓库提供 `Dockerfile` 与 `docker-compose.yml`。

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f app

# 健康检查
curl http://127.0.0.1:8787/api/health
```

`docker-compose.yml` 默认：

- 挂载命名卷 `studyflow-data` 到 `/data`，SQLite 文件持久化
- 从 `.env` 读取密钥
- `COOKIE_SECURE=false` 便于本地 HTTP 验证；**公网 HTTPS 部署请改为 `true`**
- `TRUST_PROXY=1`

### 手动 Docker 运行

```bash
docker build -t studyflow-ai .

docker run -d --name studyflow \
  -p 8787:8787 \
  -e NODE_ENV=production \
  -e JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" \
  -e DEEPSEEK_API_KEY="sk-..." \
  -e COOKIE_SECURE=true \
  -e APP_ORIGIN=https://your-domain.com \
  -e TRUST_PROXY=1 \
  -e DB_PATH=/data/studyflow.db \
  -v studyflow-data:/data \
  studyflow-ai
```

使用 Supabase 时不需要 SQLite 卷，改为：

```bash
docker run -d --name studyflow \
  -p 8787:8787 \
  -e NODE_ENV=production \
  -e JWT_SECRET="..." \
  -e DEEPSEEK_API_KEY="sk-..." \
  -e DATABASE_URL="postgresql://..." \
  -e DATABASE_SSL=true \
  -e COOKIE_SECURE=true \
  -e TRUST_PROXY=1 \
  studyflow-ai
```

---

## 5. 数据库与备份

### PostgreSQL / Supabase（生产推荐）

设置 `DATABASE_URL` 后应用使用 PostgreSQL，不再读写本地 SQLite 文件：

```ini
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DB_POOL_MAX=5
```

- 启动时自动执行 `server/db/schema.postgres.sql`
- 使用事务级 advisory lock，多实例同时启动不会重复建表
- Supabase 免费项目 7 天无活动会暂停；重要数据定期 `pg_dump`
- Render 免费服务没有磁盘也可以，数据全部在 Supabase

```bash
pg_dump "$DATABASE_URL" > studyflow-backup-$(date +%F).sql
```

### SQLite（本地 / Alwaysdata / VPS）

SQLite 文件默认：`server/data/studyflow.db`（Docker 中 `/data/studyflow.db`）。

- WAL 模式会产生 `studyflow.db-wal` 与 `studyflow.db-shm`
- 备份时建议先停止写入或使用 SQLite 在线备份：

```bash
sqlite3 server/data/studyflow.db ".backup 'backup-$(date +%F).db'"
```

- 定时备份示例（cron，每天 3:00）：

```cron
0 3 * * * cd /opt/studyflow && sqlite3 server/data/studyflow.db ".backup '/var/backups/studyflow-$(date +\%F).db'"
```

- 恢复：停止服务 → 替换 `.db` → 删除旧 `-wal/-shm` → 启动
- 迁移：SQLite 使用 `CREATE TABLE IF NOT EXISTS` + `PRAGMA user_version = 1`；PostgreSQL 使用 `CREATE TABLE IF NOT EXISTS` + advisory lock
- 数据目录必须可写；`server/data/` 已在 `.gitignore` 中

---

## 6. 平台部署提示

### Render / Railway / Fly.io
- 使用 Supabase PostgreSQL：设置 `DATABASE_URL`、`DATABASE_SSL=true`，不需要持久卷
- 也可以使用持久卷 + SQLite：挂载 `/data`，设置 `DB_PATH=/data/studyflow.db`
- 设置所有环境变量，尤其是 `JWT_SECRET`、`DEEPSEEK_API_KEY`
- 健康检查路径：`/api/health`
- SQLite 模式单实例；PostgreSQL 模式仍建议单实例，因为限流在进程内存中

### Vercel / Netlify
- 配合 Supabase PostgreSQL 可以部署 Serverless API，但需要把 Express 路由改造成对应平台函数
- AI 非流式请求可能超过平台默认函数超时；当前项目推荐 Render / 常驻 Node
- 不要在前端放 DeepSeek Key

### 反向代理与超时
- AI 非流式请求默认最长 180 秒；Nginx `proxy_read_timeout` 至少 240s
- 前端 Axios 对 AI 请求单独设置 240s 超时

---

## 7. 上线检查清单

- [ ] `JWT_SECRET` 为 48 位以上随机值，且未提交到 git
- [ ] `DEEPSEEK_API_KEY` 只存在于服务器环境变量
- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SECURE=true` 且已启用 HTTPS
- [ ] `APP_ORIGIN` 与真实域名一致
- [ ] `TRUST_PROXY=1`（在可信代理后）
- [ ] `DATABASE_URL` 已配置且 `DATABASE_SSL=true`（Supabase），或 `server/data` / `/data` 已挂载持久化磁盘并设置权限（SQLite）
- [ ] `/api/health` 返回 `database: ok`、`aiConfigured: true`
- [ ] `npm run verify:ai` 成功
- [ ] 已测试注册、登录、生成计划、保存、完成任务、统计
- [ ] 数据库备份任务已配置（Postgres `pg_dump` 或 SQLite `.backup`）
- [ ] 日志中不包含 Key / 密码 / Cookie
- [ ] 已限制服务器出站访问（只允许 DeepSeek API 等必要域名）可选
- [ ] 单实例运行（SQLite + 内存限流；PostgreSQL 仍建议单实例）

---

## 8. 常见问题

### `Port 8787 is already in use`
修改 `.env` 的 `PORT`，或停止占用端口的进程。

### `SQLITE_CANTOPEN`
数据目录不存在或没有写权限。手动创建目录并授权：

```bash
mkdir -p server/data
chown -R www-data:www-data server/data
```

### 登录成功但刷新后又退出
- 生产环境使用 HTTP 且 `COOKIE_SECURE=true`，浏览器会拒绝设置 Cookie
- 解决：启用 HTTPS，或本地验证时显式设置 `COOKIE_SECURE=false`

### 跨域请求没有带 Cookie
- 前端 `withCredentials: true`
- 后端 `APP_ORIGIN` 为前端实际 Origin
- 不要把 `APP_ORIGIN` 配成 `*`（CORS 凭据模式不允许）

### `AI_NOT_CONFIGURED`
在 `.env` 填写 `DEEPSEEK_API_KEY` 并重启后端。前端在「AI 生成计划」第三步会显示配置提示。

### `AI_TIMEOUT`
- 检查服务器到 `api.deepseek.com` 的网络
- 适当增大 `DEEPSEEK_TIMEOUT_MS`
- 缩短计划周期，或降低 `DEEPSEEK_MAX_TOKENS`

### 多实例部署数据不一致
SQLite 只适用于单实例。PostgreSQL / Supabase 可以由多个实例共享数据库，但当前限流在进程内存中，多实例仍需要 Redis 限流和共享任务队列。
