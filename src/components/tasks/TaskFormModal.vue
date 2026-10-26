<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CalendarDays, Clock3, Flag } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import { plansApi, tasksApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'
import { todayISO } from '@/utils/date.js'
import { validateTaskForm } from '@/utils/validation.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  task: { type: Object, default: null },
  defaultPlanId: { type: [Number, String], default: null },
  defaultDate: { type: String, default: '' },
  plans: { type: Array, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const ui = useUiStore()
const planOptionsRaw = ref([])
const loadingPlans = ref(false)
const submitting = ref(false)
const errors = reactive({})
const submitted = ref(false)
const loadError = ref('')

const form = reactive({
  planId: '',
  title: '',
  description: '',
  taskDate: '',
  durationMinutes: 60,
  priority: 'medium',
  completionCriteria: '',
  isReview: false,
  actualMinutes: '',
})

const isEditing = computed(() => Boolean(props.task?.id))

const plans = computed(() => props.plans || planOptionsRaw.value)

const planOptions = computed(() =>
  plans.value
    .filter((plan) => plan.status !== 'archived' || String(plan.id) === String(form.planId))
    .map((plan) => ({
      value: plan.id,
      label: `${plan.subject} · ${plan.title}`,
    })),
)

const selectedPlan = computed(() =>
  plans.value.find((plan) => String(plan.id) === String(form.planId)),
)

const dateHint = computed(() => {
  if (!selectedPlan.value) return '选择学习计划后会限定任务日期范围'
  return `可安排在 ${selectedPlan.value.startDate} 至 ${selectedPlan.value.endDate}`
})

const loadPlans = async () => {
  if (props.plans) return
  loadingPlans.value = true
  loadError.value = ''
  try {
    const data = await plansApi.list({ status: 'all', sort: 'updated' })
    planOptionsRaw.value = data.items
  } catch (error) {
    loadError.value = error.message
    ui.error(error.message, '加载学习计划失败')
  } finally {
    loadingPlans.value = false
  }
}

const applyPlanDate = () => {
  const plan = selectedPlan.value
  if (!plan) return
  const fallback = props.task?.taskDate || props.defaultDate || todayISO()
  const today = todayISO()
  let next = fallback
  if (next < plan.startDate) next = plan.startDate < today ? today : plan.startDate
  if (next > plan.endDate) next = plan.endDate
  form.taskDate = next
}

const prepare = async () => {
  Object.keys(errors).forEach((key) => delete errors[key])
  submitted.value = false
  submitting.value = false

  if (isEditing.value) {
    const task = props.task
    Object.assign(form, {
      planId: task.planId,
      title: task.title,
      description: task.description || '',
      taskDate: task.taskDate,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
      completionCriteria: task.completionCriteria || '',
      isReview: Boolean(task.isReview),
      actualMinutes:
        task.actualMinutes === null || task.actualMinutes === undefined
          ? ''
          : String(task.actualMinutes),
    })
  } else {
    Object.assign(form, {
      planId: props.defaultPlanId || '',
      title: '',
      description: '',
      taskDate: props.defaultDate || todayISO(),
      durationMinutes: 60,
      priority: 'medium',
      completionCriteria: '',
      isReview: false,
      actualMinutes: '',
    })
  }

  await loadPlans()

  if (!form.planId) {
    const preferred = plans.value.find((plan) => plan.status === 'active') || plans.value[0]
    if (preferred) form.planId = preferred.id
  }
  if (!isEditing.value) applyPlanDate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) prepare()
  },
)

watch(
  () => form.planId,
  () => {
    applyPlanDate()
  },
)

watch(
  form,
  () => {
    if (submitted.value) validate()
  },
  { deep: true },
)

const validate = () => {
  const next = validateTaskForm({
    ...form,
    actualMinutes: form.actualMinutes === '' ? null : form.actualMinutes,
  })
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(errors, next)
  return Object.keys(next).length === 0
}

const close = () => emit('update:modelValue', false)

const submit = async () => {
  submitted.value = true
  if (!validate() || submitting.value) return

  submitting.value = true
  try {
    const payload = {
      ...(isEditing.value ? {} : { planId: Number(form.planId) }),
      title: form.title.trim(),
      description: form.description.trim(),
      taskDate: form.taskDate,
      durationMinutes: Number(form.durationMinutes),
      priority: form.priority,
      completionCriteria: form.completionCriteria.trim(),
      isReview: form.isReview,
      ...(isEditing.value
        ? {
            actualMinutes:
              form.actualMinutes === '' ? null : Number(form.actualMinutes),
          }
        : {}),
    }

    const result = isEditing.value
      ? await tasksApi.update(props.task.id, payload)
      : await tasksApi.create(payload)

    ui.success(isEditing.value ? '任务已经更新' : '任务已经添加到计划里', '保存成功')
    emit('saved', result.task)
    close()
  } catch (error) {
    if (error.code === 'TASK_OUTSIDE_PLAN') {
      errors.taskDate = error.message
    } else if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
      error.details.forEach((detail) => {
        if (detail.field && detail.message) errors[detail.field] = detail.message
      })
    } else {
      ui.error(error.message, '保存任务失败')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="isEditing ? '编辑学习任务' : '添加学习任务'"

    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="loadingPlans" class="task-form__loading">
      <span class="skeleton" style="height: 46px; width: 100%" />
      <span class="skeleton" style="height: 46px; width: 100%" />
      <span class="skeleton" style="height: 100px; width: 100%" />
    </div>

    <AppEmptyState
      v-else-if="!plans.length && !loadError"
      compact
      title="还没有可以添加任务的学习计划"
      description="先创建学习计划。"
    >
      <AppButton to="/app/plans/new" size="sm" @click="close">创建学习计划</AppButton>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="loadError"
      compact
      variant="thinking"
      title="计划没有加载出来"
      description="请检查网络后重试。"
    >
      <AppButton size="sm" variant="secondary" @click="loadPlans">重新加载</AppButton>
    </AppEmptyState>

    <form v-else class="task-form" novalidate @submit.prevent="submit">
      <AppSelect
        v-model="form.planId"
        label="所属学习计划"
        :options="planOptions"
        placeholder="选择学习计划"
        :error="errors.planId"
        required
      />

      <AppInput
        v-model="form.title"
        label="任务名称"
        placeholder="例如：精听 Section 1 并整理场景词汇"
        maxlength="160"
        :error="errors.title"
        required
      />

      <div class="task-form__grid">
        <AppInput
          v-model="form.taskDate"
          label="任务日期"
          type="date"
          :min="selectedPlan?.startDate"
          :max="selectedPlan?.endDate"
          :hint="dateHint"
          :error="errors.taskDate"
          required
        >
          <template #prefix><CalendarDays :size="15" /></template>
        </AppInput>

        <AppInput
          v-model="form.durationMinutes"
          label="预计时长（分钟）"
          type="number"
          min="5"
          max="480"
          :error="errors.durationMinutes"
          required
        >
          <template #prefix><Clock3 :size="15" /></template>
        </AppInput>
      </div>

      <div class="task-form__grid">
        <AppSelect
          v-model="form.priority"
          label="优先级"
          :options="[
            { value: 'high', label: '高 · 今天优先完成' },
            { value: 'medium', label: '中 · 按计划推进' },
            { value: 'low', label: '低 · 有余力再做' },
          ]"
        >
          <template #prefix><Flag :size="15" /></template>
        </AppSelect>

        <AppInput
          v-if="isEditing"
          v-model="form.actualMinutes"
          label="实际用时（分钟，可选）"
          type="number"
          min="0"
          max="1440"
          hint="填写后会计入学习统计"
          :error="errors.actualMinutes"
        />
        <div v-else class="task-form__switch-wrap">
          <span class="task-form__switch-label">任务类型</span>
          <label class="check-row">
            <input v-model="form.isReview" type="checkbox" />
            <span>标记为复习任务</span>
          </label>
        </div>
      </div>

      <AppTextarea
        v-model="form.description"
        label="任务描述（可选）"
        placeholder="怎么做、用什么材料、注意什么…"
        :rows="3"
        :maxlength="1000"
        show-count
      />

      <AppTextarea
        v-model="form.completionCriteria"
        label="完成标准（可选）"
        placeholder="例如：能不看笔记复述 3 条要点"
        :rows="2"
        :maxlength="600"
        hint="用于判断任务是否完成。"
      />

      <label v-if="isEditing" class="check-row">
        <input v-model="form.isReview" type="checkbox" />
        <span>这是一个复习任务</span>
      </label>
    </form>

    <template #footer>
      <AppButton variant="ghost" @click="close">取消</AppButton>
      <AppButton
        :loading="submitting"
        :disabled="loadingPlans || !plans.length || Boolean(loadError)"
        @click="submit"
      >
        {{ submitting ? '正在保存…' : isEditing ? '保存修改' : '添加任务' }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.task-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-form__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.task-form__loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-form__switch-wrap {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.task-form__switch-label {
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
}

.check-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: var(--ink-soft);
  font-size: 13px;
  cursor: pointer;
}

.check-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--lav-600);
  cursor: pointer;
}

@media (max-width: 560px) {
  .task-form__grid {
    grid-template-columns: 1fr;
  }
}
</style>
