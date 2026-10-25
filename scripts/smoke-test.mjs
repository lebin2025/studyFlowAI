/**
 * End-to-end smoke test against a real HTTP server and a temporary SQLite DB.
 * It exercises auth, plan/task CRUD, stats, user isolation, the production
 * static build, the honest AI_NOT_CONFIGURED error, and persistence across a
 * server restart.
 *
 * Run: npm run smoke   (requires `npm run build` first)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PORT = Number(process.env.SMOKE_PORT || 8899)
const BASE = `http://127.0.0.1:${PORT}`
const API = `${BASE}/api`
const DB_PATH = path.join(ROOT, 'server', 'data', `smoke-${Date.now()}.db`)

const jars = new Map()
let child = null
let logs = ''

const todayISO = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const addDays = (iso, amount) => {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + amount)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const cookiesFor = (user) => jars.get(user) || ''

const rememberCookies = (user, response) => {
  const setCookies = response.headers.getSetCookie?.() || []
  if (!setCookies.length) return
  const current = new Map(
    cookiesFor(user)
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.split('=')[0], pair]),
  )
  setCookies.forEach((cookie) => {
    const pair = cookie.split(';')[0]
    current.set(pair.split('=')[0], pair)
  })
  jars.set(user, [...current.values()].join('; '))
}

const request = async (user, endpoint, { method = 'GET', body } = {}) => {
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (user) headers.Cookie = cookiesFor(user)
  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (user) rememberCookies(user, response)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: response.status, data, response }
}

const checks = []
const check = (name, condition, detail = '') => {
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`)
  checks.push(name)
  console.log(`  ✓ ${name}`)
}

const startServer = async () => {
  logs = ''
  child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      DB_PATH,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
      JWT_SECRET: 'studyflow-smoke-test-secret-please-change-1234567890',
      DEEPSEEK_API_KEY: '',
      APP_ORIGIN: BASE,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString()
  })

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`)
      if (response.ok) return
    } catch {
      /* server not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Server did not start on port ${PORT}\n${logs}`)
}

const stopServer = async () => {
  if (!child) return
  const processRef = child
  child = null
  processRef.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => processRef.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ])
}

const cleanup = async () => {
  await stopServer()
  for (const suffix of ['', '-wal', '-shm']) {
    await fs.rm(`${DB_PATH}${suffix}`, { force: true }).catch(() => {})
  }
}

const run = async () => {
  await fs.access(path.join(ROOT, 'dist', 'index.html')).catch(() => {
    throw new Error('dist/index.html is missing — run `npm run build` before the smoke test')
  })

  console.log(`\nStudyFlow AI smoke test · ${BASE}\n`)
  await startServer()

  try {
    console.log('[health & static build]')
    const health = await request(null, '/health')
    check('GET /api/health returns ok', health.status === 200 && health.data.status === 'ok')
    check('AI is honestly reported as not configured', health.data.aiConfigured === false)
    check('response carries a request id', Boolean(health.response.headers.get('x-request-id')))

    const page = await fetch(`${BASE}/`)
    const html = await page.text()
    check('production server serves the SPA', page.status === 200 && html.includes('id="app"'))
    check('SPA title is branded', html.includes('StudyFlow AI'))
    const missingApi = await request(null, '/does-not-exist')
    check('unknown API route returns JSON 404', missingApi.status === 404 && missingApi.data.error.code === 'NOT_FOUND')

    const session = await request(null, '/auth/session')
    check('anonymous session check is a 200 with null user', session.status === 200 && session.data.user === null)

    console.log('\n[authentication]')
    const registered = await request('owner', '/auth/register', {
      method: 'POST',
      body: { email: 'smoke-owner@example.com', password: 'Study1234', displayName: '冒烟测试' },
    })
    check('register returns 201 and a user', registered.status === 201 && registered.data.user.id > 0)
    check('register sets the session cookie', Boolean(cookiesFor('owner')))
    check('password hash is never returned', !JSON.stringify(registered.data).includes('password'))

    const loggedIn = await request('owner', '/auth/session')
    check('session resolves the logged-in user', loggedIn.status === 200 && loggedIn.data.user.email === 'smoke-owner@example.com')

    console.log('\n[plan & task lifecycle]')
    const start = todayISO()
    const end = addDays(start, 6)
    const createdPlan = await request('owner', '/plans', {
      method: 'POST',
      body: {
        title: '冒烟测试计划',
        goal: '验证计划、任务、统计和权限隔离',
        subject: '测试',
        level: 'beginner',
        startDate: start,
        endDate: end,
        dailyMinutes: 45,
        studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
        overview: '用于端到端冒烟测试。',
        risks: [],
        advice: '测试建议',
        stages: [
          { title: '学习阶段', objective: '完成测试', startDate: start, endDate: end },
        ],
        tasks: [
          {
            title: '第一个任务',
            description: '测试任务',
            taskDate: start,
            durationMinutes: 30,
            priority: 'high',
            completionCriteria: '测试通过',
            isReview: false,
            stageIndex: 0,
          },
        ],
      },
    })
    check('plan creation returns 201 with a task', createdPlan.status === 201 && createdPlan.data.tasks.length === 1)
    const planId = createdPlan.data.plan.id
    const taskId = createdPlan.data.tasks[0].id

    const detail = await request('owner', `/plans/${planId}`)
    check('plan detail is readable', detail.status === 200 && detail.data.plan.title === '冒烟测试计划')
    check('progress starts at 0', detail.data.plan.progress === 0)

    const addedTask = await request('owner', '/tasks', {
      method: 'POST',
      body: {
        planId,
        title: '手动添加的任务',
        taskDate: start,
        durationMinutes: 20,
        priority: 'medium',
      },
    })
    check('manual task creation works', addedTask.status === 201 && addedTask.data.task.source === 'manual')

    const toggled = await request('owner', `/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      body: { isCompleted: true, actualMinutes: 28 },
    })
    check('task completion updates the plan progress', toggled.status === 200 && toggled.data.plan.progress === 50)

    const stats = await request('owner', '/stats/overview?days=7')
    check('stats reflect the real tasks', stats.status === 200 && stats.data.totals.totalTasks === 2)
    check('stats include registered actual minutes', stats.data.totals.loggedMinutes === 28)

    console.log('\n[user isolation]')
    const other = await request('intruder', '/auth/register', {
      method: 'POST',
      body: { email: 'smoke-intruder@example.com', password: 'Study1234', displayName: '越权测试' },
    })
    check('second user can register', other.status === 201)
    const foreignPlan = await request('intruder', `/plans/${planId}`)
    check('another user cannot read the plan', foreignPlan.status === 404)
    const foreignToggle = await request('intruder', `/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      body: { isCompleted: false },
    })
    check('another user cannot modify the task', foreignToggle.status === 404)

    console.log('\n[AI error honesty]')
    const ai = await request('owner', '/ai/plans', {
      method: 'POST',
      body: {
        goal: '测试目标',
        subject: '测试',
        level: 'beginner',
        startDate: start,
        endDate: end,
        dailyMinutes: 30,
        studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
        preferences: '',
        notes: '',
        requestId: `smoke_${Date.now()}`,
      },
    })
    check('missing API key returns 503 AI_NOT_CONFIGURED', ai.status === 503 && ai.data.error.code === 'AI_NOT_CONFIGURED')

    console.log('\n[persistence across restart]')
    await stopServer()
    jars.delete('owner')
    await startServer()
    const relogin = await request('owner', '/auth/login', {
      method: 'POST',
      body: { email: 'smoke-owner@example.com', password: 'Study1234' },
    })
    check('can log in after restart', relogin.status === 200)
    const plansAfterRestart = await request('owner', '/plans')
    check(
      'plan survives a server restart',
      plansAfterRestart.status === 200 && plansAfterRestart.data.items.some((plan) => plan.id === planId),
    )
    const statsAfterRestart = await request('owner', '/stats/overview?days=7')
    check(
      'completion record survives a server restart',
      statsAfterRestart.data.totals.completedTasks === 1 &&
        statsAfterRestart.data.totals.loggedMinutes === 28,
    )

    console.log(`\n✅ Smoke test passed — ${checks.length} checks.\n`)
  } catch (error) {
    console.error(`\n❌ Smoke test failed: ${error.message}\n`)
    if (logs) console.error(logs.slice(-4000))
    process.exitCode = 1
  } finally {
    await cleanup()
  }
}

run()
