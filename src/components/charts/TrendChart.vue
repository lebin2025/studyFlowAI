<script setup>
import { computed, ref } from 'vue'
import { formatDate, formatDateShort, formatMinutes, weekdayShort } from '@/utils/date.js'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const width = 760
const height = 252
const padding = { top: 16, right: 12, bottom: 30, left: 36 }
const innerWidth = width - padding.left - padding.right
const innerHeight = height - padding.top - padding.bottom

const maxValue = computed(() =>
  Math.max(1, ...props.data.map((row) => Number(row.total) || 0)),
)

const step = computed(() => {
  const count = props.data.length
  if (count <= 7) return 1
  if (count <= 14) return 2
  if (count <= 31) return 5
  return Math.ceil(count / 12)
})

const bars = computed(() => {
  const count = props.data.length || 1
  const slot = innerWidth / count
  const barWidth = Math.max(3, Math.min(22, slot * 0.52))
  return props.data.map((row, index) => {
    const total = Number(row.total) || 0
    const completed = Number(row.completed) || 0
    const totalHeight = (total / maxValue.value) * innerHeight
    const completedHeight = (completed / maxValue.value) * innerHeight
    const centerX = padding.left + slot * index + slot / 2
    const y = padding.top + innerHeight - totalHeight
    const baseY = padding.top + innerHeight
    return {
      ...row,
      index,
      centerX,
      baseY,
      y,
      totalHeight: Math.max(total ? 3 : 0, totalHeight),
      completedHeight: Math.max(completed ? 3 : 0, completedHeight),
      completedY: baseY - Math.max(completed ? 3 : 0, completedHeight),
      barWidth,
      slot,
      showLabel: index % step.value === 0 || index === count - 1,
      label:
        count <= 7
          ? weekdayShort(row.date)
          : formatDateShort(row.date),
    }
  })
})

const gridLines = computed(() =>
  [0, 0.5, 1].map((ratio) => ({
    y: padding.top + innerHeight - innerHeight * ratio,
    value: Math.round(maxValue.value * ratio),
  })),
)

const hovered = ref(null)
const activeBar = computed(() =>
  hovered.value === null ? null : bars.value[hovered.value],
)
const tooltipStyle = computed(() => {
  if (!activeBar.value) return {}
  return {
    left: `${(activeBar.value.centerX / width) * 100}%`,
    top: `${(activeBar.value.y / height) * 100}%`,
  }
})
</script>

<template>
  <div class="trend" @mouseleave="hovered = null">
    <svg
      class="trend__svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="`每日任务完成趋势，共 ${data.length} 天`"
    >
      <g class="trend__grid">
        <line
          v-for="line in gridLines"
          :key="line.y"
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="line.y"
          :y2="line.y"
        />
        <text
          v-for="line in gridLines"
          :key="`label-${line.y}`"
          :x="padding.left - 8"
          :y="line.y + 3"
          text-anchor="end"
        >
          {{ line.value }}
        </text>
      </g>

      <g v-for="bar in bars" :key="bar.date">
        <rect
          v-if="bar.total"
          :x="bar.centerX - bar.barWidth / 2"
          :y="bar.y"
          :width="bar.barWidth"
          :height="bar.totalHeight"
          rx="4"
          class="trend__track"
        />
        <rect
          v-if="bar.completed"
          :x="bar.centerX - bar.barWidth / 2"
          :y="bar.completedY"
          :width="bar.barWidth"
          :height="bar.completedHeight"
          rx="4"
          class="trend__bar"
        />
        <circle
          v-if="!bar.total"
          :cx="bar.centerX"
          :cy="bar.baseY - 2"
          r="1.6"
          class="trend__empty-dot"
        />
        <text
          v-if="bar.showLabel"
          :x="bar.centerX"
          :y="height - 10"
          text-anchor="middle"
          class="trend__label"
        >
          {{ bar.label }}
        </text>
        <rect
          :x="bar.centerX - bar.slot / 2"
          :y="padding.top"
          :width="bar.slot"
          :height="innerHeight"
          fill="transparent"
          @mouseenter="hovered = bar.index"
        />
      </g>
    </svg>

    <div v-if="activeBar" class="trend__tooltip" :style="tooltipStyle" aria-hidden="true">
      <strong>{{ formatDate(activeBar.date, { weekday: true }) }}</strong>
      <span>完成 {{ activeBar.completed }} / {{ activeBar.total }} 个任务</span>
      <span>计划 {{ formatMinutes(activeBar.plannedMinutes) }}</span>
    </div>

    <div class="trend__legend">
      <span><i class="trend__dot trend__dot--bar" /> 已完成</span>
      <span><i class="trend__dot trend__dot--track" /> 当日任务总数</span>
    </div>
  </div>
</template>

<style scoped>
.trend {
  position: relative;
  width: 100%;
}

.trend__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.trend__grid line {
  stroke: var(--line);
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.trend__grid text {
  fill: var(--ink-faint);
  font-size: 9px;
  font-family: var(--font-sans);
}

.trend__track {
  fill: var(--surface-muted);
}

.trend__bar {
  fill: var(--lav-500);
  transition: fill var(--duration-fast) var(--ease);
}

.trend g:hover .trend__bar {
  fill: var(--lav-600);
}

.trend__empty-dot {
  fill: var(--line-strong);
}

.trend__label {
  fill: var(--ink-faint);
  font-size: 8.5px;
  font-family: var(--font-sans);
}

.trend__tooltip {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow-md);
  transform: translate(-50%, -108%);
  pointer-events: none;
  white-space: nowrap;
  font-size: 9.5px;
  color: var(--ink-muted);
}

.trend__tooltip strong {
  color: var(--ink);
  font-size: 10px;
}

.trend__legend {
  display: flex;
  gap: 14px;
  margin-top: 4px;
  padding-left: 8px;
  color: var(--ink-faint);
  font-size: 9px;
}

.trend__legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.trend__dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}

.trend__dot--bar {
  background: var(--lav-500);
}

.trend__dot--track {
  background: var(--surface-muted);
}

@media (max-width: 600px) {
  .trend__tooltip {
    font-size: 9px;
    padding: 6px 8px;
  }
}
</style>
