import { describe, it, expect } from 'vitest'
import { addDays } from '../utils/dates.js'
import { buildPlanPayload, newAgent, register, today } from './helpers.js'

const createPlan = async (agent, overrides) => {
  const res = await agent.post('/api/plans').send(buildPlanPayload(overrides))
  expect(res.status).toBe(201)
  return res.body
}

describe('plans and tasks', () => {
  it('creates, lists, filters, updates and reads a plan', async () => {
    const agent = newAgent()
    await register(agent)
    const detail = await createPlan(agent)

    expect(detail.plan.title).toBe('雅思 7 分冲刺计划')
    expect(detail.plan.progress).toBe(0)
    expect(detail.plan.taskCount).toBe(3)
    expect(detail.stages).toHaveLength(2)
    expect(detail.tasks).toHaveLength(3)

    const list = await agent.get('/api/plans').query({ status: 'active', search: '雅思' })
    expect(list.status).toBe(200)
    expect(list.body.items).toHaveLength(1)
    expect(list.body.subjects).toContain('雅思')

    const bySubject = await agent.get('/api/plans').query({ subject: '雅思', sort: 'start', order: 'asc' })
    expect(bySubject.body.items).toHaveLength(1)

    const noResults = await agent.get('/api/plans').query({ search: '%' })
    expect(noResults.body.items).toHaveLength(0)

    const updated = await agent
      .patch(`/api/plans/${detail.plan.id}`)
      .send({ title: '雅思 7 分冲刺 · 调整版', status: 'archived' })
    expect(updated.status).toBe(200)
    expect(updated.body.plan.title).toBe('雅思 7 分冲刺 · 调整版')
    expect(updated.body.plan.status).toBe('archived')

    const fetched = await agent.get(`/api/plans/${detail.plan.id}`)
    expect(fetched.status).toBe(200)
    expect(fetched.body.tasks[0].title).toBe('背诵 50 个核心词汇')
  })

  it('rejects invalid plan windows and protects plan ranges', async () => {
    const agent = newAgent()
    await register(agent)
    const payload = buildPlanPayload()
    payload.endDate = addDays(payload.startDate, -1)
    const invalid = await agent.post('/api/plans').send(payload)
    expect(invalid.status).toBe(400)

    const detail = await createPlan(agent)
    const conflict = await agent
      .patch(`/api/plans/${detail.plan.id}`)
      .send({ endDate: payload.startDate })
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('PLAN_RANGE_CONFLICT')
  })

  it('creates, edits, filters, completes and deletes tasks while syncing progress', async () => {
    const agent = newAgent()
    await register(agent)
    const detail = await createPlan(agent)
    const planId = detail.plan.id
    const startDate = detail.plan.startDate
    const endDate = detail.plan.endDate
    const targetDate = addDays(startDate, 2)

    const created = await agent.post('/api/tasks').send({
      planId,
      title: '做一套听力模考',
      description: '限时完成并整理错题',
      taskDate: targetDate,
      durationMinutes: 50,
      priority: 'high',
      completionCriteria: '正确率达到 70%',
    })
    expect(created.status).toBe(201)
    expect(created.body.task.source).toBe('manual')
    expect(created.body.task.stageId).toBeTruthy()
    const taskId = created.body.task.id

    const outside = await agent.post('/api/tasks').send({
      planId,
      title: '越界任务',
      taskDate: addDays(endDate, 1),
      durationMinutes: 30,
      priority: 'low',
    })
    expect(outside.status).toBe(409)
    expect(outside.body.error.code).toBe('TASK_OUTSIDE_PLAN')

    const edited = await agent
      .patch(`/api/tasks/${taskId}`)
      .send({ title: '做一套听力模考（复盘版）', durationMinutes: 55, actualMinutes: 50 })
    expect(edited.status).toBe(200)
    expect(edited.body.task.durationMinutes).toBe(55)
    expect(edited.body.task.actualMinutes).toBe(50)

    const byDate = await agent.get('/api/tasks').query({ date: targetDate })
    expect(byDate.body.items).toHaveLength(1)

    const high = await agent.get('/api/tasks').query({ priority: 'high' })
    expect(high.body.items.every((task) => task.priority === 'high')).toBe(true)

    const open = await agent.get('/api/tasks').query({ status: 'open', planId })
    expect(open.body.total).toBe(4)

    const toggled = await agent
      .patch(`/api/tasks/${taskId}/toggle`)
      .send({ isCompleted: true, actualMinutes: 50 })
    expect(toggled.status).toBe(200)
    expect(toggled.body.task.isCompleted).toBe(true)
    expect(toggled.body.plan.completedTasks).toBe(1)
    expect(toggled.body.plan.progress).toBe(25)

    const done = await agent.get('/api/tasks').query({ status: 'done' })
    expect(done.body.items).toHaveLength(1)

    const planAfter = await agent.get(`/api/plans/${planId}`)
    expect(planAfter.body.plan.progress).toBe(25)

    // Complete everything → plan auto-completes.
    for (const task of planAfter.body.tasks.filter((item) => !item.isCompleted)) {
      const res = await agent.patch(`/api/tasks/${task.id}/toggle`).send({ isCompleted: true })
      expect(res.status).toBe(200)
    }
    const completedPlan = await agent.get(`/api/plans/${planId}`)
    expect(completedPlan.body.plan.status).toBe('completed')
    expect(completedPlan.body.plan.progress).toBe(100)

    // Un-completing a task re-activates the plan.
    await agent.patch(`/api/tasks/${taskId}/toggle`).send({ isCompleted: false })
    const reactivated = await agent.get(`/api/plans/${planId}`)
    expect(reactivated.body.plan.status).toBe('active')
    expect(reactivated.body.plan.progress).toBe(75)

    const deleted = await agent.delete(`/api/tasks/${taskId}`)
    expect(deleted.status).toBe(200)
    const afterDelete = await agent.get(`/api/plans/${planId}`)
    expect(afterDelete.body.plan.taskCount).toBe(3)
  })

  it('computes stats from real task data and returns zeros for new users', async () => {
    const agent = newAgent()
    await register(agent)

    const empty = await agent.get('/api/stats/overview').query({ days: 7 })
    expect(empty.status).toBe(200)
    expect(empty.body.totals.totalTasks).toBe(0)
    expect(empty.body.totals.completionRate).toBe(0)
    expect(empty.body.trend).toHaveLength(7)
    expect(empty.body.streak).toBe(0)

    const detail = await createPlan(agent)
    const tasks = detail.tasks
    for (const task of tasks) {
      await agent.patch(`/api/tasks/${task.id}/toggle`).send({ isCompleted: true })
    }

    const stats = await agent.get('/api/stats/overview').query({ days: 30 })
    expect(stats.body.totals.totalTasks).toBe(3)
    expect(stats.body.totals.completedTasks).toBe(3)
    expect(stats.body.totals.completionRate).toBe(100)
    expect(stats.body.totals.plannedMinutes).toBe(115)
    expect(stats.body.totals.completedMinutes).toBe(115)
    expect(stats.body.trend).toHaveLength(30)
    expect(stats.body.subjects[0]).toMatchObject({ subject: '雅思', total: 3, completed: 3 })
    expect(stats.body.streak).toBeGreaterThanOrEqual(1)
    expect(stats.body.today.totalTasks).toBeGreaterThanOrEqual(0)
  })

  it('isolates every user’s plans and tasks', async () => {
    const owner = newAgent()
    await register(owner)
    const detail = await createPlan(owner)
    const taskId = detail.tasks[0].id

    const intruder = newAgent()
    await register(intruder)

    const list = await intruder.get('/api/plans')
    expect(list.body.items).toHaveLength(0)

    expect((await intruder.get(`/api/plans/${detail.plan.id}`)).status).toBe(404)
    expect((await intruder.patch(`/api/plans/${detail.plan.id}`).send({ title: '偷看' })).status).toBe(404)
    expect((await intruder.delete(`/api/plans/${detail.plan.id}`)).status).toBe(404)
    expect((await intruder.get(`/api/tasks/${taskId}`)).status).toBe(404)
    expect((await intruder.patch(`/api/tasks/${taskId}`).send({ title: '篡改' })).status).toBe(404)
    expect(
      (
        await intruder.post('/api/tasks').send({
          planId: detail.plan.id,
          title: '越权任务',
          taskDate: detail.plan.startDate,
          durationMinutes: 30,
          priority: 'medium',
        })
      ).status,
    ).toBe(404)
    expect(
      (await intruder.patch(`/api/tasks/${taskId}/toggle`).send({ isCompleted: true })).status,
    ).toBe(404)
  })

  it('cascades task deletion when a plan is removed', async () => {
    const agent = newAgent()
    await register(agent)
    const detail = await createPlan(agent)
    const planId = detail.plan.id

    const removed = await agent.delete(`/api/plans/${planId}`)
    expect(removed.status).toBe(200)

    expect((await agent.get(`/api/plans/${planId}`)).status).toBe(404)
    const tasks = await agent.get('/api/tasks').query({ planId })
    expect(tasks.body.total).toBe(0)
    const stats = await agent.get('/api/stats/overview')
    expect(stats.body.totals.totalTasks).toBe(0)
  })

  it('validates task payloads', async () => {
    const agent = newAgent()
    await register(agent)
    const detail = await createPlan(agent)

    const tooLong = await agent.post('/api/tasks').send({
      planId: detail.plan.id,
      title: 'x'.repeat(200),
      taskDate: today(),
      durationMinutes: 30,
      priority: 'medium',
    })
    expect(tooLong.status).toBe(400)

    const badPriority = await agent.post('/api/tasks').send({
      planId: detail.plan.id,
      title: '任务',
      taskDate: today(),
      durationMinutes: 30,
      priority: 'urgent',
    })
    expect(badPriority.status).toBe(400)

    const badDuration = await agent.post('/api/tasks').send({
      planId: detail.plan.id,
      title: '任务',
      taskDate: today(),
      durationMinutes: 500,
      priority: 'medium',
    })
    expect(badDuration.status).toBe(400)
  })
})
