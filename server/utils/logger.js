import { env } from '../config/env.js'

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'deepseek_api_key',
  'secret',
])

const redact = (value, depth = 0) => {
  if (value === null || value === undefined) return value
  if (depth > 4) return '[deep]'
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1))
  if (typeof value === 'object') {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, code: value.code }
    }
    const output = {}
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(item, depth + 1)
    }
    return output
  }
  if (typeof value === 'string' && value.length > 1200) return `${value.slice(0, 1200)}…`
  return value
}

const write = (level, message, meta = {}) => {
  if (env.isTest) return
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...redact(meta),
  }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}
