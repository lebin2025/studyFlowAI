import { describe, it, expect } from 'vitest'
import { addDays, weekdayISO } from '../utils/dates.js'
import { newAgent, register, today } from './helpers.js'

const generatePayload = () => ({
  goal: '在两周内系统提升雅思听力，目标 7 分',
  subject: '雅思听力',
  level: 'intermediate',
  startDate: today(),
  endDate: addDays(today(), 13),
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
  preferences: '喜欢精听和间隔复习',
  notes: '每天最多一小时',
  requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
})

describe('AI configuration safety', () => {
  it('requires authentication and returns a clear error when the key is missing', async () => {
    expect((await newAgent().post('/api/ai/plans').send(generatePayload())).status).toBe(401)

    const agent = newAgent()
    await register(agent)
    const res = await agent.post('/api/ai/plans').send(generatePayload())
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('AI_NOT_CONFIGURED')
    expect(res.body.error.message).toMatch(/DEEPSEEK_API_KEY/)
    expect(JSON.stringify(res.body)).not.toMatch(/sk-[A-Za-z0-9]/)

    const status = await agent.get('/api/ai/status')
    expect(status.status).toBe(200)
    expect(status.body.configured).toBe(false)
    expect(status.body.usage.calls).toBeGreaterThanOrEqual(1)
  })

  it('validates impossible schedules before spending tokens', async () => {
    const agent = newAgent()
    await register(agent)

    const past = generatePayload()
    past.startDate = addDays(today(), -1)
    const pastRes = await agent.post('/api/ai/plans').send(past)
    expect(pastRes.status).toBe(400)
    expect(pastRes.body.error.details[0].field).toBe('startDate')

    const noStudyDays = generatePayload()
    noStudyDays.startDate = today()
    noStudyDays.endDate = addDays(today(), 1)
    const todayWeekday = weekdayISO(today())
    const absentWeekday = todayWeekday + 2 > 7 ? todayWeekday - 5 : todayWeekday + 2
    noStudyDays.studyWeekdays = [absentWeekday]
    const noDaysRes = await agent.post('/api/ai/plans').send(noStudyDays)
    expect(noDaysRes.status).toBe(400)

    const tooLittle = generatePayload()
    tooLittle.dailyMinutes = 10
    tooLittle.endDate = addDays(today(), 3)
    tooLittle.studyWeekdays = [2]
    const tooLittleRes = await agent.post('/api/ai/plans').send(tooLittle)
    expect(tooLittleRes.status).toBe(400)
  })
})
