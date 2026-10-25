import { getDb } from '../db/database.js'
import { env } from '../config/env.js'
import { addDays, todayISO, weekdayISO, enumerateDates, diffDays } from '../utils/dates.js'

const number = (value) => Number(value) || 0

export const getOverview = async (userId, days = 30) => {
  const db = getDb()
  const today = todayISO(env.timezone)
  const rangeStart = addDays(today, -(days - 1))

  const totals = await db.get(
    `SELECT COUNT(*) AS totalTasks,
            COALESCE(SUM(is_completed), 0) AS completedTasks,
            COALESCE(SUM(duration_minutes), 0) AS plannedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END), 0) AS completedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 THEN actual_minutes ELSE 0 END), 0) AS loggedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 AND actual_minutes IS NOT NULL THEN 1 ELSE 0 END), 0) AS loggedTaskCount
     FROM tasks WHERE user_id = ?`,
    [userId],
  )

  const todayStats = await db.get(
    `SELECT COUNT(*) AS totalTasks,
            COALESCE(SUM(is_completed), 0) AS completedTasks,
            COALESCE(SUM(duration_minutes), 0) AS plannedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END), 0) AS completedMinutes
     FROM tasks WHERE user_id = ? AND task_date = ?`,
    [userId, today],
  )

  const overdue = await db.get(
    `SELECT COUNT(*) AS count, COALESCE(SUM(duration_minutes), 0) AS minutes
     FROM tasks WHERE user_id = ? AND is_completed = 0 AND task_date < ?`,
    [userId, today],
  )

  const upcoming = await db.get(
    `SELECT COUNT(*) AS count, COALESCE(SUM(duration_minutes), 0) AS minutes
     FROM tasks WHERE user_id = ? AND is_completed = 0 AND task_date > ? AND task_date <= ?`,
    [userId, today, addDays(today, 7)],
  )

  const planCounts = await db.get(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS activePlans,
       COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedPlans,
       COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) AS archivedPlans,
       COUNT(*) AS totalPlans
     FROM plans WHERE user_id = ?`,
    [userId],
  )

  const trendRows = await db.all(
    `SELECT task_date AS date,
            COUNT(*) AS total,
            COALESCE(SUM(is_completed), 0) AS completed,
            COALESCE(SUM(duration_minutes), 0) AS plannedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 THEN duration_minutes ELSE 0 END), 0) AS completedMinutes,
            COALESCE(SUM(CASE WHEN is_completed = 1 THEN actual_minutes ELSE 0 END), 0) AS loggedMinutes
     FROM tasks
     WHERE user_id = ? AND task_date BETWEEN ? AND ?
     GROUP BY task_date ORDER BY task_date ASC`,
    [userId, rangeStart, today],
  )
  const trendMap = new Map(trendRows.map((row) => [row.date, row]))
  const trend = enumerateDates(rangeStart, today, days).map((date) => {
    const row = trendMap.get(date)
    return {
      date,
      weekday: weekdayISO(date),
      total: number(row?.total),
      completed: number(row?.completed),
      plannedMinutes: number(row?.plannedMinutes),
      completedMinutes: number(row?.completedMinutes),
      loggedMinutes: number(row?.loggedMinutes),
    }
  })

  const weekdayMap = new Map()
  for (let day = 1; day <= 7; day += 1) {
    weekdayMap.set(day, { weekday: day, total: 0, completed: 0, plannedMinutes: 0 })
  }
  trend.forEach((row) => {
    const bucket = weekdayMap.get(row.weekday)
    if (!bucket) return
    bucket.total += row.total
    bucket.completed += row.completed
    bucket.plannedMinutes += row.plannedMinutes
  })

  const subjectRows = await db.all(
    `SELECT p.subject AS subject,
            COUNT(t.id) AS total,
            COALESCE(SUM(t.is_completed), 0) AS completed
     FROM tasks t JOIN plans p ON p.id = t.plan_id
     WHERE t.user_id = ?
     GROUP BY p.subject
     ORDER BY total DESC, p.subject ASC
     LIMIT 8`,
    [userId],
  )
  const subjects = subjectRows.map((row) => ({
    subject: row.subject,
    total: number(row.total),
    completed: number(row.completed),
  }))

  const completedDayRows = await db.all(
    `SELECT DISTINCT task_date AS date FROM tasks
     WHERE user_id = ? AND is_completed = 1
     ORDER BY task_date DESC LIMIT 400`,
    [userId],
  )
  const completedDays = completedDayRows.map((row) => row.date)

  const streak = calculateStreak(completedDays, today)
  const longestStreak = calculateLongestStreak(completedDays)

  const totalTasks = number(totals.totalTasks)
  const completedTasks = number(totals.completedTasks)

  return {
    generatedAt: new Date().toISOString(),
    timezone: env.timezone,
    today,
    range: { days, from: rangeStart, to: today },
    totals: {
      totalTasks,
      completedTasks,
      openTasks: totalTasks - completedTasks,
      completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      plannedMinutes: number(totals.plannedMinutes),
      completedMinutes: number(totals.completedMinutes),
      loggedMinutes: number(totals.loggedMinutes),
      loggedTaskCount: number(totals.loggedTaskCount),
    },
    today: {
      date: today,
      totalTasks: number(todayStats.totalTasks),
      completedTasks: number(todayStats.completedTasks),
      plannedMinutes: number(todayStats.plannedMinutes),
      completedMinutes: number(todayStats.completedMinutes),
    },
    overdue: { count: number(overdue.count), minutes: number(overdue.minutes) },
    upcoming: {
      next7DaysTasks: number(upcoming.count),
      next7DaysMinutes: number(upcoming.minutes),
    },
    plans: {
      active: number(planCounts.activePlans),
      completed: number(planCounts.completedPlans),
      archived: number(planCounts.archivedPlans),
      total: number(planCounts.totalPlans),
    },
    streak,
    longestStreak,
    trend,
    weekdays: [...weekdayMap.values()],
    subjects,
  }
}

export const calculateStreak = (datesDesc, today) => {
  const dates = new Set(datesDesc)
  let cursor = today
  if (!dates.has(cursor)) {
    const yesterday = addDays(today, -1)
    if (!dates.has(yesterday)) return 0
    cursor = yesterday
  }
  let streak = 0
  while (dates.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export const calculateLongestStreak = (dates) => {
  if (!dates.length) return 0
  const sorted = [...new Set(dates)].sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < sorted.length; i += 1) {
    if (diffDays(sorted[i - 1], sorted[i]) === 1) current += 1
    else current = 1
    longest = Math.max(longest, current)
  }
  return longest
}
