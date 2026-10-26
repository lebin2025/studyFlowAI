<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertCircle,
  BookOpenCheck,
  CircleCheckBig,
  Clock3,
  Flame,
  ListChecks,
  Timer,
  TrendingUp,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import WeekBarChart from '@/components/charts/WeekBarChart.vue'
import SubjectBars from '@/components/charts/SubjectBars.vue'
import { statsApi } from '@/api/index.js'
import { formatDate, formatHours } from '@/utils/date.js'

const days = ref(30)
const loading = ref(true)
const error = ref('')
const stats = ref(null)

const rangeOptions = [
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
]

const cards = computed(() => {
  const totals = stats.value?.totals || {}
  return [
    {
      label: '任务总数',
      value: totals.totalTasks ?? 0,
      hint: `${totals.completedTasks ?? 0} 个已完成`,
      icon: ListChecks,
      tone: 'lav',
    },
    {
      label: '完成率',
      value: `${totals.completionRate ?? 0}%`,
      hint: `${totals.openTasks ?? 0} 个待完成`,
      icon: CircleCheckBig,
      tone: 'mint',
    },
    {
      label: '预计学习时长',
      value: formatHours(totals.plannedMinutes ?? 0),
      hint: `已完成 ${formatHours(totals.completedMinutes ?? 0)}`,
      icon: Clock3,
      tone: 'sky',
    },
    {
      label: '登记实际用时',
      value: totals.loggedTaskCount ? formatHours(totals.loggedMinutes ?? 0) : '尚未登记',
      hint: totals.loggedTaskCount
        ? `${totals.loggedTaskCount} 个任务由你填写`
        : '完成任务后可补充实际用时',
      icon: Timer,
      tone: 'peach',
    },
  ]
})

const loggedCoverage = computed(() => {
  const completed = stats.value?.totals?.completedTasks || 0
  const logged = stats.value?.totals?.loggedTaskCount || 0
  return completed ? Math.round((logged / completed) * 100) : 0
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    stats.value = await statsApi.overview(days.value)
  } catch (loadError) {
    error.value = loadError.message || '加载学习统计失败'
  } finally {
    loading.value = false
  }
}

watch(days, load)
onMounted(load)
</script>

<template>
  <div class="stats-page">
    <PageHeader
      eyebrow=""
      title="学习统计"
      description="完成率、趋势与连续学习天数。"
    >
      <template #actions>
        <SegmentedControl v-model="days" :options="rangeOptions" label="选择统计周期" />
      </template>
    </PageHeader>

    <div v-if="loading" class="stats-loading" aria-busy="true">
      <div class="stats-cards">
        <SkeletonBlock v-for="index in 4" :key="index" height="104px" radius="var(--radius-lg)" />
      </div>
      <div class="stats-grid">
        <SkeletonBlock height="330px" radius="var(--radius-lg)" />
        <SkeletonBlock height="330px" radius="var(--radius-lg)" />
      </div>
    </div>

    <div v-else-if="error" class="stats-error card">
      <span class="stats-error__icon"><AlertCircle :size="20" /></span>
      <div>
        <h2>统计没有加载出来</h2>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load">重新加载</AppButton>
    </div>

    <template v-else-if="stats">
      <div v-if="!stats.totals.totalTasks" class="stats-empty card">
        <AppEmptyState
          title="暂无数据"
          description="完成第一个任务后显示统计。"
        >
          <AppButton to="/app/plans/new">生成学习计划</AppButton>
          <AppButton to="/app/tasks" variant="secondary">去添加任务</AppButton>
        </AppEmptyState>
      </div>

      <template v-else>
        <div class="stats-cards">
          <article v-for="card in cards" :key="card.label" class="stat-card">
            <div class="stat-card__top">
              <span class="stat-card__label">{{ card.label }}</span>
            </div>
            <strong class="stat-card__value">{{ card.value }}</strong>
            <span class="stat-card__hint">{{ card.hint }}</span>
          </article>
        </div>

        <div class="stats-grid">
          <section class="panel trend-panel">
            <header class="panel__head">
              <div>

                <h2 class="panel__title">学习趋势</h2>
                <p class="panel__sub">
                  {{ formatDate(stats.range.from, { weekday: false }) }} —
                  {{ formatDate(stats.range.to, { weekday: false }) }} ·
                  完成 {{ stats.totals.completedTasks }} 个任务
                </p>
              </div>
              <span class="trend-panel__badge">
                {{ stats.totals.completionRate }}%
              </span>
            </header>
            <div class="panel__body">
              <TrendChart v-if="stats.trend.some((row) => row.completed)" :data="stats.trend" />
              <div v-else class="chart-empty">
                <span class="chart-empty__bars" aria-hidden="true">
                  <i /><i /><i /><i /><i /><i /><i />
                </span>
                <p>暂无记录</p>
              </div>
            </div>
          </section>

          <section class="panel">
            <header class="panel__head">
              <div>

                <h2 class="panel__title">星期分布</h2>
              </div>
            </header>
            <div class="panel__body">
              <WeekBarChart :weekdays="stats.weekdays" />
            </div>
          </section>
        </div>

        <div class="stats-bottom">
          <section class="panel">
            <header class="panel__head">
              <div>

                <h2 class="panel__title">科目分布</h2>
              </div>
              <BookOpenCheck :size="17" class="panel__head-icon" />
            </header>
            <div class="panel__body">
              <SubjectBars :subjects="stats.subjects" />
            </div>
          </section>

          <section class="panel overview-panel">
            <header class="panel__head">
              <div>

                <h2 class="panel__title">概览</h2>
              </div>
              <span class="overview-panel__streak">
                <Flame :size="13" />
                {{ stats.streak }} 天
              </span>
            </header>
            <div class="panel__body">
              <div class="streak-block">
                <span class="streak-block__icon"><Flame :size="22" /></span>
                <div>
                  <strong>连续学习 {{ stats.streak }} 天</strong>
                  <span>最长连续 {{ stats.longestStreak }} 天</span>
                </div>
              </div>

              <dl class="overview-rows">
                <div>
                  <dt>进行中的计划</dt>
                  <dd>{{ stats.plans.active }} 个</dd>
                </div>
                <div>
                  <dt>已完成计划</dt>
                  <dd>{{ stats.plans.completed }} 个</dd>
                </div>
                <div>
                  <dt>已逾期任务</dt>
                  <dd :class="{ 'is-warning': stats.overdue.count > 0 }">
                    {{ stats.overdue.count }} 个
                  </dd>
                </div>
                <div>
                  <dt>未来 7 天任务</dt>
                  <dd>{{ stats.upcoming.next7DaysTasks }} 个</dd>
                </div>
              </dl>

              <div class="coverage">
                <div class="coverage__head">
                  <span>实际用时登记率</span>
                  <strong>{{ loggedCoverage }}%</strong>
                </div>
                <ProgressBar :value="loggedCoverage" color="var(--mint-500)" :height="5" label="实际用时登记率" />
                <p>仅统计你填写了实际用时的任务。</p>
              </div>
            </div>
          </section>
        </div>

        <p class="stats-note">
          按任务日期归入当天。时区：{{ stats.timezone }}。
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Metric strip ------------------------------------------------------------ */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.stat-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 17px 20px 18px;
}

.stat-card + .stat-card {
  border-left: 1px solid var(--line);
}

.stat-card__label {
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 500;
}

.stat-card__value {
  margin-top: 8px;
  color: var(--ink);
  font-size: clamp(26px, 2.8vw, 36px);
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
}

.stat-card__hint {
  margin-top: 5px;
  color: var(--ink-faint);
  font-size: 11px;
}

/* Panels ------------------------------------------------------------------ */
.stats-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.5fr);
  gap: 18px;
  align-items: start;
}

.stats-bottom {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  align-items: start;
}

.panel {
  min-width: 0;
  padding: 18px;
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

.panel__title {
  font-size: 17px;
  font-weight: 620;
  letter-spacing: -0.025em;
}

.panel__sub {
  margin-top: 4px;
  color: var(--ink-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.panel__body {
  padding-top: 8px;
}

.panel__note {
  padding: 8px 0 2px;
  color: var(--ink-faint);
  font-size: 11.5px;
}

.trend-panel__badge {
  flex: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.overview-panel__streak {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

/* Overview ---------------------------------------------------------------- */
.streak-block {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border-radius: 12px;
  background: var(--accent-soft);
}

.streak-block__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--surface);
  color: var(--accent);
}

.streak-block strong {
  display: block;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 600;
}

.streak-block span {
  display: block;
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.overview-rows {
  margin: 12px 0 0;
}

.overview-rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}

.overview-rows dt {
  color: var(--ink-muted);
  font-size: 11.5px;
}

.overview-rows dd {
  margin: 0;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.overview-rows dd.is-warning {
  color: var(--accent);
}

/* Empty / error ----------------------------------------------------------- */
.stats-error,
.stats-empty {
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.stats-error {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
}

.stats-error__icon {
  color: var(--accent);
}

.stats-error h2 {
  font-size: 14px;
  font-weight: 600;
}

.stats-error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 12px;
}

@media (max-width: 980px) {
  .stats-grid,
  .stats-bottom {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 700px) {
  .stats-cards {
    grid-template-columns: 1fr 1fr;
  }

  .stat-card {
    padding: 14px 16px;
  }

  .stat-card:nth-child(odd) {
    border-left: 0;
  }

  .stat-card:nth-child(n + 3) {
    border-top: 1px solid var(--line);
  }

  .stat-card__value {
    font-size: 28px;
  }

  .panel {
    padding: 16px;
    border-radius: 18px;
  }
}
</style>
<style scoped>
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 128px;
  color: var(--ink-faint);
}

.chart-empty__bars {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 34px;
}

.chart-empty__bars i {
  width: 5px;
  border-radius: 3px;
  background: var(--line-strong);
  opacity: 0.55;
}

.chart-empty__bars i:nth-child(1),
.chart-empty__bars i:nth-child(6) {
  height: 10px;
}

.chart-empty__bars i:nth-child(2),
.chart-empty__bars i:nth-child(5) {
  height: 18px;
}

.chart-empty__bars i:nth-child(3) {
  height: 25px;
}

.chart-empty__bars i:nth-child(4) {
  height: 14px;
}

.chart-empty__bars i:nth-child(7) {
  height: 7px;
}

.chart-empty p {
  font-size: 12px;
}

.stats-note {
  color: var(--ink-faint);
  font-size: 10.5px;
  line-height: 1.6;
}
</style>
