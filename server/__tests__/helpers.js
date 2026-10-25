import crypto from 'node:crypto'
import request from 'supertest'
import { createApp } from '../app.js'
import { addDays, todayISO, weekdayISO } from '../utils/dates.js'

export const app = createApp()

export const newAgent = () => request.agent(app)

export const register = async (agent, overrides = {}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const payload = {
    email: `learner-${suffix}@example.com`,
    password: 'Study1234',
    displayName: '小满',
    ...overrides,
  }
  const response = await agent.post('/api/auth/register').send(payload)
  return { response, payload }
}

export const today = () => todayISO('Asia/Shanghai')

export const buildPlanPayload = (overrides = {}) => {
  const startDate = overrides.startDate || today()
  const endDate = overrides.endDate || addDays(startDate, 13)
  const mid = addDays(startDate, 6)
  return {
    title: '雅思 7 分冲刺计划',
    goal: '在 14 天内完成雅思听力与词汇的基础强化',
    subject: '雅思',
    level: 'intermediate',
    startDate,
    endDate,
    dailyMinutes: 60,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 7],
    preferences: '更喜欢精听和间隔复习',
    overview: '先补词汇，再进行听力精练，最后做一次完整复盘。',
    risks: [{ title: '时间紧', detail: '每天固定 60 分钟，优先保证听力练习。' }],
    advice: '如果某天状态不好，至少完成 20 分钟复习任务。',
    stages: [
      {
        title: '基础积累',
        objective: '掌握核心词汇并适应听力语速',
        startDate,
        endDate: mid,
      },
      {
        title: '强化冲刺',
        objective: '完成套题训练并复盘错题',
        startDate: addDays(mid, 1),
        endDate,
      },
    ],
    tasks: [
      {
        title: '背诵 50 个核心词汇',
        description: '使用词表完成第一轮记忆',
        taskDate: startDate,
        durationMinutes: 40,
        priority: 'high',
        completionCriteria: '能准确说出 40 个词的中文含义',
        isReview: false,
        stageIndex: 0,
      },
      {
        title: '精听一篇 Section 2',
        description: '逐句听写并对照原文',
        taskDate: addDays(startDate, 1),
        durationMinutes: 45,
        priority: 'medium',
        completionCriteria: '听写正确率达到 80%',
        isReview: false,
        stageIndex: 0,
      },
      {
        title: '阶段复盘与错题整理',
        description: '回看本周错题',
        taskDate: mid,
        durationMinutes: 30,
        priority: 'low',
        completionCriteria: '整理出 3 条可执行的改进点',
        isReview: true,
        stageIndex: 0,
      },
    ],
    ...overrides,
  }
}

export const weekdayOf = (date) => weekdayISO(date)
