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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px;
  grid-template-areas:
    'head progress'
    'title progress'
    'goal progress'
    'foot progress';
  gap: 0 22px;
  margin-bottom: 10px;
  padding: 18px 20px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition:
    box-shadow var(--duration) var(--ease),
    transform var(--duration) var(--ease);
}

.plan-card:hover,
.plan-card:focus-within {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.plan-card__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.plan-card__head {
  grid-area: head;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-card__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.plan-card__overdue {
  color: var(--accent);
  font-size: 10.5px;
}

.plan-card__delete {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--ink-faint);
  opacity: 0;
  transition:
    color var(--duration-fast) var(--ease),
    opacity var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease);
}

.plan-card:hover .plan-card__delete,
.plan-card:focus-within .plan-card__delete {
  opacity: 1;
}

.plan-card__delete:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.plan-card__title {
  grid-area: title;
  max-width: 28ch;
  margin-top: 3px;
  font-size: 18px;
  font-weight: 620;
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.plan-card__goal {
  grid-area: goal;
  max-width: 62ch;
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.6;
}

.plan-card__progress {
  grid-area: progress;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding-left: 18px;
  border-left: 1px solid var(--line);
}

.plan-card__progress-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 5px;
}

.plan-card__progress-head span {
  color: var(--ink-faint);
  font-size: 10.5px;
}

.plan-card__progress-head strong {
  font-size: 24px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.plan-card__foot {
  grid-area: foot;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 9px;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.plan-card__meta,
.plan-card__ai {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.plan-card__ai {
  color: var(--accent);
}

@media (max-width: 680px) {
  .plan-card {
    grid-template-columns: minmax(0, 1fr) 86px;
    gap: 0 12px;
    padding: 16px;
  }

  .plan-card__title {
    font-size: 16px;
  }

  .plan-card__progress {
    padding-left: 10px;
  }

  .plan-card__progress-head {
    display: block;
  }

  .plan-card__progress-head strong {
    display: block;
    margin-top: 4px;
    font-size: 21px;
  }

  .plan-card__delete {
    opacity: 1;
  }
}
</style>