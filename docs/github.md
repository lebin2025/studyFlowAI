# 推送到 GitHub 并部署

## 先说明：GitHub Pages 不能运行这个项目

StudyFlow AI 是 **Vue 前端 + Express API + SQLite + DeepSeek 服务端调用** 的全栈应用：

- GitHub Pages 只能托管静态文件，不能运行 Node.js / Express
- SQLite 数据库需要持久化磁盘，Pages 没有
- DeepSeek API Key 必须留在服务端；放到 Pages 前端会直接泄露
- 前端使用同源 `/api`，没有独立 API 域名

所以正确做法是：

1. **代码放 GitHub**（源码、CI、版本管理）
2. **运行实例部署到支持 Node + 持久化磁盘的平台**（推荐 Render，仓库已提供 `render.yaml`）

---

## 1. 把本地代码推送到 GitHub

当前工作区已经初始化 Git 并完成首次提交（见 `git log`）。你只需要创建远程仓库并推送。

### 方式 A：网页创建 + git 推送

1. 打开 <https://github.com/new>
2. 仓库名填 `studyflow-ai`（或你喜欢的名字）
3. **不要**勾选 “Add a README / .gitignore / license”
4. 创建后复制仓库地址，执行：

```bash
git remote add origin https://github.com/<你的用户名>/studyflow-ai.git
git push -u origin main
```

如果使用 SSH：

```bash
git remote add origin git@github.com:<你的用户名>/studyflow-ai.git
git push -u origin main
```

### 方式 B：GitHub CLI（推荐，需先登录）

```bash
# 如果还没安装 gh：
winget install --id GitHub.cli

gh auth login

# 在项目根目录执行，自动创建仓库并推送
gh repo create studyflow-ai --public --source=. --remote=origin --push
```

> 推送前确认 `.env` 没有被提交。它已经在 `.gitignore` 中；`git status` 不应出现 `.env`。第一次推送后，仓库里只应出现 `.env.example`。

---

## 2. GitHub Actions 自动测试

已提供 `.github/workflows/ci.yml`。推送到 `main` 或提交 Pull Request 时会自动：

- 安装依赖（Node 24）
- `npm run build`
- 23 个后端测试
- 18 个前端测试
- 25 项真实 HTTP 冒烟检查

不需要在 GitHub Secrets 中配置 DeepSeek Key，因为测试不会调用真实模型。

查看结果：仓库页面 → **Actions** → `CI`。

---

## 3. 部署运行实例（推荐 Render）

仓库根目录的 `render.yaml` 是 Render Blueprint，一条命令/一次点击即可创建 Web Service。

### 步骤

1. 登录 [Render](https://render.com/)
2. **New** → **Blueprint**
3. 连接你的 GitHub 仓库
4. Render 会读取 `render.yaml`，创建：
   - Node Web Service
   - 1 GB 持久化磁盘挂载到 `/var/data`
   - `JWT_SECRET` 自动生成
   - `COOKIE_SECURE=true`、`TRUST_PROXY=true`
5. 弹出环境变量时填写 `DEEPSEEK_API_KEY`
6. 点击 **Apply / Deploy**
7. 打开 `https://<service-name>.onrender.com`，检查 `/api/health`

### 注意

- Render 的持久化磁盘需要 **Starter 及以上付费实例**；免费实例重启/重新部署会丢失 SQLite。
- 如果使用自定义域名，设置 `APP_ORIGIN=https://你的域名`；同源部署不设置也能工作。
- 首次启动会自动建表；数据库文件在 `/var/data/studyflow.db`。
- 建议在 Render 设置健康检查 `/api/health`（Blueprint 已配置）。
- 修改代码后 `git push` 会自动重新部署（`autoDeploy: true`）。

---

## 4. 部署到 Railway

1. Railway → **New Project** → **Deploy from GitHub repo**
2. 选择仓库
3. 设置环境变量：
   - `NODE_ENV=production`
   - `JWT_SECRET=<随机 48 位>`
   - `DEEPSEEK_API_KEY=<你的 Key>`
   - `COOKIE_SECURE=true`
   - `TRUST_PROXY=1`
   - `DB_PATH=/data/studyflow.db`
   - `APP_ORIGIN=https://你的域名`
4. 添加 Volume，挂载路径 `/data`
5. Build Command：`npm ci --include=dev && npm run build`
6. Start Command：`npm start`
7. 生成域名并访问 `/api/health`

---

## 5. 部署到自己的服务器 / Docker

见 [deployment.md](deployment.md)：

- Nginx + HTTPS + systemd / PM2
- Dockerfile / docker-compose
- SQLite 备份与恢复
- 上线检查清单

---

## 6. 如果密钥曾经被提交

如果 `.env` 或 Key 曾进入 Git 历史：

1. 立即在 DeepSeek 控制台**删除/轮换 API Key**
2. 用新 Key 更新 Render / 服务器环境变量
3. 不要只从最新提交删除文件——历史里仍然可以读到
4. 如需清理历史，使用 `git filter-repo` 重写历史并强制推送

当前本地 `.env` 已被 `.gitignore` 忽略；`git diff --cached` 中不应出现它。部署平台请通过环境变量注入 Key，不要上传 `.env`。

---

## 7. 常见问题

### GitHub Actions 中 `better-sqlite3` 安装失败
Workflow 已安装 `build-essential` 与 `python3`，通常会使用预编译产物；如果仍失败，检查 Node 版本（建议 24）与 lockfile。

### Render 部署后数据库每次重置
没挂载持久化磁盘，或 `DB_PATH` 不在 `/var/data`。检查 Blueprint 的 `disk` 与 `DB_PATH`。

### 登录后刷新掉线
`COOKIE_SECURE=true` 但站点是 HTTP，或反向代理没有正确转发 `X-Forwarded-Proto`。生产必须 HTTPS，并将 `TRUST_PROXY=1`。

### AI 返回 `AI_NOT_CONFIGURED`
部署平台没有设置 `DEEPSEEK_API_KEY`，或设置后没有重新部署。

### GitHub Pages 部署后接口 404
这是预期结果：Pages 没有 Node 后端。请使用 Render / Railway / 自己的服务器；不要尝试把 API Key 放进前端。
