import { getDb } from '../db/database.js'
import { env } from '../config/env.js'
import { nowIsoString } from '../utils/dates.js'
import { computeCost, normalizeUsage } from '../utils/cost.js'

export const recordAiUsage = ({
  userId,
  planId = null,
  requestId = null,
  kind,
  model,
  usage = {},
  latencyMs = 0,
  success = true,
  errorCode = null,
}) => {
  const normalized = normalizeUsage(usage)
  const cost = computeCost(usage)
  getDb()
    .prepare(
      `INSERT INTO ai_usage
        (user_id, plan_id, request_id, kind, model, success, error_code,
         prompt_tokens, completion_tokens, cache_hit_tokens, cache_miss_tokens,
         total_tokens, cost_usd, latency_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      planId,
      requestId,
      kind,
      model,
      success ? 1 : 0,
      errorCode,
      normalized.promptTokens,
      normalized.completionTokens,
      normalized.cacheHitTokens,
      normalized.cacheMissTokens,
      normalized.totalTokens,
      cost.costUsd,
      Math.max(0, Math.round(latencyMs)),
      nowIsoString(),
    )
  return cost
}

export const usageSummary = (userId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS calls,
              COALESCE(SUM(success), 0) AS successfulCalls,
              COALESCE(SUM(total_tokens), 0) AS totalTokens,
              COALESCE(SUM(cost_usd), 0) AS costUsd,
              MAX(created_at) AS lastCallAt
       FROM ai_usage WHERE user_id = ? AND created_at >= ?`,
    )
    .get(userId, since)
}

export const recentUsage = (userId, limit = 10) =>
  getDb()
    .prepare(
      `SELECT id, kind, model, success, error_code AS errorCode,
              prompt_tokens AS promptTokens, completion_tokens AS completionTokens,
              total_tokens AS totalTokens, cost_usd AS costUsd,
              latency_ms AS latencyMs, created_at AS createdAt
       FROM ai_usage WHERE user_id = ?
       ORDER BY id DESC LIMIT ?`,
    )
    .all(userId, limit)

export const getDraft = (userId, requestId, kind) => {
  const row = getDb()
    .prepare(
      `SELECT payload FROM ai_drafts
       WHERE request_id = ? AND user_id = ? AND kind = ? AND expires_at > ?`,
    )
    .get(requestId, userId, kind, nowIsoString())
  if (!row) return null
  try {
    return JSON.parse(row.payload)
  } catch {
    return null
  }
}

export const saveDraft = (userId, requestId, kind, payload) => {
  const db = getDb()
  db.prepare('DELETE FROM ai_drafts WHERE expires_at <= ?').run(nowIsoString())
  const createdAt = nowIsoString()
  const expiresAt = new Date(
    Date.now() + env.ai.draftTtlSeconds * 1000,
  ).toISOString()
  db.prepare(
    `INSERT INTO ai_drafts (user_id, request_id, kind, payload, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, request_id) DO UPDATE SET payload = excluded.payload,
       kind = excluded.kind, expires_at = excluded.expires_at, created_at = excluded.created_at`,
  ).run(userId, requestId, kind, JSON.stringify(payload), createdAt, expiresAt)
}

export const aiConfigurationStatus = () => ({
  configured: Boolean(env.deepseek.apiKey),
  model: env.deepseek.model,
  baseUrl: env.deepseek.baseUrl,
  thinking: env.deepseek.thinking,
  rateLimitPerHour: env.ai.rateLimitPerHour,
  pricingNote: '费用按 DeepSeek 返回的真实 token 用量估算，价格可在 .env 中配置',
})
