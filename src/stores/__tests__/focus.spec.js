import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFocusStore } from '@/stores/focus.js'

describe('focus store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T10:00:00+08:00'))
  })

  afterEach(() => {
    useFocusStore().stopTicker()
    vi.useRealTimers()
  })

  it('starts, pauses and keeps the remaining time', () => {
    const focus = useFocusStore()
    focus.bindUser(7)
    focus.startFocus(1, { openOverlay: false })
    expect(focus.status).toBe('running')
    expect(focus.remainingMs).toBe(60000)

    vi.advanceTimersByTime(1200)
    focus.tick()
    expect(focus.remainingMs).toBeLessThan(60000)
    expect(focus.remainingMs).toBeGreaterThan(58000)

    focus.pause()
    expect(focus.status).toBe('paused')
    expect(focus.endsAt).toBe(null)
    expect(focus.remainingMs).toBeGreaterThan(58000)
  })

  it('restores a paused session from local storage', () => {
    const focus = useFocusStore()
    focus.bindUser(7)
    focus.startFocus(25, { openOverlay: false })
    vi.advanceTimersByTime(2000)
    focus.pause()

    setActivePinia(createPinia())
    const restored = useFocusStore()
    restored.bindUser(7)
    expect(restored.status).toBe('paused')
    expect(restored.durationMinutes).toBe(25)
    expect(restored.remainingMs).toBeGreaterThan(0)
  })

  it('sets a rest reminder only after the real threshold is reached', () => {
    const focus = useFocusStore()
    focus.bindUser(7)
    focus.setRestThreshold(120)
    focus.startFocus(180, { openOverlay: false })
    focus.continuousMs = 120 * 60000
    focus.tick()
    expect(focus.restDue).toBe(true)

    focus.dismissRest()
    expect(focus.restDue).toBe(false)
    expect(focus.continuousMs).toBe(0)
  })

  it('does not count time while paused', () => {
    const focus = useFocusStore()
    focus.bindUser(7)
    focus.startFocus(1, { openOverlay: false })
    focus.pause()
    const before = focus.todayFocusedMs
    vi.advanceTimersByTime(3000)
    focus.tick()
    expect(focus.todayFocusedMs).toBe(before)
  })
})
