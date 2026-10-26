<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Plus,
  Search,
  Sparkles,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import TaskItem from '@/components/tasks/TaskItem.vue'
import TaskFormModal from '@/components/tasks/TaskFormModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { plansApi, tasksApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'
import {
  addDaysISO,
  endOfWeek,
  formatDate,
  formatMinutes,
  isOverdue,
  relativeDay,
  startOfWeek,
  todayISO,
  weekdayLabel,
} from '@/utils/date.js'

const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const tasks = ref([])
const total = ref(0)
const hasMore = ref(false)
const plans = ref([])
const busyIds = ref(new Set())
const loadingMore = ref(false)

const filters = reactive({
  status: 'open',
  priority: '',
  planId: '',
  datePreset: 'all',
  from: '',
  to: '',
  search: '',
})

const taskModalOpen = ref(false)
const editingTask = ref(null)
const deletingTask = ref(null)
const deleteLoading = ref(false)

const today = todayISO()

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待完成' },
  { value: 'done', label: '已完成' },
]

const priorityOptions = [
  { value: '', label: '全部优先级' },
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
]

const dateOptions = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'upcoming', label: '接下来 7 天' },
  { value: 'overdue', label: '已逾期' },
  { value: 'custom', label: '自定义日期' },
]

const planOptions = computed(() => [
  { value: '', label: '全部计划' },
  ...plans.value.map((plan) => ({
    value: plan.id,
    label: plan.title,
  })),
])

const hasFilters = computed(
  () =>
    filters.status !== 'open' ||
    Boolean(filters.priority) ||
    Boolean(filters.planId) ||
    filters.datePreset !== 'all' ||
    Boolean(filters.search),
)

let debounceTimer = null
let requestSeq = 0

const dateParams = () => {
  if (filters.datePreset === 'today') return { from: today, to: today }
  if (filters.datePreset === 'week') return { from: startOfWeek(today), to: endOfWeek(today) }
  if (filters.datePreset === 'upcoming') return { from: today, to: addDaysISO(today, 7) }
  if (filters.datePreset === 'overdue') return { to: addDaysISO(today, -1) }
  if (filters.datePreset === 'custom') {
    return {
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }
  }
  return {}
}

const effectiveStatus = computed(() =>
  filters.datePreset === 'overdue' ? 'open' : filters.status,
)

const buildParams = (offset = 0) => ({
  status: effectiveStatus.value,
  priority: filters.priority || undefined,
  planId: filters.planId || undefined,
  search: filters.search || undefined,
  limit: 200,
  offset,
  ...dateParams(),
})

const load = async ({ append = false, silent = false } = {}) => {
  const seq = ++requestSeq
  if (!silent) {
    if (append) loadingMore.value = true
    else loading.value = true
  }
  error.value = ''
  try {
    const data = await tasksApi.list(buildParams(append ? tasks.value.length : 0))
    if (seq !== requestSeq) return
    tasks.value = append ? [...tasks.value, ...data.items] : data.items
    total.value = data.total
    hasMore.value = data.hasMore
  } catch (loadError) {
    if (seq !== requestSeq) return
    error.value = loadError.message || '加载任务失败'
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const loadPlans = async () => {
  try {
    const data = await plansApi.list({ status: 'all', sort: 'updated' })
    plans.value = data.items
  } catch {
    /* the filter still works without plans */
  }
}

const scheduleLoad = () => {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => load(), 300)
}

const groups = computed(() => {
  const map = new Map()
  tasks.value.forEach((task) => {
    const date = task.taskDate
    if (!map.has(date)) {
      map.set(date, { date, tasks: [], completed: 0, minutes: 0 })
    }
    const group = map.get(date)
    group.tasks.push(task)
    if (task.isCompleted) group.completed += 1
    group.minutes += Number(task.durationMinutes) || 0
  })
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
})

const relativeLabels = new Set(['今天', '明天', '昨天', '后天', '前天'])
const dayLabel = (date) => {
  const relative = relativeDay(date)
  return relativeLabels.has(relative) ? relative : formatDate(date, { weekday: false })
}
const daySubLabel = (date) => {
  const relative = relativeDay(date)
  return relativeLabels.has(relative) ? '' : weekdayLabel(date)
}

const toggleTask = async (task, next) => {
  if (busyIds.value.has(task.id)) return
  const nextBusy = new Set(busyIds.value)
  nextBusy.add(task.id)
  busyIds.value = nextBusy

  try {
    const result = await tasksApi.toggle(task.id, { isCompleted: next })
    const removesFromView =
      (filters.status === 'open' && next) ||
      (filters.status === 'done' && !next) ||
      (filters.datePreset === 'overdue' && next)

    if (removesFromView) {
      tasks.value = tasks.value.filter((item) => item.id !== task.id)
      total.value = Math.max(0, total.value - 1)
    } else {
      const index = tasks.value.findIndex((item) => item.id === task.id)
      if (index >= 0) tasks.value[index] = result.task
    }
    ui.success(next ? '已完成' : '已恢复', '任务状态已更新')
  } catch (toggleError) {
    ui.error(toggleError.message, '更新任务失败')
  } finally {
    const afterBusy = new Set(busyIds.value)
    afterBusy.delete(task.id)
    busyIds.value = afterBusy
  }
}

const openCreate = () => {
  editingTask.value = null
  taskModalOpen.value = true
}

const openEdit = (task) => {
  editingTask.value = task
  taskModalOpen.value = true
}

const onSaved = () => {
  load({ silent: true })
}

const askDelete = (task) => {
  deletingTask.value = task
}

const confirmDelete = async () => {
  if (!deletingTask.value || deleteLoading.value) return
  deleteLoading.value = true
  try {
    await tasksApi.remove(deletingTask.value.id)
    ui.success('任务已删除')
    deletingTask.value = null
    await load({ silent: true })
  } catch (deleteError) {
    ui.error(deleteError.message, '删除任务失败')
  } finally {
    deleteLoading.value = false
  }
}

const clearFilters = () => {
  filters.status = 'open'
  filters.priority = ''
  filters.planId = ''
  filters.datePreset = 'all'
  filters.from = ''
  filters.to = ''
  filters.search = ''
}

watch(
  () => [filters.status, filters.priority, filters.planId, filters.datePreset, filters.from, filters.to],
  () => load(),
)

watch(
  () => filters.datePreset,
  (preset) => {
    if (preset === 'overdue') filters.status = 'open'
  },
)

watch(
  () => filters.search,
  () => scheduleLoad(),
)

onMounted(() => {
  loadPlans()
  load()
  if (route.query.create === '1') {
    openCreate()
    const query = { ...route.query }
    delete query.create
    router.replace({ query })
  }
})


watch(
  () => route.query.create,
  (value) => {
    if (value !== '1') return
    openCreate()
    const query = { ...route.query }
    delete query.create
    router.replace({ query })
  },
)
onBeforeUnmount(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <div class="tasks-page">
    <PageHeader
      eyebrow=""
      title="学习任务"
      description="按日期、优先级和计划查看。"
    >
      <template #actions>
        <AppButton variant="ai" to="/app/plans/new">
          <template #icon><Sparkles :size="15" /></template>
          用 AI 规划
        </AppButton>
        <AppButton @click="openCreate">
          <template #icon><Plus :size="16" /></template>
          添加任务
        </AppButton>
      </template>
    </PageHeader>

    <div class="tasks-toolbar">
      <AppInput
        v-model="filters.search"
        placeholder="搜索任务名称或描述"
        class="tasks-toolbar__search"
        aria-label="搜索学习任务"
        maxlength="80"
      >
        <template #prefix><Search :size="16" /></template>
      </AppInput>

      <div class="tasks-toolbar__row">
        <SegmentedControl v-model="filters.status" :options="statusOptions" label="按完成状态筛选" />
        <AppSelect
          v-model="filters.priority"
          :options="priorityOptions"
          class="tasks-toolbar__select"
          aria-label="按优先级筛选"
        />
        <AppSelect
          v-model="filters.planId"
          :options="planOptions"
          class="tasks-toolbar__select tasks-toolbar__select--wide"
          aria-label="按学习计划筛选"
        />
        <AppSelect
          v-model="filters.datePreset"
          :options="dateOptions"
          class="tasks-toolbar__select"
          aria-label="按日期筛选"
        >
          <template #prefix><CalendarDays :size="14" /></template>
        </AppSelect>
      </div>

      <div v-if="filters.datePreset === 'custom'" class="tasks-toolbar__custom">
        <AppInput v-model="filters.from" type="date" aria-label="开始日期" />
        <span class="tasks-toolbar__dash">—</span>
        <AppInput v-model="filters.to" type="date" aria-label="结束日期" />
      </div>
    </div>

    <div class="tasks-count">
      <span v-if="!loading">共 {{ total }} 个任务</span>
      <span v-else>正在整理任务…</span>
      <button v-if="hasFilters" type="button" class="tasks-count__clear" @click="clearFilters">
        重置筛选
      </button>
    </div>

    <div v-if="loading" class="tasks-loading" aria-busy="true">
      <SkeletonBlock height="54px" radius="var(--radius-md)" />
      <SkeletonBlock height="54px" radius="var(--radius-md)" />
      <SkeletonBlock height="54px" radius="var(--radius-md)" />
      <SkeletonBlock height="54px" radius="var(--radius-md)" />
    </div>

    <div v-else-if="error" class="tasks-error card">
      <span class="tasks-error__icon"><AlertCircle :size="20" /></span>
      <div>
        <h2>任务没有加载出来</h2>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load()">重新加载</AppButton>
    </div>

    <div v-else-if="!tasks.length" class="tasks-empty card">
      <AppEmptyState
        :title="hasFilters ? '没有匹配的任务' : '暂无任务'"
        :description="
          hasFilters
            ? '换一个筛选条件。'
            : plans.length
              ? ''
              : '先创建学习计划。'
        "
      >
        <AppButton v-if="hasFilters" variant="secondary" @click="clearFilters">重置筛选</AppButton>
        <AppButton v-else-if="plans.length" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          添加任务
        </AppButton>
        <AppButton v-else to="/app/plans/new">创建计划</AppButton>
      </AppEmptyState>
    </div>

    <div v-else class="task-groups">
      <section v-for="group in groups" :key="group.date" class="task-group">
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
            <span>{{ group.completed }} / {{ group.tasks.length }} 已完成</span>
            <span class="task-group__minutes">{{ formatMinutes(group.minutes) }}</span>
          </div>
        </header>

        <div class="task-group__list">
          <TaskItem
            v-for="task in group.tasks"
            :key="task.id"
            :task="task"
            :busy="busyIds.has(task.id)"
            show-plan
            @toggle="(next) => toggleTask(task, next)"
            @edit="openEdit"
            @delete="askDelete"
          />
        </div>
      </section>
    </div>

    <div v-if="hasMore && !loading" class="tasks-more">
      <AppButton variant="secondary" :loading="loadingMore" @click="load({ append: true })">
        <template #icon><ChevronDown :size="15" /></template>
        加载更多任务
      </AppButton>
    </div>

    <TaskFormModal
      v-model="taskModalOpen"
      :task="editingTask"
      :default-date="today"
      @saved="onSaved"
    />

    <ConfirmDialog
      :model-value="Boolean(deletingTask)"
      title="删除这个任务？"
      :message="deletingTask ? `「${deletingTask.title}」会被永久删除，完成记录也会一起消失。` : ''"
      confirm-label="删除任务"
      :loading="deleteLoading"
      @update:model-value="(value) => !value && (deletingTask = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tasks-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.tasks-toolbar__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tasks-toolbar__search {
  flex: 1;
  min-width: 220px;
}

.tasks-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tasks-toolbar__select {
  min-width: 132px;
}

.tasks-toolbar__select--wide {
  min-width: 170px;
}

.tasks-toolbar__custom {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tasks-toolbar__dash {
  color: var(--ink-faint);
  font-size: 12px;
}

.tasks-count {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
  color: var(--ink-muted);
  font-size: 12px;
}

.tasks-count__clear {
  color: var(--accent);
  font-size: 12px;
  font-weight: 550;
}

.tasks-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tasks-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.tasks-error__icon {
  color: var(--accent);
}

.tasks-error h2 {
  font-size: 13px;
  font-weight: 600;
}

.tasks-error p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 12px;
}

.tasks-empty {
  padding: 0 18px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-group {
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.task-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 8px;
}

.task-group__date {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.task-group__day {
  color: var(--ink);
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.task-group__full {
  color: var(--ink-muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.task-group__overdue {
  color: var(--accent);
  font-size: 10.5px;
  font-weight: 600;
}

.task-group__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 12px;
  color: var(--ink-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.task-group__list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tasks-more {
  display: flex;
  justify-content: center;
  padding: 4px 0 12px;
}

@media (max-width: 760px) {
  .tasks-toolbar__row {
    display: grid;
    grid-template-columns: 1fr;
  }

  .tasks-toolbar__search {
    width: 100%;
    min-width: 0;
  }

  .tasks-toolbar__filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .tasks-toolbar__select,
  .tasks-toolbar__select--wide {
    min-width: 0;
  }

  .task-group {
    padding: 13px 14px;
    border-radius: 16px;
  }

  .task-group__head {
    display: block;
  }

  .task-group__meta {
    justify-content: flex-start;
    margin-top: 4px;
  }
}
</style>
<style scoped>
@media (max-width: 760px) {
  .tasks-toolbar__row {
    grid-template-columns: 1fr 1fr;
  }

  .tasks-toolbar__row > :first-child {
    grid-column: 1 / -1;
  }

  .tasks-toolbar__select,
  .tasks-toolbar__select--wide {
    min-width: 0;
  }
}
</style>
