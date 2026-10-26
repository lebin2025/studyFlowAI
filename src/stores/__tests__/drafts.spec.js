import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDraftsStore } from '@/stores/drafts.js'

const form = {
  goal: '通过英语六级',
  subject: '英语六级',
  level: 'intermediate',
  startDate: '2026-10-26',
  endDate: '2026-11-15',
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5],
  preferences: '',
  notes: '',
}

describe('drafts store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T10:00:00+08:00'))
  })

  it('creates, updates and removes a draft per owner', () => {
    const drafts = useDraftsStore()
    drafts.bindUser(7)
    const saved = drafts.save({ form, step: 1 })
    expect(saved.id).toBeTruthy()
    expect(drafts.count).toBe(1)
    expect(drafts.get(saved.id).form.subject).toBe('英语六级')

    const updated = drafts.save({ id: saved.id, form: { ...form, subject: '雅思' }, step: 2 })
    expect(drafts.count).toBe(1)
    expect(updated.step).toBe(2)
    expect(drafts.get(saved.id).form.subject).toBe('雅思')

    drafts.remove(saved.id)
    expect(drafts.count).toBe(0)
  })

  it('keeps drafts scoped to the signed-in user', () => {
    const drafts = useDraftsStore()
    drafts.bindUser(7)
    drafts.save({ form })
    expect(drafts.count).toBe(1)

    drafts.bindUser(8)
    expect(drafts.count).toBe(0)

    drafts.bindUser(7)
    expect(drafts.count).toBe(1)
  })

  it('migrates the legacy single form draft once', () => {
    localStorage.setItem(
      'studyflow:plan-form:7',
      JSON.stringify({ form, updatedAt: Date.now() }),
    )
    const drafts = useDraftsStore()
    drafts.bindUser(7)
    expect(drafts.count).toBe(1)
    expect(localStorage.getItem('studyflow:plan-form:7')).toBe(null)
  })

  it('does not persist a draft with no usable content', () => {
    const drafts = useDraftsStore()
    drafts.bindUser(7)
    expect(drafts.save({ form: { goal: '', subject: '' } })).toBe(null)
    expect(drafts.count).toBe(0)
  })
})
