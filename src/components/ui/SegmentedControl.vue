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
  align-items: stretch;
  gap: 2px;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--surface-muted);
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 7px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 550;
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
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-xs);
  font-weight: 600;
}

.segmented__count {
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.segmented__item.is-active .segmented__count {
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.segmented--sm .segmented__item {
  height: 26px;
  padding: 0 9px;
  font-size: 11px;
}
</style>