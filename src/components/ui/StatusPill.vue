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
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: 11.5px;
  font-weight: 580;
  line-height: 1.5;
  white-space: nowrap;
}

.pill__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.pill--lav {
  color: var(--lav-700);
  background: var(--lav-50);
  border-color: rgba(130, 114, 239, 0.16);
}

.pill--mint {
  color: var(--mint-700);
  background: var(--mint-50);
  border-color: rgba(63, 157, 130, 0.18);
}

.pill--sky {
  color: var(--sky-600);
  background: var(--sky-100);
  border-color: rgba(93, 136, 201, 0.15);
}

.pill--danger {
  color: var(--danger-700);
  background: var(--danger-100);
  border-color: rgba(201, 88, 88, 0.14);
}

.pill--neutral {
  color: var(--ink-muted);
  background: var(--surface-muted);
  border-color: var(--line);
}
</style>
