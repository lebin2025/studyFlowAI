<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  Bell,
  BellOff,
  Coffee,
  Minimize2,
  Pause,
  Play,
  Square,
  Volume2,
  X,
} from 'lucide-vue-next'
import { useAmbienceStore } from '@/stores/ambience.js'
import { useFocusStore } from '@/stores/focus.js'
import FocusRing from '@/components/focus/FocusRing.vue'

const focus = useFocusStore()
const ambience = useAmbienceStore()
const panel = ref(null)
const customMinutes = ref(25)

const open = computed(() => focus.overlayOpen)
const time = computed(() =>
  focus.status === 'idle' ? `${String(focus.durationMinutes).padStart(2, '0')}:00` : focus.formattedRemaining,
)
const phaseLabel = computed(() => (focus.phase === 'break' ? '休息' : '专注'))
const stateLabel = computed(() => {
  if (focus.status === 'running') return focus.phase === 'break' ? '休息中' : '专注中'
  if (focus.status === 'paused') return '已暂停'
  if (focus.status === 'finished') return '已完成'
  return '准备开始'
})

const durations = [15, 25, 45, 60]
const thresholds = [
  { value: 90, label: '90 分钟' },
  { value: 120, label: '120 分钟' },
  { value: 180, label: '180 分钟' },
  { value: 0, label: '关闭' },
]

const close = () => {
  focus.toggleOverlay(false)
}

const start = (minutes) => {
  focus.startFocus(minutes, { openOverlay: true })
}

const startBreak = () => {
  focus.startBreak(5)
}

const primary = () => {
  if (focus.status === 'running') {
    focus.pause()
  } else if (focus.status === 'paused') {
    focus.resume()
  } else {
    focus.startFocus(focus.durationMinutes || 25, { openOverlay: true })
  }
}

const end = () => {
  focus.end()
}

const setMode = async (mode) => {
  await ambience.setMode(mode)
  if (mode !== 'minimal' && !ambience.playing) await ambience.play(mode)
}

const requestNotifications = async () => {
  await focus.enableNotifications()
}

const focusables = () => {
  if (!panel.value) return []
  return Array.from(
    panel.value.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

let previousFocus = null

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

watch(
  open,
  async (value) => {
    document.body.style.overflow = value ? 'hidden' : ''
    document.body.classList.toggle('is-focus-mode', value)
    if (value) {
      previousFocus = document.activeElement
      await nextTick()
      panel.value?.querySelector('button, input')?.focus()
    } else {
      previousFocus?.focus?.()
      previousFocus = null
    }
  },
  { immediate: true },
)

document.addEventListener('keydown', onKeydown, true)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
  document.body.classList.remove('is-focus-mode')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="focus-fade">
      <div v-if="open" class="focus-overlay" @click.self="close">
        <section ref="panel" class="focus-panel" role="dialog" aria-modal="true" aria-label="专注模式">
          <header class="focus-panel__head">
            <div>
              <h2>{{ phaseLabel === '专注' ? '专注模式' : '休息时间' }}</h2>
            </div>
            <button type="button" class="focus-icon-button" aria-label="收起专注模式" @click="close">
              <Minimize2 :size="17" />
            </button>
          </header>

          <div class="focus-stage">
            <FocusRing :value="focus.progress" :size="246" :stroke="6" label="专注剩余时间">
              <div class="focus-stage__time">
                <strong>{{ time }}</strong>
                <span>{{ stateLabel }}</span>
                <em>今日 {{ focus.todayFocusedMinutes }} 分钟</em>
              </div>
            </FocusRing>
          </div>

          <p v-if="focus.restDue" class="focus-rest-note">
            已连续专注 {{ focus.continuousMinutes }} 分钟，建议休息一下。
            <button type="button" @click="focus.dismissRest">知道了</button>
          </p>

          <div v-if="focus.status === 'finished'" class="focus-finished">
            <span>{{ focus.phase === 'break' ? '休息结束，可以继续了' : '这一轮专注完成' }}</span>
            <div class="focus-actions">
              <button type="button" class="focus-primary" @click="startBreak">
                <Coffee :size="15" />
                休息 5 分钟
              </button>
              <button type="button" class="focus-secondary" @click="primary">
                <Play :size="15" />
                再来一轮
              </button>
            </div>
          </div>

          <template v-else>
            <div class="focus-durations">
              <button
                v-for="minutes in durations"
                :key="minutes"
                type="button"
                :class="{ 'is-active': focus.durationMinutes === minutes }"
                @click="start(minutes)"
              >
                {{ minutes }} 分钟
              </button>
            </div>

            <div class="focus-custom">
              <span>自定义</span>
              <input
                v-model.number="customMinutes"
                type="number"
                min="1"
                max="180"
                aria-label="自定义专注分钟"
              />
              <button type="button" @click="start(customMinutes)">开始</button>
            </div>

            <div class="focus-actions">
              <button type="button" class="focus-primary" @click="primary">
                <Pause v-if="focus.status === 'running'" :size="16" />
                <Play v-else :size="16" />
                {{ focus.status === 'running' ? '暂停' : focus.status === 'paused' ? '继续' : '开始专注' }}
              </button>
              <button v-if="focus.isActive" type="button" class="focus-secondary" @click="end">
                <Square :size="13" />
                结束
              </button>
            </div>
          </template>

          <div class="focus-ambience">
            <div class="focus-ambience__head">
              <span>环境音</span>
              <span>{{ ambience.modeLabel }}</span>
            </div>
            <div class="focus-ambience__row">
              <button
                v-for="mode in [
                  { id: 'focus', label: '专注' },
                  { id: 'relax', label: '放松' },
                  { id: 'minimal', label: '静音' },
                ]"
                :key="mode.id"
                type="button"
                :class="{ 'is-active': ambience.mode === mode.id }"
                @click="setMode(mode.id)"
              >
                {{ mode.label }}
              </button>
              <button type="button" class="focus-play" @click="ambience.toggle">
                <Pause v-if="ambience.playing" :size="13" />
                <Play v-else :size="13" />
              </button>
              <div class="focus-volume">
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
            </div>
          </div>

          <p v-if="ambience.error" class="focus-error">{{ ambience.error }}</p>
          <div class="focus-settings">
            <label>
              <span>休息提醒</span>
              <select :value="focus.restThresholdMinutes" @change="focus.setRestThreshold($event.target.value)">
                <option v-for="item in thresholds" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <button type="button" class="focus-notify" @click="requestNotifications">
              <Bell v-if="focus.notificationEnabled" :size="13" />
              <BellOff v-else :size="13" />
              {{ focus.notificationEnabled ? '桌面提醒已开' : '桌面提醒' }}
            </button>
          </div>

          <button type="button" class="focus-close" aria-label="关闭" @click="close">
            <X :size="16" />
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.focus-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(23, 22, 20, 0.42);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.focus-panel {
  position: relative;
  width: min(520px, 100%);
  max-height: calc(100dvh - 40px);
  overflow: auto;
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 28px;
  isolation: isolate;
  background: var(--surface);
  box-shadow:
    0 40px 100px -36px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

@supports not (backdrop-filter: blur(1px)) {
  .focus-panel {
    background: var(--surface);
  }
}

.focus-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.focus-kicker {
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
}

.focus-panel h2 {
  margin-top: 3px;
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.focus-icon-button,
.focus-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  color: var(--ink-muted);
}

.focus-icon-button:hover,
.focus-close:hover {
  background: rgba(23, 22, 20, 0.06);
  color: var(--ink);
}

.focus-close {
  position: absolute;
  right: 22px;
  bottom: 18px;
  display: none;
}

.focus-stage {
  display: grid;
  place-items: center;
  margin: 18px 0 12px;
}

.focus-stage__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.focus-stage__time strong {
  color: var(--ink);
  font-size: 42px;
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}

.focus-stage__time span {
  color: var(--ink-muted);
  font-size: 11px;
}

.focus-rest-note {
  margin: 0 auto 4px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 11.5px;
  text-align: center;
}

.focus-finished {
  padding: 10px 0;
  text-align: center;
}

.focus-finished > span {
  color: var(--ink-muted);
  font-size: 12px;
}

.focus-durations {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  margin-top: 4px;
}

.focus-durations button {
  height: 32px;
  border-radius: 8px;
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 11px;
}

.focus-durations button.is-active {
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 600;
}

.focus-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
}

.focus-primary,
.focus-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.focus-primary {
  background: var(--ink);
  color: var(--bg);
}

.focus-secondary {
  background: var(--surface);
  color: var(--ink-soft);
  box-shadow: var(--shadow-xs);
}

.focus-ambience {
  margin-top: 18px;
  padding: 12px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.48);
}

.focus-ambience__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.focus-ambience__row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.focus-ambience__row > button {
  padding: 5px 8px;
  border-radius: 7px;
  color: var(--ink-muted);
  font-size: 10px;
}

.focus-ambience__row > button.is-active {
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-weight: 600;
}

.focus-play {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink);
}

.focus-volume {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 92px;
  color: var(--ink-faint);
}

.focus-volume input {
  width: 100%;
  accent-color: var(--accent);
}

.focus-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.focus-settings label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.focus-settings select {
  padding: 3px 4px;
  border: 0;
  border-radius: 5px;
  background: var(--surface-soft);
  color: var(--ink-soft);
  font-size: 10.5px;
}

.focus-notify {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-size: 10.5px;
}

.focus-notify:hover {
  color: var(--accent);
}

.focus-fade-enter-active,
.focus-fade-leave-active {
  transition: opacity 220ms var(--ease);
}

.focus-fade-enter-active .focus-panel,
.focus-fade-leave-active .focus-panel {
  transition: transform 360ms var(--ease);
}

.focus-fade-enter-from,
.focus-fade-leave-to {
  opacity: 0;
}

.focus-fade-enter-from .focus-panel,
.focus-fade-leave-to .focus-panel {
  transform: translateY(14px) scale(0.97);
}

@media (max-width: 560px) {
  .focus-overlay {
    align-items: end;
    padding: 0;
  }

  .focus-panel {
    width: 100%;
    max-height: 92dvh;
    padding: 20px 18px 26px;
    border-radius: 24px 24px 0 0;
  }

  .focus-stage :deep(.ring) {
    width: 208px !important;
    height: 208px !important;
  }

  .focus-stage__time strong {
    font-size: 36px;
  }

  .focus-durations button {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .focus-fade-enter-active,
  .focus-fade-leave-active,
  .focus-fade-enter-active .focus-panel,
  .focus-fade-leave-active .focus-panel {
    transition: none;
  }
}
</style>

<style scoped>
.focus-error {
  margin-top: 8px;
  color: var(--danger-700);
  font-size: 10.5px;
}
</style>

<style scoped>
.focus-rest-note button {
  margin-left: 4px;
  color: var(--accent-deep);
  font-size: 10.5px;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>

<style scoped>
.focus-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 8px;
  color: var(--ink-faint);
  font-size: 10px;
}

.focus-custom input {
  width: 54px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--ink);
  font-size: 10.5px;
  text-align: center;
}

.focus-custom button {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10px;
}

.focus-custom button:hover {
  color: var(--accent);
}
</style>

<style scoped>
.focus-stage__time em {
  margin-top: 5px;
  color: var(--ink-faint);
  font-size: 9.5px;
  font-style: normal;
}
</style>
