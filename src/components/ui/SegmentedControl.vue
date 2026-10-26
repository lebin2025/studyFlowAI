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
  gap: 0;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: transparent;
  scrollbar-width: none;
}

.segmented::-webkit-scrollbar {
  display: none;
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-right: 1px solid var(--line);
  border-radius: 0;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: 0.03em;
  white-space: nowrap;
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.segmented__item:last-child {
  border-right: 0;
}

.segmented__item:hover {
  color: var(--ink);
  background: var(--surface);
}

.segmented__item.is-active {
  color: var(--bg);
  background: var(--ink);
}

.segmented__count {
  min-width: 16px;
  padding: 0 3px;
  border: 1px solid currentColor;
  border-radius: 0;
  font-size: 7.5px;
  line-height: 13px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.segmented__item.is-active .segmented__count {
  border-color: rgba(241, 237, 228, 0.4);
  background: transparent;
  color: var(--bg);
}

.segmented--sm .segmented__item {
  height: 26px;
  padding: 0 9px;
  font-size: 8px;
}
</style>