const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export const todayISO = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const isISODate = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export const parseISODate = (value) => {
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const addDaysISO = (isoDate, amount) => {
  const date = parseISODate(isoDate)
  date.setDate(date.getDate() + amount)
  return toISODate(date)
}

export const diffDays = (from, to) =>
  Math.round((parseISODate(to) - parseISODate(from)) / 86400000)

export const weekdayISO = (isoDate) => {
  const day = parseISODate(isoDate).getDay()
  return day === 0 ? 7 : day
}

export const weekdayLabel = (isoDate) => WEEKDAY_LABELS[parseISODate(isoDate).getDay()]
export const weekdayShort = (isoDate) => WEEKDAY_SHORT[parseISODate(isoDate).getDay()]
export const weekdayName = (isoWeekday) => WEEKDAY_LABELS[isoWeekday === 7 ? 0 : isoWeekday]

export const formatWeekly = (weekdays = []) => {
  const days = [...new Set((weekdays || []).map(Number))]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b)
  if (!days.length) return '未选择'
  if (days.length === 7) return '每天'
  return days.map((day) => weekdayName(day)).join('、')
}

export const formatDate = (isoDate, { weekday = true, year = false } = {}) => {
  if (!isISODate(isoDate)) return ''
  const date = parseISODate(isoDate)
  let label = ''
  if (year) label += `${date.getFullYear()}年`
  label += `${date.getMonth() + 1}月${date.getDate()}日`
  if (weekday) label += ` ${WEEKDAY_LABELS[date.getDay()]}`
  return label
}

export const formatDateShort = (isoDate) => {
  if (!isISODate(isoDate)) return ''
  const date = parseISODate(isoDate)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export const formatDateRange = (start, end, options) =>
  `${formatDate(start, options)} — ${formatDate(end, options)}`

export const relativeDay = (isoDate, today = todayISO()) => {
  if (!isISODate(isoDate)) return ''
  const delta = diffDays(today, isoDate)
  if (delta === 0) return '今天'
  if (delta === 1) return '明天'
  if (delta === -1) return '昨天'
  if (delta === 2) return '后天'
  if (delta === -2) return '前天'
  return formatDate(isoDate, { weekday: true })
}

export const isOverdue = (isoDate) => isISODate(isoDate) && isoDate < todayISO()

export const enumerateDates = (start, end, max = 400) => {
  if (!isISODate(start) || !isISODate(end) || start > end) return []
  const dates = []
  const total = diffDays(start, end)
  for (let offset = 0; offset <= total && dates.length < max; offset += 1) {
    dates.push(addDaysISO(start, offset))
  }
  return dates
}

export const countStudyDays = (start, end, weekdays = []) => {
  if (!isISODate(start) || !isISODate(end)) return 0
  const allowed = new Set(weekdays)
  return enumerateDates(start, end).filter((date) => allowed.has(weekdayISO(date))).length
}

export const startOfWeek = (isoDate = todayISO()) =>
  addDaysISO(isoDate, -(weekdayISO(isoDate) - 1))

export const endOfWeek = (isoDate = todayISO()) =>
  addDaysISO(startOfWeek(isoDate), 6)

export const greeting = (date = new Date()) => {
  const hour = date.getHours()
  if (hour < 5) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export const formatMinutes = (minutes) => {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (value === 0) return '0 分钟'
  if (value < 60) return `${value} 分钟`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`
}

export const formatHours = (minutes) => {
  const hours = (Number(minutes) || 0) / 60
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} 小时`
}

export const formatDateTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

export const formatDurationClock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const timeAgo = (isoString) => {
  if (!isoString) return ''
  const time = new Date(isoString).getTime()
  if (Number.isNaN(time)) return ''
  const diff = Date.now() - time
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return formatDateTime(isoString)
}

export const WEEKDAYS = [
  { value: 1, label: '周一', short: '一' },
  { value: 2, label: '周二', short: '二' },
  { value: 3, label: '周三', short: '三' },
  { value: 4, label: '周四', short: '四' },
  { value: 5, label: '周五', short: '五' },
  { value: 6, label: '周六', short: '六' },
  { value: 7, label: '周日', short: '日' },
]
