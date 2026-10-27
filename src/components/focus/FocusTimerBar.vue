<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, ChevronUp, Maximize2, Pause, Play, Square } from 'lucide-vue-next'
import { useFocusStore } from '@/stores/focus.js'

const focus = useFocusStore()
const route = useRoute()
const expanded = ref(false)
const root = ref(null)
let collapseTimer = null

const visible = computed(
  () => route.path.startsWith('/app') && focus.isActive && !focus.overlayOpen,
)

const phaseLabel = computed(() => (focus.phase === 'break' ? '休息' : '专注'))
const stateLabel = computed(() => (focus.status === 'paused' ? '已暂停' : '进行中'))
const toggleLabel = computed(() => (expanded.value ? '收起计时操作' : '展开计时操作'))

const clearCollapse = () => {
  if (collapseTimer) window.clearTimeout(collapseTimer)
  collapseTimer = null
}

const scheduleCollapse = () => {
  clearCollapse()
  if (!expanded.value) return
  collapseTimer = window.setTimeout(() => {
    expanded.value = false
  }, 4200)
}

const toggle = () => {
  expanded.value = !expanded.value
  if (expanded.value) scheduleCollapse()
  else clearCollapse()
}

const primary = () => {
  if (focus.status === 'running') focus.pause()
  else if (focus.status === 'paused') focus.resume()
  scheduleCollapse()
}

const end = () => {
  expanded.value = false
  clearCollapse()
  focus.end()
}

const openOverlay = () => {
  expanded.value = false
  clearCollapse()
  focus.toggleOverlay(true)
}

const onDocumentPointerDown = (event) => {
  if (!expanded.value || !root.value || root.value.contains(event.target)) return
  expanded.value = false
  clearCollapse()
}

const onKeydown = (event) => {
  if (event.key === 'Escape' && expanded.value) {
    expanded.value = false
    clearCollapse()
  }
}

watch(
  () => visible.value,
  (value) => {
    document.body.classList.toggle('has-focus-bar', value)
    if (!value) {
      expanded.value = false
      clearCollapse()
    }
  },
  { immediate: true },
)

watch(
  () => focus.overlayOpen,
  (value) => {
    if (value) {
      expanded.value = false
      clearCollapse()
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  clearCollapse()
  document.body.classList.remove('has-focus-bar')
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="focus-bar">
    <div
      v-if="visible"
      ref="root"
      class="focus-bar"
      :class="{ 'is-expanded': expanded }"
      role="region"
      aria-label="专注计时"
      @pointermove="expanded && scheduleCollapse()"
    >
      <button
        type="button"
        class="focus-bar__summary"
        :aria-expanded="expanded"
        aria-controls="focus-bar-actions"
        :aria-label="toggleLabel"
        @click="toggle"
      >
        <span class="focus-bar__dot" :class="{ 'is-paused': focus.status === 'paused' }" />
        <span class="focus-bar__label">{{ phaseLabel }} · {{ stateLabel }}</span>
        <strong class="focus-bar__time">{{ focus.formattedRemaining }}</strong>
        <ChevronUp v-if="expanded" :size="14" />
        <ChevronDown v-else :size="14" />
      </button>

      <div v-if="expanded" id="focus-bar-actions" class="focus-bar__actions">
        <button type="button" class="focus-bar__action focus-bar__action--primary" @click="primary">
          <Pause v-if="focus.status === 'running'" :size="14" />
          <Play v-else :size="14" />
          {{ focus.status === 'running' ? '暂停' : '继续' }}
        </button>
        <button type="button" class="focus-bar__action" @click="openOverlay">
          <Maximize2 :size="14" />
          专注页
        </button>
        <button type="button" class="focus-bar__action focus-bar__action--quiet" @click="end">
          <Square :size="13" />
          结束
        </button>
      </div>

      <span class="focus-bar__progress" aria-hidden="true">
        <span :style="{ width: `${focus.progress}%` }" />
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.focus-bar {
  position: fixed;
  top: 14px;
  left: 50%;
  z-index: 96;
  width: min(380px, calc(100vw - 28px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 18px;
  background: rgb(var(--macaron-cream-rgb) / 0.78);
  color: var(--glass-ink);
  box-shadow:
    0 18px 42px -28px rgba(56, 72, 61, 0.48),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(18px) saturate(112%);
  -webkit-backdrop-filter: blur(18px) saturate(112%);
  transform: translateX(-50%);
  transition:
    width 260ms var(--ease-spring),
    border-radius 260ms var(--ease);
}

.focus-bar.is-expanded {
  width: min(430px, calc(100vw - 28px));
  border-radius: 20px;
}

.focus-bar__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 13px;
  background: transparent;
  color: var(--glass-ink);
  text-align: left;
}

.focus-bar__dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(208, 69, 45, 0.1);
}

.focus-bar__dot.is-paused {
  background: var(--ink-faint);
  box-shadow: none;
}

.focus-bar__label {
  color: var(--ink-muted);
  font-size: 10.5px;
  font-weight: 550;
  white-space: nowrap;
}

.focus-bar__time {
  margin-left: auto;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.focus-bar__actions {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 6px;
  padding: 0 8px 9px;
}

.focus-bar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 31px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 10px;
  background: rgb(var(--macaron-cream-rgb) / 0.44);
  color: var(--glass-ink);
  font-size: 11px;
  font-weight: 600;
}

.focus-bar__action--primary {
  background: rgb(var(--macaron-mint-rgb) / 0.62);
}

.focus-bar__action--quiet {
  color: var(--ink-muted);
}

.focus-bar__progress {
  display: block;
  height: 2px;
  background: rgba(53, 72, 61, 0.08);
}

.focus-bar__progress > span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 400ms var(--ease);
}

.focus-bar-enter-active,
.focus-bar-leave-active {
  transition:
    opacity 180ms var(--ease),
    transform 320ms var(--ease-spring);
}

.focus-bar-enter-from,
.focus-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.focus-bar-enter-to,
.focus-bar-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 900px) {
  .focus-bar {
    top: calc(8px + env(safe-area-inset-top, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-bar,
  .focus-bar-enter-active,
  .focus-bar-leave-active {
    transition: none;
  }
}
</style>
