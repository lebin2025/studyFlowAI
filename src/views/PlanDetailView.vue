<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Pencil,
  Plus,
  Target,
  Trash2,
  TriangleAlert,
  WandSparkles,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import ProgressRing from '@/components/ui/ProgressRing.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import TaskItem from '@/components/tasks/TaskItem.vue'
import TaskFormModal from '@/components/tasks/TaskFormModal.vue'
import PlanFormModal from '@/components/plans/PlanFormModal.vue'
import AiAdjustDialog from '@/components/plans/AiAdjustDialog.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { plansApi, tasksApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'
import {
  formatDate,
  formatMinutes,
  formatWeekly,
  isOverdue,
  relativeDay,
  todayISO,
  weekdayLabel,
} from '@/utils/date.js'
import { LEVEL_LABELS, PRIORITY_LABELS, formatPercent } from '@/utils/format.js'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()

const loading = ref(true)
const error = ref('')
const errorCode = ref('')
const detail = ref(null)
const busyIds = ref(new Set())
const taskFilter = ref('all')

const taskModalOpen = ref(false)
const editingTask = ref(null)
const modalDate = ref('')

const planFormOpen = ref(false)
const adjustOpen = ref(false)
const deleteOpen = ref(false)
const deleteLoading = ref(false)
const taskToDelete = ref(null)
const taskDeleteLoading = ref(false)

const plan = computed(() => detail.value?.plan || null)
const stages = computed(() => detail.value?.stages || [])
const tasks = computed(() => detail.value?.tasks || [])

const today = todayISO()

const filterOptions = computed(() => [
  { value: 'all', label: '全部', count: tasks.value.length },
  {
    value: 'open',
    label: '待完成',
    count: tasks.value.filter((task) => !task.isCompleted).length,
  },
  {
    value: 'done',
    label: '已完成',
    count: tasks.value.filter((task) => task.isCompleted).length,
  },
])

const filteredTasks = computed(() => {
  if (taskFilter.value === 'open') return tasks.value.filter((task) => !task.isCompleted)
  if (taskFilter.value === 'done') return tasks.value.filter((task) => task.isCompleted)
  return tasks.value
})

const groups = computed(() => {
  const map = new Map()
  filteredTasks.value.forEach((task) => {
    if (!map.has(task.taskDate)) {
      map.set(task.taskDate, { date: task.taskDate, tasks: [], completed: 0, minutes: 0 })
    }
    const group = map.get(task.taskDate)
    group.tasks.push(task)
    if (task.isCompleted) group.completed += 1
    group.minutes += Number(task.durationMinutes) || 0
  })
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
})

const nextTask = computed(
  () => tasks.value.filter((task) => !task.isCompleted).sort((a, b) => (a.taskDate < b.taskDate ? -1 : 1))[0] || null,
)

const weeklyLabel = computed(() => formatWeekly(plan.value?.studyWeekdays || []))
const weeklyText = computed(() =>
  weeklyLabel.value === '每天' ? '每天' : `每周 ${weeklyLabel.value}`,
)

const relativeLabels = new Set(['今天', '明天', '昨天', '后天', '前天'])
const dayLabel = (date) => {
  const relative = relativeDay(date)
  return relativeLabels.has(relative) ? relative : formatDate(date, { weekday: false })
}
const daySubLabel = (date) => {
  const relative = relativeDay(date)
  return relativeLabels.has(relative) ? '' : weekdayLabel(date)
}

const stageRows = computed(() =>
  stages.value.map((stage) => {
    const stageTasks = tasks.value.filter(
      (task) =>
        task.stageId === stage.id ||
        (!task.stageId && task.taskDate >= stage.startDate && task.taskDate <= stage.endDate),
    )
    const completed = stageTasks.filter((task) => task.isCompleted).length
    return {
      ...stage,
      total: stageTasks.length,
      completed,
      progress: stageTasks.length ? Math.round((completed / stageTasks.length) * 100) : 0,
    }
  }),
)

const isOverduePlan = computed(
  () => plan.value?.status === 'active' && plan.value.endDate < today,
)

const load = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true
  error.value = ''
  errorCode.value = ''
  try {
    detail.value = await plansApi.get(route.params.id)
  } catch (loadError) {
    error.value = loadError.message || '加载学习计划失败'
    errorCode.value = loadError.code
  } finally {
    loading.value = false
  }
}

const updateTaskLocally = (task) => {
  const index = tasks.value.findIndex((item) => item.id === task.id)
  if (index >= 0) tasks.value[index] = task
}

const toggleTask = async (task, next) => {
  if (busyIds.value.has(task.id)) return
  const busy = new Set(busyIds.value)
  busy.add(task.id)
  busyIds.value = busy
  try {
    const result = await tasksApi.toggle(task.id, { isCompleted: next })
    updateTaskLocally(result.task)
    if (result.plan && detail.value) {
      detail.value.plan.status = result.plan.status
      detail.value.plan.taskCount = result.plan.taskCount
      detail.value.plan.completedTasks = result.plan.completedTasks
      detail.value.plan.progress = result.plan.progress
    }
    if (result.plan.status === 'completed') {
      ui.success('这份计划的所有任务都完成了', '计划完成')
    }
  } catch (toggleError) {
    ui.error(toggleError.message, '更新任务失败')
  } finally {
    const after = new Set(busyIds.value)
    after.delete(task.id)
    busyIds.value = after
  }
}

const openAdd = (date = '') => {
  editingTask.value = null
  modalDate.value = date || nextTask.value?.taskDate || (today < plan.value.startDate ? plan.value.startDate : today)
  taskModalOpen.value = true
}

const openEdit = (task) => {
  editingTask.value = task
  modalDate.value = task.taskDate
  taskModalOpen.value = true
}

const onTaskSaved = () => {
  load({ silent: true })
}

const onPlanSaved = (updated) => {
  detail.value = updated
}

const onAdjusted = (updated) => {
  detail.value = updated
}

const askDeleteTask = (task) => {
  taskToDelete.value = task
}

const confirmDeleteTask = async () => {
  if (!taskToDelete.value || taskDeleteLoading.value) return
  taskDeleteLoading.value = true
  try {
    await tasksApi.remove(taskToDelete.value.id)
    ui.success('任务已删除')
    taskToDelete.value = null
    await load({ silent: true })
  } catch (deleteError) {
    ui.error(deleteError.message, '删除任务失败')
  } finally {
    taskDeleteLoading.value = false
  }
}

const confirmDelete = async () => {
  if (deleteLoading.value) return
  deleteLoading.value = true
  try {
    await plansApi.remove(plan.value.id)
    ui.success('学习计划已删除')
    router.push({ name: 'plans' })
  } catch (deleteError) {
    ui.error(deleteError.message, '删除学习计划失败')
  } finally {
    deleteLoading.value = false
    deleteOpen.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<template>
  <div class="plan-detail">
    <div v-if="loading" class="plan-detail__loading" aria-busy="true">
      <SkeletonBlock height="34px" width="42%" />
      <SkeletonBlock height="16px" width="65%" />
      <SkeletonBlock height="190px" radius="var(--radius-lg)" />
      <div class="detail-grid">
        <SkeletonBlock height="420px" radius="var(--radius-lg)" />
        <SkeletonBlock height="300px" radius="var(--radius-lg)" />
      </div>
    </div>

    <div v-else-if="error" class="plan-detail__error card">
      <AppEmptyState
        :title="errorCode === 'NOT_FOUND' ? '这份计划不在了' : '计划没有加载出来'"
        :description="error"
        variant="thinking"
      >
        <AppButton to="/app/plans" variant="secondary">返回学习计划</AppButton>
        <AppButton v-if="errorCode !== 'NOT_FOUND'" @click="load()">重新加载</AppButton>
      </AppEmptyState>
    </div>

    <template v-else-if="plan">
      <PageHeader
        eyebrow=""
        :title="plan.title"
        :description="plan.goal"
        back-to="/app/plans"
        back-label="返回"
      >
        <template #meta>
          <StatusPill :value="plan.status" />
          <span v-if="isOverduePlan" class="detail-overdue">
            <TriangleAlert :size="11" />
            已超过结束日期
          </span>
          <span class="detail-meta">
            <CalendarDays :size="12" />
            {{ formatDate(plan.startDate, { weekday: false }) }} — {{ formatDate(plan.endDate, { weekday: false }) }}
          </span>
          <span class="detail-meta">
            <Clock3 :size="12" />
            每天 {{ formatMinutes(plan.dailyMinutes) }}
          </span>
          <span class="detail-meta">{{ LEVEL_LABELS[plan.level] }}</span>
          <span class="detail-meta">{{ weeklyText === '每天' ? '每天可学' : weeklyText }}</span>
        </template>

        <template #actions>
          <AppButton variant="ai" @click="adjustOpen = true">
            <template #icon><WandSparkles :size="15" /></template>
            AI 调整
          </AppButton>
          <AppButton variant="secondary" @click="planFormOpen = true">
            <template #icon><Pencil :size="15" /></template>
            编辑
          </AppButton>
          <AppButton variant="danger" @click="deleteOpen = true">
            <template #icon><Trash2 :size="15" /></template>
            删除
          </AppButton>
        </template>
      </PageHeader>

      <section class="detail-hero">
        <div class="detail-hero__ring">
          <ProgressRing
            :value="plan.progress"
            :size="116"
            :stroke="10"
            :color="plan.status === 'completed' ? 'var(--mint-600)' : 'var(--lav-600)'"
            label="完成度"
          />
        </div>

        <div class="detail-hero__main">
          <p class="detail-hero__eyebrow">总体进度</p>
          <h2>
            {{ plan.completedTasks }} <small>/ {{ plan.taskCount }}</small> 个任务已完成
          </h2>
          <div class="detail-hero__meta">
            <span>已完成 {{ formatMinutes(plan.completedMinutes) }}</span>
            <span>计划总时长 {{ formatMinutes(plan.totalMinutes) }}</span>
            <span>{{ stages.length }} 个阶段</span>
          </div>
          <ProgressBar
            :value="plan.progress"
            :color="plan.status === 'completed' ? 'var(--mint-600)' : 'var(--lav-600)'"
            :height="7"
            label="计划完成进度"
          />
        </div>

        <div class="next-card">
          <p class="next-card__eyebrow">下一步</p>
          <template v-if="nextTask">
            <strong>{{ nextTask.title }}</strong>
            <span class="next-card__meta">
              {{ relativeDay(nextTask.taskDate) }} · {{ formatMinutes(nextTask.durationMinutes) }} ·
              {{ PRIORITY_LABELS[nextTask.priority] }}
            </span>
            <AppButton
              size="sm"
              variant="soft"
              :loading="busyIds.has(nextTask.id)"
              @click="toggleTask(nextTask, true)"
            >
              <template #icon><CheckCircle2 :size="14" /></template>
              标记完成
            </AppButton>
          </template>
          <div v-else class="next-card__done">
            <CheckCircle2 :size="20" />
            <div>
              <strong>所有任务都完成了</strong>
              <span>可以回顾一下，然后规划下一个目标。</span>
            </div>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <section class="panel tasks-panel">
          <header class="panel__head">
            <div>

              <h2 class="panel__title">任务清单</h2>
            </div>
            <div class="panel__head-actions">
              <SegmentedControl
                v-model="taskFilter"
                :options="filterOptions"
                size="sm"
                label="筛选任务"
              />
              <AppButton size="sm" @click="openAdd()">
                <template #icon><Plus :size="14" /></template>
                添加任务
              </AppButton>
            </div>
          </header>

          <div v-if="!tasks.length" class="panel__body">
            <AppEmptyState
              compact
              title="这份计划还没有任务"
              description="添加任务后开始记录进度。"
            >
              <AppButton size="sm" @click="openAdd()">添加任务</AppButton>
            </AppEmptyState>
          </div>

          <div v-else-if="!filteredTasks.length" class="panel__body">
            <AppEmptyState
              compact
              variant="thinking"
              :title="taskFilter === 'open' ? '没有待完成的任务' : '还没有已完成的任务'"
              :description="
                taskFilter === 'open'
                  ? '这份计划的任务都完成了，可以给自己一点休息时间。'
                  : '完成一个任务后，它会出现在这里。'
              "
            />
          </div>

          <div v-else class="task-groups">
            <div v-for="group in groups" :key="group.date" class="task-group">
              <header class="task-group__head">
                <div class="task-group__date">
                  <span class="task-group__day">{{ dayLabel(group.date) }}</span>
                  <span v-if="daySubLabel(group.date)" class="task-group__full">
                    {{ daySubLabel(group.date) }}
                  </span>
                  <span v-else class="task-group__full">
                    {{ formatDate(group.date, { weekday: false }) }}
                  </span>
                  <span v-if="isOverdue(group.date) && group.completed < group.tasks.length" class="task-group__overdue">
                    已逾期
                  </span>
                </div>
                <div class="task-group__meta">
                  <span>{{ group.completed }} / {{ group.tasks.length }}</span>
                  <span>{{ formatMinutes(group.minutes) }}</span>
                </div>
              </header>
              <div class="task-group__list">
                <TaskItem
                  v-for="task in group.tasks"
                  :key="task.id"
                  :task="task"
                  :busy="busyIds.has(task.id)"
                  detailed
                  @toggle="(next) => toggleTask(task, next)"
                  @edit="openEdit"
                  @delete="askDeleteTask"
                />
              </div>
            </div>
          </div>
        </section>

        <aside class="detail-aside">
          <section class="panel">
            <header class="panel__head panel__head--tight">
              <div>

                <h2 class="panel__title panel__title--sm">学习阶段</h2>
              </div>
              <Target :size="17" class="panel__head-icon" />
            </header>
            <div class="stage-list">
              <div v-for="(stage, index) in stageRows" :key="stage.id" class="stage-row">
                <span class="stage-row__index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div class="stage-row__body">
                  <div class="stage-row__head">
                    <strong>{{ stage.title }}</strong>
                    <span>{{ formatPercent(stage.progress) }}</span>
                  </div>
                  <p v-if="stage.objective" class="stage-row__objective">{{ stage.objective }}</p>
                  <span class="stage-row__dates">
                    {{ formatDate(stage.startDate, { weekday: false }) }} — {{ formatDate(stage.endDate, { weekday: false }) }}
                  </span>
                  <ProgressBar :value="stage.progress" :height="4" :label="`${stage.title} 阶段进度`" />
                  <span class="stage-row__count">
                    {{ stage.completed }} / {{ stage.total }} 个任务
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="plan.overview" class="panel">
            <header class="panel__head panel__head--tight">
              <div>

                <h2 class="panel__title panel__title--sm">计划思路</h2>
              </div>
            </header>
            <div class="panel__body">
              <p class="overview-text">{{ plan.overview }}</p>
            </div>
          </section>

          <section v-if="plan.risks?.length" class="panel">
            <header class="panel__head panel__head--tight">
              <div>

                <h2 class="panel__title panel__title--sm">风险提示</h2>
              </div>
            </header>
            <div class="panel__body risk-list">
              <div v-for="(risk, index) in plan.risks" :key="index" class="risk-item">
                <TriangleAlert :size="14" />
                <div>
                  <strong>{{ risk.title }}</strong>
                  <p v-if="risk.detail">{{ risk.detail }}</p>
                </div>
              </div>
            </div>
          </section>

          <section v-if="plan.advice" class="panel advice-panel">
            <div class="advice-panel__body">
              <span class="advice-panel__icon"><Lightbulb :size="16" /></span>
              <div>
                <p class="advice-panel__label">AI 的调整建议</p>
                <p class="advice-panel__text">{{ plan.advice }}</p>
              </div>
            </div>
          </section>

          <section class="panel meta-panel">
            <div class="panel__body">
              <div class="meta-row">
                <span>创建时间</span>
                <strong>{{ formatDate(plan.createdAt.slice(0, 10), { weekday: false, year: true }) }}</strong>
              </div>
              <div class="meta-row">
                <span>最近更新</span>
                <strong>{{ formatDate(plan.updatedAt.slice(0, 10), { weekday: false, year: true }) }}</strong>
              </div>
              <div class="meta-row">
                <span>计划来源</span>
                <strong>{{ plan.source === 'ai' ? 'AI 生成' : '手动创建' }}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <TaskFormModal
      v-model="taskModalOpen"
      :task="editingTask"
      :default-plan-id="plan?.id"
      :default-date="modalDate"
      @saved="onTaskSaved"
    />

    <PlanFormModal
      v-if="plan"
      v-model="planFormOpen"
      :plan="plan"
      @saved="onPlanSaved"
    />

    <AiAdjustDialog
      v-if="plan"
      v-model="adjustOpen"
      :plan="plan"
      @applied="onAdjusted"
    />

    <ConfirmDialog
      :model-value="deleteOpen"
      title="删除这份学习计划？"
      :message="plan ? `「${plan.title}」下的 ${plan.taskCount} 个任务也会一起删除，且无法恢复。` : ''"
      confirm-label="删除计划"
      :loading="deleteLoading"
      @update:model-value="deleteOpen = $event"
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      :model-value="Boolean(taskToDelete)"
      title="删除这个任务？"
      :message="taskToDelete ? `「${taskToDelete.title}」会被永久删除，完成记录也会一起消失。` : ''"
      confirm-label="删除任务"
      :loading="taskDeleteLoading"
      @update:model-value="(value) => !value && (taskToDelete = null)"
      @confirm="confirmDeleteTask"
    />
  </div>
</template>

<style scoped>
.plan-detail {
  display: flex;
  flex-direction: column;
}

.plan-detail__loading {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.detail-overdue {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 10px;
  font-weight: 600;
}

.detail-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.detail-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(240px, 0.55fr);
  align-items: center;
  gap: 22px;
  margin-bottom: 18px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.detail-hero__ring {
  flex: none;
}

.detail-hero__eyebrow {
  color: var(--ink-faint);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.detail-hero__main h2 {
  margin-top: 4px;
  font-size: 21px;
  font-weight: 660;
  letter-spacing: -0.03em;
}

.detail-hero__main h2 small {
  color: var(--ink-faint);
  font-size: 14px;
  font-weight: 500;
}

.detail-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  margin: 7px 0 10px;
  color: var(--ink-muted);
  font-size: 10px;
}

.next-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface-soft);
}

.next-card__eyebrow {
  color: var(--ink-faint);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.next-card > strong {
  display: block;
  margin-top: 4px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 620;
  line-height: 1.45;
}

.next-card__meta {
  display: block;
  margin-top: 3px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.next-card .btn {
  margin-top: 9px;
}

.next-card__done {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 7px;
  color: var(--mint-700);
}

.next-card__done strong {
  display: block;
  font-size: 11px;
  font-weight: 620;
}

.next-card__done span {
  color: var(--ink-muted);
  font-size: 9px;
}

.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 10px;
}

.panel__head--tight {
  padding-bottom: 8px;
}

.panel__head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.panel__eyebrow {
  color: var(--ink-faint);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.panel__title {
  margin-top: 4px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.panel__title--sm {
  font-size: 14.5px;
}

.panel__head-icon {
  color: var(--ink-faint);
}

.panel__body {
  padding: 4px 18px 16px;
}

.tasks-panel .panel__head {
  flex-wrap: wrap;
}

.task-groups {
  display: flex;
  flex-direction: column;
}

.task-group + .task-group {
  border-top: 1px solid var(--line);
}

.task-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 18px;
  background: var(--surface-soft);
}

.task-group__date {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.task-group__day {
  font-size: 11.5px;
  font-weight: 620;
}

.task-group__full {
  color: var(--ink-faint);
  font-size: 9px;
}

.task-group__overdue {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 8.5px;
  font-weight: 600;
}

.task-group__meta {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--ink-faint);
  font-size: 9px;
  white-space: nowrap;
}

.task-group__list {
  padding: 4px 10px 8px;
}

.detail-aside {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stage-list {
  display: flex;
  flex-direction: column;
  padding: 2px 16px 14px;
}

.stage-row {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line);
}

.stage-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.stage-row__index {
  display: grid;
  place-items: center;
  flex: none;
  width: 25px;
  height: 25px;
  border-radius: 7px;
  background: var(--lav-50);
  color: var(--lav-700);
  font-size: 9px;
  font-weight: 650;
}

.stage-row__body {
  flex: 1;
  min-width: 0;
}

.stage-row__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stage-row__head strong {
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
}

.stage-row__head span {
  flex: none;
  color: var(--ink-faint);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.stage-row__objective {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.stage-row__dates {
  display: block;
  margin: 3px 0 5px;
  color: var(--ink-faint);
  font-size: 8.5px;
}

.stage-row__count {
  display: block;
  margin-top: 4px;
  color: var(--ink-faint);
  font-size: 8.5px;
  text-align: right;
}

.overview-text {
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.75;
  white-space: pre-line;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.risk-item {
  display: flex;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: var(--warning-100);
  color: var(--warning-700);
}

.risk-item strong {
  display: block;
  font-size: 10.5px;
  font-weight: 620;
}

.risk-item p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 9.5px;
  line-height: 1.55;
}

.advice-panel {
  background: var(--lav-50);
  border-color: rgba(130, 114, 239, 0.12);
}

.advice-panel__body {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
}

.advice-panel__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--lav-700);
}

.advice-panel__label {
  color: var(--lav-700);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.advice-panel__text {
  margin-top: 3px;
  color: var(--ink-soft);
  font-size: 10px;
  line-height: 1.65;
}

.meta-panel .panel__body {
  padding-top: 10px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
  font-size: 9.5px;
}

.meta-row span {
  color: var(--ink-faint);
}

.meta-row strong {
  color: var(--ink-soft);
  font-weight: 550;
}

@media (max-width: 1100px) {
  .detail-hero {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .next-card {
    grid-column: span 2;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-aside {
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 700px) {
  .detail-hero {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 18px;
  }

  .detail-hero__ring {
    justify-self: center;
  }

  .detail-hero__main {
    text-align: center;
  }

  .detail-hero__meta {
    justify-content: center;
  }

  .next-card {
    grid-column: auto;
  }

  .detail-aside {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    gap: 14px;
  }

  .panel__head {
    padding: 14px 14px 8px;
  }

  .panel__head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .task-group__head {
    padding-inline: 14px;
  }

  .task-group__list {
    padding-inline: 4px;
  }

  .stage-list {
    padding-inline: 14px;
  }
}
</style>
<style scoped>
.plan-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.42fr);
  gap: 24px;
  padding: 20px;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.detail-hero__ring {
  display: none;
}

.detail-hero__eyebrow,
.next-card__eyebrow {
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 500;
}

.detail-hero__main h2 {
  max-width: 18ch;
  margin-top: 5px;
  font-size: clamp(28px, 3.4vw, 40px);
  font-weight: 650;
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.detail-hero__main h2 small {
  color: var(--ink-faint);
  font-size: 0.6em;
  font-weight: 500;
}

.detail-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  margin-top: 8px;
  color: var(--ink-faint);
  font-size: 11px;
}

.next-card {
  padding: 14px;
  border: 0;
  border-radius: 14px;
  background: var(--surface-soft);
}

.next-card strong {
  display: block;
  margin-top: 5px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.next-card__meta,
.next-card__done {
  display: block;
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1.5;
}

.next-card :deep(.btn) {
  margin-top: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.55fr);
  gap: 18px;
  align-items: start;
}

.panel {
  min-width: 0;
  padding: 18px;
  border: 0;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.panel__eyebrow {
  color: var(--ink-muted);
  font-size: 11px;
}

.panel__title {
  margin-top: 3px;
  font-size: 17px;
  font-weight: 620;
  letter-spacing: -0.025em;
}

.panel__head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.panel__body {
  padding: 8px 0;
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-group {
  display: block;
  padding-top: 4px;
}

.task-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 4px;
}

.task-group__date {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.task-group__day {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.task-group__full {
  color: var(--ink-muted);
  font-size: 11px;
}

.task-group__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 10px;
  color: var(--ink-faint);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}

.task-group__list {
  padding: 0;
}

.task-group__overdue {
  color: var(--accent);
  font-size: 10px;
}

.detail-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-item {
  padding: 0;
}

.stage-item__index {
  color: var(--accent);
  font-size: 10px;
  font-weight: 650;
}

.stage-item__title {
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 600;
}

.stage-item__meta {
  margin-top: 2px;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.detail-overdue {
  color: var(--accent);
  font-size: 11px;
}

.detail-meta {
  color: var(--ink-muted);
  font-size: 11px;
}

.plan-detail__error {
  padding: 18px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 980px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

@media (max-width: 700px) {
  .detail-hero {
    grid-template-columns: 1fr;
    padding: 16px;
    border-radius: 18px;
  }

  .detail-hero__main h2 {
    font-size: 30px;
  }

  .detail-aside {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 16px;
    border-radius: 18px;
  }

  .task-group__head {
    display: block;
  }

  .task-group__meta {
    justify-content: flex-start;
    margin-top: 3px;
  }
}
</style>