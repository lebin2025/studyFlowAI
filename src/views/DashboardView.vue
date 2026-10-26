<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flame,
  PartyPopper,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import TaskItem from '@/components/tasks/TaskItem.vue'
import TaskFormModal from '@/components/tasks/TaskFormModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { plansApi, statsApi, tasksApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import {
  addDaysISO,
  formatDate,
  formatMinutes,
  greeting as getGreeting,
  todayISO,
  weekdayShort,
} from '@/utils/date.js'

const auth = useAuthStore()
const ui = useUiStore()

const loading = ref(true)
const error = ref('')
const stats = ref(null)
const todayTasks = ref([])
const upcoming = ref([])
const activePlans = ref([])
const busyTaskId = ref(null)

const taskModalOpen = ref(false)
const editingTask = ref(null)
const modalPlanId = ref(null)
const modalDate = ref('')

const deletingTask = ref(null)
const deleteLoading = ref(false)

const today = computed(() => stats.value?.today?.date || todayISO())
const greetingText = computed(() => `${getGreeting()}，${auth.displayName}`)
const openToday = computed(() => todayTasks.value.filter((task) => !task.isCompleted))
const doneToday = computed(() => todayTasks.value.filter((task) => task.isCompleted))
const todayProgress = computed(() =>
  todayTasks.value.length
    ? Math.round((doneToday.value.length / todayTasks.value.length) * 100)
    : 0,
)
const remainingMinutes = computed(() =>
  openToday.value.reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0),
)

const subtitle = computed(() => {
  if (loading.value) return '正在整理今天的学习安排…'
  if (!todayTasks.value.length) return '今天还没有安排。加一个 20 分钟的小任务，或者让 AI 帮你规划。'
  if (!openToday.value.length) return '今天的任务都完成了，给自己一点掌声。'
  return `今天还有 ${openToday.value.length} 个任务，先从最重要的一件开始。`
})

const statCards = computed(() => {
  const totals = stats.value?.totals || {}
  return [
    {
      key: 'today',
      label: '今日任务',
      value: stats.value ? `${doneToday.value.length} / ${todayTasks.value.length}` : '—',
      hint: '已完成',
      icon: CheckCircle2,
      tone: 'mint',
    },
    {
      key: 'time',
      label: '今日计划',
      value: stats.value ? formatMinutes(stats.value.today.plannedMinutes) : '—',
      hint: '预计投入',
      icon: Clock3,
      tone: 'lav',
    },
    {
      key: 'streak',
      label: '连续学习',
      value: stats.value ? `${stats.value.streak} 天` : '—',
      hint: stats.value ? `最长 ${stats.value.longestStreak} 天` : '从今天开始',
      icon: Flame,
      tone: 'peach',
    },
    {
      key: 'rate',
      label: '整体完成率',
      value: stats.value ? `${totals.completionRate ?? 0}%` : '—',
      hint: stats.value ? `${totals.openTasks ?? 0} 个待完成` : '真实任务统计',
      icon: TrendingUp,
      tone: 'sky',
    },
  ]
})

const activePlan = computed(() => activePlans.value[0] || null)

const weekTrend = computed(() => {
  const rows = stats.value?.trend || []
  return rows.slice(-7)
})

const weekMax = computed(() =>
  Math.max(1, ...weekTrend.value.map((row) => Number(row.completed) || 0)),
)

const upcomingGroups = computed(() => {
  const groups = new Map()
  upcoming.value.forEach((task) => {
    if (!groups.has(task.taskDate)) groups.set(task.taskDate, [])
    groups.get(task.taskDate).push(task)
  })
  return [...groups.entries()].slice(0, 3).map(([date, tasks]) => ({ date, tasks }))
})

const load = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true
  error.value = ''
  try {
    const [statsData, plansData] = await Promise.all([
      statsApi.overview(7),
      plansApi.list({ status: 'active', sort: 'updated' }),
    ])
    stats.value = statsData
    activePlans.value = plansData.items

    const date = statsData.today.date
    const [todayData, upcomingData] = await Promise.all([
      tasksApi.list({ date, limit: 100 }),
      tasksApi.list({
        status: 'open',
        from: addDaysISO(date, 1),
        to: addDaysISO(date, 7),
        limit: 8,
      }),
    ])
    todayTasks.value = todayData.items
    upcoming.value = upcomingData.items
  } catch (loadError) {
    error.value = loadError.message || '加载仪表盘失败'
  } finally {
    loading.value = false
  }
}

const toggleTask = async (task, next) => {
  if (busyTaskId.value) return
  busyTaskId.value = task.id
  try {
    const result = await tasksApi.toggle(task.id, { isCompleted: next })
    const index = todayTasks.value.findIndex((item) => item.id === task.id)
    if (index >= 0) todayTasks.value[index] = result.task

    if (result.plan) {
      const plan = activePlans.value.find((item) => item.id === result.plan.id)
      if (plan) {
        plan.taskCount = result.plan.taskCount
        plan.completedTasks = result.plan.completedTasks
        plan.progress = result.plan.progress
        plan.status = result.plan.status
      }
    }
    if (stats.value?.today) {
      stats.value = await statsApi.overview(7)
    }
  } catch (toggleError) {
    ui.error(toggleError.message, '更新任务失败')
  } finally {
    busyTaskId.value = null
  }
}

const openCreate = (planId = null) => {
  editingTask.value = null
  modalPlanId.value = planId || activePlan.value?.id || null
  modalDate.value = today.value
  taskModalOpen.value = true
}

const openEdit = (task) => {
  editingTask.value = task
  modalPlanId.value = task.planId
  modalDate.value = task.taskDate
  taskModalOpen.value = true
}

const onTaskSaved = () => {
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

onMounted(load)
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-head">
      <div class="dashboard-head__meta">
        <span class="mono-label">01 / TODAY</span>
        <span>{{ formatDate(today, { weekday: true }) }}</span>
      </div>
      <div class="dashboard-head__grid">
        <div>
          <h1>{{ greetingText }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="dashboard-head__actions">
          <AppButton @click="openCreate()">
            <template #icon><Plus :size="15" /></template>
            添加任务
          </AppButton>
          <AppButton to="/app/plans/new" variant="secondary">
            <template #icon><Sparkles :size="15" /></template>
            AI 新计划
          </AppButton>
        </div>
      </div>
    </header>

    <div v-if="loading" class="dashboard__loading" aria-busy="true" aria-label="正在加载仪表盘">
      <SkeletonBlock height="82px" radius="0" />
      <SkeletonBlock height="360px" radius="0" />
    </div>

    <div v-else-if="error" class="dashboard__error">
      <span class="dashboard__error-icon"><AlertCircle :size="18" /></span>
      <div>
        <h2>仪表盘没有加载出来</h2>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load()">重新加载</AppButton>
    </div>

    <template v-else>
      <div class="dashboard-metrics">
        <div v-for="card in statCards" :key="card.key">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <em>{{ card.hint }}</em>
        </div>
      </div>

      <section class="today-sheet">
        <header class="today-sheet__head">
          <div>
            <span class="mono-label">今日 / TODAY</span>
            <h2>{{ !todayTasks.length ? '今天还没有安排' : openToday.length ? '从最重要的一件开始' : '今天已经走完' }}</h2>
          </div>
          <div class="today-sheet__count">
            <strong>{{ doneToday.length }}<span>/{{ todayTasks.length }}</span></strong>
            <span>已完成</span>
          </div>
        </header>

        <div v-if="todayTasks.length" class="today-sheet__body">
          <div v-if="openToday.length" class="today-group">
            <p class="today-group__label">待完成 · {{ openToday.length }}</p>
            <TaskItem
              v-for="task in openToday"
              :key="task.id"
              :task="task"
              :busy="busyTaskId === task.id"
              @toggle="(next) => toggleTask(task, next)"
              @edit="openEdit"
              @delete="askDelete"
            />
          </div>

          <div v-if="!openToday.length" class="today-complete">
            <span class="today-complete__icon"><PartyPopper :size="17" /></span>
            <div>
              <strong>今天的任务都完成了</strong>
              <p>可以去散个步，或者提前看看明天的安排。</p>
            </div>
          </div>

          <div v-if="doneToday.length" class="today-group today-group--done">
            <p class="today-group__label">已完成 · {{ doneToday.length }}</p>
            <TaskItem
              v-for="task in doneToday"
              :key="task.id"
              :task="task"
              :busy="busyTaskId === task.id"
              @toggle="(next) => toggleTask(task, next)"
              @edit="openEdit"
              @delete="askDelete"
            />
          </div>
        </div>

        <AppEmptyState
          v-else
          title="今天还没有任务"
          description="一个 20 分钟的小任务，也足够让今天往前一点。"
          compact
        >
          <AppButton size="sm" @click="openCreate()">
            <template #icon><Plus :size="14" /></template>
            添加今日任务
          </AppButton>
          <AppButton size="sm" variant="secondary" to="/app/plans/new">
            让 AI 规划
          </AppButton>
        </AppEmptyState>

        <footer class="today-sheet__foot">
          <button type="button" class="text-button" @click="openCreate()">
            <Plus :size="13" />
            添加任务
          </button>
          <RouterLink to="/app/tasks" class="text-link">
            全部任务
            <ArrowRight :size="12" />
          </RouterLink>
        </footer>
      </section>

      <div class="dashboard-lower">
        <section class="plan-ledger">
          <header class="sheet-head">
            <span class="mono-label">正在进行 / CURRENT PLAN</span>
            <StatusPill v-if="activePlan" :value="activePlan.status" />
          </header>

          <template v-if="activePlan">
            <div class="plan-ledger__body">
              <div class="plan-ledger__figure">
                <strong>{{ activePlan.progress }}</strong>
                <span>%</span>
              </div>
              <div class="plan-ledger__content">
                <span class="chip chip--lav">{{ activePlan.subject }}</span>
                <h2>
                  <RouterLink :to="`/app/plans/${activePlan.id}`">{{ activePlan.title }}</RouterLink>
                </h2>
                <p>{{ activePlan.goal }}</p>
                <div class="plan-progress" aria-hidden="true">
                  <span :style="{ width: `${activePlan.progress}%` }" />
                </div>
                <div class="plan-ledger__meta">
                  <span>{{ activePlan.completedTasks }} / {{ activePlan.taskCount }} 个任务</span>
                  <span>截止 {{ formatDate(activePlan.endDate, { weekday: false }) }}</span>
                  <span>每天 {{ formatMinutes(activePlan.dailyMinutes) }}</span>
                </div>
              </div>
            </div>
            <footer class="plan-ledger__foot">
              <AppButton size="sm" variant="secondary" :to="`/app/plans/${activePlan.id}`">
                查看计划
              </AppButton>
              <RouterLink :to="`/app/plans/${activePlan.id}`" class="text-link">
                用 AI 调整
                <Sparkles :size="12" />
              </RouterLink>
            </footer>
          </template>

          <div v-else class="plan-ledger__empty">
            <p>还没有进行中的计划。</p>
            <AppButton size="sm" to="/app/plans/new">
              <template #icon><Sparkles :size="14" /></template>
              生成第一份计划
            </AppButton>
          </div>
        </section>

        <section class="week-ledger">
          <header class="sheet-head">
            <span class="mono-label">最近 7 天 / RHYTHM</span>
            <span class="week-ledger__streak">
              <Flame :size="11" />
              {{ stats.streak }} 天
            </span>
          </header>
          <div class="week-bars" aria-hidden="true">
            <div v-for="row in weekTrend" :key="row.date" class="week-bar">
              <span class="week-bar__track">
                <span
                  class="week-bar__fill"
                  :class="{ 'is-empty': !row.completed }"
                  :style="{ height: `${Math.max(4, (row.completed / weekMax) * 100)}%` }"
                />
              </span>
              <span class="week-bar__label" :class="{ 'is-today': row.date === today }">
                {{ weekdayShort(row.date) }}
              </span>
            </div>
          </div>
          <p class="week-ledger__caption">
            最近 7 天已完成 {{ stats.trend.reduce((sum, row) => sum + row.completed, 0) }} 个任务。
            数据来自真实记录。
          </p>
        </section>
      </div>

      <section class="upcoming-sheet">
        <header class="sheet-head">
          <span class="mono-label">接下来 7 天 / NEXT</span>
          <RouterLink to="/app/tasks" class="text-link">
            查看全部
            <ArrowRight :size="12" />
          </RouterLink>
        </header>

        <div v-if="upcomingGroups.length" class="upcoming-columns">
          <div v-for="group in upcomingGroups" :key="group.date" class="upcoming-column">
            <div class="upcoming-column__date">
              <strong>{{ formatDate(group.date, { weekday: true, year: false }) }}</strong>
              <span>{{ group.tasks.length }} 个任务</span>
            </div>
            <ul>
              <li v-for="task in group.tasks" :key="task.id">
                <RouterLink :to="`/app/plans/${task.planId}`" class="upcoming-row">
                  <span class="upcoming-row__dot" :class="`is-${task.priority}`" />
                  <span class="upcoming-row__title">{{ task.title }}</span>
                  <span class="upcoming-row__time">{{ formatMinutes(task.durationMinutes) }}</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>

        <div v-else class="upcoming-empty">
          <p>未来 7 天还没有安排任务。</p>
          <button type="button" class="text-button" @click="openCreate()">
            <Plus :size="13" />
            提前安排一个
          </button>
        </div>
      </section>
    </template>

    <TaskFormModal
      v-model="taskModalOpen"
      :task="editingTask"
      :default-plan-id="modalPlanId"
      :default-date="modalDate"
      @saved="onTaskSaved"
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
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* Masthead ---------------------------------------------------------------- */
.dashboard-head {
  padding-top: 2px;
}

.dashboard-head__meta {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ink);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
}

.dashboard-head__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 30px;
  padding-top: 22px;
}

.dashboard-head h1 {
  max-width: 14ch;
  font-size: clamp(42px, 5.4vw, 76px);
  line-height: 0.92;
  letter-spacing: -0.06em;
}

.dashboard-head p {
  max-width: 54ch;
  margin-top: 14px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.75;
}

.dashboard-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.dashboard__loading {
  display: grid;
  gap: 18px;
}

.dashboard__error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
}

.dashboard__error-icon {
  color: var(--accent);
}

.dashboard__error h2 {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
}

.dashboard__error p {
  color: var(--ink-muted);
  font-size: 11.5px;
}

/* Metric strip, not cards ------------------------------------------------- */
.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
}

.dashboard-metrics > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 14px 20px 15px 0;
  border-right: 1px solid var(--line);
}

.dashboard-metrics > div:last-child {
  border-right: 0;
}

.dashboard-metrics span {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dashboard-metrics strong {
  margin-top: 2px;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  font-style: italic;
  line-height: 1;
  letter-spacing: -0.05em;
}

.dashboard-metrics em {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  font-style: normal;
}

/* Today sheet -------------------------------------------------------------- */
.today-sheet {
  border-top: 2px solid var(--ink);
  border-bottom: 1px solid var(--line);
}

.today-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 0 18px;
  border-bottom: 1px solid var(--ink);
}

.today-sheet__head h2 {
  margin-top: 9px;
  font-family: var(--font-sans);
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 520;
  letter-spacing: -0.045em;
}

.today-sheet__count {
  display: flex;
  align-items: baseline;
  gap: 9px;
  flex: none;
}

.today-sheet__count strong {
  font-family: var(--font-display);
  font-size: clamp(50px, 6vw, 82px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.75;
  letter-spacing: -0.06em;
}

.today-sheet__count strong span {
  color: var(--ink-faint);
  font-size: 0.45em;
}

.today-sheet__count > span {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
}

.today-sheet__body {
  padding: 10px 0 4px;
}

.today-group {
  padding: 8px 0;
}

.today-group + .today-group {
  border-top: 1px solid var(--line);
}

.today-group__label {
  padding: 0 0 4px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.today-complete {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}

.today-complete__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--accent);
  color: var(--accent);
}

.today-complete strong {
  display: block;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
}

.today-complete p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.today-sheet__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 0 12px;
  border-top: 1px solid var(--line);
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.text-button:hover {
  color: var(--accent);
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Lower ledger ------------------------------------------------------------- */
.dashboard-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 0.66fr);
  gap: 30px;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
}

.plan-ledger,
.week-ledger {
  min-width: 0;
}

.plan-ledger__body {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 20px;
  padding: 22px 0;
}

.plan-ledger__figure {
  display: flex;
  align-items: flex-start;
  gap: 2px;
  border-right: 1px solid var(--line);
}

.plan-ledger__figure strong {
  font-family: var(--font-display);
  font-size: clamp(64px, 8vw, 106px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.7;
  letter-spacing: -0.08em;
}

.plan-ledger__figure span {
  margin-top: 3px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 10px;
}

.plan-ledger__content {
  min-width: 0;
}

.plan-ledger__content h2 {
  margin-top: 10px;
  font-family: var(--font-sans);
  font-size: clamp(20px, 2.2vw, 30px);
  font-weight: 520;
  line-height: 1.16;
  letter-spacing: -0.04em;
}

.plan-ledger__content h2 a:hover {
  color: var(--accent);
}

.plan-ledger__content p {
  max-width: 52ch;
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.plan-progress {
  height: 2px;
  margin-top: 18px;
  background: var(--line);
}

.plan-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 700ms var(--ease);
}

.plan-ledger__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 16px;
  margin-top: 10px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
}

.plan-ledger__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.plan-ledger__empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 22px 0;
  color: var(--ink-muted);
  font-size: 12px;
}

/* Week bars ---------------------------------------------------------------- */
.week-ledger__streak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8px;
}

.week-bars {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 188px;
  padding: 18px 0 8px;
  border-bottom: 1px solid var(--ink);
}

.week-bar {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
}

.week-bar__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 20px;
  height: 100%;
  border-top: 1px solid var(--line);
}

.week-bar__fill {
  width: 100%;
  background: var(--ink);
  transition: height 600ms var(--ease);
}

.week-bar__fill.is-empty {
  background: var(--line);
}

.week-bar__label {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
}

.week-bar__label.is-today {
  color: var(--accent);
}

.week-ledger__caption {
  padding-top: 9px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  line-height: 1.7;
}

/* Upcoming ledger ---------------------------------------------------------- */
.upcoming-sheet {
  margin-top: 2px;
}

.upcoming-columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--line);
}

.upcoming-column {
  min-width: 0;
  padding: 14px 18px 12px 0;
  border-right: 1px solid var(--line);
}

.upcoming-column:last-child {
  border-right: 0;
}

.upcoming-column__date {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--line);
}

.upcoming-column__date strong {
  font-family: var(--font-sans);
  font-size: 11.5px;
  font-weight: 600;
}

.upcoming-column__date span {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.upcoming-column ul {
  padding-top: 4px;
}

.upcoming-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid transparent;
  color: var(--ink-soft);
  font-size: 10.5px;
}

.upcoming-row:hover {
  border-bottom-color: var(--line);
  color: var(--ink);
}

.upcoming-row__dot {
  flex: none;
  width: 4px;
  height: 4px;
  background: var(--ink-faint);
}

.upcoming-row__dot.is-high {
  background: var(--accent);
}

.upcoming-row__dot.is-medium {
  background: var(--blue);
}

.upcoming-row__dot.is-low {
  background: var(--sage);
}

.upcoming-row__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-row__time {
  flex: none;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.upcoming-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink-muted);
  font-size: 12px;
}

/* Responsive --------------------------------------------------------------- */
@media (max-width: 1120px) {
  .dashboard-lower {
    grid-template-columns: 1fr;
    gap: 26px;
  }

  .plan-ledger__body {
    grid-template-columns: 120px minmax(0, 1fr);
  }

  .upcoming-columns {
    grid-template-columns: repeat(2, 1fr);
  }

  .upcoming-column:nth-child(2n) {
    border-right: 0;
  }
}

@media (max-width: 760px) {
  .dashboard-head__grid {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 18px;
  }

  .dashboard-head h1 {
    font-size: clamp(38px, 11vw, 54px);
  }

  .dashboard-head__actions {
    justify-content: flex-start;
  }

  .dashboard-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-metrics > div:nth-child(2n) {
    border-right: 0;
  }

  .dashboard-metrics > div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }

  .today-sheet__head {
    display: block;
  }

  .today-sheet__count {
    margin-top: 14px;
  }

  .today-sheet__count strong {
    font-size: 48px;
  }

  .plan-ledger__body {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .plan-ledger__figure {
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding-bottom: 8px;
  }

  .plan-ledger__figure strong {
    font-size: 64px;
  }

  .upcoming-columns {
    grid-template-columns: 1fr;
  }

  .upcoming-column {
    padding-right: 0;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .upcoming-column:last-child {
    border-bottom: 0;
  }

  .today-sheet__foot,
  .plan-ledger__empty {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>