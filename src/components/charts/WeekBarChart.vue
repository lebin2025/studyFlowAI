<script setup>
import { computed } from 'vue'
import { weekdayName } from '@/utils/date.js'

const props = defineProps({
  weekdays: { type: Array, default: () => [] },
})

const maxTotal = computed(() =>
  Math.max(1, ...props.weekdays.map((day) => Number(day.total) || 0)),
)

const rows = computed(() =>
  props.weekdays.map((day) => {
    const total = Number(day.total) || 0
    const completed = Number(day.completed) || 0
    return {
      ...day,
      total,
      completed,
      height: total ? Math.max(8, (total / maxTotal.value) * 100) : 4,
      completedHeight: completed ? Math.max(4, (completed / maxTotal.value) * 100) : 0,
      rate: total ? Math.round((completed / total) * 100) : 0,
    }
  }),
)
</script>

<template>
  <div class="week-chart">
    <div class="week-chart__bars" role="img" aria-label="按星期统计的任务完成情况">
      <div v-for="row in rows" :key="row.weekday" class="week-chart__col">
        <div class="week-chart__track">
          <span class="week-chart__total" :style="{ height: `${row.height}%` }" />
          <span
            v-if="row.completed"
            class="week-chart__done"
            :style="{ height: `${row.completedHeight}%` }"
          />
        </div>
        <span class="week-chart__day">{{ weekdayName(row.weekday) }}</span>
        <span class="week-chart__value">{{ row.total ? `${row.completed}/${row.total}` : '—' }}</span>
      </div>
    </div>
    <p class="week-chart__caption">
      最近统计周期内，按星期汇总的完成情况。柱子的深色部分表示已完成任务。
    </p>
  </div>
</template>

<style scoped>
.week-chart {
  display: flex;
  flex-direction: column;
}

.week-chart__bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 148px;
  padding-top: 10px;
}

.week-chart__col {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}

.week-chart__track {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex: 1;
  width: 100%;
  max-width: 30px;
  min-height: 0;
}

.week-chart__total {
  position: absolute;
  bottom: 0;
  width: 100%;
  border-radius: 5px 5px 3px 3px;
  background: var(--surface-muted);
  transition: height 600ms var(--ease);
}

.week-chart__done {
  position: absolute;
  bottom: 0;
  width: 100%;
  border-radius: 5px 5px 3px 3px;
  background: linear-gradient(180deg, var(--mint-500), var(--mint-600));
  transition: height 600ms var(--ease);
}

.week-chart__day {
  color: var(--ink-muted);
  font-size: 9px;
}

.week-chart__value {
  color: var(--ink-faint);
  font-size: 8.5px;
  font-variant-numeric: tabular-nums;
}

.week-chart__caption {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 9px;
  line-height: 1.6;
}
</style>
