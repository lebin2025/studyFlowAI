import { defineStore } from 'pinia'

let nextId = 1
const timers = new Map()

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [],
  }),

  actions: {
    notify({ type = 'info', title = '', message = '', duration = 4200 } = {}) {
      const id = nextId++
      this.toasts.push({ id, type, title, message })
      if (duration > 0) {
        timers.set(
          id,
          setTimeout(() => this.dismiss(id), duration),
        )
      }
      return id
    },

    success(message, title = '完成') {
      return this.notify({ type: 'success', title, message })
    },

    error(message, title = '出了点小问题') {
      return this.notify({ type: 'error', title, message, duration: 6500 })
    },

    info(message, title = '提示') {
      return this.notify({ type: 'info', title, message })
    },

    warning(message, title = '注意') {
      return this.notify({ type: 'warning', title, message, duration: 5500 })
    },

    dismiss(id) {
      const timer = timers.get(id)
      if (timer) {
        clearTimeout(timer)
        timers.delete(id)
      }
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },
  },
})
