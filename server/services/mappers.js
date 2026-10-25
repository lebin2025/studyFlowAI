import { safeJsonParse } from '../utils/text.js'

const parseWeekdays = (value) => {
  const parsed = safeJsonParse(value, [1, 2, 3, 4, 5])
  if (!Array.isArray(parsed)) return [1, 2, 3, 4, 5]
  const days = parsed.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}

export const mapStage = (row) => ({
  id: row.id,
  planId: row.plan_id,
  title: row.title,
  objective: row.objective || '',
  startDate: row.start_date,
  endDate: row.end_date,
  sortOrder: row.sort_order,
})

export const mapTask = (row) => ({
  id: row.id,
  planId: row.plan_id,
  stageId: row.stage_id,
  title: row.title,
  description: row.description || '',
  taskDate: row.task_date,
  durationMinutes: row.duration_minutes,
  priority: row.priority,
  completionCriteria: row.completion_criteria || '',
  isCompleted: Boolean(row.is_completed),
  completedAt: row.completed_at,
  isReview: Boolean(row.is_review),
  actualMinutes: row.actual_minutes,
  source: row.source,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.plan_title ? { planTitle: row.plan_title } : {}),
  ...(row.subject ? { subject: row.subject } : {}),
  ...(row.plan_status ? { planStatus: row.plan_status } : {}),
})

export const sumTaskStats = (tasks = []) => {
  const total = tasks.length
  const completed = tasks.filter((task) => task.isCompleted).length
  const totalMinutes = tasks.reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0)
  const completedMinutes = tasks
    .filter((task) => task.isCompleted)
    .reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0)
  return {
    taskCount: total,
    completedTasks: completed,
    totalMinutes,
    completedMinutes,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}

/**
 * @param {object} row plans row
 * @param {Array} tasks mapped tasks (optional; otherwise uses SQL aggregates)
 */
export const mapPlan = (row, tasks = null) => {
  const stats = tasks ? sumTaskStats(tasks) : null
  const taskCount = stats ? stats.taskCount : Number(row.taskCount ?? 0)
  const completedTasks = stats ? stats.completedTasks : Number(row.completedTasks ?? 0)
  const totalMinutes = stats ? stats.totalMinutes : Number(row.totalMinutes ?? 0)
  const completedMinutes = stats ? stats.completedMinutes : Number(row.completedMinutes ?? 0)
  const progress = stats
    ? stats.progress
    : Number(row.progress ?? (taskCount ? Math.round((completedTasks / taskCount) * 100) : 0))

  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    subject: row.subject,
    level: row.level,
    startDate: row.start_date,
    endDate: row.end_date,
    dailyMinutes: row.daily_minutes,
    studyWeekdays: parseWeekdays(row.study_weekdays),
    preferences: row.preferences || '',
    overview: row.overview || '',
    risks: safeJsonParse(row.risks, []),
    advice: row.advice || '',
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.stageCount !== undefined ? { stageCount: Number(row.stageCount) } : {}),
    taskCount,
    completedTasks,
    totalMinutes,
    completedMinutes,
    progress,
  }
}
