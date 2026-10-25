# API 文档

Base URL：`/api`（开发时通过 Vite 代理；生产与前端同源）

- 请求 / 响应均为 JSON（除静态页面）
- 会话通过 `sf_session` HttpOnly Cookie；也支持 `Authorization: Bearer <token>` 便于脚本调用
- 所有写操作都会校验身份与数据归属
- 响应头带 `X-Request-Id`；错误响应 body 中也包含 `requestId`

## 统一错误格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "提交的信息有误，请检查后重试",
    "details": [{ "field": "password", "message": "密码需要包含数字" }],
    "requestId": "9f2c..."
  }
}
```

| HTTP | code | 含义 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 输入校验失败，`details` 给出字段 |
| 400 | `INVALID_JSON` | 请求体不是合法 JSON |
| 400 | `INVALID_PASSWORD` | 当前密码不正确 |
| 400 | `INVALID_ADJUSTMENT` | 调整方案缺少阶段/任务 |
| 401 | `UNAUTHORIZED` | 未登录、Token 过期或失效 |
| 403 | `ORIGIN_NOT_ALLOWED` | 写请求 Origin 不被允许 |
| 404 | `NOT_FOUND` | 资源不存在，或不属于当前用户 |
| 409 | `EMAIL_TAKEN` | 邮箱已注册 |
| 409 | `PLAN_RANGE_CONFLICT` | 新日期范围导致已有任务越界 |
| 409 | `TASK_OUTSIDE_PLAN` | 任务日期不在计划范围内 |
| 409 | `PLAN_TOO_LONG` / `INVALID_DATE_RANGE` | 计划周期非法 |
| 409 | `CONSTRAINT_VIOLATION` | 数据库约束冲突 |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体超过 256KB |
| 429 | `RATE_LIMITED` | 请求过于频繁 |
| 429 | `AI_RATE_LIMIT` | DeepSeek 上游限流 |
| 503 | `AI_NOT_CONFIGURED` | 后端未配置 `DEEPSEEK_API_KEY` |
| 502 | `AI_BAD_OUTPUT` | AI 返回无法解析或结构不合法 |
| 502 | `AI_OUTPUT_TRUNCATED` | AI 输出被截断 |
| 502 | `AI_AUTH` / `AI_UPSTREAM` / `AI_NETWORK` | 上游鉴权/服务/网络错误 |
| 402 | `AI_INSUFFICIENT_BALANCE` | DeepSeek 余额不足 |
| 504 | `AI_TIMEOUT` | AI 请求超时 |
| 500 | `INTERNAL_ERROR` | 未预期错误（不泄露堆栈） |

---

## 健康检查

### `GET /api/health`

公开。返回数据库与 AI 配置状态，不包含密钥。

```json
{
  "status": "ok",
  "name": "StudyFlow AI",
  "version": "1.0.0",
  "database": "ok",
  "aiConfigured": true,
  "model": "deepseek-flash",
  "time": "2026-10-25T06:47:36.531Z"
}
```

---

## 认证

### `POST /api/auth/register`

公开。创建账户并直接登录（设置 Cookie）。

```json
{
  "email": "learner@example.com",
  "password": "Study1234",
  "displayName": "小满"
}
```

`201 Created`

```json
{
  "user": { "id": 1, "email": "learner@example.com", "displayName": "小满", "bio": "", "createdAt": "..." },
  "preferences": { "defaultDailyMinutes": 60, "studyWeekdays": [1,2,3,4,5], "preferredSubjects": "", "learningStyle": "balanced" }
}
```

- 邮箱大小写不敏感、唯一
- 密码 8–72 位，必须包含字母和数字
- 不会返回密码哈希

### `POST /api/auth/login`

公开。

```json
{ "email": "learner@example.com", "password": "Study1234" }
```

成功 `200`，响应同注册；失败统一 `401`（不区分邮箱不存在/密码错误）。

### `GET /api/auth/session`

公开，可选鉴权。用于前端启动时恢复登录态。

未登录：`200`

```json
{ "user": null, "preferences": null }
```

已登录：`200`，`user` + `preferences`。**不会**返回 401，避免控制台噪音。

### `GET /api/auth/me`

需要登录。返回当前用户与偏好。

### `PATCH /api/auth/password`

需要登录。

```json
{ "currentPassword": "Study1234", "newPassword": "NewStudy5678" }
```

成功后会递增 `token_version` 并下发新 Cookie；其他设备上的旧 Token 立即失效。

### `POST /api/auth/logout`

清除会话 Cookie。

```json
{ "ok": true }
```

---

## 用户与偏好

均需要登录。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/users/me` | 当前用户资料 |
| `PATCH` | `/api/users/me` | 修改昵称 / 简介 |
| `GET` | `/api/users/me/preferences` | 学习偏好 |
| `PUT` | `/api/users/me/preferences` | 覆盖学习偏好 |

`PATCH /api/users/me`

```json
{ "displayName": "小满同学", "bio": "正在准备雅思。" }
```

`PUT /api/users/me/preferences`

```json
{
  "defaultDailyMinutes": 90,
  "studyWeekdays": [1, 3, 5, 7],
  "preferredSubjects": "英语、编程",
  "learningStyle": "deep"
}
```

`learningStyle`：`balanced` / `deep` / `practice` / `review`

---

## 学习计划

全部需要登录；以下 `:id` 都必须是当前用户的计划，否则返回 404。

### `GET /api/plans`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `search` | 搜索标题 / 目标 / 科目（自动转义 `%` `_`） |
| `status` | `all` / `active` / `completed` / `archived` |
| `subject` | 精确匹配科目 |
| `sort` | `updated`（默认）/ `created` / `start` / `end` / `title` / `progress` |
| `order` | `asc` / `desc` |

响应：

```json
{
  "items": [
    {
      "id": 3,
      "title": "雅思听力 7 分 · 三周冲刺",
      "goal": "三周内稳定在 7 分",
      "subject": "雅思听力",
      "level": "intermediate",
      "startDate": "2026-10-25",
      "endDate": "2026-11-14",
      "dailyMinutes": 60,
      "studyWeekdays": [1,2,3,4,5,6,7],
      "status": "active",
      "source": "ai",
      "progress": 45,
      "taskCount": 22,
      "completedTasks": 10,
      "totalMinutes": 880,
      "completedMinutes": 420,
      "stageCount": 3
    }
  ],
  "total": 1,
  "subjects": ["雅思听力", "英语六级"]
}
```

### `POST /api/plans`

保存计划（通常来自 AI 预览；也可手动创建）。所有字段都由 Zod + 跨字段规则校验。

```json
{
  "title": "雅思听力 7 分 · 三周冲刺",
  "goal": "三周内稳定在 7 分",
  "subject": "雅思听力",
  "level": "intermediate",
  "startDate": "2026-10-25",
  "endDate": "2026-11-14",
  "dailyMinutes": 60,
  "studyWeekdays": [1,2,3,4,5,6,7],
  "preferences": "更喜欢精听",
  "overview": "先场景，再题型，最后模考。",
  "risks": [{ "title": "语速不适应", "detail": "从 0.9 倍速开始。" }],
  "advice": "状态不好时至少精听 20 分钟。",
  "source": "ai",
  "stages": [
    {
      "title": "基础场景",
      "objective": "掌握 Section 1-2 高频场景",
      "startDate": "2026-10-25",
      "endDate": "2026-10-31"
    }
  ],
  "tasks": [
    {
      "title": "精听 Section 1 并整理同义替换",
      "description": "逐句听写",
      "taskDate": "2026-10-25",
      "durationMinutes": 45,
      "priority": "high",
      "completionCriteria": "能复述 8 组同义替换",
      "isReview": false,
      "stageIndex": 0
    }
  ]
}
```

约束：

- 标题 ≤ 120，目标 ≤ 1000，科目 ≤ 60，偏好 ≤ 1000，策略 ≤ 2000，建议 ≤ 1000
- 阶段 1–12 个，任务 1–200 个
- 日期 `YYYY-MM-DD`，计划 1–366 天，阶段/任务必须落在计划范围内
- `dailyMinutes` 10–480，任务 5–480 分钟
- 优先级 `high` / `medium` / `low`
- 状态默认 `active`；全部任务完成时自动变为 `completed`（归档不自动变更）
- `source`：`ai` / `manual`（默认 `ai`）

响应：计划详情结构（见下）。

### `GET /api/plans/:id`

```json
{
  "plan": { "id": 3, "title": "...", "progress": 45, "taskCount": 22, "...": "..." },
  "stages": [
    { "id": 1, "planId": 3, "title": "基础场景", "objective": "...", "startDate": "...", "endDate": "...", "sortOrder": 0 }
  ],
  "tasks": [
    {
      "id": 11,
      "planId": 3,
      "stageId": 1,
      "title": "精听 Section 1",
      "description": "...",
      "taskDate": "2026-10-25",
      "durationMinutes": 45,
      "priority": "high",
      "completionCriteria": "...",
      "isCompleted": false,
      "completedAt": null,
      "isReview": false,
      "actualMinutes": null,
      "source": "ai",
      "sortOrder": 0
    }
  ]
}
```

### `PATCH /api/plans/:id`

可更新字段：`title`、`goal`、`subject`、`level`、`startDate`、`endDate`、`dailyMinutes`、`studyWeekdays`、`preferences`、`overview`、`advice`、`risks`、`status`。

- 只传需要修改的字段
- 若新日期范围导致已有任务越界 → `409 PLAN_RANGE_CONFLICT`，不会静默删除任务
- 修改日期后阶段不会自动移动；阶段在详情中仍按原日期展示，必要时请用 AI 调整或重新规划

### `DELETE /api/plans/:id`

删除计划，级联删除阶段与任务。

```json
{ "deleted": true }
```

---

## 学习任务

全部需要登录；跨用户访问返回 404。

### `GET /api/tasks`

| 参数 | 说明 |
| --- | --- |
| `planId` | 所属计划 |
| `date` | 单日 `YYYY-MM-DD` |
| `from` / `to` | 日期范围（含端点） |
| `priority` | `high` / `medium` / `low` |
| `status` | `all` / `open` / `done` |
| `search` | 标题 / 描述 |
| `limit` | 1–500，默认 200 |
| `offset` | 默认 0 |

响应：

```json
{
  "items": [
    {
      "id": 11,
      "planId": 3,
      "planTitle": "雅思听力 7 分 · 三周冲刺",
      "subject": "雅思听力",
      "planStatus": "active",
      "title": "精听 Section 1",
      "taskDate": "2026-10-25",
      "durationMinutes": 45,
      "priority": "high",
      "isCompleted": false,
      "isReview": false,
      "actualMinutes": null
    }
  ],
  "total": 1,
  "limit": 200,
  "offset": 0,
  "hasMore": false
}
```

排序：任务日期升序 → 优先级（高→低）→ `sort_order` → id。

### `POST /api/tasks`

```json
{
  "planId": 3,
  "title": "做一套听力模考",
  "description": "限时完成",
  "taskDate": "2026-10-27",
  "durationMinutes": 50,
  "priority": "high",
  "completionCriteria": "正确率达到 70%",
  "isReview": false
}
```

`201`：`{ "task": { ... } }`。任务日期必须在计划范围内，否则 `409 TASK_OUTSIDE_PLAN`。

### `GET /api/tasks/:id`

`{ "task": { ... } }`

### `PATCH /api/tasks/:id`

可更新：`title`、`description`、`taskDate`、`durationMinutes`、`priority`、`completionCriteria`、`isReview`、`actualMinutes`（0–1440，可为 null）。

```json
{ "title": "新的任务名", "durationMinutes": 55, "actualMinutes": 50 }
```

### `PATCH /api/tasks/:id/toggle`

```json
{ "isCompleted": true, "actualMinutes": 50 }
```

`actualMinutes` 可选；不传不会把预计时长自动当成实际用时。

响应同时返回任务与计划进度：

```json
{
  "task": { "id": 11, "isCompleted": true, "completedAt": "..." },
  "plan": { "id": 3, "status": "active", "taskCount": 22, "completedTasks": 11, "progress": 50 }
}
```

- 全部任务完成 → 计划 `completed`
- 取消完成某任务 → 计划从 `completed` 回到 `active`
- `archived` 计划不会被自动改状态

### `DELETE /api/tasks/:id`

```json
{ "deleted": true, "planId": 3 }
```

---

## 学习统计

### `GET /api/stats/overview?days=30`

`days`：7–90，默认 30。

```json
{
  "generatedAt": "2026-10-25T07:00:00.000Z",
  "timezone": "Asia/Shanghai",
  "today": "2026-10-25",
  "range": { "days": 30, "from": "2026-09-26", "to": "2026-10-25" },
  "totals": {
    "totalTasks": 34,
    "completedTasks": 22,
    "openTasks": 12,
    "completionRate": 65,
    "plannedMinutes": 1365,
    "completedMinutes": 885,
    "loggedMinutes": 810,
    "loggedTaskCount": 22
  },
  "today": { "date": "2026-10-25", "totalTasks": 2, "completedTasks": 1, "plannedMinutes": 75, "completedMinutes": 45 },
  "overdue": { "count": 0, "minutes": 0 },
  "upcoming": { "next7DaysTasks": 8, "next7DaysMinutes": 340 },
  "plans": { "active": 1, "completed": 1, "archived": 0, "total": 2 },
  "streak": 7,
  "longestStreak": 7,
  "trend": [
    { "date": "2026-09-26", "weekday": 6, "total": 1, "completed": 1, "plannedMinutes": 40, "completedMinutes": 40, "loggedMinutes": 0 }
  ],
  "weekdays": [{ "weekday": 1, "total": 2, "completed": 2, "plannedMinutes": 80 }],
  "subjects": [{ "subject": "雅思听力", "total": 22, "completed": 10 }]
}
```

统计口径：

- 趋势按任务日期聚合，范围截止今天
- `completedMinutes` 是已完成任务的**预计**时长
- `loggedMinutes` 只统计用户填写了 `actualMinutes` 的已完成任务
- `streak` 按「已完成任务的计划日期」计算连续天数
- 无数据时所有计数为 0，`trend` 仍返回完整的零值日期序列，供图表绘制

---

## AI

全部需要登录。

### `GET /api/ai/status`

```json
{
  "configured": true,
  "model": "deepseek-flash",
  "baseUrl": "https://api.deepseek.com",
  "thinking": false,
  "rateLimitPerHour": 8,
  "pricingNote": "费用按 DeepSeek 返回的真实 token 用量估算，价格可在 .env 中配置",
  "usage": { "calls": 3, "successfulCalls": 3, "totalTokens": 12000, "costUsd": 0.0084, "lastCallAt": "..." },
  "recent": [{ "id": 4, "kind": "generate", "model": "deepseek-flash", "success": 1, "totalTokens": 4000, "costUsd": 0.003, "latencyMs": 42000, "createdAt": "..." }]
}
```

### `GET /api/ai/usage?limit=10`

`limit` 1–50。返回最近 30 天汇总 + 最近调用记录。

### `POST /api/ai/plans`

生成计划草稿（不写数据库）。

```json
{
  "goal": "三周内把雅思听力稳定在 7 分",
  "subject": "雅思听力",
  "level": "intermediate",
  "startDate": "2026-10-25",
  "endDate": "2026-11-14",
  "dailyMinutes": 60,
  "studyWeekdays": [1,2,3,4,5,6,7],
  "preferences": "喜欢精听和间隔复习",
  "notes": "每天最多一小时",
  "requestId": "f0d3c2b1-...-..."
}
```

约束：

- 开始日期不得早于今天（服务器时区）
- 至少 2 个可学习日，总可用时间至少 60 分钟
- 周期 ≤ 366 天
- `requestId` 8–80 位字母/数字/`_`/`-`；同一用户 + 同一 `requestId` 会返回缓存，不重复调用

响应（结构可能随 AI 而变，但字段固定）：

```json
{
  "plan": {
    "title": "雅思听力 7 分 · 三周冲刺",
    "goal": "...",
    "subject": "雅思听力",
    "level": "intermediate",
    "startDate": "2026-10-25",
    "endDate": "2026-11-14",
    "dailyMinutes": 60,
    "studyWeekdays": [1,2,3,4,5,6,7],
    "preferences": "...",
    "overview": "...",
    "risks": [{ "title": "...", "detail": "..." }],
    "advice": "...",
    "stages": [{ "title": "...", "objective": "...", "startDate": "...", "endDate": "..." }],
    "tasks": [
      {
        "title": "...",
        "description": "...",
        "taskDate": "2026-10-25",
        "durationMinutes": 45,
        "priority": "high",
        "completionCriteria": "...",
        "isReview": false,
        "stageIndex": 0
      }
    ]
  },
  "warnings": ["已将 2 个任务调整到可学习日"],
  "meta": {
    "planDays": 21,
    "studyDays": 21,
    "taskCount": 27,
    "totalMinutes": 1200,
    "dailyMinutes": 60,
    "model": "deepseek-flash",
    "usage": { "promptTokens": 1820, "completionTokens": 2260, "cacheHitTokens": 0, "cacheMissTokens": 1820, "totalTokens": 4080 },
    "costUsd": 0.003258,
    "latencyMs": 42600,
    "attempts": 1,
    "cached": false,
    "generatedAt": "..."
  }
}
```

### `POST /api/ai/plans/:planId/adjust/preview`

生成调整预览，**不修改原计划**。

```json
{
  "instruction": "我每天只能学 45 分钟，周期延长一周，并增加复习时间",
  "requestId": "a1b2c3d4-..."
}
```

响应：

```json
{
  "proposedPlan": { "...": "与生成计划相同的结构，额外可能包含 endDate/dailyMinutes/studyWeekdays/changeSummary" },
  "changeSummary": "把周期延长 6 天，每日时长调整为 45 分钟，并增加复习任务。",
  "preview": {
    "preservedCompleted": 9,
    "preservedManual": 2,
    "preservedTotal": 11,
    "replacedTasks": 13,
    "addedTasks": 8,
    "finalTaskCount": 19,
    "planChanges": [
      { "field": "endDate", "label": "结束日期", "from": "2026-11-14", "to": "2026-11-21" },
      { "field": "dailyMinutes", "label": "每日学习时长", "from": "60 分钟", "to": "45 分钟" }
    ],
    "keepCompleted": true,
    "keepManual": true,
    "warnings": []
  },
  "meta": { "...": "同生成接口" }
}
```

### `POST /api/ai/plans/:planId/adjust/apply`

应用调整。`proposedPlan` 会再次经过完整的服务端归一化与校验；不会信任前端或模型。

```json
{
  "proposedPlan": { "...": "preview 返回的 proposedPlan" },
  "keepCompleted": true,
  "keepManual": true
}
```

响应为计划详情，并附带：

```json
{
  "summary": {
    "keptCompleted": 9,
    "keptManual": 2,
    "replacedTasks": 13,
    "addedTasks": 8,
    "removedTasks": 13,
    "finalTaskCount": 19
  },
  "warnings": []
}
```

- 默认保留已完成任务与手动添加的未完成任务
- 保留的任务会解除与旧阶段的关联（`stage_id = NULL`），避免被阶段删除级联
- 调整在数据库事务中完成

---

## 限流

| 范围 | 默认 |
| --- | --- |
| 全 API / IP | 600 次 / 15 分钟 |
| 注册、登录 / IP | 30 次 / 15 分钟 |
| AI / 用户 | 8 次 / 小时（`AI_RATE_LIMIT_PER_HOUR`） |

单进程内存实现；多实例部署需要 Redis。
