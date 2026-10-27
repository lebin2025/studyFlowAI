import { defineStore } from 'pinia'

const VERSION = 1
let ticker = null
let visibilityBound = false

const localDay = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

export const useFocusStore = defineStore('focus', {
  state: () => ({
    version: VERSION,
    ownerId: '',
    bound: false,
    status: 'idle', // idle | running | paused | finished
    phase: 'focus', // focus | break
    durationMinutes: 25,
    remainingMs: 0,
    endsAt: null,
    lastTickAt: null,
    totalFocusedMs: 0,
    continuousMs: 0,
    todayFocusedMs: 0,
    sessionCount: 0,
    dayKey: localDay(),
    restThresholdMinutes: 120,
    restDue: false,
    overlayOpen: false,
    notificationEnabled: false,
    completionToken: 0,
    lastCompletedAt: null,
    storageError: false,
  }),

  getters: {
    isActive: (state) => state.status === 'running' || state.status === 'paused',
    isRunning: (state) => state.status === 'running',
    formattedRemaining: (state) => {
      const total = Math.max(0, Math.ceil(state.remainingMs / 1000))
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    },
    progress: (state) => {
      if (state.status === 'idle') return 0
      if (state.status === 'finished') return 100
      const total = Math.max(1, state.durationMinutes * 60000)
      return Math.min(100, Math.max(0, ((total - state.remainingMs) / total) * 100))
    },
    todayFocusedMinutes: (state) => Math.round(state.todayFocusedMs / 60000),
    continuousMinutes: (state) => Math.round(state.continuousMs / 60000),
    orbState: (state) => {
      if (state.restDue) return 'rest'
      if (state.status === 'running') return 'focusing'
      if (state.status === 'paused') return 'paused'
      if (state.status === 'finished') return 'success'
      return 'idle'
    },
  },

  actions: {
    storageKey() {
      return `studyflow:focus:v1:${this.ownerId || 'guest'}`
    },

    bindUser(userId) {
      const next = String(userId || 'guest')
      if (this.bound && this.ownerId === next) return
      this.stopTicker()
      this.ownerId = next
      this.bound = true
      this.hydrate()
      if (this.status === 'running') this.ensureTicker()
    },

    hydrate() {
      try {
        const raw = localStorage.getItem(this.storageKey())
        if (!raw) {
          this.resetSession({ keepOwner: true })
          return
        }
        const saved = JSON.parse(raw)
        if (!saved || saved.version !== VERSION) return
        const today = localDay()
        this.status = ['idle', 'running', 'paused', 'finished'].includes(saved.status)
          ? saved.status
          : 'idle'
        this.phase = saved.phase === 'break' ? 'break' : 'focus'
        this.durationMinutes = Number(saved.durationMinutes) || 25
        this.remainingMs = Number(saved.remainingMs) || 0
        this.endsAt = Number(saved.endsAt) || null
        this.lastTickAt = Number(saved.lastTickAt) || null
        this.totalFocusedMs = Number(saved.totalFocusedMs) || 0
        this.continuousMs = saved.dayKey === today ? Number(saved.continuousMs) || 0 : 0
        this.todayFocusedMs = saved.dayKey === today ? Number(saved.todayFocusedMs) || 0 : 0
        this.dayKey = today
        this.sessionCount = Number(saved.sessionCount) || 0
        this.restThresholdMinutes = Number.isFinite(Number(saved.restThresholdMinutes))
          ? Number(saved.restThresholdMinutes)
          : 120
        this.restDue = Boolean(saved.restDue)
        this.notificationEnabled = Boolean(saved.notificationEnabled)
        this.lastCompletedAt = Number(saved.lastCompletedAt) || null

        if (this.status === 'running') {
          if (!this.endsAt) {
            this.status = 'paused'
            this.lastTickAt = null
          } else if (this.endsAt <= Date.now()) {
            this.finishSession()
            return
          } else {
            this.remainingMs = Math.max(0, this.endsAt - Date.now())
            this.lastTickAt = Date.now()
            this.ensureTicker()
          }
        }
      } catch {
        this.storageError = true
      }
    },

    persist() {
      try {
        localStorage.setItem(
          this.storageKey(),
          JSON.stringify({
            version: VERSION,
            status: this.status,
            phase: this.phase,
            durationMinutes: this.durationMinutes,
            remainingMs: this.remainingMs,
            endsAt: this.endsAt,
            lastTickAt: this.lastTickAt,
            totalFocusedMs: this.totalFocusedMs,
            continuousMs: this.continuousMs,
            todayFocusedMs: this.todayFocusedMs,
            sessionCount: this.sessionCount,
            dayKey: this.dayKey,
            restThresholdMinutes: this.restThresholdMinutes,
            restDue: this.restDue,
            notificationEnabled: this.notificationEnabled,
            lastCompletedAt: this.lastCompletedAt,
          }),
        )
        this.storageError = false
      } catch {
        this.storageError = true
      }
    },

    setDuration(minutes = this.durationMinutes) {
      if (this.isActive) return
      const duration = Math.min(180, Math.max(1, Number(minutes) || 25))
      this.durationMinutes = duration
      this.remainingMs = duration * 60000
      this.endsAt = null
      this.lastTickAt = null
      if (this.status === 'finished') this.status = 'idle'
      this.persist()
    },

    startFocus(minutes = this.durationMinutes, { openOverlay = true } = {}) {
      const duration = Math.min(180, Math.max(1, Number(minutes) || 25))
      const today = localDay()
      if (today !== this.dayKey) {
        this.dayKey = today
        this.todayFocusedMs = 0
        this.continuousMs = 0
      }
      this.durationMinutes = duration
      this.phase = 'focus'
      this.status = 'running'
      this.remainingMs = duration * 60000
      this.endsAt = Date.now() + this.remainingMs
      this.lastTickAt = Date.now()
      this.restDue = false
      this.overlayOpen = openOverlay
      this.ensureTicker()
      this.persist()
    },

    startBreak(minutes = 5) {
      this.restDue = false
      const duration = Math.min(30, Math.max(1, Number(minutes) || 5))
      this.durationMinutes = duration
      this.phase = 'break'
      this.status = 'running'
      this.remainingMs = duration * 60000
      this.endsAt = Date.now() + this.remainingMs
      this.lastTickAt = Date.now()
      this.overlayOpen = true
      this.ensureTicker()
      this.persist()
    },

    pause() {
      if (this.status !== 'running') return
      this.tick()
      this.remainingMs = Math.max(0, (this.endsAt || Date.now()) - Date.now())
      this.status = 'paused'
      this.endsAt = null
      this.lastTickAt = null
      this.stopTicker()
      this.persist()
    },

    resume() {
      if (this.status !== 'paused') return
      this.status = 'running'
      this.endsAt = Date.now() + this.remainingMs
      this.lastTickAt = Date.now()
      this.ensureTicker()
      this.persist()
    },

    end() {
      if (this.status === 'running') this.tick()
      this.stopTicker()
      this.status = 'idle'
      this.endsAt = null
      this.lastTickAt = null
      this.remainingMs = 0
      this.overlayOpen = false
      this.persist()
    },

    finishSession() {
      if (this.status === 'running') this.tick({ finishing: true })
      this.stopTicker()
      if (this.phase === 'focus') {
        this.sessionCount += 1
        this.lastCompletedAt = Date.now()
        if (this.restThresholdMinutes > 0 && this.continuousMs >= this.restThresholdMinutes * 60000) {
          this.restDue = true
        }
        this.notify('专注完成', `${this.durationMinutes} 分钟专注已结束。`)
      } else {
        this.continuousMs = 0
        this.restDue = false
        this.notify('休息结束', '可以继续下一轮专注了。')
      }
      this.status = 'finished'
      this.endsAt = null
      this.lastTickAt = null
      this.remainingMs = 0
      this.completionToken += 1
      this.persist()
    },

    dismissRest() {
      this.restDue = false
      this.continuousMs = 0
      this.persist()
    },

    setRestThreshold(minutes) {
      const value = Number(minutes)
      this.restThresholdMinutes = Number.isFinite(value) && value > 0 ? Math.min(480, value) : 0
      this.persist()
    },

    toggleOverlay(value) {
      this.overlayOpen = typeof value === 'boolean' ? value : !this.overlayOpen
    },

    async enableNotifications() {
      if (typeof window === 'undefined' || !('Notification' in window)) return false
      if (Notification.permission === 'denied') {
        this.notificationEnabled = false
        this.persist()
        return false
      }
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission()
      this.notificationEnabled = permission === 'granted'
      this.persist()
      return this.notificationEnabled
    },

    notify(title, body) {
      if (!this.notificationEnabled) return
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (Notification.permission !== 'granted') return
      try {
        new Notification(title, { body, icon: '/favicon.svg' })
      } catch {
        /* notification may be unavailable */
      }
    },

    tick({ finishing = false } = {}) {
      if (this.status !== 'running') return
      const now = Date.now()
      const end = this.endsAt || now
      const until = Math.min(now, end)
      const delta = Math.max(0, until - (this.lastTickAt || until))
      if (delta > 0) {
        if (this.phase === 'focus') {
          this.todayFocusedMs += delta
          this.continuousMs += delta
          this.totalFocusedMs += delta
        }
        this.lastTickAt = until
      }
      this.remainingMs = Math.max(0, end - now)
      if (
        !finishing &&
        this.phase === 'focus' &&
        this.restThresholdMinutes > 0 &&
        this.continuousMs >= this.restThresholdMinutes * 60000
      ) {
        this.restDue = true
      }
      if (!finishing && this.remainingMs <= 0) {
        this.finishSession()
      }
    },

    ensureTicker() {
      if (ticker) return
      ticker = window.setInterval(() => {
        this.tick()
        if (this.status !== 'running') this.stopTicker()
        else if (Math.floor(this.remainingMs / 1000) % 4 === 0) this.persist()
      }, 250)
      if (!visibilityBound) {
        visibilityBound = true
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.status === 'running') this.tick()
        })
      }
    },

    stopTicker() {
      if (!ticker) return
      window.clearInterval(ticker)
      ticker = null
    },

    resetSession({ keepOwner = false } = {}) {
      this.status = 'idle'
      this.phase = 'focus'
      this.durationMinutes = 25
      this.remainingMs = 0
      this.endsAt = null
      this.lastTickAt = null
      this.totalFocusedMs = 0
      this.continuousMs = 0
      this.todayFocusedMs = 0
      this.sessionCount = 0
      this.restDue = false
      this.overlayOpen = false
      this.lastCompletedAt = null
      if (!keepOwner) this.ownerId = ''
      this.persist()
    },
  },
})
