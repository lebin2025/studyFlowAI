import { Router } from 'express'
import { asyncHandler } from '../utils/httpError.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimits.js'
import { aiAdjustSchema, aiApplySchema, aiGenerateSchema, aiUsageQuerySchema } from '../schemas/ai.schema.js'
import { aiPlanIdParamSchema } from '../schemas/plan.schema.js'
import {
  adjustStudyPlan,
  applyAdjustment,
  generateStudyPlan,
} from '../services/aiPlan.service.js'
import {
  aiConfigurationStatus,
  recentUsage,
  usageSummary,
} from '../services/usage.service.js'

const router = Router()
router.use(requireAuth)

router.get('/status', (req, res) => {
  res.json({
    ...aiConfigurationStatus(),
    usage: usageSummary(req.user.id, 30),
    recent: recentUsage(req.user.id, 5),
  })
})

router.get('/usage', validate(aiUsageQuerySchema, 'query'), (req, res) => {
  res.json({
    summary: usageSummary(req.user.id, 30),
    recent: recentUsage(req.user.id, req.validated.query.limit),
  })
})

router.post(
  '/plans',
  aiLimiter,
  validate(aiGenerateSchema),
  asyncHandler(async (req, res) => {
    const { requestId, ...input } = req.validated.body
    const result = await generateStudyPlan(req.user.id, input, requestId)
    res.json(result)
  }),
)

router.post(
  '/plans/:planId/adjust/preview',
  aiLimiter,
  validate(aiPlanIdParamSchema, 'params'),
  validate(aiAdjustSchema),
  asyncHandler(async (req, res) => {
    const { requestId, instruction } = req.validated.body
    const result = await adjustStudyPlan(
      req.user.id,
      req.validated.params.planId,
      { instruction },
      requestId,
    )
    res.json(result)
  }),
)

router.post(
  '/plans/:planId/adjust/apply',
  validate(aiPlanIdParamSchema, 'params'),
  validate(aiApplySchema),
  (req, res) => {
    const result = applyAdjustment(
      req.user.id,
      req.validated.params.planId,
      req.validated.body,
    )
    res.json(result)
  },
)

export default router
