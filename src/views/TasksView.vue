<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Plus,
  Search,
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
    ui.success(next ? '完成一小步' : '已取消完成', next ? '做得好' : '没关系')
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
})

onBeforeUnmount(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <div class="tasks-page">
    <PageHeader
      eyebrow="学习任务"
      title="把今天的小步走完"
      description="按日期、优先级和计划查看所有任务。完成状态会实时同步到计划进度和统计。"
    >
      <template #actions>
        <AppButton variant="secondary" to="/app/plans/new">
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
      <span v-if="!loading">
        共 {{ total }} 个任务
        <template v-if="filters.status === 'open'">待完成</template>
        <template v-else-if="filters.status === 'done'">已完成</template>
      </span>
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
        :title="hasFilters ? '没有匹配的任务' : '还没有任务'"
        :description="
          hasFilters
            ? '换一个筛选条件，或者重置后看看全部任务。'
            : plans.length
              ? '添加一个今天能完成的小任务，进度会从这里开始累计。'
              : '任务需要归属于一份学习计划。先让 AI 生成一份计划吧。'
        "
        :variant="hasFilters ? 'thinking' : 'happy'"
      >
        <AppButton v-if="hasFilters" variant="secondary" @click="clearFilters">重置筛选</AppButton>
        <AppButton v-else-if="plans.length" @click="openCreate">
          <template #icon><Plus :size="14" /></template>
          添加第一个任务
        </AppButton>
        <AppButton v-else to="/app/plans/new">生成学习计划</AppButton>
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
            detailed
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
}

.tasks-toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.tasks-toolbar__search {
  width: min(100%, 360px);
  align-self: flex-start;
}

.tasks-toolbar__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.tasks-toolbar__select {
  width: 136px;
}

.tasks-toolbar__select--wide {
  width: 180px;
}

.tasks-toolbar__custom {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 360px;
}

.tasks-toolbar__custom :deep(.field) {
  flex: 1;
}

.tasks-toolbar__dash {
  color: var(--ink-faint);
  font-size: 12px;
}

.tasks-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--ink-faint);
  font-size: 11px;
}

.tasks-count__clear {
  color: var(--lav-700);
  font-size: 11px;
  font-weight: 550;
}

.tasks-count__clear:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tasks-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-group {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.task-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-soft);
}

.task-group__date {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 7px;
}

.task-group__day {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.task-group__full {
  color: var(--ink-faint);
  font-size: 10px;
}

.task-group__overdue {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 9px;
  font-weight: 600;
}

.task-group__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--ink-faint);
  font-size: 9.5px;
  white-space: nowrap;
}

.task-group__minutes {
  color: var(--ink-muted);
}

.task-group__list {
  padding: 5px 10px 9px;
}

.tasks-empty {
  padding: 18px;
}

.tasks-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
}

.tasks-error__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 0;
  background: var(--danger-100);
  color: var(--danger-600);
}

.tasks-error h2 {
  font-size: 14px;
}

.tasks-error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.tasks-error .btn {
  margin-left: auto;
}

.tasks-more {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 860px) {
  .tasks-toolbar__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .tasks-toolbar__select,
  .tasks-toolbar__select--wide {
    width: 100%;
  }

  .tasks-toolbar__row :deep(.segmented) {
    grid-column: span 2;
    justify-self: start;
  }
}

@media (max-width: 560px) {
  .tasks-toolbar__search {
    width: 100%;
  }

  .tasks-toolbar__row {
    grid-template-columns: 1fr;
  }

  .tasks-toolbar__row :deep(.segmented) {
    grid-column: auto;
  }

  .task-group__head {
    flex-wrap: wrap;
    padding: 11px 13px;
  }

  .task-group__meta {
    gap: 8px;
  }

  .task-group__list {
    padding-inline: 4px;
  }

  .tasks-error {
    flex-wrap: wrap;
  }

  .tasks-error .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>
<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
}

.tasks-toolbar {
  padding: 14px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.tasks-toolbar__row {
  display: flex;
  align-items: flex-end;
  gap: 14px;
}

.tasks-toolbar__row + .tasks-toolbar__row {
  margin-top: 10px;
}

.tasks-toolbar__search {
  flex: 1;
  min-width: 220px;
}

.tasks-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tasks-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.task-groups {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 0;
}

.task-group {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.task-group + .task-group {
  border-top: 0;
}

.task-group__head {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 18px 14px 0;
  border-right: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
}

.task-group__day {
  font-family: var(--font-display);
  font-size: clamp(26px, 2.8vw, 38px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.task-group__date {
  margin-top: 5px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.task-group__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 22px;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.task-group__list {
  padding: 8px 0 8px 22px;
}

.tasks-empty {
  padding: 34px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
  background: transparent;
  border-radius: 0;
}

.tasks-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}

.tasks-error__icon {
  color: var(--accent);
}

.tasks-error h2 {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
}

.tasks-error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.tasks-more {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
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

  .task-group {
    grid-template-columns: 1fr;
  }

  .task-group__head {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    padding: 12px 0 9px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .task-group__meta {
    margin-top: 0;
    justify-content: flex-end;
    text-align: right;
  }

  .task-group__list {
    padding: 4px 0;
  }
}
</style>