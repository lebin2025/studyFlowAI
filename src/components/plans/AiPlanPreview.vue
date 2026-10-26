<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import {
  countStudyDays,
  diffDays,
  formatDate,
  formatDateRange,
  formatMinutes,
  formatWeekly,
  todayISO,
} from '@/utils/date.js'
import { formatNumber, formatUsd, PRIORITY_LABELS } from '@/utils/format.js'

const props = defineProps({
  plan: { type: Object, required: true },
  meta: { type: Object, default: () => ({}) },
  warnings: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
})

const emit = defineEmits(['save', 'save-draft', 'back', 'regenerate'])

const clone = (value) => JSON.parse(JSON.stringify(value))
const withKeys = (value) => {
  const copy = clone(value)
  copy.tasks = (copy.tasks || []).map((task) => ({
    ...task,
    _key: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`,
  }))
  return copy
}

const local = reactive(withKeys(props.plan))
const error = ref('')
const adding = ref(false)
const addError = ref('')

const addForm = reactive({
  title: '',
  taskDate: '',
  durationMinutes: 45,
  priority: 'medium',
  completionCriteria: '',
})

watch(
  () => props.plan,
  (next) => {
    const copy = withKeys(next)
    Object.keys(local).forEach((key) => delete local[key])
    Object.assign(local, copy)
    error.value = ''
    adding.value = false
  },
)

const planDays = computed(() => diffDays(local.startDate, local.endDate) + 1)
const studyDays = computed(() =>
  countStudyDays(local.startDate, local.endDate, local.studyWeekdays || []),
)
const totalMinutes = computed(() =>
  local.tasks.reduce((sum, task) => sum + (Number(task.durationMinutes) || 0), 0),
)
const weeklyLabel = computed(() => formatWeekly(local.studyWeekdays || []))
const weeklyText = computed(() =>
  weeklyLabel.value === '每天' ? '每天' : `每周 ${weeklyLabel.value}`,
)

const groups = computed(() => {
  const map = new Map()
  local.tasks.forEach((task) => {
    if (!map.has(task.taskDate)) map.set(task.taskDate, [])
    map.get(task.taskDate).push(task)
  })
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, tasks]) => ({
      date,
      tasks,
      minutes: tasks.reduce((sum, task) => sum + (Number(task.durationMinutes) || 0), 0),
    }))
})

const usage = computed(() => props.meta?.usage || {})
const costLabel = computed(() => formatUsd(props.meta?.costUsd || 0))
const latencyLabel = computed(() => {
  const seconds = Math.round((Number(props.meta?.latencyMs) || 0) / 1000)
  if (!seconds) return ''
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
})

const stageIndexForDate = (date) => {
  const index = local.stages.findIndex(
    (stage) => date >= stage.startDate && date <= stage.endDate,
  )
  if (index >= 0) return index
  let best = 0
  let distance = Number.POSITIVE_INFINITY
  local.stages.forEach((stage, stageIndex) => {
    const candidate = Math.min(
      Math.abs(diffDays(date, stage.startDate)),
      Math.abs(diffDays(date, stage.endDate)),
    )
    if (candidate < distance) {
      distance = candidate
      best = stageIndex
    }
  })
  return best
}

const openAdd = () => {
  const today = todayISO()
  const fallback = local.startDate < today ? today : local.startDate
  addForm.title = ''
  addForm.taskDate = fallback > local.endDate ? local.endDate : fallback
  addForm.durationMinutes = 45
  addForm.priority = 'medium'
  addForm.completionCriteria = ''
  addError.value = ''
  adding.value = true
}

const addTask = () => {
  if (!addForm.title.trim()) {
    addError.value = '请填写任务名称'
    return
  }
  if (!addForm.taskDate || addForm.taskDate < local.startDate || addForm.taskDate > local.endDate) {
    addError.value = '任务日期需要在计划周期内'
    return
  }
  const duration = Number(addForm.durationMinutes)
  if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
    addError.value = '任务时长需要在 5 - 480 分钟之间'
    return
  }

  local.tasks.push({
    _key: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`,
    title: addForm.title.trim(),
    description: '',
    taskDate: addForm.taskDate,
    durationMinutes: duration,
    priority: addForm.priority,
    completionCriteria: addForm.completionCriteria.trim(),
    isReview: false,
    stageIndex: stageIndexForDate(addForm.taskDate),
  })
  local.tasks.sort((a, b) => (a.taskDate === b.taskDate ? 0 : a.taskDate < b.taskDate ? -1 : 1))
  adding.value = false
  addError.value = ''
  error.value = ''
}

const removeTask = (task) => {
  local.tasks = local.tasks.filter((item) => item !== task)
}

const validate = () => {
  if (!local.title.trim()) return '请填写计划名称'
  if (!local.goal.trim()) return '请填写学习目标'
  if (!local.stages.length) return '至少需要一个学习阶段'
  if (!local.tasks.length) return '至少需要一个学习任务'

  for (const stage of local.stages) {
    if (!stage.title.trim()) return '阶段名称不能为空'
  }
  for (const task of local.tasks) {
    if (!task.title.trim()) return `「${formatDate(task.taskDate, { weekday: false })}」有任务没有名称`
    const duration = Number(task.durationMinutes)
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
      return `任务「${task.title}」的时长需要在 5 - 480 分钟之间`
    }
    if (task.taskDate < local.startDate || task.taskDate > local.endDate) {
      return '有任务不在计划日期范围内，请调整日期'
    }
  }
  return ''
}

const buildPayload = () => ({
  title: local.title.trim() || '未命名计划',
  goal: local.goal.trim(),
  subject: local.subject,
  level: local.level,
  startDate: local.startDate,
  endDate: local.endDate,
  dailyMinutes: Number(local.dailyMinutes),
  studyWeekdays: [...local.studyWeekdays],
  preferences: local.preferences || '',
  overview: local.overview || '',
  risks: local.risks || [],
  advice: local.advice || '',
  stages: local.stages.map((stage) => ({
    title: stage.title.trim(),
    objective: stage.objective || '',
    startDate: stage.startDate,
    endDate: stage.endDate,
  })),
  tasks: local.tasks.map((task) => ({
    title: task.title.trim(),
    description: task.description || '',
    taskDate: task.taskDate,
    durationMinutes: Number(task.durationMinutes),
    priority: task.priority,
    completionCriteria: task.completionCriteria || '',
    isReview: Boolean(task.isReview),
    stageIndex: Number(task.stageIndex) || 0,
  })),
})

const save = () => {
  error.value = validate()
  if (error.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  emit('save', buildPayload())
}

const saveDraft = () => {
  emit('save-draft', buildPayload(), clone(local))
}
</script>

<template>
  <div class="preview">
    <div class="preview__head">
      <div class="preview__head-copy">
        <span class="preview__badge">
          <Sparkles :size="12" />
          AI 生成 · 未保存
        </span>
        <h1>计划草稿</h1>
        <p>
          修改后保存到账户。
        </p>
      </div>
      <div class="preview__head-actions">
        <AppButton variant="secondary" :disabled="saving" @click="emit('back')">
          <template #icon><ArrowLeft :size="15" /></template>
          返回修改条件
        </AppButton>
        <AppButton variant="ghost" :disabled="saving" @click="emit('regenerate')">
          <template #icon><RefreshCw :size="15" /></template>
          重新生成
        </AppButton>
      </div>
    </div>

    <div v-if="error" class="preview__alert" role="alert">
      <TriangleAlert :size="16" />
      <span>{{ error }}</span>
    </div>

    <div class="preview__layout">
      <div class="preview__main">
        <section class="edit-card">
          <header class="edit-card__head">
            <h2>基本信息</h2>

          </header>
          <div class="edit-card__body">
            <label class="edit-label" for="preview-title">计划名称</label>
            <input
              id="preview-title"
              v-model="local.title"
              class="edit-title"
              maxlength="120"
              placeholder="给这份计划取个名字"
            />

            <div class="edit-basic">
              <div>
                <label class="edit-label" for="preview-goal">学习目标</label>
                <textarea
                  id="preview-goal"
                  v-model="local.goal"
                  class="edit-textarea"
                  rows="3"
                  maxlength="1000"
                />
              </div>
              <div>
                <label class="edit-label" for="preview-overview">整体策略</label>
                <textarea
                  id="preview-overview"
                  v-model="local.overview"
                  class="edit-textarea"
                  rows="3"
                  maxlength="2000"
                  placeholder="AI 为你安排的整体思路"
                />
              </div>
            </div>

            <div class="edit-meta">
              <span class="chip">{{ local.subject }}</span>
              <span class="chip">{{ formatDate(local.startDate, { weekday: false }) }} — {{ formatDate(local.endDate, { weekday: false }) }}</span>
              <span class="chip">{{ weeklyText === '每天' ? '每天可学' : weeklyText }}</span>
              <span class="chip">每天 {{ formatMinutes(local.dailyMinutes) }}</span>
            </div>
          </div>
        </section>

        <section class="edit-card">
          <header class="edit-card__head">
            <h2>学习阶段</h2>
            <span class="edit-card__meta">{{ local.stages.length }} 个阶段</span>
          </header>
          <div class="edit-card__body">
            <div v-for="(stage, index) in local.stages" :key="index" class="stage-edit">
              <span class="stage-edit__index">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="stage-edit__body">
                <input
                  v-model="stage.title"
                  class="stage-edit__title"
                  :aria-label="`阶段 ${index + 1} 名称`"
                  maxlength="80"
                />
                <input
                  v-model="stage.objective"
                  class="stage-edit__objective"
                  :aria-label="`阶段 ${index + 1} 目标`"
                  maxlength="600"
                  placeholder="这个阶段要达成什么？"
                />
                <span class="stage-edit__dates">
                  {{ formatDate(stage.startDate, { weekday: false }) }} — {{ formatDate(stage.endDate, { weekday: false }) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="edit-card">
          <header class="edit-card__head">
            <h2>每日任务</h2>
            <div class="edit-card__head-actions">
              <span class="edit-card__meta">{{ local.tasks.length }} 个任务</span>
              <button type="button" class="add-task-button" @click="openAdd">
                <Plus :size="13" />
                添加任务
              </button>
            </div>
          </header>
          <div class="edit-card__body edit-card__body--tasks">
            <div v-for="group in groups" :key="group.date" class="task-group">
              <div class="task-group__head">
                <span class="task-group__date">
                  <CalendarDays :size="13" />
                  {{ formatDate(group.date, { weekday: true }) }}
                </span>
                <span
                  class="task-group__minutes"
                  :class="{ 'is-over': group.minutes > local.dailyMinutes }"
                >
                  {{ formatMinutes(group.minutes) }}
                  <template v-if="group.minutes > local.dailyMinutes">· 超过每日上限</template>
                </span>
              </div>

              <div v-for="task in group.tasks" :key="task._key" class="task-edit">
                <div class="task-edit__top">
                  <input
                    v-model="task.title"
                    class="task-edit__title"
                    aria-label="任务名称"
                    maxlength="160"
                    placeholder="任务名称"
                  />
                  <button
                    type="button"
                    class="task-edit__remove"
                    aria-label="移除这个任务"
                    @click="removeTask(task)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
                <div class="task-edit__row">
                  <input
                    v-model="task.completionCriteria"
                    class="task-edit__criteria"
                    aria-label="完成标准"
                    maxlength="600"
                    placeholder="完成标准（可选），例如：能复述 3 条要点"
                  />
                  <label class="task-edit__duration">
                    <Clock3 :size="12" />
                    <input
                      v-model.number="task.durationMinutes"
                      type="number"
                      min="5"
                      max="480"
                      aria-label="预计时长（分钟）"
                    />
                    分
                  </label>
                  <select
                    v-model="task.priority"
                    class="task-edit__select"
                    aria-label="优先级"
                  >
                    <option v-for="(label, value) in PRIORITY_LABELS" :key="value" :value="value">
                      {{ label }}
                    </option>
                  </select>
                  <label class="task-edit__review">
                    <input v-model="task.isReview" type="checkbox" />
                    复习
                  </label>
                </div>
                <p v-if="task.description" class="task-edit__desc">{{ task.description }}</p>
              </div>
            </div>

            <div v-if="adding" class="add-task">
              <p class="add-task__title">添加一个任务</p>
              <div class="add-task__grid">
                <AppInput
                  v-model="addForm.title"
                  label="任务名称"
                  placeholder="具体做什么？"
                  maxlength="160"
                />
                <AppInput
                  v-model="addForm.taskDate"
                  label="日期"
                  type="date"
                  :min="local.startDate"
                  :max="local.endDate"
                />
                <AppInput
                  v-model="addForm.durationMinutes"
                  label="时长（分钟）"
                  type="number"
                  min="5"
                  max="480"
                />
                <AppInput
                  v-model="addForm.completionCriteria"
                  label="完成标准（可选）"
                  placeholder="可检验的完成信号"
                  maxlength="600"
                />
              </div>
              <p v-if="addError" class="add-task__error">{{ addError }}</p>
              <div class="add-task__actions">
                <AppButton size="sm" variant="ghost" @click="adding = false">取消</AppButton>
                <AppButton size="sm" @click="addTask">加入草稿</AppButton>
              </div>
            </div>
          </div>
        </section>

        <section v-if="local.advice || (local.risks && local.risks.length)" class="edit-card">
          <header class="edit-card__head">
            <h2>风险与建议</h2>
          </header>
          <div class="edit-card__body">
            <div v-if="local.risks?.length" class="risk-list">
              <div v-for="(risk, index) in local.risks" :key="index" class="risk-item">
                <TriangleAlert :size="14" />
                <div>
                  <strong>{{ risk.title }}</strong>
                  <p v-if="risk.detail">{{ risk.detail }}</p>
                </div>
              </div>
            </div>
            <p v-if="local.advice" class="advice-text">{{ local.advice }}</p>
          </div>
        </section>
      </div>

      <aside class="preview__aside">
        <div class="summary-card">
          <p class="summary-card__eyebrow">计划概览</p>
          <div class="summary-grid">
            <div>
              <strong>{{ planDays }}</strong>
              <span>计划天数</span>
            </div>
            <div>
              <strong>{{ studyDays }}</strong>
              <span>可学习日</span>
            </div>
            <div>
              <strong>{{ local.tasks.length }}</strong>
              <span>任务数量</span>
            </div>
            <div>
              <strong>{{ formatMinutes(totalMinutes) }}</strong>
              <span>预计总时长</span>
            </div>
          </div>

          <div class="summary-rows">
            <div>
              <span>计划周期</span>
              <strong>{{ formatDateRange(local.startDate, local.endDate, { weekday: false }) }}</strong>
            </div>
            <div>
              <span>每日上限</span>
              <strong>{{ formatMinutes(local.dailyMinutes) }}</strong>
            </div>
            <div>
              <span>可学习日</span>
              <strong>{{ weeklyText }}</strong>
            </div>
          </div>

          <div v-if="warnings.length" class="summary-warnings">
            <p class="summary-warnings__title">
              <TriangleAlert :size="13" />
              系统自动调整
            </p>
            <ul>
              <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>

          <div class="usage-card">
            <div class="usage-card__head">
              <span><Sparkles :size="12" /> 本次 AI 调用</span>
              <span>{{ meta.cached ? '复用缓存' : '真实调用' }}</span>
            </div>
            <dl class="usage-card__rows">
              <div>
                <dt>模型</dt>
                <dd>{{ meta.model || 'deepseek-flash' }}</dd>
              </div>
              <div>
                <dt>Token</dt>
                <dd>{{ formatNumber((usage.totalTokens || 0)) }}</dd>
              </div>
              <div>
                <dt>估算费用</dt>
                <dd>{{ costLabel }}</dd>
              </div>
              <div v-if="latencyLabel">
                <dt>耗时</dt>
                <dd>{{ latencyLabel }}</dd>
              </div>
            </dl>
            <p class="usage-card__note">
              费用根据 DeepSeek 返回的真实 token 用量估算，仅供参考。
            </p>
          </div>

          <div v-if="saveError" class="summary-error" role="alert">{{ saveError }}</div>

          <AppButton variant="secondary" block :disabled="saving" @click="saveDraft">
            <template #icon><Save :size="14" /></template>
            保存草稿
          </AppButton>
          <AppButton block :loading="saving" :disabled="saving" @click="save">
            {{ saving ? '正在保存…' : '保存计划' }}
          </AppButton>
          <p class="summary-card__hint">草稿只保存在当前浏览器，正式保存后才写入账户。</p>
        </div>
      </aside>
    </div>

    <div class="preview__mobilebar">
      <AppButton variant="secondary" size="sm" :disabled="saving" @click="emit('back')">
        <template #icon><ArrowLeft :size="14" /></template>
        返回
      </AppButton>
      <AppButton variant="secondary" size="sm" :disabled="saving" @click="saveDraft">
        存草稿
      </AppButton>
      <AppButton size="sm" block :loading="saving" @click="save">
        {{ saving ? '保存中…' : '保存计划' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}

.preview__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.preview__head-copy {
  max-width: 65ch;
}

.preview__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  background: var(--lav-50);
  border: 1px solid rgba(130, 114, 239, 0.14);
  color: var(--lav-700);
  font-size: 10px;
  font-weight: 600;
}

.preview__head h1 {
  margin-top: 9px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 660;
  letter-spacing: -0.04em;
}

.preview__head p {
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.65;
}

.preview__head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.preview__alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 11px 14px;
  border: 1px solid rgba(201, 88, 88, 0.16);
  border-radius: var(--radius-md);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 12.5px;
  line-height: 1.55;
}

.preview__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  align-items: start;
}

.preview__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.edit-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.edit-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
}

.edit-card__head h2 {
  font-size: 14.5px;
  font-weight: 640;
}

.edit-card__meta {
  color: var(--ink-faint);
  font-size: 10px;
}

.edit-card__head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-card__body {
  padding: 16px 18px 18px;
}

.edit-card__body--tasks {
  padding: 8px 10px 14px;
}

.edit-label {
  display: block;
  margin-bottom: 5px;
  color: var(--ink-muted);
  font-size: 10.5px;
  font-weight: 600;
}

.edit-title {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 640;
  letter-spacing: -0.03em;
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.edit-title:hover {
  border-color: var(--line);
}

.edit-title:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--lav-300);
  box-shadow: var(--focus-ring);
}

.edit-basic {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}

.edit-textarea {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.65;
  resize: vertical;
}

.edit-textarea:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--lav-300);
  box-shadow: var(--focus-ring);
}

.edit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 13px;
}

.edit-meta .chip {
  font-size: 10px;
}

.stage-edit {
  display: flex;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--line);
}

.stage-edit:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.stage-edit__index {
  flex: none;
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: var(--lav-50);
  color: var(--lav-700);
  font-size: 10px;
  font-weight: 650;
}

.stage-edit__body {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 12px;
}

.stage-edit__title {
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 620;
}

.stage-edit__objective {
  grid-column: 1;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 11px;
}

.stage-edit__dates {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--ink-faint);
  font-size: 9.5px;
  white-space: nowrap;
}

.stage-edit__title:hover,
.stage-edit__objective:hover {
  border-color: var(--line);
  background: var(--surface-soft);
}

.stage-edit__title:focus,
.stage-edit__objective:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--lav-300);
  box-shadow: var(--focus-ring);
}

.add-task-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  background: var(--lav-50);
  color: var(--lav-700);
  font-size: 10.5px;
  font-weight: 600;
}

.add-task-button:hover {
  background: var(--lav-100);
}

.task-group {
  padding: 8px 8px 4px;
}

.task-group + .task-group {
  border-top: 1px solid var(--line);
}

.task-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 6px 6px;
}

.task-group__date {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.task-group__minutes {
  color: var(--ink-faint);
  font-size: 9.5px;
}

.task-group__minutes.is-over {
  color: var(--danger-700);
}

.task-edit {
  padding: 7px 8px;
  border-radius: 9px;
  transition: background-color var(--duration-fast) var(--ease);
}

.task-edit:hover {
  background: var(--surface-soft);
}

.task-edit__top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-edit__title {
  flex: 1;
  min-width: 0;
  padding: 4px 5px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 520;
}

.task-edit__title:hover {
  border-color: var(--line);
  background: var(--surface);
}

.task-edit__title:focus {
  outline: none;
  background: var(--surface);
  border-color: var(--lav-300);
  box-shadow: var(--focus-ring);
}

.task-edit__remove {
  display: grid;
  place-items: center;
  flex: none;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  color: var(--ink-faint);
  opacity: 0;
}

.task-edit:hover .task-edit__remove,
.task-edit:focus-within .task-edit__remove {
  opacity: 1;
}

.task-edit__remove:hover {
  background: var(--danger-100);
  color: var(--danger-700);
}

.task-edit__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 9px;
  margin-top: 2px;
  padding-left: 5px;
}

.task-edit__criteria {
  flex: 1;
  min-width: 150px;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: var(--ink-faint);
  font-size: 10px;
}

.task-edit__criteria:hover {
  border-color: var(--line);
}

.task-edit__criteria:focus {
  outline: none;
  border-color: var(--lav-300);
  background: var(--surface);
}

.task-edit__duration {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.task-edit__duration input {
  width: 44px;
  padding: 2px 4px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--ink-soft);
  font-size: 10px;
  text-align: center;
}

.task-edit__select {
  padding: 2px 4px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 9.5px;
}

.task-edit__review {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ink-faint);
  font-size: 9.5px;
  cursor: pointer;
}

.task-edit__review input {
  width: 12px;
  height: 12px;
  accent-color: var(--mint-600);
}

.task-edit__desc {
  margin-top: 2px;
  padding-left: 5px;
  color: var(--ink-faint);
  font-size: 9.5px;
  line-height: 1.5;
}

.add-task {
  margin: 10px 8px 6px;
  padding: 13px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
}

.add-task__title {
  margin-bottom: 9px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.add-task__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr 1.2fr;
  gap: 9px;
}

.add-task__error {
  margin-top: 7px;
  color: var(--danger-700);
  font-size: 10.5px;
}

.add-task__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 9px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-item {
  display: flex;
  gap: 8px;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: var(--warning-100);
  color: var(--warning-700);
}

.risk-item strong {
  display: block;
  font-size: 11.5px;
  font-weight: 620;
}

.risk-item p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.55;
}

.advice-text {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--lav-50);
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.7;
}

.preview__aside {
  position: sticky;
  top: 20px;
  min-width: 0;
}

.summary-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.summary-card__eyebrow {
  color: var(--ink-faint);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--line);
  overflow: hidden;
}

.summary-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 11px;
  background: var(--surface-soft);
}

.summary-grid strong {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.summary-grid span {
  color: var(--ink-faint);
  font-size: 9px;
}

.summary-rows {
  margin-top: 12px;
}

.summary-rows > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  font-size: 10px;
}

.summary-rows span {
  flex: none;
  color: var(--ink-faint);
}

.summary-rows strong {
  color: var(--ink-soft);
  font-weight: 550;
  text-align: right;
}

.summary-warnings {
  margin-top: 10px;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: var(--warning-100);
}

.summary-warnings__title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--warning-700);
  font-size: 10px;
  font-weight: 650;
}

.summary-warnings ul {
  margin-top: 4px;
  padding-left: 12px;
  list-style: disc;
  color: var(--ink-muted);
  font-size: 9.5px;
  line-height: 1.6;
}

.usage-card {
  margin-top: 12px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
}

.usage-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--lav-700);
  font-size: 9.5px;
  font-weight: 600;
}

.usage-card__head span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.usage-card__head span:last-child {
  color: var(--ink-faint);
  font-weight: 500;
}

.usage-card__rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 10px;
  margin-top: 7px;
}

.usage-card__rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.usage-card__rows dt {
  color: var(--ink-faint);
  font-size: 9px;
}

.usage-card__rows dd {
  margin: 0;
  color: var(--ink-soft);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.usage-card__note {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 8.5px;
  line-height: 1.55;
}

.summary-error {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 10px;
  line-height: 1.5;
}

.summary-card .btn {
  margin-top: 12px;
}

.summary-card__hint {
  margin-top: 7px;
  color: var(--ink-faint);
  font-size: 8.5px;
  line-height: 1.5;
  text-align: center;
}

.preview__mobilebar {
  display: none;
}

@media (max-width: 1000px) {
  .preview__layout {
    grid-template-columns: 1fr;
  }

  .preview__aside {
    position: static;
  }

  .edit-basic {
    grid-template-columns: 1fr;
  }

  .add-task__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .preview__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview__head-actions {
    width: 100%;
  }

  .preview__head-actions .btn {
    flex: 1;
  }

  .edit-card__body {
    padding: 14px;
  }

  .edit-title {
    font-size: 17px;
  }

  .stage-edit__body {
    grid-template-columns: 1fr;
  }

  .stage-edit__dates {
    grid-column: 1;
    grid-row: auto;
  }

  .task-edit__criteria {
    min-width: 100%;
    order: 5;
  }

  .task-edit__remove {
    opacity: 1;
  }

  .add-task__grid {
    grid-template-columns: 1fr;
  }

  .preview {
    padding-bottom: 74px;
  }

  .preview__mobilebar {
    position: fixed;
    right: 0;
    bottom: calc(68px + env(safe-area-inset-bottom, 0px));
    left: 0;
    z-index: 45;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    background: rgba(255, 253, 249, 0.97);
    border-top: 1px solid var(--line);
    box-shadow: 0 -10px 30px -22px rgba(41, 37, 49, 0.4);
  }

  .preview__mobilebar .btn--block {
    flex: 1;
    width: auto;
  }
}
</style>

<style scoped>
.preview {
  padding-bottom: 0;
}

.preview__badge {
  padding: 3px 7px;
  border: 1px solid var(--accent);
  border-radius: 0;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.preview__head h1 {
  font-family: var(--font-display);
  font-size: clamp(30px, 3.4vw, 46px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.055em;
}

.preview__head p {
  font-size: 11.5px;
}

.preview__alert {
  padding: 9px 0 9px 12px;
  border: 0;
  border-left: 2px solid var(--accent);
  border-radius: 0;
  background: transparent;
  font-size: 10.5px;
}

.preview__layout {
  grid-template-columns: minmax(0, 1fr) minmax(230px, 0.36fr);
  gap: 30px;
}

.preview__main {
  gap: 24px;
}

.edit-card {
  padding: 0;
  border: 0;
  border-top: 1px solid var(--ink);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.edit-card__head {
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.edit-card__head h2 {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.05em;
}

.edit-card__body {
  padding: 14px 0;
}

.edit-title {
  padding: 2px 0;
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.05em;
}

.edit-title:hover,
.edit-title:focus {
  border-bottom-color: var(--accent);
  background: transparent;
}

.edit-textarea {
  border: 0;
  border-bottom: 1px solid var(--line-strong);
  border-radius: 0;
  background: transparent;
  font-size: 12px;
}

.edit-textarea:focus {
  border-bottom-color: var(--accent);
  box-shadow: none;
}

.stage-edit {
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.stage-edit__index {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8px;
}

.stage-edit__title {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
}

.stage-edit__objective {
  color: var(--ink-muted);
  font-size: 10.5px;
}

.stage-edit__dates {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
}

.add-task-button {
  border: 1px dashed var(--line-strong);
  border-radius: 0;
  background: transparent;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
}

.add-task-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.task-group {
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}

.task-group__head {
  background: transparent;
}

.task-group__day {
  font-family: var(--font-display);
  font-size: 20px;
  font-style: normal;
}

.task-edit {
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}

.task-edit:hover {
  background: var(--surface);
}

@media (max-width: 900px) {
  .preview__layout {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.preview__head h1 {
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.preview__badge {
  padding: 4px 8px;
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 10.5px;
}

.edit-card {
  margin-bottom: 12px;
  padding: 18px;
  border: 0;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.edit-card__head {
  padding: 0 0 8px;
  border: 0;
}

.edit-card__head h2 {
  font-size: 16px;
  font-weight: 620;
}

.edit-card__body {
  padding: 6px 0 0;
}

.task-group {
  border: 0;
  background: transparent;
}

.task-group__head {
  padding: 8px 0;
  border: 0;
}

.task-edit {
  margin: 0 -10px;
  padding: 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
}

.task-edit:hover {
  background: var(--surface-soft);
}

.summary-card {
  padding: 16px;
  border: 0;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.summary-card__hint {
  color: var(--ink-faint);
  font-size: 10.5px;
}
</style>
