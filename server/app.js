import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { env, isDeepSeekConfigured, ROOT_DIR } from './config/env.js'
import { getDb } from './db/database.js'
import { asyncHandler } from './utils/httpError.js'
import { requestId } from './middleware/requestId.js'
import { corsMiddleware, helmetMiddleware, originGuard } from './middleware/security.js'
import { apiLimiter } from './middleware/rateLimits.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'
import planRoutes from './routes/plans.routes.js'
import taskRoutes from './routes/tasks.routes.js'
import statsRoutes from './routes/stats.routes.js'
import aiRoutes from './routes/ai.routes.js'

export const createApp = () => {
  const app = express()
  app.disable('x-powered-by')
  if (env.trustProxy) app.set('trust proxy', 1)

  app.use(requestId)
  app.use(helmetMiddleware)
  app.use(corsMiddleware)
  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser())
  app.use(originGuard)

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  app.get(
    '/api/health',
    asyncHandler(async (req, res) => {
      let database = 'ok'
      try {
        await getDb().health()
      } catch {
        database = 'error'
      }
      res.json({
        status: database === 'ok' ? 'ok' : 'degraded',
        name: 'StudyFlow AI',
        version: '1.0.0',
        database,
        aiConfigured: isDeepSeekConfigured(),
        model: env.deepseek.model,
        time: new Date().toISOString(),
      })
    }),
  )

  app.use('/api', apiLimiter)
  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/plans', planRoutes)
  app.use('/api/tasks', taskRoutes)
  app.use('/api/stats', statsRoutes)
  app.use('/api/ai', aiRoutes)

  app.use('/api', notFoundHandler)

  const distDir = path.join(ROOT_DIR, 'dist')
  const indexHtml = path.join(distDir, 'index.html')
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '1h',
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(indexHtml)
    })
  } else {
    app.get('/', (req, res) => {
      res.json({
        name: 'StudyFlow AI API',
        message: '前端开发服务器运行在 http://localhost:5173；生产模式请先执行 npm run build',
        health: '/api/health',
      })
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

export default createApp
