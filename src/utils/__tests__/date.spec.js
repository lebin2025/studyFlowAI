import { describe, it, expect } from 'vitest'
import {
  addDaysISO,
  countStudyDays,
  formatDate,
  formatMinutes,
  formatWeekly,
  relativeDay,
  todayISO,
  weekdayISO,
} from '@/utils/date.js'

describe('date utilities', () => {
  it('counts study days inside a range', () => {
    // 2026-10-25 is a Sunday (ISO weekday 7).
    expect(weekdayISO('2026-10-25')).toBe(7)
    expect(countStudyDays('2026-10-25', '2026-10-31', [1, 2, 3, 4, 5])).toBe(5)
    expect(countStudyDays('2026-10-25', '2026-10-31', [6, 7])).toBe(2)
    expect(countStudyDays('2026-10-25', '2026-10-25', [1])).toBe(0)
  })

  it('formats weekly schedules without repeating “每周 周一”', () => {
    expect(formatWeekly([1, 2, 3, 4, 5, 6, 7])).toBe('每天')
    expect(formatWeekly([5, 1, 3, 3])).toBe('周一、周三、周五')
    expect(formatWeekly([])).toBe('未选择')
  })

  it('formats human dates and relative labels', () => {
    expect(formatDate('2026-10-25', { weekday: true })).toBe('10月25日 周日')
    expect(formatDate('2026-10-25', { weekday: false, year: true })).toBe('2026年10月25日')
    expect(relativeDay(addDaysISO(todayISO(), 1))).toBe('明天')
    expect(relativeDay(addDaysISO(todayISO(), 2))).toBe('后天')
    expect(relativeDay(todayISO())).toBe('今天')
  })

  it('formats minutes into readable durations', () => {
    expect(formatMinutes(0)).toBe('0 分钟')
    expect(formatMinutes(45)).toBe('45 分钟')
    expect(formatMinutes(60)).toBe('1 小时')
    expect(formatMinutes(90)).toBe('1 小时 30 分钟')
  })
})
