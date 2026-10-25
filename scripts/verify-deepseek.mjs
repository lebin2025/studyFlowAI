/**
 * Verify the real DeepSeek connectivity used by StudyFlow AI.
 * Requires DEEPSEEK_API_KEY in `.env` (server-side only).
 *
 * Run: npm run verify:ai
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import axios from 'axios'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
dotenv.config({ path: path.join(ROOT, '.env') })

const apiKey = process.env.DEEPSEEK_API_KEY || ''
const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const model = process.env.DEEPSEEK_MODEL || 'deepseek-flash'

if (!apiKey) {
  console.error(
    '\nDEEPSEEK_API_KEY is not set.\n' +
      '1. Copy .env.example to .env if you have not already.\n' +
      '2. Set DEEPSEEK_API_KEY=sk-... (never commit this file).\n' +
      '3. Run `npm run verify:ai` again.\n',
  )
  process.exit(2)
}

const payload = {
  model,
  messages: [
    {
      role: 'system',
      content:
        'You are a connectivity check for StudyFlow AI. Output only a JSON object with keys "ok" (boolean), "service" (string) and "message" (string).',
    },
    {
      role: 'user',
      content:
        'Return {"ok": true, "service": "StudyFlow AI", "message": "connected"} as JSON. Do not output anything else.',
    },
  ],
  response_format: { type: 'json_object' },
  max_tokens: 200,
  temperature: 0.1,
  thinking: { type: 'disabled' },
  stream: false,
}

const startedAt = Date.now()

try {
  const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  const content = response.data?.choices?.[0]?.message?.content
  const usage = response.data?.usage || {}
  const parsed = JSON.parse(content)

  if (parsed.ok !== true) {
    throw new Error(`Unexpected JSON payload: ${content?.slice(0, 300)}`)
  }

  console.log('\n✅ DeepSeek connectivity verified\n')
  console.log(`  Base URL   ${baseUrl}`)
  console.log(`  Model      ${response.data?.model || model}`)
  console.log(`  Latency    ${Date.now() - startedAt} ms`)
  console.log(`  Response   ${JSON.stringify(parsed)}`)
  console.log(
    `  Tokens     prompt ${usage.prompt_tokens ?? 0}, completion ${usage.completion_tokens ?? 0}, total ${usage.total_tokens ?? 0}`,
  )
  console.log(
    `  Cache      hit ${usage.prompt_cache_hit_tokens ?? 0}, miss ${usage.prompt_cache_miss_tokens ?? 0}`,
  )
  console.log('\nThe API key was used only by this Node process and was not printed.\n')
} catch (error) {
  const status = error?.response?.status
  const upstream = error?.response?.data?.error?.message
  console.error('\n❌ DeepSeek verification failed\n')
  if (status) console.error(`  HTTP ${status}${upstream ? ` — ${upstream}` : ''}`)
  else console.error(`  ${error.message}`)
  if (status === 401) console.error('  Check that DEEPSEEK_API_KEY is valid and belongs to this base URL.')
  if (status === 402) console.error('  The DeepSeek account has no remaining balance.')
  if (status === 429) console.error('  Rate limited. Wait a moment and try again.')
  if (!status) console.error('  Check network access to api.deepseek.com from this machine.')
  console.error('')
  process.exit(1)
}
