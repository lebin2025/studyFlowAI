<script setup>
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="segmented" :class="`segmented--${size}`" role="group" :aria-label="label || '筛选'">
    <button
      v-for="option in props.options"
      :key="String(option.value)"
      type="button"
      class="segmented__item"
      :class="{ 'is-active': option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      <span>{{ option.label }}</span>
      <span v-if="option.count !== undefined" class="segmented__count">{{ option.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: var(--radius-pill);
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 560;
  white-space: nowrap;
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.segmented__item:hover {
  color: var(--ink);
}

.segmented__item.is-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.segmented__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  color: var(--ink-muted);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.segmented__item.is-active .segmented__count {
  background: var(--lav-100);
  color: var(--lav-700);
}

.segmented--sm .segmented__item {
  height: 28px;
  padding: 0 11px;
  font-size: 12px;
}
</style>
