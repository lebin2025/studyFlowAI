<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 116 },
  stroke: { type: Number, default: 10 },
  color: { type: String, default: 'var(--lav-600)' },
  label: { type: String, default: '完成度' },
  showText: { type: Boolean, default: true },
})

const clamped = computed(() => Math.min(100, Math.max(0, Math.round(props.value))))
const radius = computed(() => (props.size - props.stroke) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => circumference.value * (1 - clamped.value / 100))
</script>

<template>
  <div
    class="ring"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="progressbar"
    :aria-valuenow="clamped"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--line)"
        :stroke-width="stroke"
      />
      <circle
        class="ring__progress"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
      />
    </svg>
    <div v-if="showText" class="ring__text" aria-hidden="true">
      <strong>{{ clamped }}<span>%</span></strong>
      <span class="ring__label">{{ label }}</span>
    </div>
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
}

.ring__progress {
  transition: stroke-dashoffset 700ms var(--ease);
}

.ring__text {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.ring__text strong {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 660;
  letter-spacing: -0.04em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.ring__text strong span {
  font-size: 12px;
  font-weight: 600;
  margin-left: 1px;
  color: var(--ink-muted);
}

.ring__label {
  margin-top: 5px;
  font-size: 10.5px;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}
</style>
