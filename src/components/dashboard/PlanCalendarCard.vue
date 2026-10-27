<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Maximize2,
  RotateCcw,
  X,
} from 'lucide-vue-next'
import { tasksApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'
import {
  formatDate,
  formatMinutes,
  parseISODate,
  relativeDay,
  toISODate,
  todayISO,
} from '@/utils/date.js'

const emit = defineEmits(['changed'])
const router = useRouter()
const ui = useUiStore()

const today = todayISO()
const todayDate = parseISODate(today)
const viewDate = ref(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
const selectedDate = ref(today)
const monthTasks = ref([])
const loading = ref(false)
const error = ref('')
const busyTaskId = ref(null)
const expanded = ref(false)

const triggerRef = ref(null)
const panelRef = ref(null)
const closeButton = ref(null)
let requestId = 0
let previousFocus = null

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)
const isoMonthStart = (date) =>
  toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
const isoMonthEnd = (date) =>
  toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0))

const monthStart = computed(() => isoMonthStart(viewDate.value))
const monthEnd = computed(() => isoMonthEnd(viewDate.value))
const monthLabel = computed(
  () => `${viewDate.value.getFullYear()}年${viewDate.value.getMonth() + 1}月`,
)

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const tasksByDate = computed(() => {
  const map = new Map()
  monthTasks.value.forEach((task) => {
    if (!map.has(task.taskDate)) map.set(task.taskDate, [])
    map.get(task.taskDate).push(task)
  })
  return map
})

const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const days = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const iso = toISODate(date)
    const tasks = tasksByDate.value.get(iso) || []
    const completed = tasks.filter((task) => task.isCompleted).length
    const minutes = tasks.reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0)
    days.push({
      date: iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: iso === today,
      isSelected: iso === selectedDate.value,
      tasks,
      completed,
      minutes,
      allDone: tasks.length > 0 && completed === tasks.length,
    })
  }
  return days
})

const selectedTasks = computed(() => {
  const tasks = tasksByDate.value.get(selectedDate.value) || []
  return [...tasks].sort(
    (a, b) =>
      Number(a.isCompleted) - Number(b.isCompleted) ||
      a.title.localeCompare(b.title, 'zh'),
  )
})

const selectedDayLabel = computed(() => {
  const relative = relativeDay(selectedDate.value)
  return relative === formatDate(selectedDate.value, { weekday: true })
    ? formatDate(selectedDate.value, { weekday: true, year: true })
    : `${relative} · ${formatDate(selectedDate.value, { weekday: true })}`
})

const selectedRelativeLabel = computed(() => {
  const relative = relativeDay(selectedDate.value)
  return relative === formatDate(selectedDate.value, { weekday: true })
    ? '选中日期'
    : relative
})

const monthStats = computed(() => {
  const total = monthTasks.value.length
  const completed = monthTasks.value.filter((task) => task.isCompleted).length
  const minutes = monthTasks.value.reduce(
    (sum, task) => sum + Number(task.durationMinutes || 0),
    0,
  )
  const studyDays = tasksByDate.value.size
  return {
    total,
    completed,
    minutes,
    studyDays,
    rate: total ? Math.round((completed / total) * 100) : 0,
  }
})

const selectedStats = computed(() => {
  const total = selectedTasks.value.length
  const completed = selectedTasks.value.filter((task) => task.isCompleted).length
  const minutes = selectedTasks.value.reduce(
    (sum, task) => sum + Number(task.durationMinutes || 0),
    0,
  )
  return { total, completed, minutes }
})

const loadMonth = async () => {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const data = await tasksApi.list({
      from: monthStart.value,
      to: monthEnd.value,
      limit: 500,
    })
    if (current === requestId) monthTasks.value = data.items || []
  } catch (loadError) {
    if (current === requestId) {
      error.value = loadError.message || '日历加载失败'
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

const selectDate = (date) => {
  selectedDate.value = date
  const target = parseISODate(date)
  if (
    target.getFullYear() !== viewDate.value.getFullYear() ||
    target.getMonth() !== viewDate.value.getMonth()
  ) {
    viewDate.value = startOfMonth(target)
  }
}

const changeMonth = (amount) => {
  const next = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth() + amount,
    1,
  )
  viewDate.value = next
  const todayDateValue = parseISODate(today)
  selectedDate.value =
    next.getFullYear() === todayDateValue.getFullYear() &&
    next.getMonth() === todayDateValue.getMonth()
      ? today
      : toISODate(next)
}

const goToday = () => {
  const current = parseISODate(today)
  viewDate.value = startOfMonth(current)
  selectedDate.value = today
}

const openCalendar = (date) => {
  if (date) selectDate(date)
  expanded.value = true
}

const closeCalendar = () => {
  expanded.value = false
}

const toggleTask = async (task) => {
  if (busyTaskId.value) return
  busyTaskId.value = task.id
  try {
    const result = await tasksApi.toggle(task.id, { isCompleted: !task.isCompleted })
    const index = monthTasks.value.findIndex((item) => item.id === task.id)
    if (index >= 0) monthTasks.value[index] = result.task
    emit('changed')
  } catch (toggleError) {
    ui.error(toggleError.message, '更新任务失败')
  } finally {
    busyTaskId.value = null
  }
}

const goTasks = () => {
  closeCalendar()
  router.push('/app/tasks')
}

const onKeydown = (event) => {
  if (!expanded.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeCalendar()
    return
  }
  if (event.key !== 'Tab' || !panelRef.value) return
  const focusables = Array.from(
    panelRef.value.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null)
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const onDayKeydown = (event) => {
  if (!expanded.value) return
  const delta =
    event.key === 'ArrowLeft'
      ? -1
      : event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp'
          ? -7
          : event.key === 'ArrowDown'
            ? 7
            : 0
  if (!delta) return
  event.preventDefault()
  const base = parseISODate(selectedDate.value)
  base.setDate(base.getDate() + delta)
  selectDate(toISODate(base))
  nextTick(() => {
    panelRef.value
      ?.querySelector(`[data-calendar-date="${selectedDate.value}"]`)
      ?.focus()
  })
}

watch(monthStart, loadMonth, { immediate: true })

watch(expanded, async (value) => {
  document.body.classList.toggle('is-calendar-open', value)
  if (value) {
    previousFocus = document.activeElement
    await nextTick()
    closeButton.value?.focus()
    loadMonth()
  } else if (previousFocus?.focus) {
    previousFocus.focus()
    previousFocus = null
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  requestId += 1
  document.body.classList.remove('is-calendar-open')
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <article
    ref="triggerRef"
    class="calendar-card"
    v-press-tilt="{ subtle: true }"
  >
    <header class="calendar-card__head">
      <div class="calendar-card__heading">
        <span class="eyebrow">计划日历</span>
        <h2>{{ monthLabel }}</h2>
      </div>
      <div class="calendar-card__tools">
        <button type="button" class="calendar-icon" aria-label="上个月" @click="changeMonth(-1)">
          <ChevronLeft :size="15" />
        </button>
        <button type="button" class="calendar-today" @click="goToday">今天</button>
        <button type="button" class="calendar-icon" aria-label="下个月" @click="changeMonth(1)">
          <ChevronRight :size="15" />
        </button>
        <button type="button" class="calendar-expand" @click="openCalendar()">
          <Maximize2 :size="14" />
          放大
        </button>
      </div>
    </header>

    <div class="calendar-card__body">
      <div class="calendar-mini">
        <div class="calendar-weekdays" aria-hidden="true">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="day in calendarDays"
            :key="day.date"
            type="button"
            class="calendar-day"
            :class="{
              'is-outside': !day.inMonth,
              'is-today': day.isToday,
              'is-selected': day.isSelected,
              'is-complete': day.allDone,
            }"
            :aria-label="`${formatDate(day.date, { weekday: true })}，${day.tasks.length} 项任务`"
            :aria-current="day.isToday ? 'date' : undefined"
            @click="selectDate(day.date)"
          >
            <span class="calendar-day__number">{{ day.day }}</span>
            <span v-if="day.tasks.length" class="calendar-day__dots" aria-hidden="true">
              <i
                v-for="task in day.tasks.slice(0, 3)"
                :key="task.id"
                :class="{ 'is-done': task.isCompleted, 'is-review': task.isReview }"
              />
              <b v-if="day.tasks.length > 3">+</b>
            </span>
          </button>
        </div>
      </div>

      <aside class="calendar-agenda">
        <header class="calendar-agenda__head">
          <div>
            <span class="calendar-agenda__eyebrow">{{ selectedDayLabel }}</span>
            <strong>{{ selectedStats.total }} 项安排</strong>
          </div>
        </header>

        <div v-if="loading && !monthTasks.length" class="calendar-empty">
          <span class="calendar-empty__pulse" />
          正在整理日历…
        </div>
        <div v-else-if="error" class="calendar-empty">
          <strong>{{ error }}</strong>
          <button type="button" class="calendar-today" @click="loadMonth">重试</button>
        </div>
        <div v-else-if="selectedTasks.length" class="calendar-task-list">
          <div
            v-for="task in selectedTasks.slice(0, 3)"
            :key="task.id"
            class="calendar-task"
            :class="{ 'is-done': task.isCompleted }"
          >
            <button
              type="button"
              class="calendar-check"
              :class="{ 'is-done': task.isCompleted }"
              :aria-label="task.isCompleted ? `取消完成：${task.title}` : `完成任务：${task.title}`"
              :aria-pressed="task.isCompleted"
              :disabled="busyTaskId === task.id"
              @click.stop="toggleTask(task)"
            >
              <Check v-if="task.isCompleted" :size="11" />
            </button>
            <div class="calendar-task__body">
              <strong>{{ task.title }}</strong>
              <span>
                {{ task.planTitle || '学习任务' }} · {{ formatMinutes(task.durationMinutes) }}
                <RotateCcw v-if="task.isReview" :size="10" aria-label="复习任务" />
              </span>
            </div>
          </div>
          <span v-if="selectedTasks.length > 3" class="calendar-more">
            还有 {{ selectedTasks.length - 3 }} 项
          </span>
        </div>
        <div v-else class="calendar-empty">
          <CalendarDays :size="18" />
          <strong>这一天还没有安排</strong>
          <span>打开月历查看整月计划。</span>
        </div>

        <footer class="calendar-agenda__foot">
          <span>{{ selectedStats.completed }}/{{ selectedStats.total }} 完成</span>
          <span>{{ formatMinutes(selectedStats.minutes) }}</span>
        </footer>
      </aside>
    </div>

    <footer class="calendar-card__foot">
      <span>
        本月 {{ monthStats.total }} 项 · {{ monthStats.studyDays }} 个学习日 ·
        {{ monthStats.rate }}% 完成
      </span>
    </footer>
  </article>

  <Teleport to="body">
    <Transition name="calendar-fade">
      <div v-if="expanded" class="calendar-overlay" @click.self="closeCalendar">
        <section
          ref="panelRef"
          class="calendar-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-calendar-title"
          @keydown="onDayKeydown"
        >
          <header class="calendar-modal__head">
            <div>
              <span class="eyebrow">计划日历</span>
              <h2 id="plan-calendar-title">{{ monthLabel }}</h2>
              <p>
                {{ monthStats.total }} 项任务 · {{ monthStats.studyDays }} 个学习日 ·
                {{ monthStats.rate }}% 完成
              </p>
            </div>
            <div class="calendar-modal__tools">
              <button type="button" class="calendar-icon" aria-label="上个月" @click="changeMonth(-1)">
                <ChevronLeft :size="17" />
              </button>
              <button type="button" class="calendar-today" @click="goToday">回到今天</button>
              <button type="button" class="calendar-icon" aria-label="下个月" @click="changeMonth(1)">
                <ChevronRight :size="17" />
              </button>
              <button
                ref="closeButton"
                type="button"
                class="calendar-close"
                aria-label="收起计划日历"
                @click="closeCalendar"
              >
                <X :size="17" />
              </button>
            </div>
          </header>

          <div class="calendar-modal__body">
            <div class="calendar-full">
              <div class="calendar-weekdays" aria-hidden="true">
                <span v-for="day in weekdays" :key="day">{{ day }}</span>
              </div>
              <div class="calendar-grid calendar-grid--full">
                <button
                  v-for="day in calendarDays"
                  :key="day.date"
                  type="button"
                  class="calendar-day calendar-day--full"
                  :class="{
                    'is-outside': !day.inMonth,
                    'is-today': day.isToday,
                    'is-selected': day.isSelected,
                    'is-complete': day.allDone,
                  }"
                  :data-calendar-date="day.date"
                  :aria-label="`${formatDate(day.date, { weekday: true })}，${day.tasks.length} 项任务，${day.completed} 项完成`"
                  :aria-current="day.isToday ? 'date' : undefined"
                  @click="selectDate(day.date)"
                >
                  <span class="calendar-day__number">{{ day.day }}</span>
                  <span v-if="day.tasks.length" class="calendar-day__meta">
                    {{ day.tasks.length }} 项
                  </span>
                  <span v-if="day.tasks.length" class="calendar-day__dots" aria-hidden="true">
                    <i
                      v-for="task in day.tasks.slice(0, 3)"
                      :key="task.id"
                      :class="{ 'is-done': task.isCompleted, 'is-review': task.isReview }"
                    />
                    <b v-if="day.tasks.length > 3">+</b>
                  </span>
                  <span v-if="day.minutes" class="calendar-day__minutes">
                    {{ day.minutes }} 分
                  </span>
                </button>
              </div>
            </div>

            <aside class="calendar-detail">
              <header class="calendar-detail__head">
                <span class="calendar-agenda__eyebrow">{{ selectedRelativeLabel }}</span>
                <h3>{{ formatDate(selectedDate, { weekday: true }) }}</h3>
                <div class="calendar-detail__stats">
                  <span>{{ selectedStats.completed }}/{{ selectedStats.total }} 完成</span>
                  <span>{{ formatMinutes(selectedStats.minutes) }}</span>
                </div>
              </header>

              <div v-if="selectedTasks.length" class="calendar-detail__list">
                <div
                  v-for="task in selectedTasks"
                  :key="task.id"
                  class="calendar-task calendar-task--large"
                  :class="{ 'is-done': task.isCompleted }"
                >
                  <button
                    type="button"
                    class="calendar-check"
                    :class="{ 'is-done': task.isCompleted }"
                    :aria-label="task.isCompleted ? `取消完成：${task.title}` : `完成任务：${task.title}`"
                    :aria-pressed="task.isCompleted"
                    :disabled="busyTaskId === task.id"
                    @click="toggleTask(task)"
                  >
                    <Check v-if="task.isCompleted" :size="12" />
                  </button>
                  <div class="calendar-task__body">
                    <strong>{{ task.title }}</strong>
                    <span>
                      {{ task.planTitle || '学习任务' }} · {{ formatMinutes(task.durationMinutes) }}
                    </span>
                    <span v-if="task.completionCriteria" class="calendar-task__criteria">
                      {{ task.completionCriteria }}
                    </span>
                  </div>
                  <RotateCcw v-if="task.isReview" class="calendar-task__review" :size="12" />
                </div>
              </div>
              <div v-else class="calendar-empty calendar-empty--large">
                <CalendarDays :size="24" />
                <strong>这一天还没有任务</strong>
                <span>可以从任务页给这一天添加安排。</span>
              </div>

              <div class="calendar-detail__month">
                <div class="calendar-detail__month-head">
                  <span>本月完成率</span>
                  <strong>{{ monthStats.rate }}%</strong>
                </div>
                <div class="calendar-detail__month-bar" aria-hidden="true">
                  <span :style="{ width: `${monthStats.rate}%` }" />
                </div>
                <p>
                  {{ monthStats.completed }}/{{ monthStats.total }} 项 · {{ monthStats.studyDays }}
                  个学习日
                </p>
              </div>

              <footer class="calendar-detail__foot">
                <button type="button" class="calendar-today" @click="goTasks">
                  打开任务页
                </button>
              </footer>
            </aside>
          </div>

          <footer class="calendar-modal__foot">
            <span><Clock3 :size="12" /> 本月预计 {{ formatMinutes(monthStats.minutes) }}</span>
            <span>点日期查看当天任务，点圆圈标记完成；Esc 收起</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.calendar-card {
  margin-bottom: 18px;
  padding: 17px 18px 13px;
  border: 1px solid rgb(255 255 255 / 0.58);
  border-radius: 22px;
  background: rgb(var(--macaron-cream-rgb) / 0.5);
  box-shadow:
    0 18px 42px -34px rgb(69 86 74 / 0.4),
    inset 0 1px 0 rgb(255 255 255 / 0.78);
  backdrop-filter: blur(16px) saturate(112%);
  -webkit-backdrop-filter: blur(16px) saturate(112%);
}

.calendar-card__head,
.calendar-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.calendar-card__heading h2 {
  margin-top: 2px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.035em;
}

.calendar-card__tools,
.calendar-modal__tools {
  display: flex;
  align-items: center;
  gap: 5px;
}

.calendar-icon,
.calendar-today,
.calendar-expand,
.calendar-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 8px;
  background: rgb(var(--macaron-cream-rgb) / 0.42);
  color: var(--glass-ink);
  font-size: 10px;
  font-weight: 600;
  transition:
    background-color 160ms var(--ease),
    transform 260ms var(--ease-spring);
}

.calendar-icon {
  width: 28px;
  padding: 0;
}

.calendar-expand {
  margin-left: 3px;
  background: rgb(var(--macaron-mint-rgb) / 0.56);
}

.calendar-close {
  width: 30px;
  padding: 0;
  color: var(--ink-muted);
}

.calendar-card__body {
  display: grid;
  grid-template-columns: minmax(0, 540px) minmax(240px, 1fr);
  gap: 18px;
  margin-top: 12px;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.calendar-weekdays {
  margin-bottom: 3px;
  color: var(--ink-faint);
  font-size: 9px;
  text-align: center;
}

.calendar-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  min-height: 31px;
  padding: 2px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--ink-muted);
  cursor: pointer;
}

.calendar-day:hover {
  background: rgb(var(--macaron-cream-rgb) / 0.58);
}

.calendar-day.is-outside {
  opacity: 0.32;
}

.calendar-day.is-today {
  border-color: rgb(208 69 45 / 0.5);
  color: var(--accent-deep);
}

.calendar-day.is-today::after {
  position: absolute;
  top: 4px;
  right: 5px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--accent);
  content: '';
}

.calendar-day.is-selected {
  background: rgb(var(--macaron-mint-rgb) / 0.58);
  border-color: rgb(255 255 255 / 0.68);
  color: var(--glass-ink);
}

.calendar-day.is-complete .calendar-day__number {
  color: var(--mint-700);
}

.calendar-day__number {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.calendar-day__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 4px;
}

.calendar-day__dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.calendar-day__dots i.is-done {
  background: var(--mint-600);
}

.calendar-day__dots i.is-review {
  background: var(--accent);
}

.calendar-day__dots b {
  color: var(--ink-faint);
  font-size: 7px;
  font-weight: 600;
  line-height: 1;
}

.calendar-agenda {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding-left: 16px;
  border-left: 1px solid rgb(53 72 61 / 0.1);
}

.calendar-agenda__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.calendar-agenda__eyebrow {
  display: block;
  color: var(--ink-faint);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.calendar-agenda__head strong {
  display: block;
  margin-top: 3px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 650;
}

.calendar-task-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}

.calendar-task {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid rgb(255 255 255 / 0.44);
  border-radius: 9px;
  background: rgb(var(--macaron-cream-rgb) / 0.34);
}

.calendar-task.is-done {
  opacity: 0.62;
}

.calendar-check {
  display: grid;
  place-items: center;
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  padding: 0;
  border: 1px solid var(--ink-faint);
  border-radius: 50%;
  background: transparent;
  color: var(--bg);
}

.calendar-check.is-done {
  border-color: var(--mint-600);
  background: var(--mint-600);
}

.calendar-task__body {
  min-width: 0;
}

.calendar-task__body strong {
  display: block;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-task.is-done .calendar-task__body strong {
  text-decoration: line-through;
}

.calendar-task__body > span {
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
  margin-top: 2px;
  color: var(--ink-faint);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-task__review {
  flex: none;
  margin-left: auto;
  color: var(--accent);
}

.calendar-empty {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 10px;
  color: var(--ink-faint);
  font-size: 9.5px;
  text-align: center;
}

.calendar-empty strong {
  color: var(--ink-soft);
  font-size: 10.5px;
}

.calendar-empty__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: calendar-pulse 1.1s var(--ease-in-out) infinite;
}

@keyframes calendar-pulse {
  50% {
    opacity: 0.3;
    transform: scale(0.72);
  }
}

.calendar-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-deep);
  font-size: 9.5px;
  font-weight: 600;
}

.calendar-agenda__foot,
.calendar-card__foot,
.calendar-modal__foot,
.calendar-detail__stats,
.calendar-detail__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.calendar-agenda__foot {
  margin-top: auto;
  padding-top: 10px;
  color: var(--ink-faint);
  font-size: 9px;
}

.calendar-card__foot {
  margin-top: 8px;
  padding-top: 9px;
  border-top: 1px solid rgb(53 72 61 / 0.08);
  color: var(--ink-faint);
  font-size: 9px;
}

/* Expanded calendar: same glass language as the focus card, but wider. */
.calendar-overlay {
  position: fixed;
  z-index: 130;
  inset: 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: rgb(25 24 20 / 0.45);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
}

.calendar-modal {
  display: flex;
  width: min(1080px, calc(100vw - 40px));
  height: min(800px, calc(100dvh - 40px));
  flex-direction: column;
  overflow: hidden;
  padding: 22px;
  border: 1px solid rgb(255 255 255 / 0.64);
  border-radius: 28px;
  background: rgb(var(--macaron-cream-rgb) / 0.97);
  box-shadow:
    0 48px 110px -42px rgb(30 42 34 / 0.62),
    inset 0 1px 0 rgb(255 255 255 / 0.88);
  backdrop-filter: blur(28px) saturate(112%);
  -webkit-backdrop-filter: blur(28px) saturate(112%);
}

.calendar-modal__head {
  flex: none;
  padding-bottom: 12px;
}

.calendar-modal__head h2 {
  margin-top: 2px;
  color: var(--ink);
  font-size: 26px;
  font-weight: 660;
  letter-spacing: -0.045em;
}

.calendar-modal__head p {
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 10px;
}

.calendar-modal__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.8fr);
  gap: 18px;
  overflow: hidden;
}

.calendar-full {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: auto;
  padding: 2px;
}

.calendar-grid--full {
  flex: 1;
  gap: 5px;
  grid-auto-rows: minmax(62px, 1fr);
}

.calendar-day--full {
  min-height: 62px;
  padding: 6px;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 3px;
  border-color: rgb(255 255 255 / 0.46);
  background: rgb(var(--macaron-cream-rgb) / 0.3);
}

.calendar-day--full .calendar-day__number {
  font-size: 13px;
  font-weight: 600;
}

.calendar-day--full .calendar-day__dots {
  margin-top: auto;
}

.calendar-day--full .calendar-day__meta,
.calendar-day--full .calendar-day__minutes {
  color: var(--ink-faint);
  font-size: 8px;
  line-height: 1.2;
}

.calendar-day--full .calendar-day__meta {
  color: var(--ink-muted);
}

.calendar-detail {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: auto;
  padding-left: 18px;
  border-left: 1px solid rgb(53 72 61 / 0.1);
}

.calendar-detail__head {
  flex: none;
}

.calendar-detail__head h3 {
  margin-top: 4px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.025em;
}

.calendar-detail__stats {
  justify-content: flex-start;
  margin-top: 7px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.calendar-detail__list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 14px;
}

.calendar-task--large {
  padding: 10px;
  background: rgb(var(--macaron-cream-rgb) / 0.36);
}

.calendar-task--large .calendar-check {
  width: 19px;
  height: 19px;
}

.calendar-task--large .calendar-task__body strong {
  font-size: 11.5px;
}

.calendar-task--large .calendar-task__body > span {
  font-size: 9.5px;
}

.calendar-task__criteria {
  display: block !important;
  overflow: hidden;
  margin-top: 4px !important;
  color: var(--ink-faint) !important;
  font-size: 9px !important;
  line-height: 1.45 !important;
  text-overflow: ellipsis;
  white-space: normal !important;
}

.calendar-empty--large {
  min-height: 160px;
  gap: 7px;
}

.calendar-empty--large strong {
  font-size: 12px;
}

.calendar-detail__month {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgb(53 72 61 / 0.08);
}

.calendar-detail__month-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.calendar-detail__month-head strong {
  color: var(--ink);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.calendar-detail__month-bar {
  height: 3px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(53 72 61 / 0.1);
}

.calendar-detail__month-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.calendar-detail__month p {
  margin-top: 6px;
  color: var(--ink-faint);
  font-size: 9px;
}

.calendar-detail__foot {
  margin-top: 12px;
  padding-top: 10px;
}

.calendar-modal__foot {
  flex: none;
  padding-top: 12px;
  border-top: 1px solid rgb(53 72 61 / 0.1);
  color: var(--ink-faint);
  font-size: 9px;
}

.calendar-modal__foot span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: opacity 220ms var(--ease);
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
}

.calendar-fade-enter-active .calendar-modal,
.calendar-fade-leave-active .calendar-modal {
  transition: transform 380ms var(--ease-spring);
}

.calendar-fade-enter-from .calendar-modal,
.calendar-fade-leave-to .calendar-modal {
  transform: translateY(14px) scale(0.965);
}

@media (max-width: 900px) {
  .calendar-card__body {
    grid-template-columns: 1fr;
  }

  .calendar-agenda {
    padding-top: 12px;
    padding-left: 0;
    border-top: 1px solid rgb(53 72 61 / 0.1);
    border-left: 0;
  }

  .calendar-card__head {
    align-items: flex-start;
  }

  .calendar-card__tools {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .calendar-overlay {
    padding: 0;
  }

  .calendar-modal {
    width: 100%;
    height: 100dvh;
    padding: 14px;
    border-radius: 0;
    background: rgb(var(--macaron-cream-rgb) / 0.97);
  }

  .calendar-modal__head h2 {
    font-size: 22px;
  }

  .calendar-modal__body {
    display: flex;
    flex-direction: column;
    overflow: auto;
  }

  .calendar-full {
    flex: none;
    overflow: visible;
  }

  .calendar-grid--full {
    flex: none;
    grid-auto-rows: auto;
  }

  .calendar-day--full {
    min-height: 42px;
    padding: 4px;
  }

  .calendar-day--full .calendar-day__number {
    font-size: 11px;
  }

  .calendar-detail {
    flex: none;
    overflow: visible;
    padding-top: 14px;
    padding-left: 0;
    border-top: 1px solid rgb(53 72 61 / 0.1);
    border-left: 0;
  }

  .calendar-detail__month {
    margin-top: 14px;
  }

  .calendar-modal__foot {
    display: none;
  }
}

@media (max-width: 560px) {
  .calendar-card {
    padding: 13px;
  }

  .calendar-card__heading h2 {
    font-size: 16px;
  }

  .calendar-card__tools {
    gap: 3px;
  }

  .calendar-expand {
    font-size: 0;
  }

  .calendar-expand svg {
    margin: 0;
  }

  .calendar-modal__tools {
    gap: 3px;
  }

  .calendar-modal__tools .calendar-today {
    font-size: 9px;
  }

  .calendar-detail__foot {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-fade-enter-active,
  .calendar-fade-leave-active,
  .calendar-fade-enter-active .calendar-modal,
  .calendar-fade-leave-active .calendar-modal {
    transition: none;
  }

  .calendar-empty__pulse {
    animation: none;
  }
}
</style>
