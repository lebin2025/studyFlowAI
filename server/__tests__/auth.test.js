import { describe, it, expect } from 'vitest'
import { app, newAgent, register } from './helpers.js'

describe('health', () => {
  it('reports database and AI configuration without secrets', async () => {
    const res = await newAgent().get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.database).toBe('ok')
    expect(res.body.aiConfigured).toBe(false)
    expect(JSON.stringify(res.body)).not.toMatch(/sk-|apiKey/i)
    expect(res.headers['x-request-id']).toBeTruthy()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('answers anonymous session checks with 200 instead of a noisy 401', async () => {
    const anonymous = await newAgent().get('/api/auth/session')
    expect(anonymous.status).toBe(200)
    expect(anonymous.body.user).toBeNull()
    expect(anonymous.body.preferences).toBeNull()

    const agent = newAgent()
    await register(agent)
    const session = await agent.get('/api/auth/session')
    expect(session.status).toBe(200)
    expect(session.body.user.email).toBeTruthy()
    expect(session.body.preferences.defaultDailyMinutes).toBe(60)
  })
})

describe('authentication', () => {
  it('rejects weak passwords with a useful validation error', async () => {
    const agent = newAgent()
    const res = await agent
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: '12345678', displayName: '小满' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details[0].field).toMatch(/password/)
  })

  it('registers, sets an httpOnly cookie and returns a safe user object', async () => {
    const agent = newAgent()
    const { response, payload } = await register(agent)
    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe(payload.email)
    expect(response.body.user.passwordHash).toBeUndefined()
    expect(response.body.user.password_hash).toBeUndefined()
    expect(response.body.preferences.defaultDailyMinutes).toBe(60)

    const cookie = response.headers['set-cookie']?.[0] || ''
    expect(cookie).toMatch(/sf_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user.displayName).toBe('小满')
  })

  it('normalises email case, rejects duplicates and wrong passwords', async () => {
    const agent = newAgent()
    const { payload } = await register(agent, { email: 'Mixed.Case@Example.com' })

    const duplicate = await newAgent()
      .post('/api/auth/register')
      .send({ email: payload.email.toUpperCase(), password: 'Study1234', displayName: '重复' })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN')

    const wrong = await newAgent()
      .post('/api/auth/login')
      .send({ email: payload.email.toLowerCase(), password: 'WrongPass1' })
    expect(wrong.status).toBe(401)
    expect(wrong.body.error.message).toMatch(/邮箱或密码/)

    const ok = await newAgent()
      .post('/api/auth/login')
      .send({ email: payload.email.toLowerCase(), password: 'Study1234' })
    expect(ok.status).toBe(200)
  })

  it('protects private routes and clears the session on logout', async () => {
    const anonymous = await newAgent().get('/api/plans')
    expect(anonymous.status).toBe(401)

    const agent = newAgent()
    await register(agent)
    await agent.post('/api/auth/logout').expect(200)
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(401)
  })

  it('updates profile and learning preferences', async () => {
    const agent = newAgent()
    await register(agent)

    const profile = await agent
      .patch('/api/users/me')
      .send({ displayName: '小满同学', bio: '正在准备雅思，每天进步一点点。' })
    expect(profile.status).toBe(200)
    expect(profile.body.user.displayName).toBe('小满同学')

    const preferences = await agent.put('/api/users/me/preferences').send({
      defaultDailyMinutes: 90,
      studyWeekdays: [1, 3, 5, 7],
      preferredSubjects: '英语、编程',
      learningStyle: 'deep',
    })
    expect(preferences.status).toBe(200)
    expect(preferences.body.preferences.defaultDailyMinutes).toBe(90)
    expect(preferences.body.preferences.studyWeekdays).toEqual([1, 3, 5, 7])
  })

  it('rotates the token version on password change and logs other devices out', async () => {
    const agentA = newAgent()
    const { payload } = await register(agentA)
    const agentB = newAgent()
    await agentB
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'Study1234' })
      .expect(200)

    const change = await agentA.patch('/api/auth/password').send({
      currentPassword: 'Study1234',
      newPassword: 'NewStudy5678',
    })
    expect(change.status).toBe(200)

    const oldSession = await agentB.get('/api/auth/me')
    expect(oldSession.status).toBe(401)

    const currentSession = await agentA.get('/api/auth/me')
    expect(currentSession.status).toBe(200)

    const oldPassword = await newAgent()
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'Study1234' })
    expect(oldPassword.status).toBe(401)

    const newPassword = await newAgent()
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'NewStudy5678' })
    expect(newPassword.status).toBe(200)
  })
})
