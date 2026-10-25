<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CalendarDays, CircleAlert, Clock3 } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { plansApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'
import { countStudyDays, diffDays, formatMinutes, formatWeekly, todayISO, WEEKDAYS } from '@/utils/date.js'
import { LEVEL_LABELS, PLAN_STATUS_LABELS } from '@/utils/format.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  plan: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const ui = useUiStore()

const form = reactive({
  title: '',
  subject: '',
  level: 'intermediate',
  status: 'active',
  startDate: todayISO(),
  endDate: todayISO(),
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5],
  overview: '',
  preferences: '',
})
const errors = reactive({})
const saving = ref(false)
const apiError = ref('')
const submitted = ref(false)

const weekdaysLabel = computed(() => formatWeekly(form.studyWeekdays))

const prepare = () => {
  if (!props.plan) return
  Object.assign(form, {
    title: props.plan.title,
    subject: props.plan.subject,
    level: props.plan.level,
    status: props.plan.status,
    startDate: props.plan.startDate,
    endDate: props.plan.endDate,
    dailyMinutes: props.plan.dailyMinutes,
    studyWeekdays: [...props.plan.studyWeekdays],
    overview: props.plan.overview || '',
    preferences: props.plan.preferences || '',
  })
  Object.keys(errors).forEach((key) => delete errors[key])
  apiError.value = ''
  submitted.value = false
  saving.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) prepare()
  },
)

const toggleWeekday = (day) => {
  if (form.studyWeekdays.includes(day)) {
    if (form.studyWeekdays.length === 1) {
      errors.studyWeekdays = '至少要保留一个可学习日'
      return
    }
    form.studyWeekdays = form.studyWeekdays.filter((item) => item !== day)
  } else {
    form.studyWeekdays = [...form.studyWeekdays, day].sort((a, b) => a - b)
  }
  if (submitted.value) validate()
}

const validate = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (!form.title.trim()) errors.title = '计划名称不能为空'
  else if (form.title.trim().length > 120) errors.title = '计划名称不能超过 120 个字符'
  if (!form.subject.trim()) errors.subject = '科目不能为空'
  if (!form.startDate) errors.startDate = '请选择开始日期'
  if (!form.endDate) errors.endDate = '请选择结束日期'
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = '结束日期不能早于开始日期'
  } else if (form.startDate && form.endDate && diffDays(form.startDate, form.endDate) + 1 > 366) {
    errors.endDate = '计划周期不能超过 366 天'
  }
  const minutes = Number(form.dailyMinutes)
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 480) {
    errors.dailyMinutes = '每日学习时长需要在 10 - 480 分钟之间'
  }
  if (!form.studyWeekdays.length) {
    errors.studyWeekdays = '至少要保留一个可学习日'
  } else if (
    form.startDate &&
    form.endDate &&
    form.endDate >= form.startDate &&
    countStudyDays(form.startDate, form.endDate, form.studyWeekdays) === 0
  ) {
    errors.studyWeekdays = '当前日期范围内没有可学习的星期，请调整日期或学习日'
  }
  return Object.keys(errors).length === 0
}

watch(
  form,
  () => {
    if (submitted.value) validate()
  },
  { deep: true },
)

const close = () => emit('update:modelValue', false)

const submit = async () => {
  submitted.value = true
  apiError.value = ''
  if (!validate() || saving.value) return
  saving.value = true
  try {
    const detail = await plansApi.update(props.plan.id, {
      title: form.title.trim(),
      subject: form.subject.trim(),
      level: form.level,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      dailyMinutes: Number(form.dailyMinutes),
      studyWeekdays: [...form.studyWeekdays].sort((a, b) => a - b),
      overview: form.overview.trim(),
      preferences: form.preferences.trim(),
    })
    ui.success('学习计划已更新')
    emit('saved', detail)
    close()
  } catch (error) {
    apiError.value = error.message
    if (error.code === 'PLAN_RANGE_CONFLICT') {
      errors.endDate = error.message
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="编辑学习计划"
    description="调整计划信息。修改日期范围前，请确认没有任务会落在范围外。"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="apiError" class="plan-form__alert" role="alert">
      <CircleAlert :size="15" />
      {{ apiError }}
    </div>

    <form class="plan-form" novalidate @submit.prevent="submit">
      <div class="plan-form__grid">
        <AppInput
          v-model="form.title"
          label="计划名称"
          maxlength="120"
          :error="errors.title"
          required
        />
        <AppInput
          v-model="form.subject"
          label="科目 / 领域"
          maxlength="60"
          :error="errors.subject"
          required
        />
      </div>

      <div class="plan-form__grid plan-form__grid--three">
        <AppSelect
          v-model="form.level"
          label="当前基础"
          :options="Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label }))"
        />
        <AppSelect
          v-model="form.status"
          label="计划状态"
          :options="Object.entries(PLAN_STATUS_LABELS).map(([value, label]) => ({ value, label }))"
        />
        <AppInput
          v-model="form.dailyMinutes"
          label="每日时长（分钟）"
          type="number"
          min="10"
          max="480"
          :error="errors.dailyMinutes"
        >
          <template #prefix><Clock3 :size="14" /></template>
        </AppInput>
      </div>

      <div class="plan-form__grid">
        <AppInput
          v-model="form.startDate"
          label="开始日期"
          type="date"
          :max="form.endDate"
          :error="errors.startDate"
        >
          <template #prefix><CalendarDays :size="14" /></template>
        </AppInput>
        <AppInput
          v-model="form.endDate"
          label="结束日期"
          type="date"
          :min="form.startDate"
          :error="errors.endDate"
        >
          <template #prefix><CalendarDays :size="14" /></template>
        </AppInput>
      </div>

      <fieldset class="plan-form__weekdays">
        <legend>可学习日</legend>
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
            {{ day.label }}
          </button>
        </div>
        <p class="weekday-hint">{{ weekdaysLabel }} · 每天 {{ formatMinutes(form.dailyMinutes) }}</p>
        <p v-if="errors.studyWeekdays" class="weekday-error">{{ errors.studyWeekdays }}</p>
      </fieldset>

      <AppTextarea
        v-model="form.overview"
        label="整体策略（可选）"
        :rows="3"
        :maxlength="2000"
        placeholder="这份计划的整体思路"
      />

      <AppTextarea
        v-model="form.preferences"
        label="学习偏好（可选）"
        :rows="2"
        :maxlength="1000"
        placeholder="例如：需要更多复习、任务尽量短"
      />
    </form>

    <template #footer>
      <AppButton variant="ghost" @click="close">取消</AppButton>
      <AppButton :loading="saving" @click="submit">
        {{ saving ? '正在保存…' : '保存修改' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.plan-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.plan-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.plan-form__grid--three {
  grid-template-columns: 1fr 1fr 1fr;
}

.plan-form__weekdays {
  margin: 0;
  padding: 0;
  border: 0;
}

.plan-form__weekdays legend {
  margin-bottom: 7px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.weekday {
  padding: 7px 2px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10.5px;
}

.weekday:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.weekday.is-active {
  border-color: var(--lav-500);
  background: var(--lav-50);
  color: var(--lav-700);
  font-weight: 600;
}

.weekday-hint {
  margin-top: 6px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.weekday-error {
  margin-top: 3px;
  color: var(--danger-700);
  font-size: 10.5px;
}

.plan-form__alert {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-bottom: 13px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 10.5px;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .plan-form__grid,
  .plan-form__grid--three {
    grid-template-columns: 1fr;
  }

  .weekday-row {
    gap: 3px;
  }

  .weekday {
    font-size: 9.5px;
  }
}
</style>
