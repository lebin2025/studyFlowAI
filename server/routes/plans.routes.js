import { Router } from 'express'
import { asyncHandler } from '../utils/httpError.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  planCreateSchema,
  planIdParamSchema,
  planListQuerySchema,
  planUpdateSchema,
} from '../schemas/plan.schema.js'
import {
  createPlan,
  deletePlan,
  getPlanDetail,
  listPlans,
  updatePlan,
} from '../services/plan.service.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  validate(planListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await listPlans(req.user.id, req.validated.query))
  }),
)

router.post(
  '/',
  validate(planCreateSchema),
  asyncHandler(async (req, res) => {
    const detail = await createPlan(req.user.id, req.validated.body)
    res.status(201).json(detail)
  }),
)

router.get(
  '/:id',
  validate(planIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await getPlanDetail(req.user.id, req.validated.params.id))
  }),
)

router.patch(
  '/:id',
  validate(planIdParamSchema, 'params'),
  validate(planUpdateSchema),
  asyncHandler(async (req, res) => {
    const detail = await updatePlan(req.user.id, req.validated.params.id, req.validated.body)
    res.json(detail)
  }),
)

router.delete(
  '/:id',
  validate(planIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await deletePlan(req.user.id, req.validated.params.id))
  }),
)

export default router
