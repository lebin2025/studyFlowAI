import { z } from 'zod'
import { isISODate, diffDays, countStudyDays } from '../utils/dates.js'
import { env } from '../config/env.js'

export const isoDate = z
  .string()
  .trim()
  .refine(isISODate, '请使用 YYYY-MM-DD 格式的有效日期')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, '请输入邮箱')
  .max(254, '邮箱过长')
  .email('请输入有效的邮箱地址')

export const passwordSchema = z
  .string()
  .min(8, '密码至少需要 8 个字符')
  .max(72, '密码不能超过 72 个字符')
  .regex(/[A-Za-z]/, '密码需要包含字母')
  .regex(/\d/, '密码需要包含数字')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: '密码过长（UTF-8 编码不能超过 72 字节）',
  })

export const weekdaysSchema = z
  .array(z.coerce.number().int().min(1).max(7))
  .min(1, '请至少选择一个可学习的星期')
  .max(7)
  .refine((days) => new Set(days).size === days.length, '星期不能重复')
  .transform((days) => [...new Set(days)].sort((a, b) => a - b))

export const levelSchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const prioritySchema = z.enum(['high', 'medium', 'low'])
export const planStatusSchema = z.enum(['active', 'completed', 'archived'])

export const risksSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(120),
      detail: z.string().trim().max(600).default(''),
    }),
  )
  .max(8)
  .default([])

export const planStageInputSchema = z.object({
  title: z.string().trim().min(1, '阶段名称不能为空').max(80),
  objective: z.string().trim().max(600).default(''),
  startDate: isoDate,
  endDate: isoDate,
  sortOrder: z.coerce.number().int().min(0).max(50).optional(),
})

export const planTaskInputSchema = z.object({
  title: z.string().trim().min(1, '任务名称不能为空').max(160),
  description: z.string().trim().max(1000).default(''),
  taskDate: isoDate,
  durationMinutes: z.coerce.number().int().min(5).max(480),
  priority: prioritySchema.default('medium'),
  completionCriteria: z.string().trim().max(600).default(''),
  isReview: z.boolean().default(false),
  actualMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  stageIndex: z.coerce.number().int().min(0).max(20).optional(),
})

const checkPlanWindow = (data, ctx) => {
  if (data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: '结束日期不能早于开始日期',
    })
    return
  }
  const span = diffDays(data.startDate, data.endDate) + 1
  if (span > env.limits.maxPlanDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: `计划周期不能超过 ${env.limits.maxPlanDays} 天`,
    })
  }
  if (countStudyDays(data.startDate, data.endDate, data.studyWeekdays) === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studyWeekdays'],
      message: '所选日期范围内没有可学习的星期，请调整时间或学习日',
    })
  }
}

export const planCreateSchema = z
  .object({
    title: z.string().trim().min(1, '计划名称不能为空').max(120),
    goal: z.string().trim().min(1, '学习目标不能为空').max(1000),
    subject: z.string().trim().min(1, '学习科目不能为空').max(60),
    level: levelSchema,
    startDate: isoDate,
    endDate: isoDate,
    dailyMinutes: z.coerce.number().int().min(10).max(480),
    studyWeekdays: weekdaysSchema,
    preferences: z.string().trim().max(1000).default(''),
    overview: z.string().trim().max(2000).default(''),
    risks: risksSchema,
    advice: z.string().trim().max(1000).default(''),
    stages: z.array(planStageInputSchema).min(1, '至少需要一个学习阶段').max(12),
    tasks: z
      .array(planTaskInputSchema)
      .min(1, '至少需要一个学习任务')
      .max(env.limits.maxTasksPerPlan),
    source: z.enum(['ai', 'manual']).default('ai'),
  })
  .superRefine((data, ctx) => {
    checkPlanWindow(data, ctx)
    data.stages.forEach((stage, index) => {
      if (stage.startDate > stage.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stages', index, 'endDate'],
          message: '阶段结束日期不能早于开始日期',
        })
      }
      if (stage.startDate < data.startDate || stage.endDate > data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stages', index],
          message: '阶段日期需要落在计划日期范围内',
        })
      }
    })
    data.tasks.forEach((task, index) => {
      if (task.taskDate < data.startDate || task.taskDate > data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tasks', index, 'taskDate'],
          message: '任务日期需要落在计划日期范围内',
        })
      }
    })
  })

export const planUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    goal: z.string().trim().min(1).max(1000).optional(),
    subject: z.string().trim().min(1).max(60).optional(),
    level: levelSchema.optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    dailyMinutes: z.coerce.number().int().min(10).max(480).optional(),
    studyWeekdays: weekdaysSchema.optional(),
    preferences: z.string().trim().max(1000).optional(),
    overview: z.string().trim().max(2000).optional(),
    advice: z.string().trim().max(1000).optional(),
    risks: risksSchema.optional(),
    status: planStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, '没有需要更新的内容')

export const planListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(['all', 'active', 'completed', 'archived']).optional(),
  subject: z.string().trim().max(60).optional(),
  sort: z.enum(['updated', 'created', 'start', 'end', 'title', 'progress']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

export const planIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const aiPlanIdParamSchema = z.object({
  planId: z.coerce.number().int().positive(),
})
