# 第四轮：沉浸交互、智能悬浮球与草稿箱

## 目标

在不重做视觉系统的前提下，把 StudyFlow 从“静态精致”推进到“有真实反馈和空间层次”的产品：

- 全局智能悬浮球，可拖动并持久化位置。
- Hover / 展开时球体变成 StudyFlow 小苹果角色。
- 可恢复的番茄钟、专注浮层和休息提醒。
- 四个真实环境音文件，替代原先代码合成的噪声。
- 用户隔离的本地学习计划草稿箱。

## 全局交互层

`src/App.vue` 挂载两个全局组件：

- `components/orb/FloatingOrb.vue`
- `components/focus/FocusOverlay.vue`

悬浮球有 `idle / hover / expanded / focusing / paused / processing / success / error / rest / minimal` 状态。状态由真实 Pinia 状态驱动：

- 专注计时：`stores/focus.js`
- AI 请求：`stores/activity.js`
- 环境音：`stores/ambience.js`

AI 计划生成开始时 `PlanNewView` 调用 `activity.beginAI()`，请求结束调用 `finishAI()`；不是定时器模拟。专注完成后的 Success 光效只持续约 4.5 秒。

## 悬浮球拖拽与角色

- 悬浮球位置可拖拽，位置按用户写入 `studyflow:orb:v1:<userId>`。
- 拖动阈值 4px，拖动后抑制随后的 click；拖动期间禁用文本选择，结束后清除选区。
- 桌面面板相对悬浮球定位并自动避让视口；移动端使用底部浮层，悬浮球角色保留在面板下方。
- 待机时是抽象暗色球体；Hover、展开、Processing、Success、Rest、Error 时球体收缩并**由 StudyFlow 小苹果角色接管**，不是额外悬浮在球上方。
- 角色按状态切换表情：happy / thinking / sleepy / cheer。
- 按钮统一增加 Hover 轻微抬起、局部高光与 Active 回落。

## 计时器

`stores/focus.js` 是单例：

- 用 `endsAt` 时间戳计算剩余时间，不依赖递减变量。
- 每 250ms tick，仅在 running 时启动一个 interval；暂停/结束会清理。
- `visibilitychange` 会重新校正。
- 刷新后从 `studyflow:focus:v1:<userId>` 恢复，运行中过期会直接结算。
- 暂停、结束、休息不累计有效专注时间。
- 连续专注达到阈值（默认 120 分钟）触发 RestReminder；可调整或关闭。
- 支持 15 / 25 / 45 / 60 分钟和自定义 1–180 分钟。
- 桌面通知只在用户点击“桌面提醒”时请求权限。

## 环境音

`stores/ambience.js`：

- 使用用户提供的四个真实文件：
  - `/audio/forest.mp3`（森林）
  - `/audio/moon.mp3`（月光）
  - `/audio/snow.mp3`（雪）
  - `/audio/sunset.mp3`（日落）
- 再加一个“静音”选项。
- 单一 `HTMLAudioElement`、单一 source；切换时先淡出旧曲，再切换并淡入，避免叠加。
- 音量与最后选择持久化到 `studyflow:ambience:v2`。
- 不使用自动播放；初始不加载音频，用户点击后才请求文件。
- 播放失败会显示错误；不伪造“正在播放”。
- 音频文件由用户提供；项目不再用 Web Audio 合成环境音。

## 草稿箱

`stores/drafts.js` + `views/DraftsView.vue`：

- 本地存储 key：`studyflow:drafts:v1:<userId>`；结构带 `version`。
- 最多保存 20 份，按 `updatedAt` 排序。
- 自动保存使用 900ms 防抖；写入失败会保留表单并显示“保存失败”。
- PlanNew 首次自动保存后把 `?draft=<id>` 写回当前路由，刷新可恢复。
- 草稿可继续编辑、删除（二次确认）或正式创建。
- 正式创建调用现有 `plansApi.create`；成功后移除草稿，失败保留。
- 只存表单和 AI 预览，不存密码、Token 或认证信息。
- **限制：草稿只在当前浏览器/设备，不跨设备同步，也不是服务器草稿。**
- 正式计划仍写入现有后端；没有修改数据库结构或计划 API。

## 降级与可访问性

- 不支持 `backdrop-filter` 时使用实色表面。
- 悬浮球/专注浮层支持 Escape、焦点陷阱、`aria-expanded`/`dialog` 和焦点返回。
- 悬浮球支持鼠标/指针拖动；方向键可微调位置。
- `prefers-reduced-motion` 下关闭呼吸、光效、面板过渡和角色/任务动效。
- 桌面与 390px 移动端均保持无横向溢出。

## 明确未做

- 未新增服务端草稿表/接口；这是本轮有意选择，避免在生产库上做不完整迁移。
- 未做跨标签页计时锁；同一浏览器多标签页仍可能各自运行本地计时器。
- 浏览器通知依赖权限；拒绝后只保留应用内状态与提醒。
- 未在真实触屏手机上复测拖拽手势；移动端用 390px 视口与 Pointer Events 验证。
