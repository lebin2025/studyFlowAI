<script setup>
import { computed } from 'vue'
import { PLAN_STATUS_LABELS, PRIORITY_LABELS } from '@/utils/format.js'

const props = defineProps({
  type: { type: String, default: 'status' },
  value: { type: String, default: 'active' },
  label: { type: String, default: '' },
  dot: { type: Boolean, default: true },
})

const text = computed(() => {
  if (props.label) return props.label
  if (props.type === 'priority') return PRIORITY_LABELS[props.value] || props.value
  return PLAN_STATUS_LABELS[props.value] || props.value
})

const tone = computed(() => {
  if (props.type === 'priority') {
    return props.value === 'high' ? 'danger' : props.value === 'medium' ? 'sky' : 'neutral'
  }
  if (props.value === 'completed') return 'mint'
  if (props.value === 'active') return 'lav'
  return 'neutral'
})
</script>

<template>
  <span class="pill" :class="`pill--${tone}`">
    <span v-if="dot" class="pill__dot" aria-hidden="true" />
    {{ text }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.pill__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.pill--lav {
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.pill--mint {
  background: var(--sage-soft);
  color: var(--sage);
}

.pill--sky {
  background: var(--blue-soft);
  color: var(--blue);
}

.pill--danger {
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.pill--neutral {
  background: var(--surface-soft);
  color: var(--ink-muted);
}
</style>