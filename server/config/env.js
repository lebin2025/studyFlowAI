import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url))

// Load `.env` once. Existing process env (tests, CI, hosting platforms) wins.
dotenv.config({ path: path.join(ROOT_DIR, '.env') })

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const float = (value, fallback) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const isTest = nodeEnv === 'test'

const jwtSecret =
  process.env.JWT_SECRET || (isProduction ? '' : 'studyflow-dev-only-secret-change-me')

if (
  isProduction &&
  (jwtSecret.length < 32 || /replace-with|change-me|change-me-please/i.test(jwtSecret))
) {
  throw new Error(
    'JWT_SECRET must be a random string of at least 32 characters in production (do not use the example value).',
  )
}

const dbPathRaw = process.env.DB_PATH || './server/data/studyflow.db'

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: int(process.env.PORT, 8787),
  timezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',
  appOrigin: (process.env.APP_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  trustProxy: bool(process.env.TRUST_PROXY, false),

  dbPath: dbPathRaw === ':memory:' ? ':memory:' : path.resolve(ROOT_DIR, dbPathRaw),

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: process.env.COOKIE_NAME || 'sf_session',
    cookieSecure: bool(process.env.COOKIE_SECURE, isProduction),
    issuer: 'studyflow-ai',
    audience: 'studyflow-web',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, ''),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    thinking: (process.env.DEEPSEEK_THINKING || 'disabled').toLowerCase() === 'enabled',
    reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT || 'low',
    timeoutMs: int(process.env.DEEPSEEK_TIMEOUT_MS, 180000),
    maxTokens: int(process.env.DEEPSEEK_MAX_TOKENS, 12000),
    maxRetries: int(process.env.DEEPSEEK_MAX_RETRIES, 2),
  },

  pricing: {
    inputMiss: float(process.env.AI_PRICE_INPUT_MISS, 0.3),
    inputHit: float(process.env.AI_PRICE_INPUT_HIT, 0.006),
    output: float(process.env.AI_PRICE_OUTPUT, 1.2),
  },

  ai: {
    rateLimitPerHour: int(process.env.AI_RATE_LIMIT_PER_HOUR, 8),
    draftTtlSeconds: int(process.env.AI_DRAFT_TTL_SECONDS, 1800),
  },

  limits: {
    maxPlanDays: 366,
    maxTasksPerPlan: 200,
    maxAiTasks: 160,
  },
}

export const isDeepSeekConfigured = () => Boolean(env.deepseek.apiKey)
