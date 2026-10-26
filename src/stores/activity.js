import { defineStore } from 'pinia'

let clearTimer = null

export const useActivityStore = defineStore('activity', {
  state: () => ({
    activeRequests: 0,
    outcome: null, // success | error
    message: '',
    outcomeAt: 0,
    token: 0,
  }),

  getters: {
    processing: (state) => state.activeRequests > 0,
    recentOutcome: (state) =>
      state.outcome && Date.now() - state.outcomeAt < 4500 ? state.outcome : null,
  },

  actions: {
    beginAI() {
      this.activeRequests += 1
      this.outcome = null
      this.token += 1
      if (clearTimer) window.clearTimeout(clearTimer)
    },

    finishAI({ ok = true, message = '' } = {}) {
      this.activeRequests = Math.max(0, this.activeRequests - 1)
      if (this.activeRequests > 0) return
      this.outcome = ok ? 'success' : 'error'
      this.message = message
      this.outcomeAt = Date.now()
      this.token += 1
      const token = this.token
      if (clearTimer) window.clearTimeout(clearTimer)
      clearTimer = window.setTimeout(() => {
        if (this.token === token) {
          this.outcome = null
          this.message = ''
        }
      }, 4500)
    },

    clear() {
      this.activeRequests = 0
      this.outcome = null
      this.message = ''
      this.token += 1
      if (clearTimer) window.clearTimeout(clearTimer)
    },
  },
})
