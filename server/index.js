import { createApp } from './app.js'
import { env, isDeepSeekConfigured } from './config/env.js'
import { getDb, closeDb } from './db/database.js'
import { logger } from './utils/logger.js'

const app = createApp()

const start = async () => {
  try {
    const db = getDb()
    await db.ready
    logger.info('Database connection established', { dialect: db.dialect })
  } catch (error) {
    logger.error('Database initialisation failed', { error })
    process.exit(1)
  }

  // Alwaysdata injects the bind address via IP. Locally 0.0.0.0 preserves the
  // previous behaviour and keeps the server reachable through Vite's proxy.
  const bindHost = process.env.IP || '0.0.0.0'

  const server = app.listen(env.port, bindHost, () => {
    logger.info('StudyFlow AI server listening', {
      url: `http://localhost:${env.port}`,
      bindHost,
      env: env.nodeEnv,
      aiConfigured: isDeepSeekConfigured(),
      model: env.deepseek.model,
    })
    if (!isDeepSeekConfigured()) {
      logger.warn(
        'DEEPSEEK_API_KEY is empty — AI endpoints will return AI_NOT_CONFIGURED until it is set in .env',
      )
    }
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.port} is already in use. Change PORT in .env or stop the other process.`)
    } else {
      logger.error('Server error', { error })
    }
    process.exit(1)
  })

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down`)
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 8000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
