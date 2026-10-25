import axios from 'axios'
import { env, isDeepSeekConfigured } from '../config/env.js'
import { AppError } from '../utils/httpError.js'
import { logger } from '../utils/logger.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class AiError extends AppError {
  constructor(status, code, message, { usage = null, retryable = false, details } = {}) {
    super(status, code, message, details)
    this.name = 'AiError'
    this.usage = usage
    this.retryable = retryable
  }
}

const emptyUsage = () => ({
  prompt_tokens: 0,
  completion_tokens: 0,
  prompt_cache_hit_tokens: 0,
  prompt_cache_miss_tokens: 0,
  total_tokens: 0,
})

const addUsage = (target, usage = {}) => {
  target.prompt_tokens += Number(usage.prompt_tokens) || 0
  target.completion_tokens += Number(usage.completion_tokens) || 0
  target.prompt_cache_hit_tokens += Number(usage.prompt_cache_hit_tokens) || 0
  target.prompt_cache_miss_tokens += Number(usage.prompt_cache_miss_tokens) || 0
  target.total_tokens += Number(usage.total_tokens) || 0
  return target
}

const mapAxiosError = (error, usage) => {
  const status = error?.response?.status
  const code = error?.code

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
    return new AiError(504, 'AI_TIMEOUT', 'AI 生成超时了，请稍后重试或缩短计划周期', {
      usage,
      retryable: true,
    })
  }
  if (!error?.response) {
    return new AiError(502, 'AI_NETWORK', '无法连接 AI 服务，请检查服务器网络后重试', {
      usage,
      retryable: true,
    })
  }
  if (status === 401 || status === 403) {
    return new AiError(
      502,
      'AI_AUTH',
      'AI 服务鉴权失败，请检查服务器 .env 中的 DEEPSEEK_API_KEY',
      { usage, retryable: false },
    )
  }
  if (status === 402) {
    return new AiError(402, 'AI_INSUFFICIENT_BALANCE', 'DeepSeek 账户余额不足，请充值后重试', {
      usage,
      retryable: false,
    })
  }
  if (status === 429) {
    return new AiError(429, 'AI_RATE_LIMIT', 'AI 服务当前繁忙，请稍后重试', {
      usage,
      retryable: true,
    })
  }
  if (status === 400 || status === 422) {
    return new AiError(502, 'AI_BAD_REQUEST', 'AI 服务拒绝了本次请求，请调整内容后重试', {
      usage,
      retryable: false,
    })
  }
  return new AiError(502, 'AI_UPSTREAM', 'AI 服务暂时不可用，请稍后重试', {
    usage,
    retryable: true,
  })
}

/**
 * Calls DeepSeek's OpenAI-compatible chat completions API in JSON mode.
 * The API key never leaves this process.
 *
 * Docs: https://api-docs.deepseek.com/ (models: deepseek-flash, deepseek-v4-pro)
 */
export const callDeepSeekJson = async ({ system, user, maxTokens } = {}) => {
  if (!isDeepSeekConfigured()) {
    throw new AiError(
      503,
      'AI_NOT_CONFIGURED',
      'AI 服务还没有配置：请在后端 .env 中填写 DEEPSEEK_API_KEY 并重启服务',
      {
        details: { hint: '复制 .env.example 为 .env，填写 DEEPSEEK_API_KEY 后重启后端' },
      },
    )
  }

  const payload = {
    model: env.deepseek.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    max_tokens: maxTokens || env.deepseek.maxTokens,
    stream: false,
  }

  if (env.deepseek.thinking) {
    payload.thinking = { type: 'enabled' }
    payload.reasoning_effort = env.deepseek.reasoningEffort
  } else {
    payload.thinking = { type: 'disabled' }
    payload.temperature = 0.5
  }

  const usage = emptyUsage()
  const startedAt = Date.now()
  let attempts = 0
  let lastError = null

  for (let attempt = 0; attempt <= env.deepseek.maxRetries; attempt += 1) {
    attempts += 1
    try {
      const response = await axios.post(`${env.deepseek.baseUrl}/chat/completions`, payload, {
        timeout: env.deepseek.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.deepseek.apiKey}`,
          Accept: 'application/json',
        },
        maxBodyLength: 20 * 1024 * 1024,
      })

      addUsage(usage, response.data?.usage)
      const choice = response.data?.choices?.[0]
      const content = choice?.message?.content

      if (choice?.finish_reason === 'length') {
        throw new AiError(
          502,
          'AI_OUTPUT_TRUNCATED',
          'AI 输出被截断了。请缩短计划周期、减少任务数量后重试',
          { usage, retryable: false },
        )
      }
      if (typeof content !== 'string' || !content.trim()) {
        throw new AiError(502, 'AI_EMPTY_OUTPUT', 'AI 返回了空内容，正在重试', {
          usage,
          retryable: true,
        })
      }

      logger.info('DeepSeek call succeeded', {
        model: response.data?.model || env.deepseek.model,
        attempts,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        latencyMs: Date.now() - startedAt,
      })

      return {
        content,
        usage,
        attempts,
        latencyMs: Date.now() - startedAt,
        model: response.data?.model || env.deepseek.model,
        finishReason: choice?.finish_reason || 'stop',
      }
    } catch (error) {
      const mapped = error instanceof AiError ? error : mapAxiosError(error, usage)
      mapped.usage = usage
      lastError = mapped

      logger.warn('DeepSeek call failed', {
        code: mapped.code,
        status: mapped.status,
        attempt: attempts,
        retryable: mapped.retryable,
        latencyMs: Date.now() - startedAt,
      })

      if (!mapped.retryable || attempt === env.deepseek.maxRetries) {
        throw mapped
      }
      await sleep(900 * 2 ** attempt + Math.floor(Math.random() * 300))
    }
  }

  throw lastError
}
