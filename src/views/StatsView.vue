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
      eyebrow="学习统计"
      title="看见真实的进步"
      description="这里没有估算出来的努力。每一个数字都来自你实际保存的任务与完成记录。"
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
          title="还没有可统计的学习记录"
          description="完成第一个任务后，这里会出现真实的完成率、学习趋势和连续天数。我们不会用示例数据填满它。"
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
              <span class="stat-card__icon" :class="`stat-card__icon--${card.tone}`">
                <component :is="card.icon" :size="16" :stroke-width="1.8" />
              </span>
            </div>
            <strong class="stat-card__value">{{ card.value }}</strong>
            <span class="stat-card__hint">{{ card.hint }}</span>
          </article>
        </div>

        <div class="stats-grid">
          <section class="panel trend-panel">
            <header class="panel__head">
              <div>
                <p class="panel__eyebrow">每日趋势</p>
                <h2 class="panel__title">这几天，你走得怎么样</h2>
                <p class="panel__sub">
                  {{ formatDate(stats.range.from, { weekday: false }) }} —
                  {{ formatDate(stats.range.to, { weekday: false }) }} ·
                  完成 {{ stats.totals.completedTasks }} 个任务
                </p>
              </div>
              <span class="trend-panel__badge">
                <TrendingUp :size="13" />
                {{ stats.totals.completionRate }}%
              </span>
            </header>
            <div class="panel__body">
              <TrendChart :data="stats.trend" />
              <p v-if="!stats.trend.some((row) => row.completed)" class="panel__note">
                这个周期内还没有完成记录。完成今天的第一个任务后，这里会出现第一条数据。
              </p>
            </div>
          </section>

          <section class="panel">
            <header class="panel__head">
              <div>
                <p class="panel__eyebrow">节奏</p>
                <h2 class="panel__title">按星期看习惯</h2>
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
                <p class="panel__eyebrow">科目分布</p>
                <h2 class="panel__title">时间花在了哪里</h2>
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
                <p class="panel__eyebrow">学习概况</p>
                <h2 class="panel__title">真实的节奏</h2>
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
                <p>
                  只有你填写了「实际用时」的任务才会被计入登记率。预计时长不会被冒充成实际时长。
                </p>
              </div>
            </div>
          </section>
        </div>

        <p class="stats-note">
          统计口径：已完成任务按任务日期归入当天；预计学习时长为任务预计时长之和，实际用时仅统计你主动登记的数据。
          连续学习天数也按已完成任务的计划日期计算。当前时区：{{ stats.timezone }}。
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 18px;
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

.stat-card__icon--lav {
  background: var(--lav-100);
  color: var(--lav-700);
}

.stat-card__icon--mint {
  background: var(--mint-100);
  color: var(--mint-700);
}

.stat-card__icon--sky {
  background: var(--sky-100);
  color: var(--sky-600);
}

.stat-card__icon--peach {
  background: var(--peach-100);
  color: var(--peach-600);
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
  padding: 18px 20px 6px;
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
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.panel__sub {
  margin-top: 4px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.panel__body {
  padding: 10px 20px 18px;
}

.panel__note {
  margin-top: 8px;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10px;
  line-height: 1.6;
}

.panel__head-icon {
  color: var(--ink-faint);
}

.trend-panel__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  background: var(--mint-50);
  color: var(--mint-700);
  font-size: 10px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  margin-bottom: 18px;
}

.stats-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.streak-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--peach-100);
}

.streak-block__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--peach-600);
}

.streak-block strong {
  display: block;
  font-size: 13px;
  font-weight: 640;
}

.streak-block span {
  color: var(--ink-muted);
  font-size: 10px;
}

.overview-panel__streak {
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

.overview-rows {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 12px 0 0;
}

.overview-rows > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 10.5px;
}

.overview-rows dt {
  color: var(--ink-muted);
}

.overview-rows dd {
  margin: 0;
  color: var(--ink-soft);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.overview-rows dd.is-warning {
  color: var(--danger-700);
}

.coverage {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--line);
}

.coverage__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  color: var(--ink-muted);
  font-size: 10px;
}

.coverage__head strong {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 650;
}

.coverage p {
  margin-top: 7px;
  color: var(--ink-faint);
  font-size: 9px;
  line-height: 1.6;
}

.stats-note {
  margin-top: 16px;
  color: var(--ink-faint);
  font-size: 9.5px;
  line-height: 1.65;
}

.stats-empty {
  padding: 20px;
}

.stats-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
}

.stats-error__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--danger-100);
  color: var(--danger-600);
}

.stats-error h2 {
  font-size: 14px;
}

.stats-error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.stats-error .btn {
  margin-left: auto;
}

@media (max-width: 1100px) {
  .stats-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-grid,
  .stats-bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stats-cards {
    gap: 10px;
  }

  .stat-card {
    padding: 13px 14px;
  }

  .stat-card__value {
    font-size: 18px;
  }

  .panel__head {
    padding: 16px 16px 4px;
  }

  .panel__body {
    padding: 8px 16px 16px;
  }

  .stats-error {
    flex-wrap: wrap;
  }

  .stats-error .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>
