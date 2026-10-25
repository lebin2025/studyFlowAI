<script setup>
import { computed } from 'vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'

const props = defineProps({
  subjects: { type: Array, default: () => [] },
})

const colors = ['var(--lav-500)', 'var(--mint-500)', 'var(--peach-500)', 'var(--sky-500)', 'var(--rose-500)']

const rows = computed(() =>
  props.subjects.map((subject, index) => ({
    ...subject,
    rate: subject.total
      ? Math.round((Number(subject.completed) / Number(subject.total)) * 100)
      : 0,
    color: colors[index % colors.length],
  })),
)
</script>

<template>
  <div class="subject-bars">
    <div v-for="row in rows" :key="row.subject" class="subject-row">
      <div class="subject-row__head">
        <span class="subject-row__name">{{ row.subject }}</span>
        <span class="subject-row__meta">{{ row.completed }} / {{ row.total }} · {{ row.rate }}%</span>
      </div>
      <ProgressBar
        :value="row.rate"
        :color="row.color"
        :height="6"
        :label="`${row.subject} 完成进度`"
      />
    </div>
    <p v-if="!rows.length" class="subject-bars__empty">还没有按科目统计的数据。</p>
  </div>
</template>

<style scoped>
.subject-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subject-row__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 5px;
}

.subject-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-soft);
  font-size: 11.5px;
  font-weight: 550;
}

.subject-row__meta {
  flex: none;
  color: var(--ink-faint);
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}

.subject-bars__empty {
  color: var(--ink-faint);
  font-size: 10.5px;
}
</style>
