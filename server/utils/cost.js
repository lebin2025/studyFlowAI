import { env } from '../config/env.js'

/**
 * Prices are USD per 1M tokens. Configure with AI_PRICE_* env variables.
 * Defaults follow DeepSeek's published Flash *peak* prices (upper bound).
 */
export const PRICING_NOTE =
  '按 DeepSeek 官方公开价格（每百万 token，USD，Flash 高峰价）估算，可在 .env 中调整'

export const normalizeUsage = (usage = {}) => {
  const promptTokens = Number(usage.prompt_tokens) || 0
  const completionTokens = Number(usage.completion_tokens) || 0
  const hitTokens = Number(usage.prompt_cache_hit_tokens)
  const missTokens = Number(usage.prompt_cache_miss_tokens)

  const cacheHit = Number.isFinite(hitTokens) ? hitTokens : 0
  const cacheMiss = Number.isFinite(missTokens)
    ? missTokens
    : Math.max(promptTokens - cacheHit, 0)

  return {
    promptTokens,
    completionTokens,
    cacheHitTokens: cacheHit,
    cacheMissTokens: cacheMiss,
    totalTokens: Number(usage.total_tokens) || promptTokens + completionTokens,
  }
}

export const computeCost = (usage = {}) => {
  const normalized = normalizeUsage(usage)
  const cost =
    (normalized.cacheHitTokens / 1_000_000) * env.pricing.inputHit +
    (normalized.cacheMissTokens / 1_000_000) * env.pricing.inputMiss +
    (normalized.completionTokens / 1_000_000) * env.pricing.output

  return {
    ...normalized,
    costUsd: Math.round(cost * 1_000_000) / 1_000_000,
    pricingNote: PRICING_NOTE,
  }
}
