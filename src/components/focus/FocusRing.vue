<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 64 },
  stroke: { type: Number, default: 4 },
  color: { type: String, default: 'var(--accent)' },
  track: { type: String, default: 'var(--surface-muted)' },
  label: { type: String, default: '进度' },
})

const radius = 46
const circumference = 2 * Math.PI * radius
const offset = computed(() => circumference * (1 - Math.min(100, Math.max(0, props.value)) / 100))
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }" role="img" :aria-label="label">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ring__track" cx="50" cy="50" :r="radius" :stroke="track" :stroke-width="stroke" />
      <circle
        class="ring__value"
        cx="50"
        cy="50"
        :r="radius"
        :stroke="color"
        :stroke-width="stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
      />
    </svg>
    <slot />
  </div>
</template>

<style scoped>
.ring {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
}

.ring svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring circle {
  fill: none;
  stroke-linecap: round;
}

.ring__value {
  transition: stroke-dashoffset 300ms linear;
}
</style>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .ring__value {
    transition: none;
  }
}
</style>
