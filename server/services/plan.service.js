import { getDb } from '../db/database.js'
import { env } from '../config/env.js'
import { conflict, notFound } from '../utils/httpError.js'
import { escapeLike, safeJsonParse } from '../utils/text.js'
import { nowIsoString } from '../utils/dates.js'
import { mapPlan, mapStage, mapTask } from './mappers.js'

const SORT_COLUMNS = {
  updated: 'p.updated_at',
  created: 'p.created_at',
  start: 'p.start_date',
  end: 'p.end_date',
  title: 'LOWER(p.title)',
  progress: 'progress',
}

const planSelect = `
  SELECT p.id, p.user_id, p.title, p.goal, p.subject, p.level,
         p.start_date, p.end_date, p.daily_minutes, p.study_weekdays,
         p.preferences, p.overview, p.risks, p.advice, p.status, p.source,
         p.created_at, p.updated_at,
         (SELECT COUNT(*) FROM tasks t WHERE t.plan_id = p.id) AS taskCount,
         (SELECT COUNT(*) FROM tasks t WHERE t.plan_id = p.id AND t.is_completed = 1) AS completedTasks,
         (SELECT COALESCE(SUM(t.duration_minutes), 0) FROM tasks t WHERE t.plan_id = p.id) AS totalMinutes,
         (SELECT COALESCE(SUM(t.duration_minutes), 0) FROM tasks t WHERE t.plan_id = p.id AND t.is_completed = 1) AS completedMinutes,
         (SELECT COUNT(*) FROM plan_stages s WHERE s.plan_id = p.id) AS stageCount,
         CASE WHEN (SELECT COUNT(*) FROM tasks t WHERE t.plan_id = p.id) = 0 THEN 0
              ELSE ROUND(
                100.0 * (SELECT COUNT(*) FROM tasks t WHERE t.plan_id = p.id AND t.is_completed = 1)
                / (SELECT COUNT(*) FROM tasks t WHERE t.plan_id = p.id)
              )
         END AS progress
  FROM plans p
`

export const getPlanRow = async (userId, planId, db = getDb()) => {
  const row = await db.get(`${planSelect} WHERE p.id = ? AND p.user_id = ?`, [planId, userId])
  if (!row) throw notFound('没有找到这个学习计划')
  return row
}

export const getPlanDetail = async (userId, planId, db = getDb()) => {
  const row = await getPlanRow(userId, planId, db)
  const stageRows = await db.all(
    'SELECT * FROM plan_stages WHERE plan_id = ? ORDER BY sort_order ASC, id ASC',
    [planId],
  )
  const taskRows = await db.all(
    `SELECT * FROM tasks WHERE plan_id = ?
     ORDER BY task_date ASC,
       CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       sort_order ASC, id ASC`,
    [planId],
  )
  return {
    plan: mapPlan(row),
    stages: stageRows.map(mapStage),
    tasks: taskRows.map(mapTask),
  }
}

export const listPlans = async (userId, filters = {}) => {
  const db = getDb()
  const conditions = ['p.user_id = ?']
  const params = [userId]

  if (filters.status && filters.status !== 'all') {
    conditions.push('p.status = ?')
    params.push(filters.status)
  }
  if (filters.subject) {
    conditions.push('p.subject = ?')
    params.push(filters.subject)
  }
  if (filters.search) {
    const term = `%${escapeLike(filters.search)}%`
    conditions.push(
      "(p.title LIKE ? ESCAPE '\\' OR p.goal LIKE ? ESCAPE '\\' OR p.subject LIKE ? ESCAPE '\\')",
    )
    params.push(term, term, term)
  }

  const sortKey = SORT_COLUMNS[filters.sort] || SORT_COLUMNS.updated
  const direction = filters.order === 'asc' ? 'ASC' : 'DESC'
  const rows = await db.all(
    `${planSelect} WHERE ${conditions.join(' AND ')} ORDER BY ${sortKey} ${direction}, p.id DESC`,
    params,
  )

  const subjectRows = await db.all(
    'SELECT subject FROM plans WHERE user_id = ? GROUP BY subject ORDER BY LOWER(subject)',
    [userId],
  )

  return {
    items: rows.map((row) => mapPlan(row)),
    total: rows.length,
    subjects: subjectRows.map((row) => row.subject),
  }
}

const stageIdForTask = (task, stageIds, stages) => {
  if (Number.isInteger(task.stageIndex) && stageIds[task.stageIndex]) {
    return stageIds[task.stageIndex]
  }
  const matching = stages.find(
    (stage) => task.taskDate >= stage.startDate && task.taskDate <= stage.endDate,
  )
  return matching ? matching.id : null
}

export const assertPlanWindow = (plan, taskDate) => {
  if (taskDate < plan.start_date || taskDate > plan.end_date) {
    throw conflict(
      'TASK_OUTSIDE_PLAN',
      `任务日期需要在计划周期（${plan.start_date} 至 ${plan.end_date}）内`,
    )
  }
}

export const createPlan = async (userId, input) => {
  const db = getDb()
  const now = nowIsoString()

  const planId = await db.transaction(async (tx) => {
    const id = await tx.insert(
      `INSERT INTO plans
        (user_id, title, goal, subject, level, start_date, end_date, daily_minutes,
         study_weekdays, preferences, overview, risks, advice, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        userId,
        input.title,
        input.goal,
        input.subject,
        input.level,
        input.startDate,
        input.endDate,
        input.dailyMinutes,
        JSON.stringify(input.studyWeekdays),
        input.preferences || '',
        input.overview || '',
        JSON.stringify(input.risks || []),
        input.advice || '',
        input.source || 'ai',
        now,
        now,
      ],
    )

    const stageIds = []
    const stages = []
    for (const [index, stage] of input.stages.entries()) {
      const stageId = await tx.insert(
        `INSERT INTO plan_stages (plan_id, title, objective, start_date, end_date, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          stage.title,
          stage.objective || '',
          stage.startDate,
          stage.endDate,
          stage.sortOrder ?? index,
          now,
        ],
      )
      stageIds.push(stageId)
      stages.push({ ...stage, id: stageId })
    }

    for (const [index, task] of input.tasks.entries()) {
      await tx.run(
        `INSERT INTO tasks
          (plan_id, stage_id, user_id, title, description, task_date, duration_minutes,
           priority, completion_criteria, is_completed, completed_at, is_review,
           actual_minutes, source, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, NULL, ?, ?, ?, ?)`,
        [
          id,
          stageIdForTask(task, stageIds, stages),
          userId,
          task.title,
          task.description || '',
          task.taskDate,
          task.durationMinutes,
          task.priority,
          task.completionCriteria || '',
          task.isReview ? 1 : 0,
          input.source === 'manual' ? 'manual' : 'ai',
          index,
          now,
          now,
        ],
      )
    }

    return id
  })

  return getPlanDetail(userId, planId)
}

export const updatePlan = async (userId, planId, patch) => {
  const db = getDb()
  const current = await getPlanRow(userId, planId, db)
  const merged = {
    title: patch.title ?? current.title,
    goal: patch.goal ?? current.goal,
    subject: patch.subject ?? current.subject,
    level: patch.level ?? current.level,
    startDate: patch.startDate ?? current.start_date,
    endDate: patch.endDate ?? current.end_date,
    dailyMinutes: patch.dailyMinutes ?? current.daily_minutes,
    studyWeekdays:
      patch.studyWeekdays ?? safeJsonParse(current.study_weekdays, [1, 2, 3, 4, 5]),
    preferences: patch.preferences ?? current.preferences,
    overview: patch.overview ?? current.overview,
    advice: patch.advice ?? current.advice,
    risks: patch.risks ?? safeJsonParse(current.risks, []),
    status: patch.status ?? current.status,
  }

  if (merged.startDate > merged.endDate) {
    throw conflict('INVALID_DATE_RANGE', '结束日期不能早于开始日期')
  }
  const span = Math.round(
    (Date.parse(`${merged.endDate}T00:00:00Z`) - Date.parse(`${merged.startDate}T00:00:00Z`)) /
      86400000,
  )
  if (span + 1 > env.limits.maxPlanDays) {
    throw conflict('PLAN_TOO_LONG', `计划周期不能超过 ${env.limits.maxPlanDays} 天`)
  }

  if (patch.startDate || patch.endDate) {
    const outside = await db.get(
      'SELECT COUNT(*) AS count FROM tasks WHERE plan_id = ? AND (task_date < ? OR task_date > ?)',
      [planId, merged.startDate, merged.endDate],
    )
    if (Number(outside.count) > 0) {
      throw conflict(
        'PLAN_RANGE_CONFLICT',
        `有 ${outside.count} 个任务不在新的日期范围内，请先调整这些任务`,
        { taskCount: Number(outside.count) },
      )
    }
  }

  await db.run(
    `UPDATE plans SET title = ?, goal = ?, subject = ?, level = ?, start_date = ?,
       end_date = ?, daily_minutes = ?, study_weekdays = ?, preferences = ?,
       overview = ?, advice = ?, risks = ?, status = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    [
      merged.title,
      merged.goal,
      merged.subject,
      merged.level,
      merged.startDate,
      merged.endDate,
      merged.dailyMinutes,
      JSON.stringify(merged.studyWeekdays),
      merged.preferences,
      merged.overview,
      merged.advice,
      JSON.stringify(merged.risks),
      merged.status,
      nowIsoString(),
      planId,
      userId,
    ],
  )

  return getPlanDetail(userId, planId, db)
}

export const deletePlan = async (userId, planId) => {
  const db = getDb()
  await getPlanRow(userId, planId, db)
  await db.run('DELETE FROM plans WHERE id = ? AND user_id = ?', [planId, userId])
  return { deleted: true }
}

/** Keeps plan.status in sync with its tasks (never touches archived plans). */
export const recalcPlanStatus = async (planId, db = getDb()) => {
  const plan = await db.get('SELECT id, status FROM plans WHERE id = ?', [planId])
  if (!plan || plan.status === 'archived') return plan?.status
  const counts = await db.get(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(is_completed), 0) AS completed
     FROM tasks WHERE plan_id = ?`,
    [planId],
  )
  const total = Number(counts.total) || 0
  const completed = Number(counts.completed) || 0
  if (total === 0) return plan.status
  if (completed === total && plan.status === 'active') {
    await db.run("UPDATE plans SET status = 'completed', updated_at = ? WHERE id = ?", [
      nowIsoString(),
      planId,
    ])
    return 'completed'
  }
  if (completed < total && plan.status === 'completed') {
    await db.run("UPDATE plans SET status = 'active', updated_at = ? WHERE id = ?", [
      nowIsoString(),
      planId,
    ])
    return 'active'
  }
  return plan.status
}
