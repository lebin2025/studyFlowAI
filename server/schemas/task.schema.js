import { z } from 'zod'
import { isoDate, prioritySchema } from './plan.schema.js'

export const taskCreateSchema = z.object({
  planId: z.coerce.number().int().positive('请选择所属学习计划'),
  title: z.string().trim().min(1, '任务名称不能为空').max(160),
  description: z.string().trim().max(1000).default(''),
  taskDate: isoDate,
  durationMinutes: z.coerce.number().int().min(5, '预计时长至少 5 分钟').max(480),
  priority: prioritySchema.default('medium'),
  completionCriteria: z.string().trim().max(600).default(''),
  isReview: z.boolean().default(false),
})

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(1000).optional(),
    taskDate: isoDate.optional(),
    durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
    priority: prioritySchema.optional(),
    completionCriteria: z.string().trim().max(600).optional(),
    isReview: z.boolean().optional(),
    actualMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, '没有需要更新的内容')

export const taskToggleSchema = z.object({
  isCompleted: z.boolean(),
  actualMinutes: z.coerce.number().int().min(0).max(1440).nullable().optional(),
})

export const taskListQuerySchema = z.object({
  planId: z.coerce.number().int().positive().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  date: isoDate.optional(),
  priority: prioritySchema.optional(),
  status: z.enum(['all', 'open', 'done']).optional(),
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
