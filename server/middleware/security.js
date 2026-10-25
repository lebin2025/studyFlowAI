import helmet from 'helmet'
import cors from 'cors'
import { env } from '../config/env.js'
import { AppError } from '../utils/httpError.js'

const devOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

export const allowedOrigins = (req) => {
  const origins = new Set([env.appOrigin, ...(env.isProduction ? [] : devOrigins)])
  if (req?.protocol && req?.get?.('host')) {
    origins.add(`${req.protocol}://${req.get('host')}`)
  }
  return origins
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Same-origin requests and non-browser clients (curl, tests) send no Origin.
    if (!origin) return callback(null, true)
    if (allowedOrigins().has(origin)) return callback(null, true)
    return callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
})

/**
 * Defence in depth against CSRF for cookie-authenticated writes: when a browser
 * supplies an Origin it must match this deployment.
 */
export const originGuard = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (!origin) return next()
  if (allowedOrigins(req).has(origin)) return next()
  next(new AppError(403, 'ORIGIN_NOT_ALLOWED', '请求来源不被允许'))
}

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
})
