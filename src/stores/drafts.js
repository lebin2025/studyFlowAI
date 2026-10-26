import { defineStore } from 'pinia'

const VERSION = 1
const MAX_DRAFTS = 20

const formFields = [
  'goal',
  'subject',
  'level',
  'startDate',
  'endDate',
  'dailyMinutes',
  'studyWeekdays',
  'preferences',
  'notes',
]

const clone = (value) => {
  try {
    return value == null ? value : JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

const cleanForm = (form = {}) => {
  const next = {}
  formFields.forEach((key) => {
    if (form[key] !== undefined) next[key] = clone(form[key])
  })
  return next
}

const hasContent = (form = {}, preview = null, planPayload = null) =>
  Boolean(
    String(form.goal || '').trim() ||
      String(form.subject || '').trim() ||
      preview ||
      planPayload,
  )

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`

export const useDraftsStore = defineStore('drafts', {
  state: () => ({
    version: VERSION,
    ownerId: '',
    loaded: false,
    drafts: [],
    storageError: '',
  }),

  getters: {
    count: (state) => state.drafts.length,
    sorted: (state) => [...state.drafts].sort((a, b) => b.updatedAt - a.updatedAt),
  },

  actions: {
    storageKey(ownerId = this.ownerId) {
      return `studyflow:drafts:v1:${ownerId || 'guest'}`
    },

    bindUser(userId) {
      const next = String(userId || 'guest')
      if (this.loaded && this.ownerId === next) return
      this.ownerId = next
      this.load()
    },

    load() {
      this.storageError = ''
      try {
        const raw = localStorage.getItem(this.storageKey())
        const parsed = raw ? JSON.parse(raw) : null
        const list = Array.isArray(parsed?.drafts) ? parsed.drafts : []
        this.drafts = list
          .filter((draft) => draft && draft.id && draft.form && typeof draft.form === 'object')
          .map((draft) => ({
            id: String(draft.id),
            title: String(draft.title || '未命名计划'),
            form: cleanForm(draft.form),
            step: Math.min(3, Math.max(1, Number(draft.step) || 1)),
            preview: draft.preview ? clone(draft.preview) : null,
            planPayload: draft.planPayload ? clone(draft.planPayload) : null,
            source: draft.source === 'preview' ? 'preview' : 'form',
            createdAt: Number(draft.createdAt) || Date.now(),
            updatedAt: Number(draft.updatedAt) || Date.now(),
          }))
          .slice(0, MAX_DRAFTS)
        this.loaded = true
        this.importLegacy()
      } catch {
        this.drafts = []
        this.loaded = true
        this.storageError = '无法读取本地草稿，浏览器存储可能不可用。'
      }
    },

    importLegacy() {
      const legacyKey = `studyflow:plan-form:${this.ownerId}`
      try {
        const raw = localStorage.getItem(legacyKey)
        if (!raw) return
        const legacy = JSON.parse(raw)
        if (!legacy?.form || !hasContent(legacy.form)) return
        const exists = this.drafts.some(
          (draft) => draft.form?.goal === legacy.form.goal && draft.form?.subject === legacy.form.subject,
        )
        if (!exists) {
          const form = cleanForm(legacy.form)
          this.drafts.unshift({
            id: makeId(),
            title: String(form.goal || form.subject || '未命名计划').slice(0, 48),
            form,
            step: 1,
            preview: null,
            planPayload: null,
            source: 'form',
            createdAt: Number(legacy.updatedAt) || Date.now(),
            updatedAt: Number(legacy.updatedAt) || Date.now(),
          })
          this.persist()
        }
        localStorage.removeItem(legacyKey)
      } catch {
        /* legacy import is best-effort */
      }
    },

    persist() {
      try {
        localStorage.setItem(
          this.storageKey(),
          JSON.stringify({ version: VERSION, drafts: this.drafts.slice(0, MAX_DRAFTS) }),
        )
        this.storageError = ''
        return true
      } catch {
        this.storageError = '草稿保存失败，浏览器存储空间可能已满。'
        return false
      }
    },

    save({ id, form, step = 1, preview = null, planPayload = null, title = '', source } = {}) {
      const safeForm = cleanForm(form)
      if (!hasContent(safeForm, preview, planPayload) && !id) return null
      const now = Date.now()
      const existingIndex = id ? this.drafts.findIndex((draft) => draft.id === id) : -1
      const existing = existingIndex >= 0 ? this.drafts[existingIndex] : null
      if (!hasContent(safeForm, preview, planPayload) && !existing) return null
      const draft = {
        id: existing?.id || id || makeId(),
        title: String(
          title ||
            planPayload?.title ||
            preview?.plan?.title ||
            safeForm.goal ||
            safeForm.subject ||
            existing?.title ||
            '未命名计划',
        ).slice(0, 80),
        form: safeForm,
        step: Math.min(3, Math.max(1, Number(step) || 1)),
        preview: preview ? clone(preview) : null,
        planPayload: planPayload ? clone(planPayload) : preview ? existing?.planPayload || null : null,
        source: source || (preview || planPayload ? 'preview' : 'form'),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }
      if (existingIndex >= 0) this.drafts.splice(existingIndex, 1)
      this.drafts.unshift(draft)
      this.drafts = this.drafts.slice(0, MAX_DRAFTS)
      const persisted = this.persist()
      return { ...draft, persisted }
    },

    updatePlanPayload(id, planPayload) {
      const draft = this.drafts.find((item) => item.id === id)
      if (!draft) return null
      draft.planPayload = clone(planPayload)
      draft.updatedAt = Date.now()
      this.persist()
      return draft
    },

    remove(id) {
      this.drafts = this.drafts.filter((draft) => draft.id !== id)
      this.persist()
    },

    get(id) {
      return this.drafts.find((draft) => draft.id === id) || null
    },

    clear() {
      this.drafts = []
      this.persist()
    },
  },
})
