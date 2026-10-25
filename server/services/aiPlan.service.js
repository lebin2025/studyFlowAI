import { z } from 'zod'
import { env } from '../config/env.js'
import { AppError } from '../utils/httpError.js'
import {
  addDays,
  countStudyDays,
  diffDays,
  isISODate,
  snapToStudyDay,
  todayISO,
  nowIsoString,
} from '../utils/dates.js'
import { cleanText, clamp, uniqueBy } from '../utils/text.js'
import { computeCost, normalizeUsage } from '../utils/cost.js'
import { logger } from '../utils/logger.js'
import { callDeepSeekJson } from './deepseek.service.js'
import {
  AI_SYSTEM_PROMPT,
  buildGeneratePrompt,
  buildAdjustPrompt,
} from '../prompts/planPrompts.js'
import { getDraft, recordAiUsage, saveDraft } from './usage.service.js'
import { getDb } from '../db/database.js'
import { getPlanDetail, recalcPlanStatus } from './plan.service.js'

const rawTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullish(),
    date: z.string().nullish(),
    taskDate: z.string().nullish(),
    durationMinutes: z.union([z.number(), z.string()]).nullish(),
    priority: z.string().nullish(),
    completionCriteria: z.string().nullish(),
    isReview: z.union([z.boolean(), z.string(), z.number()]).nullish(),
    stageIndex: z.union([z.number(), z.string()]).nullish(),
  })
  .passthrough()

const rawStageSchema = z
  .object({
    title: z.string().min(1),
    objective: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
  })
  .passthrough()

const rawPlanSchema = z
  .object({
    title: z.string().nullish(),
    goal: z.string().nullish(),
    overview: z.string().nullish(),
    stages: z.array(rawStageSchema).min(1).max(12),
    tasks: z.array(rawTaskSchema).min(1).max(400),
    risks: z.array(z.union([z.string(), z.record(z.any())])).nullish(),
    advice: z.string().nullish(),
    changeSummary: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    dailyMinutes: z.union([z.number(), z.string()]).nullish(),
    studyWeekdays: z.array(z.union([z.number(), z.string()])).nullish(),
  })
  .passthrough()

export const parseAiJson = (content) => {
  let text = String(content || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 返回的内容不是有效 JSON，请重试')
  }
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch (error) {
    logger.warn('AI JSON parse failed', { length: text.length, error: error.message })
    throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 返回的计划格式不正确，请重试')
  }
}

const parseBool = (value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  return ['true', '1', 'yes', '是'].includes(String(value).toLowerCase())
}

const parsePriority = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (['high', '高', '紧急'].includes(normalized)) return 'high'
  if (['low', '低', '次要'].includes(normalized)) return 'low'
  return 'medium'
}

const normalizeWeekdays = (value, fallback) => {
  if (!Array.isArray(value)) return fallback
  const days = value
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  if (!days.length) return fallback
  return [...new Set(days)].sort((a, b) => a - b)
}

const clampDate = (date, min, max) => (date < min ? min : date > max ? max : date)

const stageForDate = (stages, date) => {
  const matching = stages.findIndex(
    (stage) => date >= stage.startDate && date <= stage.endDate,
  )
  if (matching >= 0) return matching
  let best = 0
  let distance = Number.POSITIVE_INFINITY
  stages.forEach((stage, index) => {
    const candidate = Math.min(
      Math.abs(diffDays(date, stage.startDate)),
      Math.abs(diffDays(date, stage.endDate)),
    )
    if (candidate < distance) {
      distance = candidate
      best = index
    }
  })
  return best
}

const mergeRisks = (risks) => {
  if (!Array.isArray(risks)) return []
  return risks
    .map((risk) => {
      if (typeof risk === 'string') {
        return { title: cleanText(risk, 120), detail: '' }
      }
      return {
        title: cleanText(risk?.title, 120),
        detail: cleanText(risk?.detail ?? risk?.description, 600),
      }
    })
    .filter((risk) => risk.title)
    .slice(0, 8)
}

/**
 * Normalises untrusted model output into the exact shape the API/database
 * accepts. Dates, daily time budgets, stages and duplicates are all enforced
 * here so the model can never write an impossible plan.
 */
export const normalizePlan = ({ raw, base, allowOverrides = false, today = todayISO(env.timezone) }) => {
  if (!Array.isArray(raw?.stages) || !raw.stages.length || !Array.isArray(raw?.tasks) || !raw.tasks.length) {
    throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 返回的计划缺少阶段或任务，请重试')
  }
  const warnings = []
  const startDate = base.startDate
  let endDate = base.endDate
  let dailyMinutes = base.dailyMinutes
  let studyWeekdays = base.studyWeekdays

  if (allowOverrides) {
    if (isISODate(raw.endDate) && raw.endDate >= startDate && raw.endDate >= today) {
      if (diffDays(startDate, raw.endDate) + 1 <= env.limits.maxPlanDays) {
        endDate = raw.endDate
      }
    }
    const proposedMinutes = Number(raw.dailyMinutes)
    if (Number.isFinite(proposedMinutes) && proposedMinutes >= 10 && proposedMinutes <= 480) {
      dailyMinutes = Math.round(proposedMinutes)
    }
    studyWeekdays = normalizeWeekdays(raw.studyWeekdays, base.studyWeekdays)
  }

  const planDays = diffDays(startDate, endDate) + 1
  const studyDays = countStudyDays(startDate, endDate, studyWeekdays)
  if (studyDays === 0) {
    throw new AppError(
      502,
      'AI_INVALID_CONSTRAINTS',
      'AI 返回的日期与可学习日组合不可用，请重试或调整学习日',
    )
  }

  // ---- stages -------------------------------------------------------------
  const rawStages = raw.stages.slice(0, Math.min(raw.stages.length, planDays, 12))
  if (rawStages.length < raw.stages.length) {
    warnings.push('阶段数量超过计划天数，已合并多余阶段')
  }

  let stages = rawStages.map((stage, index) => ({
    rawIndex: index,
    title: cleanText(stage.title, 80) || `阶段 ${index + 1}`,
    objective: cleanText(stage.objective, 600),
    startDate: isISODate(stage.startDate) ? stage.startDate : null,
    endDate: isISODate(stage.endDate) ? stage.endDate : null,
  }))

  // Keep valid AI dates, otherwise distribute evenly. Then force continuity.
  stages = stages.map((stage, index) => {
    const fallbackStart = addDays(startDate, Math.floor((index * planDays) / stages.length))
    let start = stage.startDate
    if (!start || start < startDate || start > endDate) {
      start = clampDate(fallbackStart, startDate, endDate)
    }
    return { ...stage, startDate: start }
  })
  stages.sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.rawIndex - b.rawIndex))

  stages = stages.map((stage, index) => {
    const minimum = index === 0 ? startDate : addDays(stages[index - 1].startDate, 1)
    const requested = index === 0 ? startDate : stage.startDate >= minimum ? stage.startDate : minimum
    const start = clampDate(requested, startDate, endDate)
    return { ...stage, startDate: start }
  })
  stages.forEach((stage, index) => {
    stage.endDate =
      index === stages.length - 1 ? endDate : addDays(stages[index + 1].startDate, -1)
    if (stage.endDate < stage.startDate) stage.endDate = stage.startDate
  })

  const remap = new Map(stages.map((stage, index) => [stage.rawIndex, index]))

  // ---- tasks --------------------------------------------------------------
  const rawTasks = raw.tasks
  const maxTasks = Math.min(env.limits.maxAiTasks, Math.max(studyDays * 2, 12))
  let adjustedDayCount = 0
  let invalidDateCount = 0

  let tasks = rawTasks
    .map((task, index) => {
      const title = cleanText(task.title, 160)
      if (!title) return null
      const rawDate = task.taskDate || task.date
      let date = isISODate(rawDate) ? rawDate : null
      if (!date) {
        invalidDateCount += 1
        const fallback = addDays(startDate, Math.floor((index * planDays) / Math.max(rawTasks.length, 1)))
        date = clampDate(fallback, startDate, endDate)
      } else if (date < startDate || date > endDate) {
        adjustedDayCount += 1
        date = clampDate(date, startDate, endDate)
      }
      const snapped = snapToStudyDay(date, studyWeekdays, startDate, endDate, 1)
      if (!snapped) return null
      if (snapped !== date) adjustedDayCount += 1

      const rawDuration = Number(task.durationMinutes)
      const duration = Number.isFinite(rawDuration)
        ? clamp(Math.round(rawDuration), 5, 480)
        : Math.min(45, dailyMinutes)

      const rawStageIndex = Number(task.stageIndex)
      const stageIndex = Number.isInteger(rawStageIndex) && remap.has(rawStageIndex)
        ? remap.get(rawStageIndex)
        : stageForDate(stages, snapped)

      return {
        title,
        description: cleanText(task.description, 1000),
        taskDate: snapped,
        durationMinutes: duration,
        priority: parsePriority(task.priority),
        completionCriteria: cleanText(task.completionCriteria, 600),
        isReview: parseBool(task.isReview),
        stageIndex,
        originalIndex: index,
      }
    })
    .filter(Boolean)

  tasks = uniqueBy(tasks, (task) => `${task.taskDate}|${task.title.toLowerCase()}`)
  tasks.sort((a, b) =>
    a.taskDate === b.taskDate ? a.originalIndex - b.originalIndex : a.taskDate < b.taskDate ? -1 : 1,
  )

  if (tasks.length > maxTasks) {
    warnings.push(`AI 返回了 ${tasks.length} 个任务，已保留前 ${maxTasks} 个以控制计划规模`)
    tasks = tasks.slice(0, maxTasks)
  }

  // Daily budget: scale down and, if needed, drop low-priority overflow.
  let scaledDays = 0
  let droppedTasks = 0
  const byDay = new Map()
  tasks.forEach((task) => {
    if (!byDay.has(task.taskDate)) byDay.set(task.taskDate, [])
    byDay.get(task.taskDate).push(task)
  })
  const dailyLimit = dailyMinutes
  for (const dayTasks of byDay.values()) {
    let total = dayTasks.reduce((sum, task) => sum + task.durationMinutes, 0)
    if (total <= dailyLimit) continue
    scaledDays += 1
    const ratio = dailyLimit / total
    dayTasks.forEach((task) => {
      task.durationMinutes = Math.max(5, Math.floor(task.durationMinutes * ratio))
    })
    total = dayTasks.reduce((sum, task) => sum + task.durationMinutes, 0)
    // Still over budget (many tiny tasks): drop the lowest priority tail.
    while (total > dailyLimit && dayTasks.length > 1) {
      const dropIndex = dayTasks.reduce(
        (worst, task, index) =>
          task.priority === 'low' && dayTasks[worst].priority !== 'low' ? index : worst,
        dayTasks.length - 1,
      )
      total -= dayTasks[dropIndex].durationMinutes
      dayTasks.splice(dropIndex, 1)
      droppedTasks += 1
    }
  }
  if (droppedTasks) tasks = tasks.filter((task) => byDay.get(task.taskDate)?.includes(task))
  if (scaledDays) warnings.push(`已调整 ${scaledDays} 天的任务时长，使每日安排更接近 ${dailyMinutes} 分钟`)
  if (droppedTasks) warnings.push(`为符合每日时长上限，移除了 ${droppedTasks} 个低优先级任务`)
  if (adjustedDayCount) warnings.push(`已将 ${adjustedDayCount} 个任务调整到可学习日`)
  if (invalidDateCount) warnings.push(`有 ${invalidDateCount} 个任务缺少有效日期，已安排到可学习日`)

  if (!tasks.length) {
    throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 没有生成有效的学习任务，请重试')
  }

  const title = cleanText(raw.title, 40) || `${base.subject}学习计划`
  const goal = cleanText(raw.goal, 1000) || base.goal
  const overview = cleanText(raw.overview, 2000)
  const advice = cleanText(raw.advice, 1000)
  const risks = allowOverrides ? mergeRisks(raw.risks) : mergeRisks(raw.risks)

  const plan = {
    title,
    goal,
    subject: base.subject,
    level: base.level,
    startDate,
    endDate,
    dailyMinutes,
    studyWeekdays,
    preferences: base.preferences || '',
    overview,
    risks,
    advice,
    stages: stages.map((stage) => ({
      title: stage.title,
      objective: stage.objective,
      startDate: stage.startDate,
      endDate: stage.endDate,
    })),
    tasks: tasks.map(({ originalIndex, ...task }) => task),
  }

  return {
    plan,
    warnings,
    meta: {
      planDays,
      studyDays,
      taskCount: tasks.length,
      totalMinutes: tasks.reduce((sum, task) => sum + task.durationMinutes, 0),
      dailyMinutes,
      endDate,
      changeSummary: cleanText(raw.changeSummary, 1000),
    },
  }
}

const recordFailure = ({ userId, planId, requestId, kind, error, latencyMs }) => {
  try {
    recordAiUsage({
      userId,
      planId,
      requestId,
      kind,
      model: env.deepseek.model,
      usage: error?.usage || {},
      latencyMs,
      success: false,
      errorCode: error?.code || 'AI_ERROR',
    })
  } catch (usageError) {
    logger.warn('Failed to record AI usage', { error: usageError.message })
  }
}

export const generateStudyPlan = async (userId, input, requestId) => {
  const cached = getDraft(userId, requestId, 'generate')
  if (cached) {
    return { ...cached, meta: { ...cached.meta, cached: true } }
  }

  const today = todayISO(env.timezone)
  const base = {
    startDate: input.startDate,
    endDate: input.endDate,
    dailyMinutes: input.dailyMinutes,
    studyWeekdays: input.studyWeekdays,
    goal: input.goal,
    subject: input.subject,
    level: input.level,
    preferences: input.preferences,
  }
  const planDays = diffDays(input.startDate, input.endDate) + 1
  const studyDays = countStudyDays(input.startDate, input.endDate, input.studyWeekdays)
  const prompt = buildGeneratePrompt(input, { today, planDays, studyDays })
  const startedAt = Date.now()

  let result
  try {
    result = await callDeepSeekJson({
      system: `今天是 ${today}。${AI_SYSTEM_PROMPT}`,
      user: prompt,
      maxTokens: env.deepseek.maxTokens,
    })
    const raw = rawPlanSchema.parse(parseAiJson(result.content))
    const normalized = normalizePlan({
      raw,
      base,
      allowOverrides: false,
      today,
    })
    const usage = normalizeUsage(result.usage)
    recordAiUsage({
      userId,
      planId: null,
      requestId,
      kind: 'generate',
      model: result.model,
      usage: result.usage,
      latencyMs: result.latencyMs,
      success: true,
    })

    const payload = {
      plan: normalized.plan,
      warnings: normalized.warnings,
      meta: {
        ...normalized.meta,
        model: result.model,
        usage,
        costUsd: computeCost(result.usage).costUsd,
        latencyMs: result.latencyMs,
        attempts: result.attempts,
        cached: false,
        generatedAt: nowIsoString(),
      },
    }
    saveDraft(userId, requestId, 'generate', payload)
    return payload
  } catch (error) {
    if (error?.name === 'ZodError' || error?.issues) {
      logger.warn('AI plan schema validation failed', {
        issues: error.issues?.slice(0, 5),
        latencyMs: Date.now() - startedAt,
      })
      recordFailure({
        userId,
        requestId,
        kind: 'generate',
        error: { code: 'AI_BAD_OUTPUT', usage: result?.usage },
        latencyMs: result?.latencyMs || Date.now() - startedAt,
      })
      throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 返回的计划结构不完整，请重试')
    }
    recordFailure({
      userId,
      requestId,
      kind: 'generate',
      error,
      latencyMs: result?.latencyMs || Date.now() - startedAt,
    })
    throw error
  }
}

export const adjustStudyPlan = async (userId, planId, input, requestId) => {
  const detail = getPlanDetail(userId, planId)
  const draftKey = `${planId}:${requestId}`
  const cached = getDraft(userId, draftKey, 'adjust')
  if (cached) {
    return { ...cached, meta: { ...cached.meta, cached: true } }
  }

  const today = todayISO(env.timezone)
  const prompt = buildAdjustPrompt(
    { instruction: input.instruction },
    { ...detail.plan, stages: detail.stages, tasks: detail.tasks },
    { today },
  )
  const startedAt = Date.now()
  let result

  try {
    result = await callDeepSeekJson({
      system: `今天是 ${today}。${AI_SYSTEM_PROMPT}`,
      user: prompt,
      maxTokens: env.deepseek.maxTokens,
    })
    const raw = rawPlanSchema.parse(parseAiJson(result.content))
    const normalized = normalizePlan({
      raw,
      base: {
        startDate: detail.plan.startDate,
        endDate: detail.plan.endDate,
        dailyMinutes: detail.plan.dailyMinutes,
        studyWeekdays: detail.plan.studyWeekdays,
        goal: detail.plan.goal,
        subject: detail.plan.subject,
        level: detail.plan.level,
        preferences: detail.plan.preferences,
      },
      allowOverrides: true,
      today,
    })

    // Existing data is never replaced during preview — only counted.
    const keepCompleted = true
    const keepManual = true
    const preservedCompleted = detail.tasks.filter((task) => task.isCompleted).length
    const preservedManual = detail.tasks.filter(
      (task) => !task.isCompleted && task.source === 'manual',
    ).length
    const preservedTotal = detail.tasks.filter(
      (task) => task.isCompleted || (!task.isCompleted && task.source === 'manual'),
    ).length

    const planChanges = []
    if (normalized.plan.title !== detail.plan.title) {
      planChanges.push({ field: 'title', label: '计划名称', from: detail.plan.title, to: normalized.plan.title })
    }
    if (normalized.plan.endDate !== detail.plan.endDate) {
      planChanges.push({ field: 'endDate', label: '结束日期', from: detail.plan.endDate, to: normalized.plan.endDate })
    }
    if (normalized.plan.dailyMinutes !== detail.plan.dailyMinutes) {
      planChanges.push({
        field: 'dailyMinutes',
        label: '每日学习时长',
        from: `${detail.plan.dailyMinutes} 分钟`,
        to: `${normalized.plan.dailyMinutes} 分钟`,
      })
    }
    if (normalized.plan.studyWeekdays.join(',') !== detail.plan.studyWeekdays.join(',')) {
      planChanges.push({
        field: 'studyWeekdays',
        label: '可学习日',
        from: detail.plan.studyWeekdays.join(','),
        to: normalized.plan.studyWeekdays.join(','),
      })
    }

    recordAiUsage({
      userId,
      planId,
      requestId,
      kind: 'adjust',
      model: result.model,
      usage: result.usage,
      latencyMs: result.latencyMs,
      success: true,
    })

    const payload = {
      proposedPlan: normalized.plan,
      changeSummary: normalized.meta.changeSummary,
      preview: {
        preservedCompleted,
        preservedManual,
        preservedTotal,
        replacedTasks: detail.tasks.length - preservedTotal,
        addedTasks: normalized.plan.tasks.length,
        finalTaskCount: preservedTotal + normalized.plan.tasks.length,
        planChanges,
        keepCompleted,
        keepManual,
        warnings: normalized.warnings,
      },
      meta: {
        ...normalized.meta,
        model: result.model,
        usage: normalizeUsage(result.usage),
        costUsd: computeCost(result.usage).costUsd,
        latencyMs: result.latencyMs,
        attempts: result.attempts,
        cached: false,
        generatedAt: nowIsoString(),
      },
    }
    saveDraft(userId, draftKey, 'adjust', payload)
    return payload
  } catch (error) {
    if (error?.name === 'ZodError' || error?.issues) {
      recordFailure({
        userId,
        planId,
        requestId,
        kind: 'adjust',
        error: { code: 'AI_BAD_OUTPUT', usage: result?.usage },
        latencyMs: result?.latencyMs || Date.now() - startedAt,
      })
      throw new AppError(502, 'AI_BAD_OUTPUT', 'AI 返回的调整方案结构不完整，请重试')
    }
    recordFailure({
      userId,
      planId,
      requestId,
      kind: 'adjust',
      error,
      latencyMs: result?.latencyMs || Date.now() - startedAt,
    })
    throw error
  }
}

export const applyAdjustment = (userId, planId, { proposedPlan, keepCompleted, keepManual }) => {
  const current = getPlanDetail(userId, planId)
  const today = todayISO(env.timezone)

  if (
    !proposedPlan ||
    !Array.isArray(proposedPlan.stages) ||
    !proposedPlan.stages.length ||
    !Array.isArray(proposedPlan.tasks) ||
    !proposedPlan.tasks.length
  ) {
    throw new AppError(
      400,
      'INVALID_ADJUSTMENT',
      '调整方案不完整，请重新生成预览后再确认',
    )
  }

  // Re-validate the client-edited proposal. Never trust it just because it was
  // returned by a previous endpoint.
  const normalized = normalizePlan({
    raw: {
      ...proposedPlan,
      stages: (proposedPlan.stages || []).map((stage) => ({
        title: stage.title,
        objective: stage.objective,
        startDate: stage.startDate,
        endDate: stage.endDate,
      })),
      tasks: (proposedPlan.tasks || []).map((task) => ({
        ...task,
        date: task.taskDate || task.date,
      })),
    },
    base: {
      startDate: current.plan.startDate,
      endDate: current.plan.endDate,
      dailyMinutes: current.plan.dailyMinutes,
      studyWeekdays: current.plan.studyWeekdays,
      goal: current.plan.goal,
      subject: current.plan.subject,
      level: current.plan.level,
      preferences: current.plan.preferences,
    },
    allowOverrides: true,
    today,
  })

  const db = getDb()
  const preserved = current.tasks.filter(
    (task) =>
      (keepCompleted && task.isCompleted) || (keepManual && !task.isCompleted && task.source === 'manual'),
  )
  const preservedIds = new Set(preserved.map((task) => task.id))
  const replacedTasks = current.tasks.length - preserved.length
  const addedTasks = normalized.plan.tasks.length
  const timestamp = nowIsoString()
  const warnings = [...normalized.warnings]

  const run = db.transaction(() => {
    // Detach preserved tasks before their stages are replaced.
    db.prepare('UPDATE tasks SET stage_id = NULL WHERE plan_id = ?').run(planId)

    for (const task of current.tasks) {
      if (!preservedIds.has(task.id)) {
        db.prepare('DELETE FROM tasks WHERE id = ? AND plan_id = ?').run(task.id, planId)
      }
    }
    db.prepare('DELETE FROM plan_stages WHERE plan_id = ?').run(planId)

    const stageIds = normalized.plan.stages.map((stage, index) =>
      Number(
        db
          .prepare(
            `INSERT INTO plan_stages
              (plan_id, title, objective, start_date, end_date, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            planId,
            stage.title,
            stage.objective,
            stage.startDate,
            stage.endDate,
            index,
            timestamp,
          ).lastInsertRowid,
      ),
    )

    normalized.plan.tasks.forEach((task, index) => {
      db.prepare(
        `INSERT INTO tasks
          (plan_id, stage_id, user_id, title, description, task_date, duration_minutes,
           priority, completion_criteria, is_completed, completed_at, is_review,
           actual_minutes, source, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, NULL, 'ai_adjust', ?, ?, ?)`,
      ).run(
        planId,
        stageIds[task.stageIndex] ?? null,
        userId,
        task.title,
        task.description,
        task.taskDate,
        task.durationMinutes,
        task.priority,
        task.completionCriteria,
        task.isReview ? 1 : 0,
        index,
        timestamp,
        timestamp,
      )
    })

    db.prepare(
      `UPDATE plans SET title = ?, overview = ?, advice = ?, risks = ?, end_date = ?,
         daily_minutes = ?, study_weekdays = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      normalized.plan.title,
      normalized.plan.overview,
      normalized.plan.advice,
      JSON.stringify(normalized.plan.risks),
      normalized.plan.endDate,
      normalized.plan.dailyMinutes,
      JSON.stringify(normalized.plan.studyWeekdays),
      timestamp,
      planId,
      userId,
    )

    recalcPlanStatus(planId, db)
  })

  run()

  const updated = getPlanDetail(userId, planId)
  const preservedCompleted = preserved.filter((task) => task.isCompleted).length
  const preservedManual = preserved.filter(
    (task) => !task.isCompleted && task.source === 'manual',
  ).length
  if (preserved.some((task) => task.taskDate < updated.plan.startDate || task.taskDate > updated.plan.endDate)) {
    warnings.push('有保留的任务落在新的计划周期之外，已原样保留，请手动确认')
  }

  return {
    ...updated,
    summary: {
      keptCompleted: preservedCompleted,
      keptManual: preservedManual,
      replacedTasks,
      addedTasks,
      removedTasks: replacedTasks,
      finalTaskCount: updated.tasks.length,
    },
    warnings,
  }
}
