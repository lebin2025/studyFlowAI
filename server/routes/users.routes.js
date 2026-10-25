import { Router } from 'express'
import { asyncHandler } from '../utils/httpError.js'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { preferencesSchema, updateProfileSchema } from '../schemas/auth.schema.js'
import {
  getPreferences,
  getUserById,
  updatePreferences,
  updateProfile,
} from '../services/auth.service.js'

const router = Router()

router.use(requireAuth)

router.patch('/me', validate(updateProfileSchema), (req, res) => {
  const user = updateProfile(req.user.id, req.validated.body)
  res.json({ user })
})

router.get('/me', (req, res) => {
  res.json({ user: getUserById(req.user.id) })
})

router.get('/me/preferences', (req, res) => {
  res.json({ preferences: getPreferences(req.user.id) })
})

router.put(
  '/me/preferences',
  validate(preferencesSchema),
  asyncHandler(async (req, res) => {
    const preferences = updatePreferences(req.user.id, req.validated.body)
    res.json({ preferences })
  }),
)

export default router
