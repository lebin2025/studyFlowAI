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
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  transition: opacity var(--duration-fast) var(--ease);
}

.task-item:last-child {
  border-bottom: 0;
}

.task-item.is-done {
  opacity: 0.6;
}

.task-check {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 1px solid var(--line-strong);
  color: var(--bg);
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.task-check:hover {
  border-color: var(--accent);
}

.task-item.is-done .task-check {
  border-color: var(--ink);
  background: var(--ink);
}

.task-body {
  min-width: 0;
}

.task-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 8px;
}

.task-title {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 560;
  line-height: 1.45;
  letter-spacing: -0.012em;
}

.task-item.is-done .task-title {
  color: var(--ink-muted);
  text-decoration: line-through;
  text-decoration-color: var(--line-strong);
}

.task-tag {
  padding: 1px 5px;
  border: 1px solid var(--sage);
  color: var(--sage);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.03em;
}

.task-priority {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.02em;
}

.task-priority__dot {
  width: 4px;
  height: 4px;
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
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 5px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
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
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 8px;
}

.task-plan:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.task-criteria {
  flex-basis: 100%;
  color: var(--ink-faint);
  font-family: var(--font-sans);
  font-size: 9.5px;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 1px;
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
  padding: 9px 0;
  gap: 10px;
}

.task-item--compact .task-title {
  font-size: 12px;
}

.task-item--compact .task-meta {
  margin-top: 2px;
}

@media (hover: none) {
  .task-actions {
    opacity: 1;
  }
}

@media (max-width: 620px) {
  .task-item {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 11px 0;
  }

  .task-actions {
    opacity: 1;
  }
}
</style>