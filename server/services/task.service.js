import { getDb } from '../db/database.js'
import { notFound } from '../utils/httpError.js'
import { escapeLike } from '../utils/text.js'
import { nowIsoString } from '../utils/dates.js'
import { mapTask } from './mappers.js'
import { assertPlanWindow, recalcPlanStatus } from './plan.service.js'

const TASK_SELECT = `
  SELECT t.*, p.title AS plan_title, p.subject AS subject, p.status AS plan_status
  FROM tasks t
  JOIN plans p ON p.id = t.plan_id
`

export const getTaskRow = async (userId, taskId, db = getDb()) => {
  const row = await db.get(`${TASK_SELECT} WHERE t.id = ? AND p.user_id = ?`, [taskId, userId])
  if (!row) throw notFound('没有找到这个任务')
  return row
}

export const assertPlanOwned = async (userId, planId, db = getDb()) => {
  const plan = await db.get('SELECT * FROM plans WHERE id = ? AND user_id = ?', [planId, userId])
  if (!plan) throw notFound('没有找到这个学习计划')
  return plan
}

const stageIdForDate = async (db, planId, date) => {
  const stage = await db.get(
    `SELECT id FROM plan_stages
     WHERE plan_id = ? AND start_date <= ? AND end_date >= ?
     ORDER BY sort_order ASC, id ASC LIMIT 1`,
    [planId, date, date],
  )
  return stage ? stage.id : null
}

export const listTasks = async (userId, filters = {}) => {
  const db = getDb()
  const conditions = ['p.user_id = ?']
  const params = [userId]

  if (filters.planId) {
    conditions.push('t.plan_id = ?')
    params.push(filters.planId)
  }
  if (filters.status === 'open') conditions.push('t.is_completed = 0')
  if (filters.status === 'done') conditions.push('t.is_completed = 1')
  if (filters.priority) {
    conditions.push('t.priority = ?')
    params.push(filters.priority)
  }
  if (filters.date) {
    conditions.push('t.task_date = ?')
    params.push(filters.date)
  }
  if (filters.from) {
    conditions.push('t.task_date >= ?')
    params.push(filters.from)
  }
  if (filters.to) {
    conditions.push('t.task_date <= ?')
    params.push(filters.to)
  }
  if (filters.search) {
    const term = `%${escapeLike(filters.search)}%`
    conditions.push(
      "(t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')",
    )
    params.push(term, term)
  }

  const where = conditions.join(' AND ')
  const limit = filters.limit ?? 200
  const offset = filters.offset ?? 0

  const rows = await db.all(
    `${TASK_SELECT} WHERE ${where}
     ORDER BY t.task_date ASC,
       CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       t.sort_order ASC, t.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )

  const totalRow = await db.get(
    `SELECT COUNT(*) AS count FROM tasks t JOIN plans p ON p.id = t.plan_id WHERE ${where}`,
    params,
  )
  const total = Number(totalRow.count)

  return {
    items: rows.map(mapTask),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  }
}

export const createTask = async (userId, input) => {
  const db = getDb()
  const plan = await assertPlanOwned(userId, input.planId, db)
  assertPlanWindow(plan, input.taskDate)

  const maxRow = await db.get(
    'SELECT COALESCE(MAX(sort_order), -1) AS value FROM tasks WHERE plan_id = ? AND task_date = ?',
    [plan.id, input.taskDate],
  )
  const maxOrder = Number(maxRow.value)

  const timestamp = nowIsoString()
  const stageId = await stageIdForDate(db, plan.id, input.taskDate)
  const taskId = await db.insert(
    `INSERT INTO tasks
      (plan_id, stage_id, user_id, title, description, task_date, duration_minutes,
       priority, completion_criteria, is_completed, completed_at, is_review,
       actual_minutes, source, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, NULL, 'manual', ?, ?, ?)`,
    [
      plan.id,
      stageId,
      userId,
      input.title,
      input.description || '',
      input.taskDate,
      input.durationMinutes,
      input.priority,
      input.completionCriteria || '',
      input.isReview ? 1 : 0,
      maxOrder + 1,
      timestamp,
      timestamp,
    ],
  )

  await recalcPlanStatus(plan.id, db)
  return mapTask(await getTaskRow(userId, taskId, db))
}

export const updateTask = async (userId, taskId, patch) => {
  const db = getDb()
  const current = await getTaskRow(userId, taskId, db)
  const plan = await db.get('SELECT * FROM plans WHERE id = ?', [current.plan_id])

  const taskDate = patch.taskDate ?? current.task_date
  if (patch.taskDate !== undefined) {
    assertPlanWindow(plan, taskDate)
  }

  const fields = []
  const values = []
  const mapping = {
    title: 'title',
    description: 'description',
    taskDate: 'task_date',
    durationMinutes: 'duration_minutes',
    priority: 'priority',
    completionCriteria: 'completion_criteria',
    actualMinutes: 'actual_minutes',
    isReview: 'is_review',
  }

  for (const [key, column] of Object.entries(mapping)) {
    if (patch[key] !== undefined) {
      fields.push(`${column} = ?`)
      values.push(
        key === 'isReview' ? (patch[key] ? 1 : 0) : patch[key],
      )
    }
  }

  if (patch.taskDate !== undefined) {
    fields.push('stage_id = ?')
    values.push(await stageIdForDate(db, current.plan_id, patch.taskDate))
  }

  if (fields.length === 0) return mapTask(current)
  fields.push('updated_at = ?')
  values.push(nowIsoString(), taskId)
  await db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)

  await recalcPlanStatus(current.plan_id, db)
  return mapTask(await getTaskRow(userId, taskId, db))
}

export const toggleTask = async (userId, taskId, { isCompleted, actualMinutes }) => {
  const db = getDb()
  const current = await getTaskRow(userId, taskId, db)
  const timestamp = nowIsoString()

  const nextActual =
    actualMinutes !== undefined
      ? actualMinutes
      : isCompleted
        ? current.actual_minutes
        : null

  await db.run(
    `UPDATE tasks SET is_completed = ?, completed_at = ?, actual_minutes = ?, updated_at = ?
     WHERE id = ?`,
    [isCompleted ? 1 : 0, isCompleted ? timestamp : null, nextActual, timestamp, taskId],
  )

  const planStatus = await recalcPlanStatus(current.plan_id, db)
  const task = mapTask(await getTaskRow(userId, taskId, db))
  return {
    task,
    plan: {
      id: current.plan_id,
      status: planStatus,
      ...(await getPlanCounts(current.plan_id, db)),
    },
  }
}

export const getPlanCounts = async (planId, db = getDb()) => {
  const row = await db.get(
    `SELECT COUNT(*) AS taskCount, COALESCE(SUM(is_completed), 0) AS completedTasks
     FROM tasks WHERE plan_id = ?`,
    [planId],
  )
  const taskCount = Number(row.taskCount)
  const completedTasks = Number(row.completedTasks)
  return {
    taskCount,
    completedTasks,
    progress: taskCount === 0 ? 0 : Math.round((completedTasks / taskCount) * 100),
  }
}

export const deleteTask = async (userId, taskId) => {
  const db = getDb()
  const current = await getTaskRow(userId, taskId, db)
  await db.run('DELETE FROM tasks WHERE id = ?', [taskId])
  await recalcPlanStatus(current.plan_id, db)
  return { deleted: true, planId: current.plan_id }
}
