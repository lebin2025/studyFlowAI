import { Router } from 'express'
import { asyncHandler } from '../utils/httpError.js'
import { validate } from '../middleware/validate.js'
import { authLimiter } from '../middleware/rateLimits.js'
import {
  clearSessionCookie,
  optionalAuth,
  requireAuth,
  setSessionCookie,
  signSessionToken,
} from '../middleware/auth.js'
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/auth.schema.js'
import {
  authenticateUser,
  changePassword,
  getPreferences,
  registerUser,
} from '../services/auth.service.js'

const router = Router()

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, preferences, tokenVersion } = await registerUser(req.validated.body)
    setSessionCookie(res, signSessionToken({ ...user, tokenVersion }))
    res.status(201).json({ user, preferences })
  }),
)

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, preferences, tokenVersion } = await authenticateUser(req.validated.body)
    setSessionCookie(res, signSessionToken({ ...user, tokenVersion }))
    res.json({ user, preferences })
  }),
)

router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

router.get(
  '/session',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      res.json({ user: null, preferences: null })
      return
    }
    res.json({ user: req.user, preferences: await getPreferences(req.user.id) })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user, preferences: await getPreferences(req.user.id) })
  }),
)

router.patch(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { tokenVersion } = await changePassword(req.user.id, req.validated.body)
    // Rotate the current session; every other session becomes invalid.
    setSessionCookie(
      res,
      signSessionToken({ ...req.user, tokenVersion }),
    )
    res.json({ ok: true, message: '密码已更新，其他设备已退出登录' })
  }),
)

export default router
