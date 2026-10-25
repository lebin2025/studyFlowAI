import { z } from 'zod'
import { emailSchema, passwordSchema, weekdaysSchema } from './plan.schema.js'

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(2, '昵称至少需要 2 个字符')
    .max(40, '昵称不能超过 40 个字符'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码').max(72),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码').max(72),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: '新密码不能与当前密码相同',
  })

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2, '昵称至少需要 2 个字符').max(40).optional(),
    bio: z.string().trim().max(280, '个人简介不能超过 280 个字符').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, '没有需要更新的内容')

export const preferencesSchema = z.object({
  defaultDailyMinutes: z.coerce.number().int().min(10).max(480),
  studyWeekdays: weekdaysSchema,
  preferredSubjects: z.string().trim().max(120).default(''),
  learningStyle: z.enum(['balanced', 'deep', 'practice', 'review']).default('balanced'),
})
