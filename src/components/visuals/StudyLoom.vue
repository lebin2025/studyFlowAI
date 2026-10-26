<script setup>
import { computed } from 'vue'

const props = defineProps({
  compact: { type: Boolean, default: false },
  label: { type: String, default: '学习路径编织图' },
})

const days = ['一', '二', '三', '四', '五', '六', '日']
const stages = ['01', '02', '03', '04']
const nodes = [
  { x: 80, y: 420, state: 'done' },
  { x: 180, y: 360, state: 'done' },
  { x: 280, y: 300, state: 'done' },
  { x: 380, y: 340, state: 'open' },
  { x: 480, y: 240, state: 'open' },
  { x: 580, y: 180, state: 'open' },
  { x: 680, y: 140, state: 'today' },
]

const active = computed(() => nodes.find((node) => node.state === 'today'))
</script>

<template>
  <figure class="loom" :class="{ 'loom--compact': compact }">
    <svg viewBox="0 0 760 520" role="img" :aria-label="label">
      <g class="loom__grid" aria-hidden="true">
        <line v-for="(day, index) in days" :key="`v-${day}`" :x1="80 + index * 100" y1="64" :x2="80 + index * 100" y2="456" />
        <line v-for="(stage, index) in stages" :key="`h-${stage}`" x1="64" :y1="96 + index * 100" x2="704" :y2="96 + index * 100" />
      </g>

      <g class="loom__labels" aria-hidden="true">
        <text v-for="(day, index) in days" :key="`day-${day}`" :x="80 + index * 100" y="486" text-anchor="middle">
          {{ day }}
        </text>
        <text v-for="(stage, index) in stages" :key="`stage-${stage}`" x="44" :y="100 + index * 100" text-anchor="middle">
          {{ stage }}
        </text>
      </g>

      <path
        class="loom__route"
        d="M80 420 L180 360 L280 300 L380 340 L480 240 L580 180 L680 140"
      />

      <g class="loom__nodes">
        <g v-for="(node, index) in nodes" :key="index" :class="`is-${node.state}`">
          <circle :cx="node.x" :cy="node.y" r="10" />
          <circle :cx="node.x" :cy="node.y" r="3" class="loom__core" />
        </g>
      </g>

      <g v-if="active" class="loom__today" aria-hidden="true">
        <line :x1="active.x" :y1="active.y - 26" :x2="active.x" :y2="active.y + 30" />
        <rect :x="active.x - 31" :y="active.y - 48" width="62" height="18" />
        <text :x="active.x" :y="active.y - 35" text-anchor="middle">TODAY</text>
      </g>

      <g class="loom__annotations" aria-hidden="true">
        <text x="80" y="42">GOAL / 目标</text>
        <text x="704" y="42" text-anchor="end">TIME / 时间</text>
        <text x="80" y="510">WARP / 阶段</text>
        <text x="704" y="510" text-anchor="end">WEFT / 每日行动</text>
      </g>
    </svg>
    <figcaption v-if="!compact">
      <span>FIG. 01</span>
      <span>目标不是一条直线，而是一张可以被每天走通的网。</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.loom {
  position: relative;
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
  stroke: var(--line-strong);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.loom__labels text,
.loom__annotations text {
  fill: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
}

.loom__route {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.5;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: loom-draw 1.8s var(--ease-out) 200ms forwards;
}

.loom__nodes circle {
  fill: var(--bg);
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
  fill: var(--bg);
}

.loom__nodes.is-today circle:first-child {
  fill: var(--accent);
  stroke: var(--accent);
}

.loom__today line {
  stroke: var(--accent);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.loom__today rect {
  fill: var(--accent);
}

.loom__today text {
  fill: var(--bg);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.08em;
}

.loom figcaption {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  line-height: 1.6;
  letter-spacing: 0.02em;
}

.loom figcaption span:last-child {
  max-width: 34ch;
  text-align: right;
}

.loom--compact svg {
  max-height: 340px;
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

@media (max-width: 700px) {
  .loom__labels text,
  .loom__annotations text {
    font-size: 10px;
  }

  .loom figcaption {
    display: block;
    font-size: 9px;
  }

  .loom figcaption span:last-child {
    display: block;
    margin-top: 4px;
    text-align: left;
  }
}
</style>
