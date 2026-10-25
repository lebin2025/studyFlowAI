const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86400000

export const WEEKDAY_LABELS = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

export const isISODate = (value) => {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const parseISODate = (value) => new Date(`${value}T00:00:00.000Z`)

export const toISODate = (date) => {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  return normalized.toISOString().slice(0, 10)
}

export const addDays = (isoDate, amount) => {
  const date = parseISODate(isoDate)
  date.setUTCDate(date.getUTCDate() + amount)
  return toISODate(date)
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const diffDays = (from, to) =>
  Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / MS_PER_DAY)

export const todayISO = (timeZone = 'UTC') => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export const weekdayISO = (isoDate) => {
  const day = parseISODate(isoDate).getUTCDay()
  return day === 0 ? 7 : day
}

export const enumerateDates = (startDate, endDate, max = 400) => {
  const dates = []
  const total = diffDays(startDate, endDate)
  for (let offset = 0; offset <= total && dates.length < max; offset += 1) {
    dates.push(addDays(startDate, offset))
  }
  return dates
}

export const countStudyDays = (startDate, endDate, weekdays) => {
  const allowed = new Set(weekdays)
  return enumerateDates(startDate, endDate).filter((date) => allowed.has(weekdayISO(date))).length
}

/** Moves a date to the closest allowed weekday inside [minDate, maxDate]. */
export const snapToStudyDay = (isoDate, weekdays, minDate, maxDate, direction = 1) => {
  const allowed = new Set(weekdays)
  if (allowed.size === 0) return null
  let candidate = isoDate
  for (let i = 0; i <= 7; i += 1) {
    if (candidate >= minDate && candidate <= maxDate && allowed.has(weekdayISO(candidate))) {
      return candidate
    }
    candidate = addDays(candidate, direction)
  }
  // Fall back to scanning forward from the range start.
  for (let i = 0; i <= 7; i += 1) {
    const forward = addDays(minDate, i)
    if (forward <= maxDate && allowed.has(weekdayISO(forward))) return forward
  }
  return null
}

export const formatWeekdays = (weekdays = []) =>
  [...weekdays]
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS[day] || '')
    .filter(Boolean)
    .join('、')

export const nowIsoString = () => new Date().toISOString()
