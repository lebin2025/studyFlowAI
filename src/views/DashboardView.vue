<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertCircle,
  ArrowRight,
  Plus,
  Sparkles,
} from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import TaskItem from '@/components/tasks/TaskItem.vue'
import TaskFormModal from '@/components/tasks/TaskFormModal.vue'
import PlanCalendarCard from '@/components/dashboard/PlanCalendarCard.vue'
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
const plannedMinutes = computed(
  () =>
    stats.value?.today?.plannedMinutes ??
    todayTasks.value.reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0),
)
const completionRate = computed(() => stats.value?.totals?.completionRate ?? 0)
const ringLength = 2 * Math.PI * 52
const ringOffset = computed(() => ringLength * (1 - todayProgress.value / 100))
const weekTotal = computed(() =>
  (stats.value?.trend || []).reduce((sum, row) => sum + Number(row.completed || 0), 0),
)

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
</script><template>
  <div class="dashboard">
    <header class="dashboard-head">
      <div class="dashboard-head__copy">
        <p class="dashboard-head__date">{{ formatDate(today, { weekday: true }) }}</p>
        <h1>{{ greetingText }}</h1>
      </div>
      <div class="dashboard-head__actions">
        <AppButton to="/app/plans/new" variant="ai">
          <template #icon><Sparkles :size="15" /></template>
          AI 计划
        </AppButton>
        <AppButton @click="openCreate()">
          <template #icon><Plus :size="15" /></template>
          添加任务
        </AppButton>
      </div>
    </header>

    <div v-if="loading" class="dashboard__loading" aria-busy="true" aria-label="正在加载仪表盘">
      <SkeletonBlock height="228px" radius="var(--radius-2xl)" />
      <SkeletonBlock height="320px" radius="var(--radius-2xl)" />
    </div>

    <div v-else-if="error" class="dashboard__error">
      <AlertCircle :size="18" />
      <div>
        <strong>加载失败</strong>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load()">重试</AppButton>
    </div>

    <template v-else>
      <section
        class="instrument"
        aria-label="学习数据概览"
        v-press-tilt="{ subtle: true }"
      >
        <div class="instrument__today">
          <span class="instrument__label">今日完成</span>
          <div class="instrument__ring-wrap">
            <svg class="instrument__ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle class="instrument__ring-track" cx="60" cy="60" r="52" />
              <circle
                v-if="todayProgress > 0"
                class="instrument__ring-value"
                cx="60"
                cy="60"
                r="52"
                :stroke-dasharray="ringLength"
                :stroke-dashoffset="ringOffset"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="instrument__ring-label">
              <strong>{{ doneToday.length }}</strong>
              <span>/{{ todayTasks.length }}</span>
            </div>
          </div>
        </div>

        <div class="instrument__metric">
          <span>计划时长</span>
          <strong>{{ formatMinutes(plannedMinutes) }}</strong>
        </div>

        <div class="instrument__metric">
          <span>连续学习</span>
          <strong>{{ stats?.streak ?? 0 }}<small>天</small></strong>
        </div>

        <div class="instrument__metric">
          <span>完成率</span>
          <strong>{{ completionRate }}<small>%</small></strong>
          <div class="instrument__bar" aria-hidden="true">
            <span :style="{ width: `${completionRate}%` }" />
          </div>
        </div>
      </section>

      <PlanCalendarCard @changed="load({ silent: true })" />

      <div class="dashboard-grid">
        <section class="today-card">
          <header class="section-head">
            <h2>今日任务</h2>
            <button type="button" class="icon-button" aria-label="添加任务" @click="openCreate()">
              <Plus :size="16" />
            </button>
          </header>

          <div v-if="todayTasks.length" class="today-list">
            <TaskItem
              v-for="task in [...openToday, ...doneToday]"
              :key="task.id"
              :task="task"
              :busy="busyTaskId === task.id"
              @toggle="(next) => toggleTask(task, next)"
              @edit="openEdit"
              @delete="askDelete"
            />
          </div>

          <div v-else class="today-empty">
            <div class="today-empty__visual" aria-hidden="true">
              <span /><span /><span />
            </div>
            <strong>暂无安排</strong>
            <AppButton size="sm" variant="secondary" @click="openCreate()">添加任务</AppButton>
          </div>

          <footer class="section-foot">
            <RouterLink to="/app/tasks" class="text-link">
              查看全部
              <ArrowRight :size="12" />
            </RouterLink>
          </footer>
        </section>

        <aside class="dashboard-side">
          <section class="plan-card">
            <header class="section-head">
              <h2>当前计划</h2>
              <RouterLink to="/app/plans" class="icon-button" aria-label="查看学习计划">
                <ArrowRight :size="15" />
              </RouterLink>
            </header>

            <template v-if="activePlan">
              <div class="plan-card__tags">
                <span class="chip chip--lav">{{ activePlan.subject }}</span>
              </div>
              <RouterLink :to="`/app/plans/${activePlan.id}`" class="plan-card__title">
                {{ activePlan.title }}
              </RouterLink>
              <p class="plan-card__goal">{{ activePlan.goal }}</p>
              <div class="plan-card__progress">
                <span :style="{ width: `${activePlan.progress}%` }" />
              </div>
              <div class="plan-card__meta">
                <span>{{ activePlan.progress }}%</span>
                <span>{{ activePlan.completedTasks }}/{{ activePlan.taskCount }} 项</span>
                <span>截止 {{ formatDate(activePlan.endDate, { weekday: false }) }}</span>
              </div>
            </template>

            <div v-else class="plan-card__empty">
              <p>暂无计划</p>
              <AppButton size="sm" to="/app/plans/new">
                <template #icon><Sparkles :size="13" /></template>
                创建计划
              </AppButton>
            </div>
          </section>

          <section class="rhythm-card">
            <header class="section-head">
              <h2>近 7 天</h2>
              <span class="rhythm-card__total">{{ weekTotal }} 项</span>
            </header>

            <div class="rhythm-bars" aria-label="近 7 天完成任务数">
              <div v-for="row in weekTrend" :key="row.date" class="rhythm-bar">
                <span class="rhythm-bar__track">
                  <span
                    class="rhythm-bar__fill"
                    :class="{ 'is-empty': !row.completed, 'is-today': row.date === today }"
                    :style="{ height: `${Math.max(4, (row.completed / weekMax) * 100)}%` }"
                    :title="`${formatDate(row.date, { weekday: true, year: false })}：${row.completed} 项`"
                  />
                </span>
                <span class="rhythm-bar__label" :class="{ 'is-today': row.date === today }">
                  {{ weekdayShort(row.date) }}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section class="upcoming">
        <header class="section-head">
          <h2>接下来</h2>
          <RouterLink to="/app/tasks" class="text-link">
            全部任务
            <ArrowRight :size="12" />
          </RouterLink>
        </header>

        <div v-if="upcoming.length" class="upcoming-list">
          <RouterLink
            v-for="task in upcoming.slice(0, 5)"
            :key="task.id"
            :to="`/app/plans/${task.planId}`"
            class="upcoming-row"
          >
            <span class="upcoming-row__date">{{ formatDate(task.taskDate, { weekday: true, year: false }) }}</span>
            <span class="upcoming-row__title">{{ task.title }}</span>
            <span class="upcoming-row__time">{{ formatMinutes(task.durationMinutes) }}</span>
          </RouterLink>
        </div>
        <p v-else class="upcoming-empty">暂无安排</p>
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
  gap: 24px;
}

/* Header ------------------------------------------------------------------ */
.dashboard-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.dashboard-head__date {
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 500;
}

.dashboard-head h1 {
  margin-top: 4px;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.dashboard-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.dashboard__loading {
  display: grid;
  gap: 20px;
}

.dashboard__error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.dashboard__error div {
  flex: 1;
}

.dashboard__error strong {
  display: block;
  color: var(--ink);
  font-size: 13px;
}

.dashboard__error p {
  color: var(--ink-muted);
  font-size: 12px;
}

/* Data instrument --------------------------------------------------------- */
.instrument {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 24px;
  padding: 26px 30px;
  border-radius: 26px;
  background: #1b1a17;
  color: var(--on-dark);
  box-shadow: var(--shadow-deep);
}

.instrument__today {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.instrument__label,
.instrument__metric > span {
  color: var(--on-dark-soft);
  font-size: 11.5px;
  font-weight: 500;
}

.instrument__ring-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
}

.instrument__ring {
  width: 132px;
  height: 132px;
}

.instrument__ring circle {
  fill: none;
  stroke-width: 5;
  vector-effect: non-scaling-stroke;
}

.instrument__ring-track {
  stroke: rgba(247, 243, 236, 0.12);
}

.instrument__ring-value {
  stroke: var(--accent);
  stroke-linecap: round;
  transition: stroke-dashoffset 700ms var(--ease);
}

.instrument__ring-label {
  position: absolute;
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.instrument__ring-label strong {
  font-size: 34px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}

.instrument__ring-label span {
  color: var(--on-dark-soft);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.instrument__metric {
  min-width: 0;
  padding-left: 24px;
  border-left: 1px solid var(--line-dark);
}

.instrument__metric strong {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-top: 10px;
  font-size: clamp(28px, 3.2vw, 38px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.instrument__metric small {
  color: var(--on-dark-soft);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}

.instrument__bar {
  width: min(100%, 90px);
  height: 3px;
  margin-top: 14px;
  border-radius: 999px;
  background: rgba(247, 243, 236, 0.14);
  overflow: hidden;
}

.instrument__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 700ms var(--ease);
}

/* Dashboard body ---------------------------------------------------------- */
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.75fr);
  gap: 20px;
  align-items: start;
}

.today-card,
.plan-card,
.rhythm-card {
  padding: 20px;
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.section-head h2 {
  font-size: 17px;
  font-weight: 620;
  letter-spacing: -0.025em;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: var(--ink-muted);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.icon-button:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.today-list {
  margin-top: 4px;
}

.today-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 34px 0 26px;
}

.today-empty__visual {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}

.today-empty__visual span {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
}

.today-empty__visual span:nth-child(2) {
  width: 22px;
  border-radius: 999px;
  background: var(--line);
}

.today-empty strong {
  font-size: 14px;
  font-weight: 600;
}

.section-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 550;
  transition: color var(--duration-fast) var(--ease);
}

.text-link:hover {
  color: var(--accent);
}

.dashboard-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card__tags {
  margin-top: 10px;
}

.plan-card__title {
  display: block;
  margin-top: 8px;
  font-size: 17px;
  font-weight: 620;
  line-height: 1.35;
  letter-spacing: -0.025em;
}

.plan-card__title:hover {
  color: var(--accent);
}

.plan-card__goal {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.6;
}

.plan-card__progress {
  height: 4px;
  margin-top: 16px;
  border-radius: 999px;
  background: var(--surface-muted);
  overflow: hidden;
}

.plan-card__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 600ms var(--ease);
}

.plan-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 9px;
  color: var(--ink-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.plan-card__meta span:first-child {
  color: var(--ink);
  font-weight: 600;
}

.plan-card__empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0 6px;
}

.plan-card__empty p {
  color: var(--ink-muted);
  font-size: 12px;
}

.rhythm-card__total {
  color: var(--ink-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.rhythm-bars {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 116px;
  margin-top: 12px;
}

.rhythm-bar {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
}

.rhythm-bar__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 18px;
  height: 100%;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}

.rhythm-bar__fill {
  width: 100%;
  min-height: 4px;
  border-radius: inherit;
  background: var(--ink);
  transition: height 600ms var(--ease);
}

.rhythm-bar__fill.is-empty {
  background: var(--line);
}

.rhythm-bar__fill.is-today {
  background: var(--accent);
}

.rhythm-bar__label {
  color: var(--ink-faint);
  font-size: 10px;
}

.rhythm-bar__label.is-today {
  color: var(--accent);
  font-weight: 600;
}

/* Upcoming ---------------------------------------------------------------- */
.upcoming {
  margin-top: 4px;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}

.upcoming-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px 10px;
  border-radius: 10px;
  transition: background-color var(--duration-fast) var(--ease);
}

.upcoming-row:hover {
  background: var(--surface);
}

.upcoming-row__date {
  color: var(--ink-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.upcoming-row__title {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-row__time {
  color: var(--ink-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.upcoming-empty {
  padding: 18px 10px;
  color: var(--ink-muted);
  font-size: 13px;
}

/* Responsive --------------------------------------------------------------- */
@media (max-width: 1080px) {
  .inline {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

@media (max-width: 760px) {
  .dashboard-head {
    display: block;
  }

  .dashboard-head__actions {
    margin-top: 16px;
  }

  .instrument {
    grid-template-columns: 1fr 1fr;
    gap: 22px 16px;
    padding: 22px;
    border-radius: 22px;
  }

  .instrument__today {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .instrument__ring-wrap,
  .instrument__ring {
    width: 104px;
    height: 104px;
  }

  .instrument__ring-label strong {
    font-size: 27px;
  }

  .instrument__metric {
    padding-left: 0;
    border-left: 0;
  }

  .instrument__metric:nth-child(3) {
    padding-left: 16px;
    border-left: 1px solid var(--line-dark);
  }

  .instrument__metric strong {
    font-size: 27px;
  }

  .dashboard-side {
    grid-template-columns: 1fr;
  }

  .upcoming-row {
    grid-template-columns: 96px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 2px;
  }

  .upcoming-row__date {
    font-size: 11px;
  }
}

@media (max-width: 520px) {
  .instrument__today {
    display: block;
  }

  .instrument__ring-wrap {
    margin-top: 4px;
  }

  .today-card,
  .plan-card,
  .rhythm-card {
    padding: 16px;
    border-radius: 18px;
  }
}
</style>