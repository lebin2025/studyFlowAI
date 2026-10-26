<script setup>
import { computed } from 'vue'
import { CalendarDays, Clock3, Sparkles, Trash2 } from 'lucide-vue-next'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import { formatDate, formatMinutes, todayISO } from '@/utils/date.js'

const props = defineProps({
  plan: { type: Object, required: true },
})

const emit = defineEmits(['delete'])

const overdue = computed(
  () => props.plan.status === 'active' && props.plan.endDate < todayISO(),
)

const barColor = computed(() => {
  if (props.plan.status === 'completed') return 'var(--mint-600)'
  if (props.plan.status === 'archived') return 'var(--ink-faint)'
  return 'var(--lav-600)'
})
</script>

<template>
  <article class="plan-card">
    <RouterLink
      :to="`/app/plans/${plan.id}`"
      class="plan-card__overlay"
      :aria-label="`查看学习计划：${plan.title}`"
    />

    <header class="plan-card__head">
      <div class="plan-card__tags">
        <span class="chip chip--lav">{{ plan.subject }}</span>
        <StatusPill :value="plan.status" />
        <span v-if="overdue" class="plan-card__overdue">已到期</span>
      </div>
      <button
        type="button"
        class="plan-card__delete"
        :aria-label="`删除学习计划：${plan.title}`"
        @click.stop="emit('delete', plan)"
      >
        <Trash2 :size="14" />
      </button>
    </header>

    <h3 class="plan-card__title">{{ plan.title }}</h3>
    <p class="plan-card__goal">{{ plan.goal }}</p>

    <div class="plan-card__progress">
      <div class="plan-card__progress-head">
        <span>{{ plan.completedTasks }} / {{ plan.taskCount }} 个任务</span>
        <strong>{{ plan.progress }}%</strong>
      </div>
      <ProgressBar :value="plan.progress" :color="barColor" :height="6" :label="`${plan.title} 完成进度`" />
    </div>

    <footer class="plan-card__foot">
      <span class="plan-card__meta">
        <CalendarDays :size="12" />
        {{ formatDate(plan.startDate, { weekday: false }) }} — {{ formatDate(plan.endDate, { weekday: false }) }}
      </span>
      <span class="plan-card__meta">
        <Clock3 :size="12" />
        {{ formatMinutes(plan.dailyMinutes) }}/天
      </span>
      <span v-if="plan.source === 'ai'" class="plan-card__ai">
        <Sparkles :size="10" />
        AI 生成
      </span>
    </footer>
  </article>
</template>

<style scoped>
.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease),
    border-color var(--duration) var(--ease);
}

.plan-card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
}

.plan-card:focus-within {
  border-color: var(--lav-300);
}

.plan-card__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
}

.plan-card__overlay:focus-visible {
  outline: 2px solid var(--lav-500);
  outline-offset: -2px;
}

.plan-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.plan-card__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.plan-card__overdue {
  color: var(--warning-700);
  font-size: 9.5px;
  font-weight: 600;
}

.plan-card__delete {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin: -4px -4px 0 0;
  border-radius: 8px;
  color: var(--ink-faint);
  opacity: 0;
  transition:
    opacity var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.plan-card:hover .plan-card__delete,
.plan-card:focus-within .plan-card__delete {
  opacity: 1;
}

.plan-card__delete:hover {
  background: var(--danger-100);
  color: var(--danger-700);
}

.plan-card__title {
  margin-top: 13px;
  font-size: 17px;
  font-weight: 640;
  letter-spacing: -0.025em;
  line-height: 1.4;
}

.plan-card__goal {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.65;
  min-height: 38px;
}

.plan-card__progress {
  margin-top: 16px;
}

.plan-card__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.plan-card__progress-head strong {
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.plan-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 9.5px;
}

.plan-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.plan-card__ai {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  color: var(--lav-700);
  font-size: 9px;
  font-weight: 550;
}

@media (hover: none) {
  .plan-card__delete {
    opacity: 1;
  }
}
</style>

<style scoped>
/* 2026 / editorial plan index card */
.plan-card {
  min-height: 286px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 26px;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(215, 201, 255, 0.16), transparent 54%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.65), transparent 46%),
    var(--surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.plan-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 24px;
  left: 24px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(133, 114, 239, 0.5), transparent);
}

.plan-card:hover {
  transform: translateY(-5px);
  border-color: rgba(133, 114, 239, 0.28);
  box-shadow: var(--shadow-md);
}

.plan-card__overlay:focus-visible {
  outline: 2px solid var(--lav-500);
  outline-offset: -3px;
  border-radius: 25px;
}

.plan-card__tags {
  gap: 7px;
}

.plan-card__tags .chip {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.plan-card__title {
  max-width: 18ch;
  margin-top: 18px;
  font-size: 21px;
  font-weight: 640;
  line-height: 1.22;
  letter-spacing: -0.04em;
}

.plan-card__goal {
  min-height: 40px;
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.7;
}

.plan-card__progress {
  margin-top: auto;
  padding-top: 22px;
}

.plan-card__progress-head {
  margin-bottom: 8px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.plan-card__progress-head strong {
  color: var(--ink);
  font-family: var(--font-editorial);
  font-size: 18px;
  font-style: italic;
  font-weight: 400;
}

.plan-card__foot {
  margin-top: 16px;
  padding-top: 14px;
  border-top-color: var(--line);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.01em;
}

.plan-card__ai {
  color: var(--lav-700);
  font-family: var(--font-mono);
  font-size: 8px;
}

.plan-card__delete {
  border: 1px solid transparent;
}

.plan-card__delete:hover {
  border-color: rgba(194, 86, 92, 0.16);
}

@media (hover: none) {
  .plan-card__delete {
    opacity: 1;
  }
}
</style>
