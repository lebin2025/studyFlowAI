import { describe, it, expect, beforeEach, vi } from 'vitest'
import { addDays, todayISO } from '../utils/dates.js'
import { AppError } from '../utils/httpError.js'
import { newAgent, register } from './helpers.js'

const { callMock } = vi.hoisted(() => ({ callMock: vi.fn() }))

vi.mock('../services/deepseek.service.js', () => ({
  callDeepSeekJson: callMock,
}))

const today = () => todayISO('Asia/Shanghai')

const buildGeneratedContent = () => {
  const start = today()
  const end = addDays(start, 13)
  const mid = addDays(start, 6)
  return JSON.stringify({
    title: '雅思听力 7 分两周冲刺',
    goal: '两周内提升雅思听力正确率，熟悉常考场景',
    overview: '先熟悉题型，再做精听，最后完成整套模考并复盘。',
    stages: [
      {
        title: '基础与题型',
        objective: '掌握 Section 1-2 的常考词汇与题型',
        startDate: start,
        endDate: mid,
      },
      {
        title: '强化与模考',
        objective: '完成 3 套模考并把正确率稳定在 70%',
        startDate: addDays(mid, 1),
        endDate: end,
      },
    ],
    tasks: [
      {
        title: '精听 Section 1 并整理场景词汇',
        description: '逐句听写，整理租房场景词汇',
        date: start,
        durationMinutes: 45,
        priority: 'high',
        completionCriteria: '听写正确率达到 85%',
        isReview: false,
        stageIndex: 0,
      },
      {
        title: '完成一套 Section 1-2 专项练习',
        description: '限时完成后对照答案',
        date: addDays(start, 1),
        durationMinutes: 40,
        priority: 'medium',
        completionCriteria: '正确率不低于 70%',
        isReview: false,
        stageIndex: 0,
      },
      {
        title: '阶段复盘：整理错题与同义替换',
        description: '回看本周错题',
        date: mid,
        durationMinutes: 30,
        priority: 'low',
        completionCriteria: '整理出 10 组同义替换',
        isReview: true,
        stageIndex: 0,
      },
    ],
    risks: [
      { title: '语速不适应', detail: '从 0.9 倍速开始，逐步恢复到原速。' },
      { title: '时间不足', detail: '优先保证精听，减少泛听。' },
    ],
    advice: '如果某天只有 20 分钟，优先复习同义替换。',
  })
}

const buildAdjustedContent = () => {
  const start = today()
  const end = addDays(start, 19)
  return JSON.stringify({
    title: '雅思听力 7 分 · 延长版',
    goal: '三周内提升雅思听力正确率，熟悉常考场景',
    overview: '把冲刺周期延长一周，增加题型专项与两次完整模考。',
    endDate: end,
    dailyMinutes: 45,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
    stages: [
      {
        title: '基础与题型',
        objective: '掌握 Section 1-2 的常考词汇与题型',
        startDate: start,
        endDate: addDays(start, 9),
      },
      {
        title: '强化与模考',
        objective: '完成 3 套模考并把正确率稳定在 70%',
        startDate: addDays(start, 10),
        endDate: end,
      },
    ],
    tasks: [
      {
        title: '做一套完整听力模考',
        description: '严格限时 30 分钟完成',
        date: addDays(start, 2),
        durationMinutes: 40,
        priority: 'high',
        completionCriteria: '正确率达到 70%',
        isReview: false,
        stageIndex: 0,
      },
      {
        title: '复习同义替换与错题',
        description: '回看本周错题本',
        date: addDays(start, 8),
        durationMinutes: 20,
        priority: 'medium',
        completionCriteria: '能复述 15 组同义替换',
        isReview: true,
        stageIndex: 1,
      },
    ],
    risks: [{ title: '周期变长', detail: '每周固定复盘，避免后程松懈。' }],
    advice: '延长周期的同时保持每天 45 分钟的稳定投入。',
    changeSummary: '周期延长 6 天，每日时长调整为 45 分钟，并增加模考与复习任务。',
  })
}

const successResponse = (content) => ({
  content,
  usage: {
    prompt_tokens: 1200,
    completion_tokens: 800,
    prompt_cache_hit_tokens: 200,
    prompt_cache_miss_tokens: 1000,
    total_tokens: 2000,
  },
  latencyMs: 1234,
  attempts: 1,
  model: 'deepseek-flash',
  finishReason: 'stop',
})

const generatePayload = (requestId) => ({
  goal: '两周内提升雅思听力正确率，目标 7 分',
  subject: '雅思听力',
  level: 'intermediate',
  startDate: today(),
  endDate: addDays(today(), 13),
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
  preferences: '喜欢精听和间隔复习',
  notes: '每天最多一小时',
  requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
})

describe('AI plan generation (mocked provider)', () => {
  beforeEach(() => {
    callMock.mockReset()
  })

  it('generates a validated plan, records real usage and caches retries', async () => {
    const agent = newAgent()
    await register(agent)
    callMock.mockResolvedValueOnce(successResponse(buildGeneratedContent()))

    const requestId = `req_${Date.now()}_cache`
    const first = await agent.post('/api/ai/plans').send(generatePayload(requestId))
    expect(first.status).toBe(200)
    expect(first.body.plan.title).toBe('雅思听力 7 分两周冲刺')
    expect(first.body.plan.tasks).toHaveLength(3)
    expect(first.body.meta.cached).toBe(false)
    expect(first.body.meta.usage.totalTokens).toBe(2000)
    expect(first.body.meta.costUsd).toBeGreaterThan(0)
    expect(callMock).toHaveBeenCalledTimes(1)

    const second = await agent.post('/api/ai/plans').send(generatePayload(requestId))
    expect(second.status).toBe(200)
    expect(second.body.meta.cached).toBe(true)
    expect(callMock).toHaveBeenCalledTimes(1)

    const usage = await agent.get('/api/ai/usage').query({ limit: 5 })
    expect(usage.status).toBe(200)
    expect(usage.body.summary.calls).toBe(1)
    expect(usage.body.summary.totalTokens).toBe(2000)
    expect(usage.body.recent[0].kind).toBe('generate')
  })

  it('saves the generated plan, previews an adjustment and preserves completed work', async () => {
    const agent = newAgent()
    await register(agent)
    callMock.mockResolvedValueOnce(successResponse(buildGeneratedContent()))

    const generated = await agent.post('/api/ai/plans').send(generatePayload())
    expect(generated.status).toBe(200)

    const saved = await agent.post('/api/plans').send({
      ...generated.body.plan,
      source: 'ai',
    })
    expect(saved.status).toBe(201)
    const planId = saved.body.plan.id

    const firstTask = saved.body.tasks[0]
    await agent
      .patch(`/api/tasks/${firstTask.id}/toggle`)
      .send({ isCompleted: true, actualMinutes: 40 })
      .expect(200)

    callMock.mockResolvedValueOnce(successResponse(buildAdjustedContent()))
    const preview = await agent.post(`/api/ai/plans/${planId}/adjust/preview`).send({
      instruction: '我每天只能学 45 分钟，周期延长一周，并增加复习时间',
      requestId: `req_${Date.now()}_adjust`,
    })
    expect(preview.status).toBe(200)
    expect(preview.body.proposedPlan.endDate).toBe(addDays(today(), 19))
    expect(preview.body.proposedPlan.dailyMinutes).toBe(45)
    expect(preview.body.preview.preservedCompleted).toBe(1)
    expect(preview.body.preview.replacedTasks).toBe(2)
    expect(preview.body.preview.planChanges.some((change) => change.field === 'endDate')).toBe(true)

    const applied = await agent
      .post(`/api/ai/plans/${planId}/adjust/apply`)
      .send({
        proposedPlan: preview.body.proposedPlan,
        keepCompleted: true,
        keepManual: true,
      })
    expect(applied.status).toBe(200)
    expect(applied.body.summary.keptCompleted).toBe(1)
    expect(applied.body.plan.endDate).toBe(addDays(today(), 19))
    expect(applied.body.plan.dailyMinutes).toBe(45)
    expect(applied.body.tasks.some((task) => task.id === firstTask.id && task.isCompleted)).toBe(true)
    expect(applied.body.tasks.some((task) => task.title === '做一套完整听力模考')).toBe(true)

    const reloaded = await agent.get(`/api/plans/${planId}`)
    expect(reloaded.body.plan.endDate).toBe(addDays(today(), 19))
    expect(reloaded.body.plan.tasks).toBeUndefined()
  })

  it('rejects malformed model output instead of inventing a plan', async () => {
    const agent = newAgent()
    await register(agent)
    callMock.mockResolvedValueOnce(successResponse('这不是 JSON'))
    const invalidJson = await agent.post('/api/ai/plans').send(generatePayload())
    expect(invalidJson.status).toBe(502)
    expect(invalidJson.body.error.code).toBe('AI_BAD_OUTPUT')

    callMock.mockResolvedValueOnce(successResponse(JSON.stringify({ title: '缺少阶段' })))
    const invalidShape = await agent.post('/api/ai/plans').send(generatePayload())
    expect(invalidShape.status).toBe(502)
    expect(invalidShape.body.error.code).toBe('AI_BAD_OUTPUT')
  })

  it('surfaces upstream timeouts as a retryable 504', async () => {
    const agent = newAgent()
    await register(agent)
    callMock.mockRejectedValueOnce(
      new AppError(504, 'AI_TIMEOUT', 'AI 生成超时了，请稍后重试'),
    )
    const res = await agent.post('/api/ai/plans').send(generatePayload())
    expect(res.status).toBe(504)
    expect(res.body.error.code).toBe('AI_TIMEOUT')
  })

  it('does not let another user preview or apply changes to a plan', async () => {
    const owner = newAgent()
    await register(owner)
    callMock.mockResolvedValueOnce(successResponse(buildGeneratedContent()))
    const generated = await owner.post('/api/ai/plans').send(generatePayload())
    const saved = await owner.post('/api/plans').send(generated.body.plan)
    const planId = saved.body.plan.id

    const intruder = newAgent()
    await register(intruder)
    const preview = await intruder
      .post(`/api/ai/plans/${planId}/adjust/preview`)
      .send({ instruction: '删掉所有任务', requestId: `req_${Date.now()}_intruder` })
    expect(preview.status).toBe(404)

    const apply = await intruder
      .post(`/api/ai/plans/${planId}/adjust/apply`)
      .send({ proposedPlan: JSON.parse(buildGeneratedContent()), keepCompleted: true })
    expect(apply.status).toBe(404)
  })

  it('rejects an incomplete adjustment payload', async () => {
    const agent = newAgent()
    await register(agent)
    callMock.mockResolvedValueOnce(successResponse(buildGeneratedContent()))
    const generated = await agent.post('/api/ai/plans').send(generatePayload())
    const saved = await agent.post('/api/plans').send(generated.body.plan)

    const res = await agent
      .post(`/api/ai/plans/${saved.body.plan.id}/adjust/apply`)
      .send({ proposedPlan: { title: '空方案' }, keepCompleted: true })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_ADJUSTMENT')
  })
})
