import { defineStore } from 'pinia'
import { authApi, usersApi } from '@/api/index.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    preferences: null,
    initialized: false,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    displayName: (state) => state.user?.displayName || '同学',
    initials: (state) => (state.user?.displayName || '同').trim().slice(0, 1).toUpperCase(),
    defaultDailyMinutes: (state) => state.preferences?.defaultDailyMinutes ?? 60,
    defaultWeekdays: (state) => state.preferences?.studyWeekdays ?? [1, 2, 3, 4, 5],
  },

  actions: {
    async bootstrap({ force = false } = {}) {
      if (this.initialized && !force) return this.isAuthenticated
      try {
        const data = await authApi.session()
        this.user = data.user
        this.preferences = data.preferences
      } catch {
        this.user = null
        this.preferences = null
      } finally {
        this.initialized = true
      }
      return this.isAuthenticated
    },

    async login(payload) {
      this.loading = true
      try {
        const data = await authApi.login(payload)
        this.user = data.user
        this.preferences = data.preferences
        this.initialized = true
        return data.user
      } finally {
        this.loading = false
      }
    },

    async register(payload) {
      this.loading = true
      try {
        const data = await authApi.register(payload)
        this.user = data.user
        this.preferences = data.preferences
        this.initialized = true
        return data.user
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        await authApi.logout()
      } finally {
        this.clearSession()
      }
    },

    async updateProfile(payload) {
      const data = await usersApi.updateProfile(payload)
      this.user = data.user
      return data.user
    },

    async updatePreferences(payload) {
      const data = await usersApi.updatePreferences(payload)
      this.preferences = data.preferences
      return data.preferences
    },

    async changePassword(payload) {
      return authApi.changePassword(payload)
    },

    clearSession() {
      this.user = null
      this.preferences = null
      this.initialized = true
    },
  },
})
