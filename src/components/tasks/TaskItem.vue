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
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 10px 12px 6px;
  border-radius: var(--radius-md);
  transition:
    background-color var(--duration-fast) var(--ease),
    opacity var(--duration-fast) var(--ease);
}

.task-item:hover {
  background: var(--surface-soft);
}

.task-item--compact {
  padding: 9px 8px 9px 4px;
}

.task-check {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  border: 1.5px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface);
  color: #fff;
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease);
}

.task-check:hover {
  border-color: var(--mint-500);
  background: var(--mint-50);
}

.task-check:active {
  transform: scale(0.92);
}

.task-check:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.task-item.is-done .task-check {
  border-color: var(--mint-600);
  background: var(--mint-600);
}

.task-body {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.task-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.task-title {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 550;
  line-height: 1.5;
  overflow-wrap: anywhere;
  transition: color var(--duration-fast) var(--ease);
}

.task-item.is-done .task-title {
  color: var(--ink-faint);
  text-decoration: line-through;
  text-decoration-color: rgba(164, 157, 173, 0.65);
}

.task-tag {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--mint-50);
  color: var(--mint-700);
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.6;
}

.task-priority {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-faint);
  font-size: 9.5px;
  font-weight: 550;
}

.task-priority__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.task-priority--high {
  color: var(--danger-700);
}

.task-priority--high .task-priority__dot {
  background: var(--danger-600);
}

.task-priority--medium .task-priority__dot {
  background: var(--sky-500);
}

.task-priority--low .task-priority__dot {
  background: var(--mint-500);
}

.task-description {
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.6;
}

.task-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 4px;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.task-meta__item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.task-plan {
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--lav-700);
}

.task-plan:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.task-criteria {
  width: 100%;
  color: var(--ink-faint);
  line-height: 1.55;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
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
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--ink-faint);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.task-action:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.task-action--danger:hover {
  background: var(--danger-100);
  color: var(--danger-700);
}

.task-item.is-busy {
  opacity: 0.72;
}

@media (max-width: 760px) {
  .task-actions {
    opacity: 1;
  }

  .task-action {
    width: 32px;
    height: 32px;
  }

  .task-title {
    font-size: 13px;
  }
}
</style>
