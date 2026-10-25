# Alwaysdata Free 免费部署（推荐）

这是目前最适合本项目的免费方案：**Alwaysdata Free 0€/月，终身有效，不需要信用卡**。它提供持久化磁盘，因此可以继续使用 SQLite，不需要把数据库改成付费服务。

## 免费方案规格

| 项目 | Free |
| --- | --- |
| 价格 | 0€/月，终身 |
| 磁盘 | 1GB SSD（持久化） |
| 内存 | 256MB |
| CPU | 1/4 核（共享） |
| 运行时 | Node.js 6–24（选 24） |
| 数据库 | SQLite 文件可直接放磁盘；也支持 MySQL/PostgreSQL |
| 访问 | SSH / SFTP / Git |
| 域名 | 免费 `账号.alwaysdata.net` 子域名 |
| HTTPS | Let's Encrypt 免费证书 |
| 备份 | 3 天滚动备份 |
| 信用卡 | 不需要 |

项目已经按 Alwaysdata 的启动方式适配：服务端会读取平台注入的 `IP` 和 `PORT`，并监听对应地址。

> 限制：256MB 内存、1/4 CPU、法国/加拿大节点。适合个人作品集和轻量使用，不适合高并发生产。前端构建可以限制在 200MB 堆内完成，已经测试过。

---

## 1. 注册免费账号

打开 Free 方案注册入口：

<https://www.alwaysdata.com/en/register/?p=2012>

填写邮箱、密码，选择 **Free / 0€** 方案，完成邮箱验证。**不需要信用卡。**

登录管理面板：<https://admin.alwaysdata.com>

---

## 2. 选择 Node.js 24

管理面板 → **Environment → Node.js** → 选择版本 **24**。

如果找不到，先创建一个 Node.js 站点，面板会提示安装对应运行环境。

---

## 3. 创建 Node.js 站点

管理面板 → **Web → Sites → Add a site**：

| 字段 | 填写 |
| --- | --- |
| 类型 | **Node.js** |
| 地址 | `你的账号.alwaysdata.net`（免费子域名） |
| 命令 / Command | `node /home/你的账号/studyflow/server/index.js` |
| 工作目录 | 可留空（入口使用绝对路径即可） |

保存后先不要期待能访问，代码还没有上传。

### 开启 HTTPS

站点创建后进入 **SSL/TLS → Let's Encrypt**，为 `你的账号.alwaysdata.net` 申请免费证书，并开启 HTTP → HTTPS 跳转。

---

## 4. SSH 上传代码

管理面板首页会显示 SSH 地址，通常是：

```bash
ssh 你的账号@ssh-你的账号.alwaysdata.net
```

首次连接确认指纹，输入面板密码或使用 SSH Key。

### 克隆仓库

```bash
git clone https://github.com/lebin2025/studyFlowAI.git ~/studyflow
cd ~/studyflow
```

### 安装依赖并构建

```bash
npm ci
NODE_OPTIONS=--max-old-space-size=200 npm run build
npm prune --omit=dev
```

> 256MB 内存下构建已验证可通过。如果构建仍被 OOM 终止，使用后面的「本地构建后上传」方案。

### 创建 .env

```bash
cat > .env <<'EOF'
NODE_ENV=production
JWT_SECRET=替换成48位以上随机字符串
DEEPSEEK_API_KEY=sk-你的密钥
COOKIE_SECURE=true
APP_ORIGIN=https://你的账号.alwaysdata.net
TRUST_PROXY=1
DB_PATH=server/data/studyflow.db
EOF

chmod 600 .env
```

生成 JWT Secret：

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

注意：

- **不要设置 `PORT`**。Alwaysdata 会注入 `PORT` 和 `IP`，应用会自动使用。
- `COOKIE_SECURE=true` 依赖 HTTPS，所以先完成第 3 步的证书。
- `.env` 只存在服务器上，永不提交 Git。

### 启动站点

回到管理面板 → **Web → Sites** → 对应站点 → **Restart**。

打开：

```text
https://你的账号.alwaysdata.net/api/health
```

应返回：

```json
{"status":"ok","database":"ok","aiConfigured":true}
```

然后访问首页，注册账号并生成真实计划。

---

## 5. 本地构建后上传（构建内存不足时）

如果服务器上 `npm run build` 因 256MB 内存失败，可以在本地构建后只上传 `dist` 和源码。

在 Windows 本地项目根目录：

```powershell
npm ci
npm run build
```

然后使用 `scp`/`rsync` 上传（在 Git Bash 或 WSL 中执行）：

```bash
rsync -av --exclude node_modules --exclude .env --exclude server/data \
  ./ 你的账号@ssh-你的账号.alwaysdata.net:~/studyflow/
```

在服务器上只安装生产依赖：

```bash
cd ~/studyflow
npm ci --omit=dev
```

`dist` 已包含构建产物，启动时 Express 会直接托管它，不需要再构建。

---

## 6. 更新代码

```bash
ssh 你的账号@ssh-你的账号.alwaysdata.net
cd ~/studyflow
git pull --ff-only
npm ci
NODE_OPTIONS=--max-old-space-size=200 npm run build
npm prune --omit=dev
```

然后在面板重启站点。也可以在面板设置 Git 部署，或使用 GitHub Actions + SSH 自动部署。

---

## 7. 数据与备份

- SQLite 文件：`/home/你的账号/studyflow/server/data/studyflow.db`
- Alwaysdata 免费方案提供 3 天滚动备份
- 重要数据请自行导出：

```bash
scp 你的账号@ssh-你的账号.alwaysdata.net:~/studyflow/server/data/studyflow.db ./backup-$(date +%F).db
```

- 不要在部署时删除 `server/data/`。
- 1GB 磁盘对 SQLite 和代码足够；注意不要上传大量媒体文件。

---

## 8. 为什么不用 Render 免费实例

Render 的免费 Web Service 没有持久化磁盘：

- 服务重启 / 重新部署后 SQLite 文件会丢失
- 用户账号和学习记录都会消失
- Blueprint 的 `disk` 需要付费 Starter 实例

所以本项目推荐 **Alwaysdata Free**，而不是 Render 免费版。Render 配置仍保留在仓库里，供以后需要更强性能时使用。

---

## 9. 免费方案适合做什么

适合：

- 个人作品集 / 简历演示
- 小规模朋友试用
- 低并发 AI 学习计划生成

不适合：

- 高并发
- 大文件存储
- 长时间 CPU 密集任务
- 需要 root / Docker 的场景

如果以后用户变多，再迁移到 Render Starter、Railway、Fly.io 或 VPS；数据库文件可以直接迁移。
