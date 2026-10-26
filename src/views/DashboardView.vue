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
import ProgressRing from '@/components/ui/ProgressRing.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
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
    <section class="focus-stage">
      <div class="focus-stage__grid" aria-hidden="true" />
      <div class="focus-stage__aura" aria-hidden="true" />
      <div class="focus-stage__copy">
        <p class="focus-stage__date">
          <span class="focus-stage__live" />
          {{ formatDate(today, { weekday: true }) }} · 学习空间
        </p>
        <h1 class="focus-stage__title">{{ greetingText }}</h1>
        <p class="focus-stage__subtitle">{{ subtitle }}</p>
        <div class="focus-stage__actions">
          <AppButton variant="inverse" @click="openCreate()">
            <template #icon><Plus :size="16" /></template>
            添加任务
          </AppButton>
          <AppButton to="/app/plans/new" variant="glass">
            <template #icon><Sparkles :size="16" /></template>
            AI 新计划
          </AppButton>
        </div>
        <div class="focus-stage__signals">
          <div>
            <span>今日完成</span>
            <strong>{{ doneToday.length }}<em>/{{ todayTasks.length }}</em></strong>
          </div>
          <div>
            <span>还需要</span>
            <strong>{{ openToday.length ? formatMinutes(remainingMinutes) : '0m' }}</strong>
          </div>
          <div>
            <span>连续学习</span>
            <strong>{{ stats?.streak ?? 0 }}<em>天</em></strong>
          </div>
        </div>
      </div>
      <div class="focus-stage__orb" aria-label="今日完成进度">
        <div class="focus-stage__orbit focus-stage__orbit--one" aria-hidden="true" />
        <div class="focus-stage__orbit focus-stage__orbit--two" aria-hidden="true" />
        <div class="focus-stage__orbit focus-stage__orbit--three" aria-hidden="true" />
        <ProgressRing :value="todayProgress" :size="214" :stroke="3" label="今日" />
        <span class="focus-stage__orb-caption">TODAY / FOCUS</span>
      </div>
    </section>

    <div v-if="loading" class="dashboard__loading" aria-busy="true" aria-label="正在加载仪表盘">
      <div class="stat-grid">
        <SkeletonBlock v-for="index in 4" :key="index" height="104px" radius="var(--radius-lg)" />
      </div>
      <div class="dashboard-grid">
        <SkeletonBlock height="420px" radius="var(--radius-lg)" />
        <div class="rail">
          <SkeletonBlock height="210px" radius="var(--radius-lg)" />
          <SkeletonBlock height="180px" radius="var(--radius-lg)" />
        </div>
      </div>
    </div>

    <div v-else-if="error" class="dashboard__error card">
      <span class="dashboard__error-icon"><AlertCircle :size="20" /></span>
      <div>
        <h2>仪表盘没有加载出来</h2>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load()">重新加载</AppButton>
    </div>

    <template v-else>
      <div class="stat-grid">
        <article v-for="card in statCards" :key="card.key" class="stat-card">
          <div class="stat-card__top">
            <span class="stat-card__label">{{ card.label }}</span>
            <span class="stat-card__icon" :class="`stat-card__icon--${card.tone}`">
              <component :is="card.icon" :size="16" :stroke-width="1.8" />
            </span>
          </div>
          <strong class="stat-card__value">{{ card.value }}</strong>
          <span class="stat-card__hint">{{ card.hint }}</span>
        </article>
      </div>

      <div class="dashboard-grid">
        <section class="panel today-panel">
          <header class="panel__head">
            <div>
              <p class="panel__eyebrow">
                {{ formatDate(today, { weekday: true }) }}
              </p>
              <h2 class="panel__title">今日专注</h2>
            </div>
            <RouterLink to="/app/tasks" class="text-link">
              全部任务
              <ArrowRight :size="13" />
            </RouterLink>
          </header>

          <div v-if="todayTasks.length" class="today-summary">
            <ProgressRing :value="todayProgress" :size="82" :stroke="8" label="今日" />
            <div class="today-summary__text">
              <strong>
                {{ doneToday.length }} / {{ todayTasks.length }} 个任务已完成
              </strong>
              <span>
                {{
                  openToday.length
                    ? `还需要约 ${formatMinutes(remainingMinutes)}，一件一件来。`
                    : '今天的安排已经全部完成。'
                }}
              </span>
            </div>
          </div>

          <div class="today-body">
            <AppEmptyState
              v-if="!todayTasks.length"
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

            <template v-else>
              <p v-if="openToday.length" class="section-label">待完成 · {{ openToday.length }}</p>
              <TaskItem
                v-for="task in openToday"
                :key="task.id"
                :task="task"
                :busy="busyTaskId === task.id"
                @toggle="(next) => toggleTask(task, next)"
                @edit="openEdit"
                @delete="askDelete"
              />

              <div v-if="!openToday.length" class="today-complete">
                <span class="today-complete__icon"><PartyPopper :size="18" /></span>
                <div>
                  <strong>今天的任务都完成了</strong>
                  <p>可以去散个步，或者提前看看明天的安排。</p>
                </div>
              </div>

              <div v-if="doneToday.length" class="today-done">
                <p class="section-label">已完成 · {{ doneToday.length }}</p>
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
            </template>
          </div>

          <footer class="panel__foot">
            <button type="button" class="text-button" @click="openCreate()">
              <Plus :size="14" />
              添加任务
            </button>
            <RouterLink to="/app/plans" class="text-link">
              管理学习计划
              <ArrowRight :size="13" />
            </RouterLink>
          </footer>
        </section>

        <aside class="rail">
          <section class="panel plan-rail">
            <header class="panel__head panel__head--tight">
              <div>
                <p class="panel__eyebrow">正在进行</p>
                <h2 class="panel__title panel__title--sm">当前学习计划</h2>
              </div>
              <StatusPill v-if="activePlan" :value="activePlan.status" />
            </header>

            <template v-if="activePlan">
              <div class="plan-rail__body">
                <span class="chip chip--lav">{{ activePlan.subject }}</span>
                <h3>
                  <RouterLink :to="`/app/plans/${activePlan.id}`">
                    {{ activePlan.title }}
                  </RouterLink>
                </h3>
                <p class="plan-rail__goal">{{ activePlan.goal }}</p>
                <div class="plan-rail__progress">
                  <ProgressBar
                    :value="activePlan.progress"
                    :height="6"
                    :label="`${activePlan.title} 进度`"
                  />
                  <div class="plan-rail__progress-meta">
                    <span>{{ activePlan.completedTasks }} / {{ activePlan.taskCount }} 个任务</span>
                    <strong>{{ activePlan.progress }}%</strong>
                  </div>
                </div>
                <div class="plan-rail__meta">
                  <span>截止 {{ formatDate(activePlan.endDate, { weekday: false }) }}</span>
                  <span>每天 {{ formatMinutes(activePlan.dailyMinutes) }}</span>
                </div>
              </div>
              <footer class="plan-rail__foot">
                <AppButton size="sm" variant="soft" :to="`/app/plans/${activePlan.id}`">
                  查看计划
                </AppButton>
                <RouterLink :to="`/app/plans/${activePlan.id}`" class="text-link">
                  用 AI 调整
                  <Sparkles :size="12" />
                </RouterLink>
              </footer>
            </template>

            <AppEmptyState
              v-else
              compact
              variant="thinking"
              title="还没有进行中的计划"
              description="告诉 AI 你的目标与时间，它会给你一份可以执行的计划。"
            >
              <AppButton size="sm" to="/app/plans/new">
                <template #icon><Sparkles :size="14" /></template>
                生成第一份计划
              </AppButton>
            </AppEmptyState>
          </section>

          <section class="panel rhythm-panel">
            <header class="panel__head panel__head--tight">
              <div>
                <p class="panel__eyebrow">保持节奏</p>
                <h2 class="panel__title panel__title--sm">最近 7 天</h2>
              </div>
              <span class="rhythm-panel__streak">
                <Flame :size="12" />
                {{ stats.streak }} 天
              </span>
            </header>

            <div class="mini-bars" aria-hidden="true">
              <div v-for="row in weekTrend" :key="row.date" class="mini-bar">
                <span class="mini-bar__track">
                  <span
                    class="mini-bar__fill"
                    :class="{ 'is-empty': !row.completed }"
                    :style="{ height: `${Math.max(6, (row.completed / weekMax) * 100)}%` }"
                  />
                </span>
                <span class="mini-bar__label" :class="{ 'is-today': row.date === today }">
                  {{ weekdayShort(row.date) }}
                </span>
              </div>
            </div>
            <p class="rhythm-panel__caption">
              最近 7 天已完成 {{ stats.trend.reduce((sum, row) => sum + row.completed, 0) }} 个任务。
              数据来自真实记录。
            </p>
          </section>
        </aside>
      </div>

      <section class="panel upcoming-panel">
        <header class="panel__head">
          <div>
            <p class="panel__eyebrow">提前看一眼</p>
            <h2 class="panel__title panel__title--sm">接下来 7 天</h2>
          </div>
          <RouterLink to="/app/tasks" class="text-link">
            查看全部
            <ArrowRight :size="13" />
          </RouterLink>
        </header>

        <div v-if="upcomingGroups.length" class="upcoming-grid">
          <div v-for="group in upcomingGroups" :key="group.date" class="upcoming-group">
            <div class="upcoming-group__date">
              <strong>{{ formatDate(group.date, { weekday: true, year: false }) }}</strong>
              <span>{{ group.tasks.length }} 个任务</span>
            </div>
            <ul class="upcoming-list">
              <li v-for="task in group.tasks" :key="task.id">
                <RouterLink :to="`/app/plans/${task.planId}`" class="upcoming-item">
                  <span class="upcoming-item__dot" :class="`is-${task.priority}`" />
                  <span class="upcoming-item__title">{{ task.title }}</span>
                  <span class="upcoming-item__time">{{ formatMinutes(task.durationMinutes) }}</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>

        <div v-else class="upcoming-empty">
          <p>未来 7 天还没有安排任务。</p>
          <button type="button" class="text-button" @click="openCreate()">
            <Plus :size="14" />
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
  gap: 18px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  padding: 16px 17px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stat-card__label {
  color: var(--ink-muted);
  font-size: 10.5px;
  font-weight: 550;
}

.stat-card__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
}

.stat-card__icon--mint {
  background: var(--mint-100);
  color: var(--mint-700);
}

.stat-card__icon--lav {
  background: var(--lav-100);
  color: var(--lav-700);
}

.stat-card__icon--peach {
  background: var(--peach-100);
  color: var(--peach-600);
}

.stat-card__icon--sky {
  background: var(--sky-100);
  color: var(--sky-600);
}

.stat-card__value {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 660;
  letter-spacing: -0.035em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-card__hint {
  margin-top: 2px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
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
  gap: 14px;
  padding: 18px 20px 12px;
}

.panel__head--tight {
  padding-bottom: 8px;
}

.panel__eyebrow {
  color: var(--ink-faint);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.panel__title {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.panel__title--sm {
  font-size: 15.5px;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  color: var(--lav-700);
  font-size: 11.5px;
  font-weight: 550;
  transition: gap var(--duration-fast) var(--ease);
}

.text-link:hover {
  gap: 7px;
}

.text-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-muted);
  font-size: 11.5px;
  font-weight: 550;
  transition: color var(--duration-fast) var(--ease);
}

.text-button:hover {
  color: var(--ink);
}

.today-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 20px 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.today-summary__text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.today-summary__text strong {
  font-size: 13px;
  font-weight: 620;
}

.today-summary__text span {
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1.55;
}

.today-body {
  padding: 4px 10px 8px;
}

.section-label {
  padding: 8px 10px 4px;
  color: var(--ink-faint);
  font-size: 9.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.today-done {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--line);
}

.today-complete {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 6px 10px;
  padding: 13px;
  border-radius: var(--radius-md);
  background: var(--mint-50);
  border: 1px solid rgba(63, 157, 130, 0.14);
}

.today-complete__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--surface);
  color: var(--mint-700);
}

.today-complete strong {
  font-size: 12.5px;
  font-weight: 620;
}

.today-complete p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 20px;
  border-top: 1px solid var(--line);
  background: var(--surface-soft);
}

.rail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.plan-rail__body {
  padding: 4px 20px 14px;
}

.chip {
  padding: 2px 8px;
  font-size: 10px;
}

.plan-rail__body h3 {
  margin-top: 9px;
  font-size: 15.5px;
  font-weight: 640;
  line-height: 1.45;
}

.plan-rail__body h3 a:hover {
  color: var(--lav-700);
}

.plan-rail__goal {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 1.6;
}

.plan-rail__progress {
  margin-top: 13px;
}

.plan-rail__progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.plan-rail__progress-meta strong {
  color: var(--ink-soft);
  font-weight: 640;
}

.plan-rail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 9px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.plan-rail__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 20px;
  border-top: 1px solid var(--line);
  background: var(--surface-soft);
}

.rhythm-panel__streak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--peach-100);
  color: var(--peach-600);
  font-size: 10px;
  font-weight: 600;
}

.mini-bars {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  height: 100px;
  padding: 4px 20px 0;
}

.mini-bar {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  height: 100%;
}

.mini-bar__track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.mini-bar__fill {
  width: 100%;
  max-width: 20px;
  border-radius: 5px 5px 3px 3px;
  background: var(--lav-300);
  transition: height 600ms var(--ease);
}

.mini-bar__fill.is-empty {
  background: var(--line);
}

.mini-bar__label {
  color: var(--ink-faint);
  font-size: 9px;
}

.mini-bar__label.is-today {
  color: var(--lav-700);
  font-weight: 650;
}

.rhythm-panel__caption {
  padding: 10px 20px 16px;
  color: var(--ink-faint);
  font-size: 9.5px;
  line-height: 1.6;
}

.upcoming-panel {
  background: var(--surface);
}

.upcoming-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 4px 20px 20px;
}

.upcoming-group {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.upcoming-group__date {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--line);
}

.upcoming-group__date strong {
  font-size: 11.5px;
  font-weight: 620;
}

.upcoming-group__date span {
  color: var(--ink-faint);
  font-size: 9px;
}

.upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 5px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 3px;
  border-radius: 6px;
  color: var(--ink-soft);
  font-size: 10.5px;
}

.upcoming-item:hover {
  background: var(--surface);
}

.upcoming-item__dot {
  flex: none;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.upcoming-item__dot.is-high {
  background: var(--danger-600);
}

.upcoming-item__dot.is-medium {
  background: var(--sky-500);
}

.upcoming-item__dot.is-low {
  background: var(--mint-500);
}

.upcoming-item__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upcoming-item__time {
  flex: none;
  color: var(--ink-faint);
  font-size: 9px;
}

.upcoming-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 20px 20px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.dashboard__error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
}

.dashboard__error-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--danger-100);
  color: var(--danger-600);
}

.dashboard__error h2 {
  font-size: 14px;
}

.dashboard__error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.dashboard__error .btn {
  margin-left: auto;
}

@media (max-width: 1180px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .rail {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
}

@media (max-width: 720px) {
  .rail {
    grid-template-columns: 1fr;
  }

  .upcoming-grid {
    grid-template-columns: 1fr;
  }

  .today-summary {
    gap: 13px;
    padding: 12px;
  }

  .panel__head {
    padding: 16px 16px 10px;
  }

  .panel__foot {
    padding: 10px 16px;
  }

  .today-body {
    padding-inline: 4px;
  }

  .today-summary {
    margin-inline: 16px;
  }
}

@media (max-width: 420px) {
  .stat-grid {
    gap: 10px;
  }

  .stat-card {
    padding: 13px 14px;
  }

  .stat-card__value {
    font-size: 18px;
  }

  .dashboard__error {
    flex-wrap: wrap;
  }

  .dashboard__error .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>

<style scoped>
/* ==========================================================================
   2026 / Precision instrument panel
   ========================================================================== */
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Focus stage ------------------------------------------------------------- */
.focus-stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(0, 0.84fr);
  align-items: center;
  gap: 24px;
  min-height: 356px;
  padding: clamp(28px, 4vw, 48px);
  color: var(--on-dark);
  border: 1px solid rgba(215, 201, 255, 0.18);
  border-radius: 34px;
  background:
    radial-gradient(100% 120% at 100% 0%, rgba(215, 201, 255, 0.22), transparent 56%),
    radial-gradient(80% 100% at 0% 100%, rgba(157, 232, 203, 0.12), transparent 58%),
    linear-gradient(145deg, #1b1530 0%, #0e0b16 56%, #09080e 100%);
  box-shadow: var(--shadow-deep);
  overflow: hidden;
}

.focus-stage__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background-image:
    linear-gradient(rgba(248, 242, 233, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(248, 242, 233, 0.06) 1px, transparent 1px);
  background-size: 62px 62px;
  mask-image: radial-gradient(75% 100% at 80% 30%, black, transparent 78%);
  -webkit-mask-image: radial-gradient(75% 100% at 80% 30%, black, transparent 78%);
}

.focus-stage__aura {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: rgba(133, 114, 239, 0.22);
  filter: blur(90px);
  pointer-events: none;
}

.focus-stage__copy {
  position: relative;
  z-index: 2;
  min-width: 0;
}

.focus-stage__date {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.focus-stage__live {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--aurora);
  box-shadow: 0 0 0 4px rgba(157, 232, 203, 0.08), 0 0 16px var(--aurora);
}

.focus-stage__title {
  max-width: 13ch;
  margin-top: 18px;
  color: var(--on-dark);
  font-size: clamp(38px, 4.6vw, 64px);
  font-weight: 650;
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.focus-stage__subtitle {
  max-width: 46ch;
  margin-top: 16px;
  color: var(--on-dark-soft);
  font-size: 13.5px;
  line-height: 1.75;
}

.focus-stage__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.focus-stage__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid var(--line-dark);
}

.focus-stage__signals > div {
  min-width: 90px;
  padding-right: 24px;
  margin-right: 24px;
  border-right: 1px solid var(--line-dark);
}

.focus-stage__signals > div:last-child {
  border-right: 0;
  margin-right: 0;
  padding-right: 0;
}

.focus-stage__signals span {
  display: block;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.focus-stage__signals strong {
  display: block;
  margin-top: 4px;
  color: var(--on-dark);
  font-family: var(--font-editorial);
  font-size: 26px;
  font-style: italic;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.focus-stage__signals em {
  margin-left: 3px;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  font-style: normal;
}

.focus-stage__orb {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  min-height: 270px;
  --line: rgba(248, 242, 233, 0.13);
  --ink: var(--on-dark);
  --ink-soft: var(--on-dark-soft);
  --ink-muted: var(--on-dark-soft);
  --ink-faint: var(--on-dark-faint);
}

.focus-stage__orb :deep(.ring) {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 26px rgba(215, 201, 255, 0.18));
}

.focus-stage__orb :deep(.ring__text strong) {
  font-family: var(--font-editorial);
  font-size: 54px;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.06em;
}

.focus-stage__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid rgba(215, 201, 255, 0.14);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.focus-stage__orbit--one {
  width: 270px;
  height: 270px;
  animation: orbit-slow 44s linear infinite;
}

.focus-stage__orbit--two {
  width: 320px;
  height: 320px;
  border-color: rgba(157, 232, 203, 0.1);
  animation: orbit-slow 60s linear infinite reverse;
}

.focus-stage__orbit--three {
  width: 210px;
  height: 210px;
  border-style: dashed;
  border-color: rgba(248, 242, 233, 0.12);
}

.focus-stage__orb-caption {
  position: absolute;
  bottom: 4px;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.2em;
}

/* Stat strip -------------------------------------------------------------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(252, 249, 243, 0.62);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.stat-card {
  min-height: 108px;
  padding: 18px 20px;
  border: 0;
  border-right: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.stat-card:last-child {
  border-right: 0;
}

.stat-card__label {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat-card__icon {
  width: 26px;
  height: 26px;
  border: 1px solid var(--line);
  background: transparent;
}

.stat-card__value {
  margin-top: 10px;
  font-family: var(--font-editorial);
  font-size: 30px;
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.05em;
}

.stat-card__hint {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

/* Panels ------------------------------------------------------------------ */
.dashboard-grid {
  gap: 20px;
}

.panel {
  border: 1px solid var(--line);
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.panel__head {
  padding: 22px 24px 14px;
}

.panel__eyebrow {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.panel__title {
  margin-top: 5px;
  font-size: 23px;
  font-weight: 640;
  letter-spacing: -0.04em;
}

.panel__title--sm {
  font-size: 18px;
}

.text-link {
  color: var(--lav-700);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}

.today-summary {
  margin: 0 24px 12px;
  padding: 18px 20px;
  border: 1px solid rgba(133, 114, 239, 0.13);
  border-radius: 18px;
  background:
    radial-gradient(80% 140% at 100% 0%, rgba(215, 201, 255, 0.18), transparent 58%),
    linear-gradient(135deg, var(--lav-50), var(--surface-soft));
}

.today-summary__text strong {
  font-size: 14px;
  font-weight: 640;
}

.today-summary__text span {
  color: var(--ink-muted);
  font-size: 11.5px;
}

.today-body {
  padding: 4px 14px 10px;
}

.section-label {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.panel__foot {
  padding: 14px 24px;
  border-top-color: var(--line);
  background: var(--surface-soft);
}

.text-button {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.03em;
}

/* Plan rail as dark instrument */
.plan-rail {
  --ink: var(--on-dark);
  --ink-soft: var(--on-dark-soft);
  --ink-muted: var(--on-dark-soft);
  --ink-faint: var(--on-dark-faint);
  --line: var(--line-dark);
  --surface: rgba(255, 255, 255, 0.06);
  color: var(--on-dark);
  border-color: rgba(215, 201, 255, 0.16);
  background:
    radial-gradient(90% 100% at 100% 0%, rgba(215, 201, 255, 0.18), transparent 56%),
    linear-gradient(150deg, #1a1429 0%, #0e0b16 58%, #09080e 100%);
  box-shadow: var(--shadow-deep);
}

.plan-rail .panel__eyebrow {
  color: var(--on-dark-faint);
}

.plan-rail .panel__title,
.plan-rail .plan-rail__body h3,
.plan-rail .plan-rail__body h3 a {
  color: var(--on-dark);
}

.plan-rail .chip {
  background: rgba(215, 201, 255, 0.1);
  border-color: rgba(215, 201, 255, 0.18);
  color: var(--lumen);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.06em;
}

.plan-rail__body h3 {
  font-size: 21px;
  line-height: 1.24;
  letter-spacing: -0.04em;
}

.plan-rail__body h3 a:hover {
  color: var(--lumen);
}

.plan-rail__goal {
  color: var(--on-dark-soft);
  font-size: 11.5px;
}

.plan-rail__progress-meta,
.plan-rail__meta {
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.plan-rail__progress-meta strong {
  color: var(--on-dark);
}

.plan-rail .plan-rail__foot {
  border-top-color: var(--line-dark);
  background: rgba(255, 255, 255, 0.035);
}

.plan-rail .text-link {
  color: var(--lumen);
}

.plan-rail :deep(.btn--soft) {
  color: var(--lumen);
  background: rgba(215, 201, 255, 0.12);
  border-color: rgba(215, 201, 255, 0.18);
}

/* Rhythm ------------------------------------------------------------------ */
.rhythm-panel__streak {
  border: 1px solid rgba(229, 155, 114, 0.18);
  background: rgba(229, 155, 114, 0.1);
  color: var(--peach-600);
  font-family: var(--font-mono);
  font-size: 8px;
}

.mini-bars {
  height: 112px;
}

.mini-bar__fill {
  max-width: 22px;
  background: linear-gradient(180deg, #cabaff, #7060d8);
  box-shadow: 0 0 18px rgba(133, 114, 239, 0.18);
}

.mini-bar__fill.is-empty {
  background: var(--line);
  box-shadow: none;
}

.mini-bar__label,
.rhythm-panel__caption {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

.mini-bar__label.is-today {
  color: var(--lav-700);
}

/* Upcoming ---------------------------------------------------------------- */
.upcoming-grid {
  gap: 12px;
}

.upcoming-group {
  padding: 16px;
  border-radius: 18px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.upcoming-group__date strong {
  font-size: 12px;
  letter-spacing: -0.02em;
}

.upcoming-group__date span,
.upcoming-item__time {
  font-family: var(--font-mono);
  font-size: 8px;
}

.upcoming-item {
  font-size: 11px;
}

/* Responsive -------------------------------------------------------------- */
@media (max-width: 1120px) {
  .focus-stage {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .focus-stage__orb {
    min-height: 240px;
  }

  .focus-stage__orbit--one {
    width: 230px;
    height: 230px;
  }

  .focus-stage__orbit--two {
    width: 270px;
    height: 270px;
  }

  .focus-stage__orbit--three {
    width: 180px;
    height: 180px;
  }
}

@media (max-width: 900px) {
  .focus-stage {
    grid-template-columns: 1fr;
    min-height: auto;
    border-radius: 28px;
  }

  .focus-stage__orb {
    display: none;
  }

  .focus-stage__title {
    max-width: 11ch;
    font-size: clamp(36px, 8vw, 52px);
  }
}

@media (max-width: 720px) {
  .focus-stage {
    padding: 24px 20px;
  }

  .focus-stage__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .focus-stage__actions :deep(.btn) {
    width: 100%;
  }

  .focus-stage__signals {
    gap: 14px;
  }

  .focus-stage__signals > div {
    min-width: 0;
    padding-right: 14px;
    margin-right: 14px;
  }

  .focus-stage__signals strong {
    font-size: 22px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card {
    border-bottom: 1px solid var(--line);
  }

  .stat-card:nth-child(2n) {
    border-right: 0;
  }

  .stat-card:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .stat-card__value {
    font-size: 26px;
  }

  .panel__head {
    padding: 18px 18px 10px;
  }

  .today-summary {
    margin-inline: 18px;
  }

  .panel__foot {
    padding-inline: 18px;
  }
}
</style>
