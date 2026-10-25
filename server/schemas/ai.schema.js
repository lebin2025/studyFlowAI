import { z } from 'zod'
import {
  isoDate,
  levelSchema,
  weekdaysSchema,
  risksSchema,
} from './plan.schema.js'
import { diffDays, countStudyDays, todayISO } from '../utils/dates.js'
import { env } from '../config/env.js'

const requestIdSchema = z
  .string()
  .trim()
  .min(8, '请求标识无效')
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, '请求标识无效')

const aiWindowCheck = (data, ctx) => {
  const today = todayISO(env.timezone)
  if (data.startDate < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startDate'],
      message: '开始日期不能早于今天',
    })
  }
  if (data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: '结束日期不能早于开始日期',
    })
    return
  }
  if (diffDays(data.startDate, data.endDate) + 1 > env.limits.maxPlanDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: `计划周期不能超过 ${env.limits.maxPlanDays} 天`,
    })
  }
  const studyDays = countStudyDays(data.startDate, data.endDate, data.studyWeekdays)
  if (studyDays === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studyWeekdays'],
      message: '所选日期范围内没有可学习的星期，请调整日期或学习日',
    })
    return
  }
  if (studyDays < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: '可学习日不足 2 天，无法生成有效的学习计划，请延长周期',
    })
  }
  if (studyDays * data.dailyMinutes < 60) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dailyMinutes'],
      message: '可用学习时间不足 60 分钟，建议延长周期或增加每日学习时长',
    })
  }
}

export const aiGenerateSchema = z
  .object({
    goal: z.string().trim().min(2, '请更具体地描述学习目标').max(1000),
    subject: z.string().trim().min(1, '请填写学习科目').max(60),
    level: levelSchema,
    startDate: isoDate,
    endDate: isoDate,
    dailyMinutes: z.coerce.number().int().min(10).max(480),
    studyWeekdays: weekdaysSchema,
    preferences: z.string().trim().max(1000).default(''),
    notes: z.string().trim().max(1000).default(''),
    requestId: requestIdSchema,
  })
  .superRefine(aiWindowCheck)

export const aiAdjustSchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(2, '请描述你希望如何调整计划')
    .max(600, '调整要求不能超过 600 个字符'),
  requestId: requestIdSchema,
})

export const aiProposedPlanSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  overview: z.string().trim().max(2000).optional(),
  advice: z.string().trim().max(1000).optional(),
  endDate: isoDate.optional(),
  startDate: isoDate.optional(),
  dailyMinutes: z.coerce.number().int().min(10).max(480).optional(),
  studyWeekdays: weekdaysSchema.optional(),
  risks: risksSchema.optional(),
  stages: z.array(z.record(z.any())).max(12).optional(),
  tasks: z.array(z.record(z.any())).max(env.limits.maxTasksPerPlan).optional(),
  changeSummary: z.string().trim().max(1000).optional(),
})

export const aiApplySchema = z.object({
  proposedPlan: aiProposedPlanSchema,
  keepCompleted: z.boolean().default(true),
  keepManual: z.boolean().default(true),
})

export const aiUsageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
