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
const snappedEdge = ref('right')
const scrolling = ref(false)
let dragState = null
let suppressClick = false
let scrollTimer = null

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

const edgeMargin = () => (isMobile.value ? 14 : 20)
const mobileMinBottom = () => (isMobile.value ? 72 : 8)

const hideTranslation = computed(() => {
  if (!scrolling.value || open.value) return '0px 0px'
  const distance = Math.round(orbSize() * 0.8)
  if (snappedEdge.value === 'left') return `-${distance}px 0px`
  if (snappedEdge.value === 'top') return `0px -${distance}px`
  if (snappedEdge.value === 'bottom') return `0px ${distance}px`
  return `${distance}px 0px`
})

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
  const minBottom = mobileMinBottom()
  const maxBottom = Math.max(minBottom, window.innerHeight - size - minBottom)
  const fallbackRight = isMobile.value ? 14 : 24
  const fallbackBottom = isMobile.value ? 80 : 24
  position.right = clamp(Number(saved?.right) || fallbackRight, min, maxRight)
  position.bottom = clamp(Number(saved?.bottom) || fallbackBottom, minBottom, maxBottom)
  snappedEdge.value = ['left', 'right', 'top', 'bottom'].includes(saved?.edge)
    ? saved.edge
    : inferredEdge()
}

const inferredEdge = () => {
  const size = orbSize()
  const x = window.innerWidth - position.right - size / 2
  const y = window.innerHeight - position.bottom - size / 2
  const distances = {
    left: x,
    right: window.innerWidth - x,
    top: y,
    bottom: window.innerHeight - y,
  }
  return Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0]
}

const savePosition = () => {
  try {
    localStorage.setItem(
      positionKey.value,
      JSON.stringify({
        right: position.right,
        bottom: position.bottom,
        edge: snappedEdge.value,
      }),
    )
  } catch {
    /* position persistence is best-effort */
  }
}

const applyEdge = (edge, { animate = true } = {}) => {
  const size = orbSize()
  const margin = edgeMargin()
  const minBottom = mobileMinBottom()
  const maxRight = Math.max(8, window.innerWidth - size - 8)
  const maxBottom = Math.max(minBottom, window.innerHeight - size - 8)
  snappedEdge.value = edge
  if (edge === 'left') position.right = window.innerWidth - size - margin
  else if (edge === 'right') position.right = margin
  else if (edge === 'top') position.bottom = window.innerHeight - size - margin
  else if (edge === 'bottom') position.bottom = minBottom
  position.right = clamp(position.right, 8, maxRight)
  position.bottom = clamp(position.bottom, minBottom, maxBottom)
  savePosition()
  if (open.value) {
    window.setTimeout(updatePanelPosition, animate ? 430 : 0)
  }
}

const snapToNearestEdge = ({ animate = true } = {}) => {
  applyEdge(inferredEdge(), { animate })
}

const updatePanelPosition = () => {
  if (!open.value || isMobile.value || !panel.value || !orbButton.value) return
  const orbRect = orbButton.value.getBoundingClientRect()
  const width = panel.value.offsetWidth || 370
  const height = panel.value.offsetHeight || 520
  const gap = 12
  const maxLeft = Math.max(12, window.innerWidth - width - gap)
  const maxTop = Math.max(12, window.innerHeight - height - gap)
  const alignLeft =
    orbRect.left + orbRect.width / 2 < window.innerWidth / 2
      ? orbRect.left
      : orbRect.right - width
  const fitsAbove = orbRect.top - height - gap >= gap
  const fitsBelow = orbRect.bottom + height + gap <= window.innerHeight - gap

  if (fitsAbove || fitsBelow) {
    panelLeft.value = clamp(alignLeft, gap, maxLeft)
    panelTop.value = clamp(
      fitsAbove ? orbRect.top - height - gap : orbRect.bottom + gap,
      gap,
      maxTop,
    )
    return
  }

  const roomRight = window.innerWidth - orbRect.right - gap
  const roomLeft = orbRect.left - gap
  if (roomRight >= width || roomRight >= roomLeft) {
    panelLeft.value = clamp(orbRect.right + gap, gap, maxLeft)
  } else {
    panelLeft.value = clamp(orbRect.left - width - gap, gap, maxLeft)
  }
  panelTop.value = clamp(orbRect.top, gap, maxTop)
}

const onResize = () => {
  loadPosition()
  applyEdge(snappedEdge.value, { animate: false })
  if (open.value) nextTick(updatePanelPosition)
}

const onWindowScroll = () => {
  scrolling.value = true
  hovered.value = false
  if (scrollTimer) window.clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(() => {
    scrolling.value = false
    scrollTimer = null
  }, 160)
}

const onOrbPointerDown = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  if (scrollTimer) {
    window.clearTimeout(scrollTimer)
    scrollTimer = null
  }
  scrolling.value = false
  hovered.value = false
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
    snapToNearestEdge()
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
  snappedEdge.value = inferredEdge()
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
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onWindowScroll)
  if (scrollTimer) window.clearTimeout(scrollTimer)
  if (dragState) document.body.style.userSelect = dragState.previousUserSelect || ''
  if (completionTimer) window.clearTimeout(completionTimer)
})
</script>

<template>
  <div
    ref="root"
    class="orb-root"
    :class="{
      'is-expanded': open,
      'is-scrolling': scrolling,
      'is-dragging': dragging,
      'is-top-edge': snappedEdge === 'top',
    }"
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
              :disabled="focus.isActive"
              @click="focus.setDuration(minutes)"
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
        { 'is-open': open, 'is-dragging': dragging },
      ]"
      :style="{ translate: hideTranslation }"
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
      <span class="orb__avatar" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path
            d="M32 47c-9.4 0-17-6.7-17-15 0-1.4.2-2.7.5-4 2.5 1.2 5.3 1.8 8.2 1.8 3.6 0 7-1 9.9-2.7 2.2 1 4.6 1.5 7.2 1.6 2.4.1 4.8-.2 6.9-1A15.2 15.2 0 0 1 49 32c0 8.3-7.6 15-17 15Z"
            fill="#f4c9b6"
            stroke="#c68b77"
            stroke-width="1.4"
          />
          <circle cx="25.5" cy="34" r="2.4" fill="#292531" />
          <circle cx="38.5" cy="34" r="2.4" fill="#292531" />
          <path d="M28.5 40c1.1 1.3 2.3 2 3.5 2s2.4-.7 3.5-2" stroke="#292531" stroke-width="2.2" stroke-linecap="round" fill="none" />
          <ellipse cx="20.5" cy="38.5" rx="3.4" ry="1.9" fill="#eaa895" opacity=".65" />
          <ellipse cx="43.5" cy="38.5" rx="3.4" ry="1.9" fill="#eaa895" opacity=".65" />
          <path d="M32 25c-1.8-6.2.7-11.6 6.6-15.1.9 5.9-1.4 11.1-6.6 15.1Z" fill="#5d705d" />
          <path d="M32 25c-4.3-3.6-9.4-4.4-14.2-1.9 3.5 4.6 8.3 6.2 14.2 1.9Z" fill="#b83e27" />
        </svg>
      </span>
      <Transition name="orb-character">
        <span v-if="hovered && !open" class="orb-character" aria-hidden="true">
          <Mascot :size="62" :variant="mascotVariant" :animated="false" />
        </span>
      </Transition>
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
  transition:
    right 420ms var(--ease-spring),
    bottom 420ms var(--ease-spring);
}

.orb-root.is-dragging {
  transition: none;
}

.orb-root.is-scrolling .orb {
  transition: none;
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
  color: var(--ink);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    transform 220ms var(--ease),
    opacity 180ms var(--ease),
    translate 460ms var(--ease-spring);
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

.orb__avatar {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.94), transparent 36%),
    linear-gradient(145deg, #f8ebdf, #e7f0e7 58%, #f1e2e9);
  box-shadow:
    0 16px 34px -17px rgba(87, 104, 92, 0.46),
    inset 0 1px 1px rgba(255, 255, 255, 0.94),
    inset 0 -7px 14px rgba(170, 188, 175, 0.2);
  transition: transform 260ms var(--ease-spring);
}

.orb:hover .orb__avatar,
.orb.is-open .orb__avatar {
  transform: scale(1.035);
}

.orb__avatar svg {
  width: 82%;
  height: 82%;
}

.orb__aura {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(208, 69, 45, 0.16), transparent 66%);
  opacity: 0.46;
  filter: blur(5px);
  animation: orb-aura 6s var(--ease-in-out) infinite;
  pointer-events: none;
}

.orb-character {
  position: absolute;
  left: 50%;
  bottom: 52px;
  width: 66px;
  height: 66px;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 10px 14px rgba(23, 22, 20, 0.18));
  opacity: 1;
  transform: translateX(-50%);
  transform-origin: bottom center;
}

.orb-character :deep(svg) {
  width: 100%;
  height: 100%;
}

.orb-root.is-top-edge .orb-character {
  bottom: auto;
  top: 52px;
}

.orb-character-enter-active,
.orb-character-leave-active {
  transition:
    opacity 160ms var(--ease),
    transform 330ms var(--ease-spring);
}

.orb-character-enter-from,
.orb-character-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(9px) scale(0.55) rotate(-5deg);
}

.orb-character-enter-to,
.orb-character-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1) rotate(0deg);
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
