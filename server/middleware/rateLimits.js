import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

const rejection = (message) => (req, res) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message,
      requestId: req.id,
    },
  })
}

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
}

/** Broad protection for the whole API surface. */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 600,
  handler: rejection('请求太频繁了，请稍后再试'),
})

/** Slows down credential stuffing without locking real users out. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 30,
  handler: rejection('尝试次数过多，请 15 分钟后再试'),
})

/** Per-user AI budget guard: protects the API key and the user's wallet. */
export const aiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: env.ai.rateLimitPerHour,
  keyGenerator: (req) => `user:${req.user?.id ?? 'anonymous'}`,
  handler: rejection(
    `AI 调用次数已达上限（每小时 ${env.ai.rateLimitPerHour} 次），请稍后再试`,
  ),
})
