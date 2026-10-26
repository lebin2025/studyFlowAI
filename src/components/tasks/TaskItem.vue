<script setup>
import { computed } from 'vue'
import { Check, Clock3, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-vue-next'
import { formatMinutes } from '@/utils/date.js'

const props = defineProps({
  task: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  showPlan: { type: Boolean, default: false },
  detailed: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle', 'edit', 'delete'])

const priorityLabel = computed(() => {
  if (props.task.priority === 'high') return '高优先级'
  if (props.task.priority === 'low') return '低优先级'
  return '中优先级'
})
</script>

<template>
  <div
    class="task-item"
    :class="{
      'is-done': task.isCompleted,
      'is-busy': busy,
      'task-item--compact': compact,
    }"
  >
    <button
      type="button"
      class="task-check"
      :aria-label="task.isCompleted ? `将「${task.title}」标记为未完成` : `将「${task.title}」标记为已完成`"
      :aria-pressed="task.isCompleted"
      :disabled="busy"
      @click="emit('toggle', !task.isCompleted)"
    >
      <Loader2 v-if="busy" class="spin" :size="13" />
      <Check v-else-if="task.isCompleted" :size="13" :stroke-width="3" />
    </button>

    <div class="task-body">
      <div class="task-title-row">
        <span class="task-title">{{ task.title }}</span>
        <span v-if="task.isReview" class="task-tag">复习</span>
        <span
          class="task-priority"
          :class="`task-priority--${task.priority}`"
          :title="priorityLabel"
        >
          <span class="task-priority__dot" aria-hidden="true" />
          {{ priorityLabel }}
        </span>
      </div>

      <p v-if="detailed && task.description" class="task-description">
        {{ task.description }}
      </p>

      <div class="task-meta">
        <span class="task-meta__item">
          <Clock3 :size="12" />
          {{ formatMinutes(task.durationMinutes) }}
        </span>
        <span v-if="task.actualMinutes !== null && task.actualMinutes !== undefined" class="task-meta__item">
          <RotateCcw :size="11" />
          实际 {{ formatMinutes(task.actualMinutes) }}
        </span>
        <RouterLink
          v-if="showPlan && task.planId"
          :to="`/app/plans/${task.planId}`"
          class="task-plan"
        >
          {{ task.planTitle || '查看计划' }}
        </RouterLink>
        <span v-if="detailed && task.completionCriteria" class="task-criteria">
          完成标准：{{ task.completionCriteria }}
        </span>
      </div>
    </div>

    <div class="task-actions">
      <button
        type="button"
        class="task-action"
        :aria-label="`编辑任务：${task.title}`"
        @click="emit('edit', task)"
      >
        <Pencil :size="14" />
      </button>
      <button
        type="button"
        class="task-action task-action--danger"
        :aria-label="`删除任务：${task.title}`"
        @click="emit('delete', task)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  margin: 0 -10px;
  padding: 10px;
  border-radius: 10px;
  transition: background-color var(--duration-fast) var(--ease);
}

.task-item:hover,
.task-item:focus-within {
  background: var(--surface-soft);
}

.task-item.is-done {
  opacity: 0.55;
}

.task-check {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  color: var(--accent-ink);
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease);
}

.task-check:hover {
  border-color: var(--accent);
}

.task-check:active {
  transform: scale(0.9);
}

.task-item.is-done .task-check {
  border-color: var(--accent);
  background: var(--accent);
}

.task-body {
  min-width: 0;
}

.task-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.task-title {
  color: var(--ink);
  font-size: 13px;
  font-weight: 550;
  line-height: 1.45;
}

.task-item.is-done .task-title {
  color: var(--ink-muted);
  text-decoration: line-through;
  text-decoration-color: var(--line-strong);
}

.task-tag {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--sage-soft);
  color: var(--sage);
  font-size: 9.5px;
  font-weight: 600;
}

.task-priority {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-faint);
  font-size: 10px;
}

.task-priority__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.task-priority--high {
  color: var(--accent);
}

.task-priority--medium {
  color: var(--blue);
}

.task-priority--low {
  color: var(--sage);
}

.task-description {
  max-width: 70ch;
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.6;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 10px;
  margin-top: 4px;
  color: var(--ink-faint);
  font-size: 10.5px;
  line-height: 1.5;
}

.task-meta__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.task-plan {
  color: var(--ink-muted);
  font-size: 10.5px;
}

.task-plan:hover {
  color: var(--accent);
}

.task-criteria {
  flex-basis: 100%;
  color: var(--ink-faint);
  font-size: 10px;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease);
}

.task-item:hover .task-actions,
.task-item:focus-within .task-actions {
  opacity: 1;
}

.task-action {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--ink-faint);
  transition:
    color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease);
}

.task-action:hover {
  background: var(--surface);
  color: var(--ink);
}

.task-action--danger:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.task-item--compact {
  grid-template-columns: 22px minmax(0, 1fr) auto;
  padding: 8px 10px;
}

.task-item--compact .task-title {
  font-size: 12px;
}

@media (hover: none) {
  .task-actions {
    opacity: 1;
  }
}

@media (max-width: 620px) {
  .task-item {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    margin: 0;
    padding: 10px 0;
  }

  .task-actions {
    opacity: 1;
  }
}
</style>
<style scoped>
.task-check {
  transition:
    background-color var(--duration) var(--ease),
    border-color var(--duration) var(--ease),
    transform 180ms var(--ease-spring);
}

.task-item.is-done .task-check {
  animation: task-check-pop 320ms var(--ease-spring);
}

@keyframes task-check-pop {
  0% {
    transform: scale(0.8);
  }
  55% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .task-item.is-done .task-check {
    animation: none;
  }
}
</style>

<style scoped>
.task-check {
  position: relative;
}

.task-item.is-done .task-check::after {
  content: "";
  position: absolute;
  inset: -5px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  opacity: 0;
  animation: task-check-ring 520ms var(--ease-out);
  pointer-events: none;
}

@keyframes task-check-ring {
  0% {
    opacity: 0.5;
    transform: scale(0.75);
  }
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

@media (prefers-reduced-motion: reduce) {
  .task-item.is-done .task-check::after {
    animation: none;
  }
}
</style>
