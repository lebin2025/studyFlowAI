import { describe, it, expect } from 'vitest'
import { passwordStrength, validateLoginForm, validatePlanWindow, validateTaskForm } from '@/utils/validation.js'
import { addDaysISO, todayISO } from '@/utils/date.js'

describe('validation utilities', () => {
  it('scores passwords and requires letters and numbers', () => {
    const weak = passwordStrength('12345678')
    expect(weak.valid).toBe(false)
    expect(weak.checks.letter).toBe(false)

    const good = passwordStrength('Study1234')
    expect(good.valid).toBe(true)
    expect(good.checks.length).toBe(true)
    expect(good.checks.number).toBe(true)
    expect(good.score).toBeGreaterThanOrEqual(3)
  })

  it('validates login fields', () => {
    expect(validateLoginForm({ email: '', password: '' })).toEqual({
      email: '请输入邮箱',
      password: '请输入密码',
    })
    expect(validateLoginForm({ email: 'not-an-email', password: 'x' })).toHaveProperty('email')
    expect(validateLoginForm({ email: 'me@example.com', password: 'x' })).toEqual({})
  })

  it('rejects past or impossible plan windows', () => {
    const today = todayISO()
    const valid = validatePlanWindow({
      startDate: today,
      endDate: addDaysISO(today, 13),
      studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
      dailyMinutes: 60,
    })
    expect(valid.errors).toEqual({})

    const past = validatePlanWindow({
      startDate: addDaysISO(today, -1),
      endDate: addDaysISO(today, 10),
      studyWeekdays: [1, 2, 3, 4, 5],
      dailyMinutes: 60,
    })
    expect(past.errors.startDate).toMatch(/不能早于今天/)

    const noDays = validatePlanWindow({
      startDate: today,
      endDate: today,
      studyWeekdays: [((new Date().getDay() + 6) % 7) + 1],
      dailyMinutes: 60,
    })
    expect(Object.keys(noDays.errors).length).toBeGreaterThan(0)
  })

  it('validates task fields including optional actual minutes', () => {
    expect(validateTaskForm({ title: '', planId: '', taskDate: '', durationMinutes: 0 })).toHaveProperty('title')
    expect(
      validateTaskForm({
        title: '精听',
        planId: 1,
        taskDate: todayISO(),
        durationMinutes: 45,
        actualMinutes: 2000,
      }),
    ).toHaveProperty('actualMinutes')
    expect(
      validateTaskForm({
        title: '精听',
        planId: 1,
        taskDate: todayISO(),
        durationMinutes: 45,
        actualMinutes: 40,
      }),
    ).toEqual({})
  })
})
