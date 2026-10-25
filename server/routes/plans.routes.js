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

router.get('/', validate(planListQuerySchema, 'query'), (req, res) => {
  res.json(listPlans(req.user.id, req.validated.query))
})

router.post(
  '/',
  validate(planCreateSchema),
  asyncHandler(async (req, res) => {
    const detail = createPlan(req.user.id, req.validated.body)
    res.status(201).json(detail)
  }),
)

router.get('/:id', validate(planIdParamSchema, 'params'), (req, res) => {
  res.json(getPlanDetail(req.user.id, req.validated.params.id))
})

router.patch(
  '/:id',
  validate(planIdParamSchema, 'params'),
  validate(planUpdateSchema),
  (req, res) => {
    const detail = updatePlan(req.user.id, req.validated.params.id, req.validated.body)
    res.json(detail)
  },
)

router.delete('/:id', validate(planIdParamSchema, 'params'), (req, res) => {
  res.json(deletePlan(req.user.id, req.validated.params.id))
})

export default router
