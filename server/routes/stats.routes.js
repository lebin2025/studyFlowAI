import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { getOverview } from '../services/stats.service.js'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

const router = Router()
router.use(requireAuth)

router.get('/overview', validate(querySchema, 'query'), (req, res) => {
  res.json(getOverview(req.user.id, req.validated.query.days))
})

export default router
