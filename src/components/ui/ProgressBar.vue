<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  color: { type: String, default: 'var(--lav-600)' },
  height: { type: Number, default: 7 },
  label: { type: String, default: '完成进度' },
})

const clamped = computed(() => Math.min(100, Math.max(0, Number(props.value) || 0)))
</script>

<template>
  <div
    class="progress"
    :style="{ height: `${height}px` }"
    role="progressbar"
    :aria-valuenow="Math.round(clamped)"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <span
      class="progress__fill"
      :style="{ width: `${clamped}%`, background: color }"
    />
  </div>
</template>

<style scoped>
.progress {
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-muted);
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 600ms var(--ease);
}
</style>
