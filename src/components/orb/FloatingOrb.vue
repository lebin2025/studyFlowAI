<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  CalendarCheck2,
  FileText,
  ListChecks,
  Pause,
  Play,
  Plus,
  Sparkles,
  Square,
  Timer,
  Volume2,
  Waves,
  X,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.js'
import { useActivityStore } from '@/stores/activity.js'
import { useAmbienceStore } from '@/stores/ambience.js'
import { useDraftsStore } from '@/stores/drafts.js'
import { useFocusStore } from '@/stores/focus.js'
import { useUiStore } from '@/stores/ui.js'
import Mascot from '@/components/illustrations/Mascot.vue'
import FocusRing from '@/components/focus/FocusRing.vue'

const auth = useAuthStore()
const activity = useActivityStore()
const ambience = useAmbienceStore()
const drafts = useDraftsStore()
const focus = useFocusStore()
const router = useRouter()
const route = useRoute()
const ui = useUiStore()

const root = ref(null)
const panel = ref(null)
const orbButton = ref(null)
const open = ref(false)
const hovered = ref(false)
const completionPulse = ref(false)
const panelId = 'studyflow-orb-panel'
let completionTimer = null
const initialMobile = typeof window !== 'undefined' && window.innerWidth <= 900
const position = reactive({
  right: initialMobile ? 14 : 24,
  bottom: initialMobile ? 80 : 24,
})
const isMobile = ref(initialMobile)
const panelLeft = ref(0)
const panelTop = ref(0)
const dragging = ref(false)
let dragState = null
let suppressClick = false

const orbSize = () => (window.innerWidth <= 900 ? 56 : 66)
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const positionKey = computed(() => `studyflow:orb:v1:${auth.user?.id || 'guest'}`)

const panelStyle = computed(() =>
  isMobile.value ? {} : { left: `${panelLeft.value}px`, top: `${panelTop.value}px` },
)

const mascotVariant = computed(() => {
  if (orbState.value === 'rest') return 'sleepy'
  if (orbState.value === 'processing') return 'thinking'
  if (orbState.value === 'success') return 'cheer'
  if (orbState.value === 'error') return 'thinking'
  return 'happy'
})

watch(
  () => focus.completionToken,
  (token) => {
    if (!token) return
    completionPulse.value = true
    if (completionTimer) window.clearTimeout(completionTimer)
    completionTimer = window.setTimeout(() => {
      completionPulse.value = false
    }, 4500)
  },
)

const orbState = computed(() => {
  if (activity.processing) return 'processing'
  if (focus.restDue) return 'rest'
  if (focus.status === 'running' && focus.phase === 'focus') return 'focusing'
  if (focus.status === 'paused') return 'paused'
  if (focus.status === 'finished' && completionPulse.value) return 'success'
  if (activity.recentOutcome) return activity.recentOutcome
  if (hovered.value) return 'hover'
  if (ambience.mode === 'minimal') return 'minimal'
  return 'idle'
})

const characterVisible = computed(
  () =>
    hovered.value ||
    open.value ||
    ['processing', 'success', 'rest', 'error'].includes(orbState.value),
)

const stateLabel = computed(() => {
  if (orbState.value === 'processing') return '正在生成'
  if (orbState.value === 'rest') return '需要休息'
  if (orbState.value === 'focusing') return focus.phase === 'break' ? '休息中' : '专注中'
  if (orbState.value === 'paused') return '已暂停'
  if (orbState.value === 'success') return '已完成'
  if (orbState.value === 'error') return '生成失败'
  if (orbState.value === 'minimal') return '静音模式'
  return '学习助手'
})

const stateDetail = computed(() => {
  if (activity.processing) return 'AI 正在整理你的学习计划'
  if (focus.restDue) return `已连续专注 ${focus.continuousMinutes} 分钟`
  if (focus.status === 'running') return `${focus.phase === 'break' ? '休息' : '专注'} · ${focus.formattedRemaining}`
  if (focus.status === 'paused') return `已暂停 · ${focus.formattedRemaining}`
  if (focus.status === 'finished') {
    return focus.phase === 'break' ? '休息结束，可以继续' : '这一轮专注完成'
  }
  if (activity.recentOutcome === 'success') return activity.message || '操作已完成'
  if (activity.recentOutcome === 'error') return activity.message || '请重试'
  return '专注、计时与快捷操作'
})

const displayTime = computed(() =>
  focus.status === 'idle' ? `${String(focus.durationMinutes).padStart(2, '0')}:00` : focus.formattedRemaining,
)

const loadPosition = () => {
  isMobile.value = window.innerWidth <= 900
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(positionKey.value) || 'null')
  } catch {
    saved = null
  }
  const size = orbSize()
  const min = 8
  const maxRight = Math.max(min, window.innerWidth - size - min)
  const minBottom = isMobile.value ? 72 : min
  const maxBottom = Math.max(minBottom, window.innerHeight - size - minBottom)
  const fallbackRight = isMobile.value ? 14 : 24
  const fallbackBottom = isMobile.value ? 80 : 24
  position.right = clamp(Number(saved?.right) || fallbackRight, min, maxRight)
  position.bottom = clamp(Number(saved?.bottom) || fallbackBottom, minBottom, maxBottom)
}

const savePosition = () => {
  try {
    localStorage.setItem(
      positionKey.value,
      JSON.stringify({ right: position.right, bottom: position.bottom }),
    )
  } catch {
    /* position persistence is best-effort */
  }
}

const updatePanelPosition = () => {
  if (!open.value || isMobile.value || !panel.value || !orbButton.value) return
  const orbRect = orbButton.value.getBoundingClientRect()
  const width = panel.value.offsetWidth || 370
  const height = panel.value.offsetHeight || 520
  const left =
    orbRect.left + orbRect.width / 2 < window.innerWidth / 2
      ? orbRect.left
      : orbRect.right - width
  panelLeft.value = clamp(left, 12, Math.max(12, window.innerWidth - width - 12))
  let top = orbRect.top - height - 12
  if (top < 12) top = orbRect.bottom + 12
  panelTop.value = clamp(top, 12, Math.max(12, window.innerHeight - height - 12))
}

const onResize = () => {
  loadPosition()
  if (open.value) nextTick(updatePanelPosition)
}

const onOrbPointerDown = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  dragState = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    right: position.right,
    bottom: position.bottom,
    moved: false,
    previousUserSelect: document.body.style.userSelect,
  }
  dragging.value = true
  document.body.style.userSelect = 'none'
  orbButton.value?.setPointerCapture?.(event.pointerId)
}

const onOrbPointerMove = (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const dx = event.clientX - dragState.x
  const dy = event.clientY - dragState.y
  if (!dragState.moved && Math.hypot(dx, dy) < 4) return
  dragState.moved = true
  const size = orbSize()
  const maxRight = Math.max(8, window.innerWidth - size - 8)
  const maxBottom = Math.max(8, window.innerHeight - size - 8)
  position.right = clamp(dragState.right - dx, 8, maxRight)
  position.bottom = clamp(dragState.bottom - dy, isMobile.value ? 72 : 8, maxBottom)
  hovered.value = false
  if (open.value) updatePanelPosition()
}

const onOrbPointerUp = (event) => {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const moved = dragState.moved
  document.body.style.userSelect = dragState.previousUserSelect || ''
  if (moved) window.getSelection?.()?.removeAllRanges()
  dragging.value = false
  try {
    orbButton.value?.releasePointerCapture?.(event.pointerId)
  } catch {
    /* pointer capture may already be released */
  }
  dragState = null
  if (moved) {
    suppressClick = true
    savePosition()
    window.setTimeout(() => {
      suppressClick = false
    }, 260)
  }
}

const onOrbClick = (event) => {
  if (suppressClick) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  toggle()
}

const onOrbKeydown = (event) => {
  const amount = event.shiftKey ? 24 : 8
  const moves = {
    ArrowUp: [0, amount],
    ArrowDown: [0, -amount],
    ArrowLeft: [amount, 0],
    ArrowRight: [-amount, 0],
  }
  if (!moves[event.key]) return
  event.preventDefault()
  const [rightDelta, bottomDelta] = moves[event.key]
  const size = orbSize()
  const minBottom = isMobile.value ? 72 : 8
  position.right = clamp(
    position.right + rightDelta,
    8,
    Math.max(8, window.innerWidth - size - 8),
  )
  position.bottom = clamp(
    position.bottom + bottomDelta,
    minBottom,
    Math.max(minBottom, window.innerHeight - size - 8),
  )
  savePosition()
  if (open.value) updatePanelPosition()
}

const durationOptions = [15, 25, 45, 60]

const go = (path) => {
  close()
  if (path.startsWith('/app') && !auth.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: path } })
    return
  }
  router.push(path)
}

const quickActions = computed(() => [
  { label: '新建计划', caption: '用 AI 生成', icon: Plus, run: () => go('/app/plans/new') },
  { label: '新建任务', caption: '加入今天', icon: ListChecks, run: () => go('/app/tasks?create=1') },
  { label: '今日任务', caption: '回到仪表盘', icon: CalendarCheck2, run: () => go('/app') },
  { label: '草稿箱', caption: `${drafts.count} 份草稿`, icon: FileText, run: () => go('/app/drafts') },
])

const focusPrimary = async () => {
  if (focus.status === 'running') {
    focus.pause()
    return
  }
  if (focus.status === 'paused') {
    focus.resume()
    return
  }
  focus.startFocus(focus.durationMinutes || 25, { openOverlay: false })
}

const startFocus = (minutes) => {
  focus.startFocus(minutes, { openOverlay: false })
}

const openFocus = () => {
  close()
  focus.toggleOverlay(true)
}

const endFocus = () => {
  focus.end()
  ui.info('专注已结束')
}

const selectAmbience = async (mode) => {
  try {
    await ambience.setMode(mode)
    if (mode !== 'minimal' && !ambience.playing) await ambience.play(mode)
  } catch {
    ui.error('环境音切换失败')
  }
}

const toggleAmbience = async () => {
  try {
    await ambience.toggle()
  } catch {
    ui.error('环境音播放失败')
  }
}

const focusables = () => {
  if (!panel.value) return []
  return Array.from(
    panel.value.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

const onKeydown = (event) => {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const onPointerDown = (event) => {
  if (!open.value || root.value?.contains(event.target)) return
  close()
}

const openPanel = async () => {
  open.value = true
  await nextTick()
  updatePanelPosition()
  panel.value?.querySelector('button, a, input')?.focus()
}

const close = () => {
  if (!open.value) return
  const restore = panel.value?.contains(document.activeElement)
  open.value = false
  if (restore) nextTick(() => orbButton.value?.focus())
}

const toggle = () => {
  if (open.value) close()
  else openPanel()
}

watch(
  () => route.fullPath,
  () => close(),
)

watch(
  () => auth.user?.id,
  () => {
    loadPosition()
    if (open.value) nextTick(updatePanelPosition)
  },
)

onMounted(() => {
  loadPosition()
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', onResize)
  if (dragState) document.body.style.userSelect = dragState.previousUserSelect || ''
  if (completionTimer) window.clearTimeout(completionTimer)
})
</script>

<template>
  <div
    ref="root"
    class="orb-root"
    :class="{ 'is-expanded': open }"
    :style="{ right: `${position.right}px`, bottom: `${position.bottom}px` }"
  >
    <Transition name="orb-panel">
      <section
        v-if="open"
        :id="panelId"
        ref="panel"
        class="orb-panel"
        :style="panelStyle"
        role="dialog"
        aria-label="StudyFlow 快捷中心"
      >
        <header class="orb-panel__head">
          <div class="orb-panel__status">
            <span class="orb-status-dot" :class="`is-${orbState}`" />
            <div>
              <strong>{{ stateLabel }}</strong>
              <span>{{ stateDetail }}</span>
            </div>
          </div>
          <button type="button" class="orb-panel__close" aria-label="关闭快捷中心" @click="close">
            <X :size="15" />
          </button>
        </header>

        <div class="orb-panel__quick">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            class="orb-quick"
            @click="action.run"
          >
            <span class="orb-quick__icon"><component :is="action.icon" :size="16" /></span>
            <span class="orb-quick__text">
              <strong>{{ action.label }}</strong>
              <span>{{ action.caption }}</span>
            </span>
            <ArrowRight :size="12" class="orb-quick__arrow" />
          </button>
        </div>

        <section class="orb-timer">
          <div class="orb-timer__head">
            <span>专注计时</span>
            <span class="orb-timer__mode">{{ focus.phase === 'break' ? '休息' : 'Focus' }} · 今日 {{ focus.todayFocusedMinutes }} 分</span>
          </div>
          <div class="orb-timer__body">
            <FocusRing :value="focus.progress" :size="66" :stroke="4" label="专注进度">
              <Timer :size="18" />
            </FocusRing>
            <div class="orb-timer__readout">
              <strong>{{ displayTime }}</strong>
              <span>{{ focus.status === 'running' ? '进行中' : focus.status === 'paused' ? '已暂停' : focus.status === 'finished' ? '已完成' : '准备开始' }}</span>
            </div>
            <button type="button" class="orb-timer__primary" :aria-label="focus.status === 'running' ? '暂停专注' : '开始专注'" @click="focusPrimary">
              <Pause v-if="focus.status === 'running'" :size="16" />
              <Play v-else :size="16" />
            </button>
          </div>
          <div class="orb-timer__durations" aria-label="专注时长">
            <button
              v-for="minutes in durationOptions"
              :key="minutes"
              type="button"
              :class="{ 'is-active': focus.durationMinutes === minutes }"
              @click="startFocus(minutes)"
            >
              {{ minutes }} 分
            </button>
          </div>
          <div class="orb-timer__actions">
            <button type="button" class="orb-text-button" @click="openFocus">
              打开专注模式
            </button>
            <button v-if="focus.isActive" type="button" class="orb-text-button" @click="endFocus">
              <Square :size="10" />
              结束
            </button>
          </div>
        </section>

        <section class="orb-ambience">
          <div class="orb-ambience__head">
            <span>环境音</span>
            <span>{{ ambience.modeLabel }}</span>
          </div>
          <div class="orb-modes">
            <button
              v-for="track in ambience.tracks"
              :key="track.id"
              type="button"
              :class="{ 'is-active': ambience.mode === track.id }"
              @click="selectAmbience(track.id)"
            >
              {{ track.label }}
            </button>
            <button type="button" class="orb-mode-play" :aria-label="ambience.playing ? '暂停环境音' : '播放环境音'" @click="toggleAmbience">
              <Pause v-if="ambience.playing" :size="13" />
              <Play v-else :size="13" />
            </button>
          </div>
          <p v-if="ambience.error" class="orb-error">{{ ambience.error }}</p>
          <div class="orb-volume">
            <Volume2 :size="14" />
            <input
              v-model.number="ambience.volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="环境音音量"
              :disabled="ambience.mode === 'minimal'"
              @input="ambience.setVolume(ambience.volume)"
            />
          </div>
        </section>

        <footer class="orb-panel__foot">
          <Waves :size="12" />
          <span>真实环境音 · 不自动播放</span>
        </footer>
      </section>
    </Transition>

    <button
      ref="orbButton"
      type="button"
      class="orb"
      :class="[
        `is-${orbState}`,
        { 'is-open': open, 'is-dragging': dragging, 'is-character': characterVisible },
      ]"
      :aria-expanded="open"
      :aria-controls="open ? panelId : undefined"
      aria-label="打开 StudyFlow 快捷中心"
      title="拖动调整位置"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @pointerdown="onOrbPointerDown"
      @pointermove="onOrbPointerMove"
      @pointerup="onOrbPointerUp"
      @pointercancel="onOrbPointerUp"
      @click="onOrbClick"
      @keydown="onOrbKeydown"
    >
      <span class="orb__aura" aria-hidden="true" />
      <span class="orb__sphere" aria-hidden="true">
        <span class="orb__core">
          <Sparkles :size="19" />
        </span>
      </span>
      <span class="orb__character" aria-hidden="true">
        <Mascot :size="66" :variant="mascotVariant" :animated="false" />
      </span>
      <span class="orb__state">{{ stateLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.orb-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  width: 66px;
  height: 66px;
  pointer-events: none;
}

.orb-root > .orb,
.orb-root > .orb-panel {
  pointer-events: auto;
}

/* Orb visual -------------------------------------------------------------- */
.orb {
  position: relative;
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--on-dark);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    transform 220ms var(--ease),
    opacity 180ms var(--ease);
  animation: orb-breathe 5.5s var(--ease-in-out) infinite;
}

.orb.is-dragging {
  cursor: grabbing;
}

.orb:hover,
.orb.is-open {
  transform: scale(1.045);
}

.orb:active {
  transform: scale(0.97);
}

.orb__sphere {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 25%, rgba(255, 255, 255, 0.34), transparent 24%),
    radial-gradient(circle at 70% 75%, rgba(208, 69, 45, 0.5), transparent 54%),
    radial-gradient(circle at 50% 50%, #2e2a25, #141311 72%);
  box-shadow:
    0 20px 50px -22px rgba(23, 22, 20, 0.75),
    inset 0 1px 1px rgba(255, 255, 255, 0.28);
  transition:
    opacity 180ms var(--ease),
    transform 320ms var(--ease-spring);
}

.orb:hover .orb__sphere,
.orb.is-open .orb__sphere {
  box-shadow:
    0 26px 62px -22px rgba(23, 22, 20, 0.82),
    inset 0 1px 1px rgba(255, 255, 255, 0.34);
}

.orb.is-character .orb__sphere {
  opacity: 0;
  transform: scale(0.55) rotate(-6deg);
}

.orb__aura {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(208, 69, 45, 0.22), transparent 66%);
  opacity: 0.58;
  filter: blur(5px);
  animation: orb-aura 6s var(--ease-in-out) infinite;
  pointer-events: none;
}

.orb__core {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.orb__character {
  position: absolute;
  inset: -1px;
  z-index: 2;
  display: grid;
  place-items: center;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 10px 14px rgba(23, 22, 20, 0.2));
  transform: translateY(7px) scale(0.55) rotate(-5deg);
  transform-origin: bottom center;
  transition:
    opacity 180ms var(--ease),
    transform 340ms var(--ease-spring);
}

.orb__character :deep(svg) {
  width: 100%;
  height: 100%;
}

.orb.is-character .orb__character {
  opacity: 1;
  transform: none;
}

.orb.is-character .orb__aura {
  opacity: 0.34;
}

.orb__state {
  position: absolute;
  right: 4px;
  bottom: -23px;
  color: var(--ink-muted);
  font-size: 10px;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(-3px);
  transition:
    opacity 180ms var(--ease),
    transform 180ms var(--ease);
}

.orb:hover .orb__state,
.orb.is-open .orb__state {
  opacity: 1;
  transform: none;
}

.orb.is-focusing .orb__aura {
  opacity: 0.42;
  animation-duration: 8s;
}

.orb.is-focusing .orb__core {
  background: rgba(208, 69, 45, 0.16);
}

.orb.is-processing .orb__aura {
  opacity: 0.9;
  animation-duration: 2.2s;
}

.orb.is-success .orb__aura {
  background: radial-gradient(circle, rgba(79, 107, 93, 0.36), transparent 66%);
}

.orb.is-error .orb__aura {
  background: radial-gradient(circle, rgba(208, 69, 45, 0.45), transparent 62%);
}

.orb.is-rest .orb__aura {
  background: radial-gradient(circle, rgba(154, 115, 56, 0.4), transparent 66%);
}

@keyframes orb-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.025);
  }
}

@keyframes orb-aura {
  0%,
  100% {
    transform: scale(0.94);
  }
  50% {
    transform: scale(1.08);
  }
}

/* Panel ------------------------------------------------------------------- */
.orb-panel {
  position: fixed;
  z-index: 91;
  right: auto;
  bottom: auto;
  width: min(370px, calc(100vw - 32px));
  max-height: min(680px, calc(100dvh - 120px));
  overflow: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 24px;
  background: #fffdfa !important;
  box-shadow:
    0 32px 80px -30px rgba(23, 22, 20, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform-origin: bottom right;
  isolation: isolate;
  scrollbar-width: none;
}

.orb-panel::-webkit-scrollbar {
  display: none;
}

@supports not (backdrop-filter: blur(1px)) {
  .orb-panel {
    background: #fffdfa !important;
  }
}

.orb-panel-enter-active,
.orb-panel-leave-active {
  transition:
    opacity 220ms var(--ease),
    transform 320ms var(--ease);
}

.orb-panel-enter-from,
.orb-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.94);
}

.orb-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 12px;
}

.orb-panel__status {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.orb-panel__avatar {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px rgba(23, 22, 20, 0.04);
}

.orb-panel__avatar :deep(svg) {
  width: 38px;
  height: 38px;
}

.orb-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sage);
}

.orb-panel__avatar .orb-status-dot {
  position: absolute;
  right: 1px;
  bottom: 2px;
  border: 1.5px solid var(--surface);
}

.orb-status-dot.is-focusing,
.orb-status-dot.is-processing {
  background: var(--accent);
}

.orb-status-dot.is-rest {
  background: var(--ochre);
}

.orb-status-dot.is-error {
  background: var(--accent-deep);
}

.orb-panel__status strong {
  display: block;
  color: var(--ink);
  font-size: 13px;
  font-weight: 620;
}

.orb-panel__status > div > span {
  display: block;
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.45;
}

.orb-panel__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--ink-muted);
}

.orb-panel__close:hover {
  background: rgba(23, 22, 20, 0.06);
  color: var(--ink);
}

.orb-panel__quick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.orb-quick {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 9px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.42);
  text-align: left;
  transition:
    background-color 160ms var(--ease),
    transform 160ms var(--ease);
}

.orb-quick:hover {
  background: rgba(255, 255, 255, 0.76);
  transform: translateY(-1px);
}

.orb-quick__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.orb-quick__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.orb-quick__text strong {
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
}

.orb-quick__text span {
  overflow: hidden;
  color: var(--ink-faint);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orb-quick__arrow {
  flex: none;
  margin-left: auto;
  color: var(--ink-faint);
}

.orb-timer,
.orb-ambience {
  margin-top: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.36);
}

.orb-timer__head,
.orb-ambience__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.orb-timer__mode {
  color: var(--accent-deep);
  font-weight: 600;
}

.orb-timer__body {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 9px;
}

.orb-timer__readout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.orb-timer__readout strong {
  color: var(--ink);
  font-size: 22px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.orb-timer__readout span {
  margin-top: 3px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.orb-timer__primary {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--bg);
}

.orb-timer__durations {
  display: flex;
  gap: 4px;
  margin-top: 10px;
}

.orb-timer__durations button {
  flex: 1;
  height: 26px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink-muted);
  font-size: 10px;
}

.orb-timer__durations button.is-active {
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 600;
}

.orb-timer__actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 9px;
}

.orb-text-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-muted);
  font-size: 10px;
}

.orb-text-button:hover {
  color: var(--accent);
}

.orb-modes {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 9px;
}

.orb-modes > button {
  padding: 5px 8px;
  border-radius: 7px;
  color: var(--ink-muted);
  font-size: 10px;
}

.orb-modes > button.is-active {
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 600;
}

.orb-mode-play {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border-radius: 50%;
  background: #fffdfa !important;
  color: var(--ink);
}

.orb-volume {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  color: var(--ink-faint);
}

.orb-volume input {
  width: 100%;
  accent-color: var(--accent);
}

.orb-panel__foot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 2px 1px;
  color: var(--ink-faint);
  font-size: 9px;
}

@media (max-width: 900px) {
  .orb-root {
    width: 56px;
    height: 56px;
  }

  .orb {
    width: 56px;
    height: 56px;
  }

  .orb-panel {
    position: fixed;
    right: 10px;
    bottom: calc(146px + env(safe-area-inset-bottom, 0px));
    left: 10px;
    width: auto;
    max-height: min(72dvh, 560px);
    border-radius: 20px;
  }

  .orb-panel__quick {
    gap: 8px;
  }

  .orb__state {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb,
  .orb__aura {
    animation: none;
  }
}
</style>

<style scoped>
.orb-error {
  margin-top: 7px;
  color: var(--danger-700);
  font-size: 10px;
}
</style>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .orb-panel-enter-active,
  .orb-panel-leave-active {
    transition: none;
  }
}
</style>
