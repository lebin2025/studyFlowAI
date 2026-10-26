<script setup>
import { computed } from 'vue'

const props = defineProps({
  compact: { type: Boolean, default: false },
  label: { type: String, default: '学习路径图' },
})

const days = ['一', '二', '三', '四', '五', '六', '日']
const stages = ['1', '2', '3', '4']
const nodes = [
  { x: 80, y: 310, state: 'done' },
  { x: 180, y: 270, state: 'done' },
  { x: 280, y: 220, state: 'done' },
  { x: 380, y: 250, state: 'open' },
  { x: 480, y: 170, state: 'open' },
  { x: 580, y: 130, state: 'open' },
  { x: 680, y: 105, state: 'today' },
]

const active = computed(() => nodes.find((node) => node.state === 'today'))
</script>

<template>
  <figure class="loom" :class="{ 'loom--compact': compact }">
    <svg viewBox="0 0 760 430" role="img" :aria-label="label">
      <g class="loom__grid" aria-hidden="true">
        <line v-for="(day, index) in days" :key="`v-${day}`" :x1="80 + index * 100" y1="64" :x2="80 + index * 100" y2="360" />
        <line v-for="(stage, index) in stages" :key="`h-${stage}`" x1="58" :y1="88 + index * 76" x2="704" :y2="88 + index * 76" />
      </g>

      <g class="loom__labels" aria-hidden="true">
        <text v-for="(day, index) in days" :key="`day-${day}`" :x="80 + index * 100" y="390" text-anchor="middle">
          {{ day }}
        </text>
        <text v-for="(stage, index) in stages" :key="`stage-${stage}`" x="36" :y="92 + index * 76" text-anchor="middle">
          {{ stage }}
        </text>
      </g>

      <path class="loom__route" d="M80 310 L180 270 L280 220 L380 250 L480 170 L580 130 L680 105" />

      <g class="loom__nodes">
        <g v-for="(node, index) in nodes" :key="index" :class="`is-${node.state}`">
          <circle :cx="node.x" :cy="node.y" r="8" />
          <circle :cx="node.x" :cy="node.y" r="2.5" class="loom__core" />
        </g>
      </g>

      <g v-if="active" class="loom__today" aria-hidden="true">
        <line :x1="active.x" :y1="active.y - 20" :x2="active.x" :y2="active.y + 22" />
        <circle :cx="active.x" :cy="active.y - 28" r="3" />
        <text :x="active.x" :y="active.y - 38" text-anchor="middle">今天</text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.loom {
  margin: 0;
  color: var(--ink);
}

.loom svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.loom__grid line {
  stroke: var(--line);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.loom__labels text {
  fill: var(--ink-faint);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}

.loom__route {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: loom-draw 1.4s var(--ease-out) 120ms forwards;
}

.loom__nodes circle {
  fill: var(--surface);
  stroke: var(--ink);
  stroke-width: 1.5;
}

.loom__nodes .loom__core {
  fill: var(--ink);
  stroke: none;
}

.loom__nodes.is-done circle {
  fill: var(--ink);
}

.loom__nodes.is-done .loom__core {
  fill: var(--surface);
}

.loom__nodes.is-today circle:first-child {
  fill: var(--accent);
  stroke: var(--accent);
}

.loom__today line {
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 2 4;
}

.loom__today circle {
  fill: var(--accent);
}

.loom__today text {
  fill: var(--accent);
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
}

.loom--compact svg {
  max-height: 320px;
}

@keyframes loom-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loom__route {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
