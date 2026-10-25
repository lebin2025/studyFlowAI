import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getDb } from '../db/database.js'
import { unauthorized } from '../utils/httpError.js'

export const signSessionToken = (user) =>
  jwt.sign({ email: user.email, ver: Number(user.tokenVersion) || 0 }, env.jwt.secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: env.jwt.expiresIn,
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  })

export const verifySessionToken = (token) =>
  jwt.verify(token, env.jwt.secret, {
    algorithms: ['HS256'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
  })

const readToken = (req) => {
  const header = req.get('authorization')
  if (header && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  const cookieToken = req.cookies?.[env.jwt.cookieName]
  return typeof cookieToken === 'string' && cookieToken ? cookieToken : null
}

export const sessionMaxAgeMs = () => {
  const sample = jwt.sign({}, env.jwt.secret, { expiresIn: env.jwt.expiresIn })
  const decoded = jwt.decode(sample)
  if (!decoded?.exp) return 7 * 24 * 60 * 60 * 1000
  return Math.max(decoded.exp * 1000 - Date.now(), 60 * 1000)
}

export const setSessionCookie = (res, token) => {
  const decoded = jwt.decode(token)
  const maxAge = decoded?.exp ? Math.max(decoded.exp * 1000 - Date.now(), 60 * 1000) : sessionMaxAgeMs()
  res.cookie(env.jwt.cookieName, token, {
    httpOnly: true,
    secure: env.jwt.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export const clearSessionCookie = (res) => {
  res.clearCookie(env.jwt.cookieName, {
    httpOnly: true,
    secure: env.jwt.cookieSecure,
    sameSite: 'lax',
    path: '/',
  })
}

/** Authenticates the request and attaches a fresh user row to req.user. */
const resolveSession = (req) => {
  const token = readToken(req)
  if (!token) {
    return { error: unauthorized() }
  }
  let payload
  try {
    payload = verifySessionToken(token)
  } catch (error) {
    const expired = error?.name === 'TokenExpiredError'
    return {
      error: unauthorized(expired ? '登录已过期，请重新登录' : '登录状态无效，请重新登录'),
    }
  }

  const userId = Number(payload.sub)
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: unauthorized('登录状态无效，请重新登录') }
  }

  const user = getDb()
    .prepare(
      `SELECT id, email, display_name AS displayName, bio,
              token_version AS tokenVersion, created_at AS createdAt
       FROM users WHERE id = ?`,
    )
    .get(userId)

  if (!user) {
    return { error: unauthorized('账户不存在或已注销') }
  }
  if ((Number(payload.ver) || 0) !== Number(user.tokenVersion)) {
    return { error: unauthorized('登录状态已失效，请重新登录') }
  }

  const { tokenVersion, ...safeUser } = user
  return { user: safeUser }
}

export const requireAuth = (req, res, next) => {
  const { user, error } = resolveSession(req)
  if (error) {
    next(error)
    return
  }
  req.user = user
  next()
}

/**
 * Populates req.user when a valid session exists, but never rejects anonymous
 * requests. Used by the lightweight `/auth/session` bootstrap endpoint so a
 * visitor without a cookie does not produce a spurious 401 in the console.
 */
export const optionalAuth = (req, res, next) => {
  const { user } = resolveSession(req)
  if (user) req.user = user
  next()
}
