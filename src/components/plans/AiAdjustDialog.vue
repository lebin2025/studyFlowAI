<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
} from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AiGeneratingPanel from '@/components/plans/AiGeneratingPanel.vue'
import { aiApi } from '@/api/index.js'
import { formatDate, formatWeekly } from '@/utils/date.js'
import { formatNumber, formatUsd } from '@/utils/format.js'
import { useUiStore } from '@/stores/ui.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  plan: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'applied'])
const ui = useUiStore()

const instruction = ref('')
const requestId = ref('')
const loading = ref(false)
const elapsed = ref(0)
const error = ref(null)
const previewData = ref(null)
const applying = ref(false)
const applyError = ref('')
const keepCompleted = ref(true)
const keepManual = ref(true)
const controller = ref(null)
let timer = null

const suggestions = [
  '我每天只能学 1 小时，请重新安排',
  '把任务拆得更细一些',
  '增加复习和自测的时间',
  '难度调低一点，更适合初学者',
  '我只有周末有时间，重新安排',
  '把截止日期延长一周',
]

const startTimer = () => {
  stopTimer()
  elapsed.value = 0
  timer = window.setInterval(() => (elapsed.value += 1), 1000)
}

const stopTimer = () => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

const reset = () => {
  instruction.value = ''
  requestId.value = ''
  loading.value = false
  elapsed.value = 0
  error.value = null
  previewData.value = null
  applying.value = false
  applyError.value = ''
  keepCompleted.value = true
  keepManual.value = true
  stopTimer()
  controller.value?.abort()
  controller.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
    else controller.value?.abort()
  },
)

const createRequestId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`

const close = () => {
  if (loading.value || applying.value) return
  emit('update:modelValue', false)
}

const updateVisibility = (value) => {
  if (!value && (loading.value || applying.value)) return
  emit('update:modelValue', value)
}

const applySuggestion = (text) => {
  instruction.value = text
  error.value = null
}

const preview = async ({ retry = false } = {}) => {
  if (loading.value) return
  if (instruction.value.trim().length < 2) {
    error.value = { code: 'INVALID', message: '请至少写几个字，告诉 AI 你想怎么调整' }
    return
  }
  if (!retry || !requestId.value) requestId.value = createRequestId()

  error.value = null
  loading.value = true
  applying.value = false
  startTimer()
  controller.value = new AbortController()

  try {
    previewData.value = await aiApi.previewAdjustment(
      props.plan.id,
      { instruction: instruction.value.trim(), requestId: requestId.value },
      { signal: controller.value.signal },
    )
  } catch (previewError) {
    if (previewError?.isCanceled) {
      error.value = { code: 'CANCELLED', message: '已取消本次调整，原计划没有变化。' }
    } else {
      error.value = {
        code: previewError.code || 'AI_ERROR',
        message: previewError.message || 'AI 调整没有完成，请稍后重试',
        requestId: previewError.requestId,
      }
    }
  } finally {
    loading.value = false
    stopTimer()
    controller.value = null
  }
}

const cancelPreview = () => controller.value?.abort()

const backToInstruction = () => {
  previewData.value = null
  applyError.value = ''
}

const previewCounts = computed(() => {
  const base = previewData.value?.preview
  if (!base) return null
  const preservedCompleted = keepCompleted.value ? base.preservedCompleted : 0
  const preservedManual = keepManual.value ? base.preservedManual : 0
  const removed = Math.max((props.plan?.taskCount || 0) - preservedCompleted - preservedManual, 0)
  return {
    preservedCompleted,
    preservedManual,
    removed,
    added: base.addedTasks,
    final: preservedCompleted + preservedManual + base.addedTasks,
  }
})

const weekdayText = (value) => {
  const raw = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((day) => Number(day))
  return formatWeekly(raw.map(Number))
}

const planChanges = computed(() =>
  (previewData.value?.preview?.planChanges || []).map((change) =>
    change.field === 'studyWeekdays'
      ? { ...change, from: weekdayText(change.from), to: weekdayText(change.to) }
      : change,
  ),
)

const proposedTasks = computed(() => {
  const tasks = previewData.value?.proposedPlan?.tasks || []
  return [...tasks]
    .sort((a, b) => (a.taskDate < b.taskDate ? -1 : a.taskDate > b.taskDate ? 1 : 0))
    .slice(0, 8)
})

const remainingTaskCount = computed(() =>
  Math.max((previewData.value?.proposedPlan?.tasks?.length || 0) - proposedTasks.value.length, 0),
)

const apply = async () => {
  if (!previewData.value || applying.value) return
  applying.value = true
  applyError.value = ''
  try {
    const result = await aiApi.applyAdjustment(props.plan.id, {
      proposedPlan: previewData.value.proposedPlan,
      keepCompleted: keepCompleted.value,
      keepManual: keepManual.value,
    })
    ui.success(
      `计划已更新，保留了 ${result.summary.keptCompleted} 个已完成任务`,
      'AI 调整已应用',
    )
    emit('applied', result)
    applying.value = false
    emit('update:modelValue', false)
  } catch (applyUpdateError) {
    applyError.value = applyUpdateError.message || '应用调整失败，请稍后重试'
  } finally {
    applying.value = false
  }
}

onBeforeUnmount(() => {
  stopTimer()
  controller.value?.abort()
})
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="用 AI 调整计划"
    description="用一句自然语言说明你的新情况。AI 会重排阶段和任务，但预览阶段不会修改原计划。"
    size="xl"
    :close-on-overlay="!loading && !applying"
    :show-close="!loading && !applying"
    @update:model-value="updateVisibility"
  >
    <AiGeneratingPanel
      v-if="loading"
      :model="previewData?.meta?.model || 'deepseek-flash'"
      @cancel="cancelPreview"
    />

    <div v-else-if="previewData" class="adjust-preview">
      <div class="adjust-preview__summary">
        <span class="adjust-preview__badge">
          <Sparkles :size="12" />
          AI 调整预览 · 尚未应用
        </span>
        <p class="adjust-preview__change">
          {{ previewData.changeSummary || 'AI 已根据你的要求重新安排了这份计划。' }}
        </p>
      </div>

      <div class="diff-grid">
        <div>
          <strong>{{ previewCounts.preservedCompleted }}</strong>
          <span>保留已完成</span>
        </div>
        <div>
          <strong>{{ previewCounts.preservedManual }}</strong>
          <span>保留手动任务</span>
        </div>
        <div class="is-warn">
          <strong>{{ previewCounts.removed }}</strong>
          <span>替换未完成任务</span>
        </div>
        <div>
          <strong>{{ previewCounts.added }}</strong>
          <span>新增任务</span>
        </div>
      </div>

      <div class="preserve-box">
        <p class="preserve-box__title">
          <ShieldCheck :size="14" />
          应用时如何保护已有数据
        </p>
        <label class="check-row">
          <input v-model="keepCompleted" type="checkbox" />
          <span>
            保留 {{ previewData.preview.preservedCompleted }} 个已完成任务（推荐，避免抹掉已投入的时间）
          </span>
        </label>
        <label class="check-row">
          <input v-model="keepManual" type="checkbox" />
          <span>
            保留 {{ previewData.preview.preservedManual }} 个手动添加的未完成任务
          </span>
        </label>
        <p v-if="!keepCompleted" class="preserve-box__warning">
          <TriangleAlert :size="13" />
          取消勾选会删除已完成任务，完成记录也会从统计中消失。除非你确定要重来，否则不建议这样做。
        </p>
      </div>

      <div v-if="planChanges.length" class="changes-box">
        <p class="changes-box__title">计划信息变化</p>
        <div v-for="change in planChanges" :key="change.field" class="change-row">
          <span>{{ change.label }}</span>
          <span class="change-row__from">{{ change.from }}</span>
          <span class="change-row__arrow">→</span>
          <strong>{{ change.to }}</strong>
        </div>
      </div>
      <p v-else class="no-changes">计划周期和每日时长保持不变，只重新安排了任务内容。</p>

      <div class="proposed-box">
        <div class="proposed-box__head">
          <span>调整后的任务预览</span>
          <span>
            共 {{ previewData.proposedPlan.tasks.length }} 个 ·
            每天 {{ previewData.proposedPlan.dailyMinutes }} 分钟
          </span>
        </div>
        <ul class="proposed-list">
          <li v-for="(task, index) in proposedTasks" :key="`${task.taskDate}-${index}`">
            <span class="proposed-list__date">
              {{ formatDate(task.taskDate, { weekday: false }) }}
            </span>
            <span class="proposed-list__title">{{ task.title }}</span>
            <span v-if="task.isReview" class="proposed-list__tag">复习</span>
            <span class="proposed-list__time">{{ task.durationMinutes }} 分</span>
          </li>
        </ul>
        <p v-if="remainingTaskCount" class="proposed-list__more">
          还有 {{ remainingTaskCount }} 个任务，应用后可在计划详情中查看。
        </p>
      </div>

      <ul v-if="previewData.preview.warnings?.length" class="adjust-warnings">
        <li v-for="warning in previewData.preview.warnings" :key="warning">{{ warning }}</li>
      </ul>

      <div class="adjust-meta">
        <span>{{ previewData.meta?.model || 'deepseek-flash' }}</span>
        <span>{{ formatNumber(previewData.meta?.usage?.totalTokens || 0) }} token</span>
        <span>估算 {{ formatUsd(previewData.meta?.costUsd || 0) }}</span>
        <span class="adjust-meta__note">本次预览已产生一次 AI 调用费用</span>
      </div>

      <div v-if="applyError" class="adjust-error" role="alert">
        <AlertCircle :size="15" />
        {{ applyError }}
      </div>
    </div>

    <div v-else class="adjust-form">
      <AppTextarea
        v-model="instruction"
        label="你希望怎么调整？"
        placeholder="例如：我每天只能学习 45 分钟，请把任务拆细一点，并增加复习时间。"
        :rows="5"
        :maxlength="600"
        show-count
        required
      />

      <div class="adjust-form__suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          type="button"
          class="adjust-suggestion"
          @click="applySuggestion(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>

      <p class="adjust-form__note">
        调整会基于当前计划的阶段、任务和日期。生成预览后，你会看到哪些任务会被替换、哪些会被保留，确认后才会写入。
      </p>

      <div v-if="error" class="adjust-error" role="alert">
        <div>
          <p>{{ error.message }}</p>
          <p v-if="error.requestId" class="adjust-error__request">请求编号：{{ error.requestId }}</p>
          <div v-if="error.code === 'AI_NOT_CONFIGURED'" class="adjust-setup">
            <p><KeyRound :size="13" /> 在后端 <code>.env</code> 中填写 <code>DEEPSEEK_API_KEY</code>，重启服务后再试。</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <template v-if="loading">
        <AppButton variant="ghost" @click="cancelPreview">取消生成</AppButton>
      </template>

      <template v-else-if="previewData">
        <AppButton variant="ghost" :disabled="applying" @click="backToInstruction">
          <template #icon><ArrowLeft :size="15" /></template>
          返回修改要求
        </AppButton>
        <AppButton variant="secondary" :disabled="applying" @click="close">取消</AppButton>
        <AppButton :loading="applying" @click="apply">
          <template #icon><ShieldCheck :size="15" /></template>
          {{ applying ? '正在应用…' : '确认应用调整' }}
        </AppButton>
      </template>

      <template v-else>
        <AppButton variant="ghost" @click="close">取消</AppButton>
        <AppButton
          :loading="false"
          @click="preview()"
        >
          <template #icon><WandSparkles :size="15" /></template>
          生成调整预览
        </AppButton>
      </template>
    </template>
  </AppModal>
</template>

<style scoped>
.adjust-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.adjust-form__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.adjust-suggestion {
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10px;
  text-align: left;
}

.adjust-suggestion:hover {
  border-color: var(--lav-300);
  color: var(--lav-700);
}

.adjust-form__note {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.65;
}

.adjust-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 10.5px;
  line-height: 1.6;
}

.adjust-error__request {
  margin-top: 3px;
  font-family: var(--font-mono);
  font-size: 9px !important;
  opacity: 0.75;
}

.adjust-setup {
  margin-top: 7px;
  padding-top: 6px;
  border-top: 1px solid rgba(201, 88, 88, 0.15);
}

.adjust-setup p {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
}

.adjust-setup code {
  padding: 1px 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.65);
  font-family: var(--font-mono);
}

.adjust-preview {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.adjust-preview__summary {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--lav-50);
  border: 1px solid rgba(130, 114, 239, 0.12);
}

.adjust-preview__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lav-700);
  font-size: 9.5px;
  font-weight: 650;
}

.adjust-preview__change {
  margin-top: 5px;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.65;
}

.diff-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--line);
}

.diff-grid > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px 12px;
  background: var(--surface-soft);
}

.diff-grid strong {
  font-size: 18px;
  font-weight: 660;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.diff-grid span {
  color: var(--ink-faint);
  font-size: 8.5px;
}

.diff-grid .is-warn strong {
  color: var(--warning-700);
}

.preserve-box {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.preserve-box__title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  color: var(--mint-700);
  font-size: 10.5px;
  font-weight: 650;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 4px 0;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.55;
  cursor: pointer;
}

.check-row input {
  flex: none;
  width: 14px;
  height: 14px;
  margin-top: 2px;
  accent-color: var(--mint-600);
}

.preserve-box__warning {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 5px;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 9.5px;
  line-height: 1.55;
}

.changes-box {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.changes-box__title {
  margin-bottom: 6px;
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 650;
}

.change-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  padding: 3px 0;
  color: var(--ink-muted);
  font-size: 10px;
}

.change-row > span:first-child {
  min-width: 68px;
  color: var(--ink-faint);
}

.change-row__from {
  text-decoration: line-through;
  text-decoration-color: rgba(164, 157, 173, 0.7);
}

.change-row__arrow {
  color: var(--ink-faint);
}

.change-row strong {
  color: var(--ink-soft);
  font-weight: 600;
}

.no-changes {
  color: var(--ink-faint);
  font-size: 10px;
}

.proposed-box {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.proposed-box__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: var(--surface-soft);
  border-bottom: 1px solid var(--line);
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
}

.proposed-box__head span:last-child {
  color: var(--ink-faint);
  font-size: 8.5px;
  font-weight: 500;
}

.proposed-list {
  display: flex;
  flex-direction: column;
}

.proposed-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px dashed var(--line);
  font-size: 10px;
}

.proposed-list li:last-child {
  border-bottom: 0;
}

.proposed-list__date {
  flex: none;
  width: 62px;
  color: var(--ink-faint);
  font-size: 9px;
}

.proposed-list__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-soft);
}

.proposed-list__tag {
  flex: none;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--mint-50);
  color: var(--mint-700);
  font-size: 8px;
}

.proposed-list__time {
  flex: none;
  color: var(--ink-faint);
  font-size: 9px;
}

.proposed-list__more {
  padding: 6px 12px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 9px;
}

.adjust-warnings {
  padding-left: 16px;
  list-style: disc;
  color: var(--warning-700);
  font-size: 9.5px;
  line-height: 1.6;
}

.adjust-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
  color: var(--ink-faint);
  font-size: 9px;
}

.adjust-meta__note {
  color: var(--ink-muted);
}

@media (max-width: 640px) {
  .diff-grid {
    grid-template-columns: 1fr 1fr;
  }

  .proposed-list__date {
    width: 52px;
  }

  .adjust-preview {
    gap: 11px;
  }
}
</style>
