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
  padding: 2px 6px;
  border: 1px solid currentColor;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.pill__dot {
  width: 4px;
  height: 4px;
  border-radius: 0;
  background: currentColor;
}

.pill--lav {
  color: var(--accent);
}

.pill--mint {
  color: var(--sage);
}

.pill--sky {
  color: var(--blue);
}

.pill--danger {
  color: var(--accent);
}

.pill--neutral {
  color: var(--ink-faint);
}
</style>