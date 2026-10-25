<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AiGeneratingPanel from '@/components/plans/AiGeneratingPanel.vue'
import AiPlanPreview from '@/components/plans/AiPlanPreview.vue'
import { aiApi, plansApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import {
  addDaysISO,
  countStudyDays,
  diffDays,
  formatDate,
  formatMinutes,
  formatWeekly,
  todayISO,
  WEEKDAYS,
} from '@/utils/date.js'
import { LEVEL_LABELS } from '@/utils/format.js'
import { validatePlanWindow } from '@/utils/validation.js'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const step = ref(1)
const maxVisited = ref(1)
const wizardCard = ref(null)
const showPreview = ref(false)
const preview = ref(null)
const previewKey = ref(0)
const saving = ref(false)
const saveError = ref('')
const generating = ref(false)
const generateError = ref(null)
const controller = ref(null)
const elapsed = ref(0)
let elapsedTimer = null

const aiStatus = ref(null)
const aiStatusLoading = ref(true)
const aiStatusError = ref('')

const regenerateOpen = ref(false)
let allowLeave = false

const today = todayISO()

const defaultWeekdays = auth.defaultWeekdays?.length
  ? [...auth.defaultWeekdays]
  : [1, 2, 3, 4, 5]

const form = reactive({
  goal: '',
  subject: '',
  level: 'intermediate',
  startDate: today,
  endDate: addDaysISO(today, 20),
  dailyMinutes: auth.defaultDailyMinutes || 60,
  studyWeekdays: defaultWeekdays,
  preferences: '',
  notes: '',
})

const errors = reactive({})
const touched = reactive({ 1: false, 2: false, 3: false })

const steps = [
  { id: 1, title: '目标', caption: '想学什么' },
  { id: 2, title: '时间', caption: '什么时候学' },
  { id: 3, title: '偏好', caption: '怎么学更舒服' },
]

const subjectSuggestions = [
  '英语六级',
  '考研英语',
  '雅思',
  '考研数学',
  '数据结构与算法',
  '前端开发',
  '教师资格证',
  '摄影',
]

const preferenceSuggestions = [
  '任务尽量短一些',
  '需要更多复习安排',
  '喜欢先看例子再练习',
  '周末可以多学一点',
  '不要安排太满',
]

const dayPresets = [
  { label: '2 周', days: 14 },
  { label: '1 个月', days: 30 },
  { label: '3 个月', days: 90 },
]

const storageKey = computed(() => `studyflow:plan-form:${auth.user?.id || 'anonymous'}`)

const planDays = computed(() => {
  if (!form.startDate || !form.endDate || form.endDate < form.startDate) return 0
  return diffDays(form.startDate, form.endDate) + 1
})
const studyDays = computed(() =>
  form.startDate && form.endDate
    ? countStudyDays(form.startDate, form.endDate, form.studyWeekdays)
    : 0,
)
const totalMinutes = computed(() => studyDays.value * (Number(form.dailyMinutes) || 0))
const weeklyLabel = computed(() => formatWeekly(form.studyWeekdays))
const weeklyText = computed(() =>
  weeklyLabel.value === '每天' ? '每天' : `每周 ${weeklyLabel.value}`,
)

const windowValidation = computed(() =>
  validatePlanWindow({
    startDate: form.startDate,
    endDate: form.endDate,
    studyWeekdays: form.studyWeekdays,
    dailyMinutes: Number(form.dailyMinutes),
  }),
)

const warnings = computed(() => Object.values(windowValidation.value.warnings))

const requestId = ref('')

const createRequestId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`

const loadAiStatus = async () => {
  aiStatusLoading.value = true
  aiStatusError.value = ''
  try {
    aiStatus.value = await aiApi.status()
  } catch (error) {
    aiStatusError.value = error.message
  } finally {
    aiStatusLoading.value = false
  }
}

const restoreDraft = () => {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (!saved?.form || typeof saved.form !== 'object') return
    const allowed = [
      'goal',
      'subject',
      'level',
      'startDate',
      'endDate',
      'dailyMinutes',
      'studyWeekdays',
      'preferences',
      'notes',
    ]
    allowed.forEach((key) => {
      if (saved.form[key] !== undefined) form[key] = saved.form[key]
    })
    form.dailyMinutes = Number(form.dailyMinutes) || 60
    if (!Array.isArray(form.studyWeekdays) || !form.studyWeekdays.length) {
      form.studyWeekdays = defaultWeekdays
    }
    if (form.startDate < todayISO()) {
      const span = Math.max(diffDays(form.startDate, form.endDate), 1)
      form.startDate = todayISO()
      form.endDate = addDaysISO(form.startDate, Math.min(span, 365))
    }
    if (!['beginner', 'intermediate', 'advanced'].includes(form.level)) {
      form.level = 'intermediate'
    }
  } catch {
    /* ignore corrupted drafts */
  }
}

const persistDraft = () => {
  try {
    localStorage.setItem(storageKey.value, JSON.stringify({ form: { ...form }, updatedAt: Date.now() }))
  } catch {
    /* storage might be unavailable */
  }
}

const clearDraft = () => {
  try {
    localStorage.removeItem(storageKey.value)
  } catch {
    /* ignore */
  }
}

const validateStepOne = () => {
  if (!form.goal.trim()) errors.goal = '请描述你的学习目标'
  else if (form.goal.trim().length < 2) errors.goal = '目标至少需要 2 个字符'
  else delete errors.goal

  if (!form.subject.trim()) errors.subject = '请填写学习科目或领域'
  else delete errors.subject

  return !errors.goal && !errors.subject
}

const validateStepTwo = () => {
  const result = validatePlanWindow({
    startDate: form.startDate,
    endDate: form.endDate,
    studyWeekdays: form.studyWeekdays,
    dailyMinutes: Number(form.dailyMinutes),
  })
  ;['startDate', 'endDate', 'studyWeekdays', 'dailyMinutes'].forEach((key) => {
    if (result.errors[key]) errors[key] = result.errors[key]
    else delete errors[key]
  })
  return !result.errors.startDate &&
    !result.errors.endDate &&
    !result.errors.studyWeekdays &&
    !result.errors.dailyMinutes
}

const focusFirstError = async () => {
  await nextTick()
  const element = wizardCard.value?.querySelector('[aria-invalid="true"]')
  element?.focus()
}

const validateCurrent = (target = step.value) => {
  touched[target] = true
  const valid = target === 1 ? validateStepOne() : target === 2 ? validateStepTwo() : true
  if (!valid) focusFirstError()
  return valid
}

const validateAll = () => {
  touched[1] = true
  touched[2] = true
  const first = validateStepOne()
  const second = validateStepTwo()
  if (!first) return 1
  if (!second) return 2
  return 0
}

const goToStep = (target) => {
  if (target > maxVisited.value || generating.value) return
  step.value = target
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const nextStep = () => {
  if (!validateCurrent()) return
  if (step.value < 3) {
    step.value += 1
    maxVisited.value = Math.max(maxVisited.value, step.value)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const prevStep = () => {
  if (step.value > 1) {
    step.value -= 1
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const toggleWeekday = (day) => {
  if (generating.value) return
  if (form.studyWeekdays.includes(day)) {
    if (form.studyWeekdays.length === 1) {
      ui.warning('至少要保留一个可学习日')
      return
    }
    form.studyWeekdays = form.studyWeekdays.filter((item) => item !== day)
  } else {
    form.studyWeekdays = [...form.studyWeekdays, day].sort((a, b) => a - b)
  }
  if (touched[2]) validateStepTwo()
}

const applyPreset = (days) => {
  form.endDate = addDaysISO(form.startDate || todayISO(), days - 1)
  if (touched[2]) validateStepTwo()
}

const applySubject = (subject) => {
  form.subject = subject
  if (touched[1]) validateStepOne()
}

const appendPreference = (text) => {
  if (form.preferences.includes(text)) return
  form.preferences = form.preferences ? `${form.preferences}；${text}` : text
}

const startTimer = () => {
  elapsed.value = 0
  stopTimer()
  elapsedTimer = window.setInterval(() => (elapsed.value += 1), 1000)
}

const stopTimer = () => {
  if (elapsedTimer) {
    window.clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

const generate = async ({ retry = false } = {}) => {
  if (generating.value) return
  if (!retry) {
    const invalidStep = validateAll()
    if (invalidStep) {
      step.value = invalidStep
      window.scrollTo({ top: 0, behavior: 'smooth' })
      focusFirstError()
      return
    }
    requestId.value = createRequestId()
  } else if (!requestId.value) {
    requestId.value = createRequestId()
  }

  generateError.value = null
  saving.value = false
  saveError.value = ''
  generating.value = true
  startTimer()
  controller.value = new AbortController()

  try {
    const result = await aiApi.generate(
      {
        goal: form.goal.trim(),
        subject: form.subject.trim(),
        level: form.level,
        startDate: form.startDate,
        endDate: form.endDate,
        dailyMinutes: Number(form.dailyMinutes),
        studyWeekdays: [...form.studyWeekdays].sort((a, b) => a - b),
        preferences: form.preferences.trim(),
        notes: form.notes.trim(),
        requestId: requestId.value,
      },
      { signal: controller.value.signal },
    )
    preview.value = result
    previewKey.value += 1
    showPreview.value = true
    maxVisited.value = 3
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    if (error?.isCanceled) {
      generateError.value = {
        code: 'CANCELLED',
        message: '已取消本次生成。你填写的信息都还在，可以随时重试。',
      }
    } else {
      generateError.value = {
        code: error.code || 'AI_ERROR',
        message: error.message || 'AI 生成没有完成，请稍后重试',
        requestId: error.requestId,
      }
    }
  } finally {
    generating.value = false
    stopTimer()
    controller.value = null
  }
}

const cancelGeneration = () => {
  controller.value?.abort()
}

const retryGeneration = () => {
  generate({ retry: true })
}

const backToForm = () => {
  showPreview.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const backToPreview = () => {
  if (!preview.value) return
  showPreview.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const askRegenerate = () => {
  regenerateOpen.value = true
}

const confirmRegenerate = () => {
  regenerateOpen.value = false
  preview.value = null
  showPreview.value = false
  generate({ retry: false })
}

const savePlan = async (payload) => {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const detail = await plansApi.create({ ...payload, source: 'ai' })
    clearDraft()
    allowLeave = true
    ui.success('学习计划已保存，可以开始今天的一小步了', '计划创建成功')
    router.push({ name: 'plan-detail', params: { id: detail.plan.id } })
  } catch (error) {
    saveError.value =
      error.details?.length
        ? `${error.message}：${error.details[0].message}`
        : error.message || '保存计划失败，请稍后重试'
    ui.error(saveError.value, '保存计划失败')
  } finally {
    saving.value = false
  }
}

watch(
  form,
  () => {
    persistDraft()
    if (touched[1]) validateStepOne()
    if (touched[2]) validateStepTwo()
  },
  { deep: true },
)

watch(
  () => form.startDate,
  (value) => {
    if (value && form.endDate < value) {
      form.endDate = addDaysISO(value, 20)
    }
  },
)

onMounted(() => {
  restoreDraft()
  loadAiStatus()
})

onBeforeUnmount(() => {
  stopTimer()
  controller.value?.abort()
})

onBeforeRouteLeave(() => {
  if (preview.value && !allowLeave) {
    return window.confirm('这份 AI 计划草稿还没有保存，确定离开吗？已填写的条件会保留在浏览器中。')
  }
  return true
})

const aiReady = computed(() => Boolean(aiStatus.value?.configured))
</script>

<template>
  <div class="plan-new">
    <PageHeader
      v-if="!showPreview"
      eyebrow="AI 学习规划"
      title="让 AI 把目标拆到每一天"
      description="告诉我们你想学什么、有多少时间。AI 会生成一份带阶段、每日任务和复习节奏的计划，你可以先修改，再保存。"
      back-to="/app/plans"
      back-label="返回学习计划"
    >
      <template #actions>
        <AppButton
          v-if="preview"
          variant="secondary"
          @click="backToPreview"
        >
          <template #icon><Sparkles :size="15" /></template>
          查看上次草稿
        </AppButton>
      </template>
    </PageHeader>

    <AiPlanPreview
      v-if="preview"
      v-show="showPreview"
      :key="previewKey"
      :plan="preview.plan"
      :meta="preview.meta"
      :warnings="preview.warnings || []"
      :saving="saving"
      :save-error="saveError"
      @save="savePlan"
      @back="backToForm"
      @regenerate="askRegenerate"
    />

    <template v-else>
      <ol class="stepper" aria-label="生成计划步骤">
        <li
          v-for="item in steps"
          :key="item.id"
          class="stepper__item"
          :class="{
            'is-active': step === item.id,
            'is-done': step > item.id,
          }"
          :aria-current="step === item.id ? 'step' : undefined"
        >
          <button
            type="button"
            class="stepper__button"
            :disabled="item.id > maxVisited || generating"
            :aria-label="`第 ${item.id} 步：${item.title}`"
            @click="goToStep(item.id)"
          >
            <span class="stepper__number">
              <Check v-if="step > item.id" :size="13" :stroke-width="3" />
              <template v-else>{{ item.id }}</template>
            </span>
            <span class="stepper__text">
              <strong>{{ item.title }}</strong>
              <span>{{ item.caption }}</span>
            </span>
          </button>
          <span v-if="item.id < 3" class="stepper__line" aria-hidden="true" />
        </li>
      </ol>

      <div class="wizard-layout">
        <section ref="wizardCard" class="wizard-card">
          <AiGeneratingPanel
            v-if="generating"
            :model="aiStatus?.model || 'deepseek-flash'"
            @cancel="cancelGeneration"
          />

          <div v-else-if="generateError" class="wizard-error">
            <span class="wizard-error__icon"><AlertCircle :size="22" /></span>
            <h2>
              {{ generateError.code === 'CANCELLED' ? '已取消生成' : '这次生成没有完成' }}
            </h2>
            <p>{{ generateError.message }}</p>
            <p v-if="generateError.requestId" class="wizard-error__request">
              请求编号：{{ generateError.requestId }}
            </p>

            <div v-if="generateError.code === 'AI_NOT_CONFIGURED'" class="setup-card">
              <p class="setup-card__title">
                <KeyRound :size="14" />
                需要先在后端配置密钥
              </p>
              <ol>
                <li>打开项目根目录的 <code>.env</code> 文件（可从 <code>.env.example</code> 复制）。</li>
                <li>填写 <code>DEEPSEEK_API_KEY=你的密钥</code>，密钥只保存在后端。</li>
                <li>重启后端服务（<code>npm run dev</code>），然后回到这里点击重试。</li>
              </ol>
            </div>

            <div v-else-if="generateError.code === 'AI_TIMEOUT'" class="setup-card setup-card--soft">
              <p class="setup-card__title">
                <Clock3 :size="14" />
                可以试试更轻的请求
              </p>
              <p>缩短计划周期、减少每日时长，或在 .env 中调大 DEEPSEEK_TIMEOUT_MS。</p>
            </div>

            <div class="wizard-error__actions">
              <AppButton variant="secondary" @click="generateError = null">
                返回修改条件
              </AppButton>
              <AppButton :loading="generating" @click="retryGeneration">
                <template #icon><RotateCcw :size="15" /></template>
                重试生成
              </AppButton>
            </div>
          </div>

          <template v-else>
            <div v-if="step === 1" class="step-panel">
              <header class="step-head">
                <p class="eyebrow">第 1 步 · 目标</p>
                <h2>你真正想达成什么？</h2>
                <p>尽量具体：目标分数、截止日期、想完成的作品，都会帮助 AI 拆得更准。</p>
              </header>

              <AppTextarea
                v-model="form.goal"
                label="学习目标"
                placeholder="例如：12 月前通过英语六级，重点提升听力和写作，目标 500 分以上。"
                :rows="5"
                :maxlength="1000"
                show-count
                :error="errors.goal"
                required
              />

              <div class="field-group">
                <AppInput
                  v-model="form.subject"
                  label="学习科目 / 领域"
                  placeholder="例如：英语六级、数据结构、雅思听力"
                  maxlength="60"
                  :error="errors.subject"
                  required
                />
                <div class="suggestions" aria-label="常用科目">
                  <button
                    v-for="subject in subjectSuggestions"
                    :key="subject"
                    type="button"
                    class="suggestion"
                    :class="{ 'is-active': form.subject === subject }"
                    @click="applySubject(subject)"
                  >
                    {{ subject }}
                  </button>
                </div>
              </div>

              <fieldset class="level-field">
                <legend>你当前的基础</legend>
                <div class="level-options">
                  <button
                    v-for="(label, value) in LEVEL_LABELS"
                    :key="value"
                    type="button"
                    class="level-option"
                    :class="{ 'is-active': form.level === value }"
                    role="radio"
                    :aria-checked="form.level === value"
                    @click="form.level = value"
                  >
                    <strong>{{ label }}</strong>
                    <span>{{
                      value === 'beginner'
                        ? '从零开始，需要基础讲解'
                        : value === 'intermediate'
                          ? '学过一些，想系统梳理'
                          : '基础扎实，目标高分或进阶'
                    }}</span>
                  </button>
                </div>
              </fieldset>

              <p class="step-tip">
                <Sparkles :size="14" />
                不确定怎么写？描述你的现状和截止日期就够了，AI 会先理解，再规划。
              </p>
            </div>

            <div v-else-if="step === 2" class="step-panel">
              <header class="step-head">
                <p class="eyebrow">第 2 步 · 时间</p>
                <h2>你能拿出多少时间？</h2>
                <p>真实的时间比理想的时间更有用。AI 会严格按这里的约束安排任务。</p>
              </header>

              <div class="form-grid">
                <AppInput
                  v-model="form.startDate"
                  label="开始日期"
                  type="date"
                  :min="today"
                  :error="errors.startDate"
                  required
                >
                  <template #prefix><CalendarDays :size="15" /></template>
                </AppInput>
                <AppInput
                  v-model="form.endDate"
                  label="截止日期"
                  type="date"
                  :min="form.startDate"
                  :error="errors.endDate"
                  required
                >
                  <template #prefix><CalendarDays :size="15" /></template>
                </AppInput>
              </div>

              <div class="preset-row">
                <span class="preset-row__label">快速设置周期</span>
                <button
                  v-for="preset in dayPresets"
                  :key="preset.label"
                  type="button"
                  class="preset"
                  @click="applyPreset(preset.days)"
                >
                  {{ preset.label }}
                </button>
              </div>

              <div class="field-group">
                <AppInput
                  v-model="form.dailyMinutes"
                  label="每天可学习时间（分钟）"
                  type="number"
                  min="10"
                  max="480"
                  step="5"
                  :error="errors.dailyMinutes"
                  required
                >
                  <template #prefix><Clock3 :size="15" /></template>
                </AppInput>
                <div class="suggestions">
                  <button
                    v-for="minutes in [30, 45, 60, 90, 120]"
                    :key="minutes"
                    type="button"
                    class="suggestion"
                    :class="{ 'is-active': Number(form.dailyMinutes) === minutes }"
                    @click="form.dailyMinutes = minutes"
                  >
                    {{ minutes }} 分钟
                  </button>
                </div>
              </div>

              <fieldset class="weekday-field">
                <legend>每周可以学习的日子</legend>
                <div class="weekday-row">
                  <button
                    v-for="day in WEEKDAYS"
                    :key="day.value"
                    type="button"
                    class="weekday"
                    :class="{ 'is-active': form.studyWeekdays.includes(day.value) }"
                    :aria-pressed="form.studyWeekdays.includes(day.value)"
                    @click="toggleWeekday(day.value)"
                  >
                    <span>{{ day.short }}</span>
                    <small>{{ day.label }}</small>
                  </button>
                </div>
                <p class="weekday-hint">
                  已选 {{ weeklyLabel === '未选择' ? '还没有选择' : weeklyLabel }}
                </p>
                <p v-if="errors.studyWeekdays" class="weekday-error" role="alert">
                  {{ errors.studyWeekdays }}
                </p>
              </fieldset>

              <div class="calc-card">
                <div>
                  <strong>{{ planDays }}</strong>
                  <span>计划天数</span>
                </div>
                <div>
                  <strong>{{ studyDays }}</strong>
                  <span>可学习日</span>
                </div>
                <div>
                  <strong>{{ formatMinutes(totalMinutes) }}</strong>
                  <span>总可用时间</span>
                </div>
              </div>

              <div v-if="warnings.length" class="inline-warning">
                <TriangleAlert :size="14" />
                <span>{{ warnings[0] }}</span>
              </div>
            </div>

            <div v-else class="step-panel">
              <header class="step-head">
                <p class="eyebrow">第 3 步 · 偏好</p>
                <h2>让计划更适合你</h2>
                <p>这些不是必填项，但会帮助 AI 安排得更贴近你的学习习惯。</p>
              </header>

              <div class="field-group">
                <AppTextarea
                  v-model="form.preferences"
                  label="学习偏好（可选）"
                  placeholder="例如：喜欢先看例子再练习；需要更多复习；每天任务尽量短。"
                  :rows="3"
                  :maxlength="1000"
                  show-count
                />
                <div class="suggestions">
                  <button
                    v-for="item in preferenceSuggestions"
                    :key="item"
                    type="button"
                    class="suggestion"
                    @click="appendPreference(item)"
                  >
                    + {{ item }}
                  </button>
                </div>
              </div>

              <AppTextarea
                v-model="form.notes"
                label="其他补充要求（可选）"
                placeholder="例如：周末可以多学两小时；教材是《XXX》；不希望安排视频任务。"
                :rows="3"
                :maxlength="1000"
                show-count
              />

              <div class="review-box">
                <p class="review-box__title">生成前确认</p>
                <dl class="review-box__rows">
                  <div>
                    <dt>学习目标</dt>
                    <dd>{{ form.goal || '—' }}</dd>
                  </div>
                  <div>
                    <dt>科目与基础</dt>
                    <dd>{{ form.subject || '—' }} · {{ LEVEL_LABELS[form.level] }}</dd>
                  </div>
                  <div>
                    <dt>计划周期</dt>
                    <dd>
                      {{ formatDate(form.startDate, { weekday: false }) }} —
                      {{ formatDate(form.endDate, { weekday: false }) }}（{{ planDays }} 天）
                    </dd>
                  </div>
                  <div>
                    <dt>学习时间</dt>
                    <dd>{{ formatMinutes(form.dailyMinutes) }}/天 · {{ weeklyText }}</dd>
                  </div>
                  <div>
                    <dt>预计总投入</dt>
                    <dd>{{ formatMinutes(totalMinutes) }} · {{ studyDays }} 个学习日</dd>
                  </div>
                </dl>
              </div>

              <div class="ai-config" :class="{ 'is-warning': !aiStatusLoading && !aiReady && !aiStatusError }">
                <div class="ai-config__head">
                  <span class="ai-config__icon">
                    <Sparkles v-if="aiReady" :size="15" />
                    <TriangleAlert v-else :size="15" />
                  </span>
                  <div>
                    <strong>
                      {{
                        aiStatusLoading
                          ? '正在检查 AI 配置…'
                          : aiStatusError
                            ? '无法读取 AI 配置状态'
                            : aiReady
                              ? 'AI 已就绪'
                              : 'AI 还没有配置'
                      }}
                    </strong>
                    <p v-if="aiReady">
                      将使用 {{ aiStatus.model }} 生成。每次调用会记录真实 token 用量。
                    </p>
                    <p v-else-if="aiStatusError">{{ aiStatusError }}</p>
                    <p v-else>
                      后端缺少 DEEPSEEK_API_KEY，提交后会返回配置提示。请先完成配置再生成。
                    </p>
                  </div>
                </div>
                <div v-if="!aiStatusLoading && !aiReady && !aiStatusError" class="ai-config__steps">
                  <p>1. 在项目根目录 <code>.env</code> 中填写 <code>DEEPSEEK_API_KEY</code></p>
                  <p>2. 重启后端服务，然后刷新本页</p>
                </div>
                <AppButton
                  v-if="aiStatusError"
                  size="sm"
                  variant="ghost"
                  class="ai-config__retry"
                  @click="loadAiStatus"
                >
                  重新检查配置
                </AppButton>
              </div>

              <p class="cost-note">
                生成会真实调用 DeepSeek API，可能产生少量费用。提交后请保持页面打开，通常需要 20–60 秒。
              </p>
            </div>

            <footer class="wizard-footer">
              <AppButton
                v-if="step > 1"
                variant="ghost"
                @click="prevStep"
              >
                <template #icon><ArrowLeft :size="15" /></template>
                上一步
              </AppButton>
              <span v-else class="wizard-footer__spacer" />

              <div class="wizard-footer__right">
                <span class="wizard-footer__count">第 {{ step }} / 3 步</span>
                <AppButton v-if="step < 3" @click="nextStep">
                  下一步
                  <template #trailing><ArrowRight :size="16" /></template>
                </AppButton>
                <AppButton v-else :loading="generating" @click="generate()">
                  <template #icon><Sparkles :size="16" /></template>
                  开始生成计划
                </AppButton>
              </div>
            </footer>
          </template>
        </section>

        <aside class="wizard-aside">
          <div class="aside-card">
            <p class="aside-card__eyebrow">实时概览</p>
            <p class="aside-goal">
              {{ form.goal || '写下目标后，这里会显示摘要。' }}
            </p>
            <div class="aside-rows">
              <div>
                <span>科目</span>
                <strong>{{ form.subject || '待填写' }}</strong>
              </div>
              <div>
                <span>基础</span>
                <strong>{{ LEVEL_LABELS[form.level] }}</strong>
              </div>
              <div>
                <span>周期</span>
                <strong>{{ planDays }} 天</strong>
              </div>
              <div>
                <span>学习日</span>
                <strong>{{ studyDays }} 天</strong>
              </div>
              <div>
                <span>每日</span>
                <strong>{{ formatMinutes(form.dailyMinutes) }}</strong>
              </div>
              <div>
                <span>总投入</span>
                <strong>{{ formatMinutes(totalMinutes) }}</strong>
              </div>
            </div>
            <div class="aside-note">
              <ShieldCheck :size="13" />
              表单只保存在你的浏览器；密钥只留在后端。
            </div>
          </div>

          <div class="aside-card aside-card--soft">
            <p class="aside-card__eyebrow">AI 会做什么</p>
            <ul class="aside-list">
              <li><span>01</span> 拆出 2–5 个连续阶段</li>
              <li><span>02</span> 把任务安排到可学习日</li>
              <li><span>03</span> 控制每天不超过设定时长</li>
              <li><span>04</span> 加入阶段复习与风险提示</li>
            </ul>
            <p class="aside-footnote">
              生成后系统会再次校验日期、时长和结构。不合格的结果不会写入数据库。
            </p>
          </div>
        </aside>
      </div>
    </template>

    <ConfirmDialog
      :model-value="regenerateOpen"
      title="重新生成这份计划？"
      message="会再次调用 DeepSeek 并产生新的费用。当前草稿里的手动修改会丢失，但左侧填写的目标与时间会保留。"
      confirm-label="重新生成"
      :danger="false"
      @update:model-value="regenerateOpen = $event"
      @confirm="confirmRegenerate"
    />
  </div>
</template>

<style scoped>
.plan-new {
  display: flex;
  flex-direction: column;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.55);
}

.stepper__item {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 6px;
}

.stepper__button {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  text-align: left;
  color: var(--ink-muted);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.stepper__button:disabled {
  cursor: default;
}

.stepper__item.is-active .stepper__button {
  background: var(--lav-50);
  color: var(--ink);
}

.stepper__item.is-done .stepper__button {
  color: var(--ink-soft);
}

.stepper__number {
  display: grid;
  place-items: center;
  flex: none;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--ink-faint);
  font-size: 11px;
  font-weight: 650;
}

.stepper__item.is-active .stepper__number {
  border-color: var(--lav-600);
  background: var(--lav-600);
  color: #fff;
}

.stepper__item.is-done .stepper__number {
  border-color: var(--mint-500);
  background: var(--mint-100);
  color: var(--mint-700);
}

.stepper__text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
  min-width: 0;
}

.stepper__text strong {
  font-size: 11.5px;
  font-weight: 600;
}

.stepper__text span {
  color: var(--ink-faint);
  font-size: 9px;
}

.stepper__line {
  flex: none;
  width: 18px;
  height: 1px;
  background: var(--line-strong);
}

.wizard-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}

.wizard-card {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 28px 10px;
}

.step-head h2 {
  margin-top: 7px;
  font-size: clamp(21px, 2.4vw, 26px);
  font-weight: 660;
  letter-spacing: -0.035em;
}

.step-head > p:last-child {
  max-width: 58ch;
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.7;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.suggestion {
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10px;
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.suggestion:hover {
  border-color: var(--lav-300);
  color: var(--lav-700);
}

.suggestion.is-active {
  border-color: rgba(130, 114, 239, 0.3);
  background: var(--lav-50);
  color: var(--lav-700);
}

.level-field,
.weekday-field {
  margin: 0;
  padding: 0;
  border: 0;
}

.level-field legend,
.weekday-field legend {
  margin-bottom: 7px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
}

.level-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.level-option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  text-align: left;
  transition:
    border-color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.level-option:hover {
  border-color: var(--line-strong);
  background: var(--surface);
}

.level-option.is-active {
  border-color: var(--lav-400, #9a8df2);
  background: var(--lav-50);
  box-shadow: 0 0 0 3px rgba(130, 114, 239, 0.1);
}

.level-option strong {
  font-size: 12px;
  font-weight: 620;
}

.level-option span {
  color: var(--ink-muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.step-tip {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.6;
}

.step-tip svg {
  flex: none;
  margin-top: 1px;
  color: var(--lav-600);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.preset-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: -6px;
}

.preset-row__label {
  color: var(--ink-faint);
  font-size: 9.5px;
}

.preset {
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-muted);
  font-size: 10px;
}

.preset:hover {
  border-color: var(--lav-300);
  color: var(--lav-700);
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.weekday {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 2px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  transition:
    border-color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.weekday span {
  font-size: 12px;
  font-weight: 600;
}

.weekday small {
  font-size: 8px;
}

.weekday:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.weekday.is-active {
  border-color: var(--lav-500);
  background: var(--lav-50);
  color: var(--lav-700);
}

.weekday-hint {
  margin-top: 6px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.weekday-error {
  margin-top: 4px;
  color: var(--danger-700);
  font-size: 10.5px;
}

.calc-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--line);
}

.calc-card > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  background: var(--surface-soft);
}

.calc-card strong {
  font-size: 15px;
  font-weight: 660;
  letter-spacing: -0.02em;
}

.calc-card span {
  color: var(--ink-faint);
  font-size: 9px;
}

.inline-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: var(--warning-100);
  color: var(--warning-700);
  font-size: 10.5px;
  line-height: 1.55;
}

.review-box {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
}

.review-box__title {
  margin-bottom: 8px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
}

.review-box__rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
}

.review-box__rows > div {
  display: flex;
  gap: 14px;
  font-size: 10.5px;
}

.review-box dt {
  flex: none;
  width: 70px;
  color: var(--ink-faint);
}

.review-box dd {
  margin: 0;
  flex: 1;
  color: var(--ink-soft);
  line-height: 1.55;
}

.ai-config {
  padding: 13px 14px;
  border: 1px solid rgba(63, 157, 130, 0.16);
  border-radius: var(--radius-md);
  background: var(--mint-50);
}

.ai-config.is-warning {
  border-color: rgba(181, 122, 46, 0.18);
  background: var(--warning-100);
}

.ai-config__head {
  display: flex;
  gap: 9px;
}

.ai-config__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 29px;
  height: 29px;
  border-radius: 9px;
  background: var(--surface);
  color: var(--mint-700);
}

.ai-config.is-warning .ai-config__icon {
  color: var(--warning-700);
}

.ai-config strong {
  font-size: 11.5px;
  font-weight: 640;
}

.ai-config p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10px;
  line-height: 1.6;
}

.ai-config__steps {
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(181, 122, 46, 0.16);
}

.ai-config__steps p {
  font-size: 9.5px;
}

.ai-config__retry {
  margin-top: 7px;
}

.ai-config code {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.cost-note {
  color: var(--ink-faint);
  font-size: 9.5px;
  line-height: 1.6;
}

.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding: 15px 28px;
  border-top: 1px solid var(--line);
  background: var(--surface-soft);
}

.wizard-footer__spacer {
  flex: 1;
}

.wizard-footer__right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.wizard-footer__count {
  color: var(--ink-faint);
  font-size: 9.5px;
}

.wizard-aside {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aside-card {
  padding: 17px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.aside-card--soft {
  background: var(--lav-50);
  border-color: rgba(130, 114, 239, 0.12);
}

.aside-card__eyebrow {
  color: var(--ink-faint);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.aside-goal {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 7px;
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.6;
}

.aside-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--line);
}

.aside-rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 10px;
}

.aside-rows span {
  color: var(--ink-faint);
}

.aside-rows strong {
  color: var(--ink-soft);
  font-weight: 550;
  text-align: right;
}

.aside-note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 9px;
  line-height: 1.55;
}

.aside-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.aside-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 10.5px;
}

.aside-list span {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--lav-700);
  font-size: 8.5px;
  font-weight: 650;
}

.aside-footnote {
  margin-top: 10px;
  color: var(--ink-muted);
  font-size: 9px;
  line-height: 1.6;
}

.wizard-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 34px 30px;
}

.wizard-error__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--danger-100);
  color: var(--danger-600);
}

.wizard-error h2 {
  margin-top: 14px;
  font-size: 21px;
  font-weight: 660;
  letter-spacing: -0.03em;
}

.wizard-error > p {
  max-width: 52ch;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.65;
}

.wizard-error__request {
  font-family: var(--font-mono);
  font-size: 9.5px !important;
  color: var(--ink-faint) !important;
}

.setup-card {
  width: 100%;
  margin-top: 16px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
}

.setup-card--soft {
  background: var(--warning-100);
  border-color: rgba(181, 122, 46, 0.16);
}

.setup-card__title {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 640;
}

.setup-card ol {
  margin-top: 7px;
  padding-left: 17px;
  list-style: decimal;
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.8;
}

.setup-card code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.setup-card > p:not(.setup-card__title) {
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.wizard-error__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

@media (max-width: 1080px) {
  .wizard-layout {
    grid-template-columns: 1fr;
  }

  .wizard-aside {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 700px) {
  .stepper {
    padding: 4px;
  }

  .stepper__text {
    display: none;
  }

  .stepper__item.is-active .stepper__text {
    display: flex;
  }

  .stepper__item.is-active .stepper__text span {
    display: none;
  }

  .stepper__button {
    justify-content: center;
    padding: 7px 4px;
  }

  .stepper__line {
    width: 8px;
  }

  .wizard-aside {
    grid-template-columns: 1fr;
  }

  .step-panel {
    padding: 20px 16px 8px;
    gap: 16px;
  }

  .form-grid,
  .level-options {
    grid-template-columns: 1fr;
  }

  .level-option {
    padding: 10px 12px;
  }

  .weekday-row {
    gap: 3px;
  }

  .weekday {
    padding: 6px 0;
  }

  .weekday small {
    display: none;
  }

  .wizard-footer {
    flex-wrap: wrap;
    padding: 13px 16px;
  }

  .wizard-footer__count {
    display: none;
  }

  .wizard-footer__right {
    margin-left: auto;
  }

  .calc-card {
    grid-template-columns: 1fr 1fr;
  }

  .calc-card > div:last-child {
    grid-column: span 2;
  }

  .wizard-error {
    padding: 26px 18px;
  }

  .wizard-error__actions .btn {
    flex: 1;
  }
}
</style>
