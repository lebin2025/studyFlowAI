export const LEVEL_LABELS = {
  beginner: '初学者',
  intermediate: '有基础',
  advanced: '进阶冲刺',
}

export const LEVEL_DESCRIPTIONS = {
  beginner: '从零开始，需要更多基础讲解',
  intermediate: '学过一些，希望系统梳理',
  advanced: '基础扎实，目标高分或进阶',
}

export const PRIORITY_LABELS = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

export const PRIORITY_SHORT = {
  high: '高',
  medium: '中',
  low: '低',
}

export const PLAN_STATUS_LABELS = {
  active: '进行中',
  completed: '已完成',
  archived: '已归档',
}

export const LEARNING_STYLE_LABELS = {
  balanced: '均衡安排',
  deep: '深度学习',
  practice: '以练带学',
  review: '复习优先',
}

export const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`

export const formatUsd = (value) => {
  const number = Number(value) || 0
  if (number === 0) return '$0.0000'
  if (number < 0.0001) return `$${number.toFixed(6)}`
  if (number < 0.01) return `$${number.toFixed(5)}`
  return `$${number.toFixed(4)}`
}

export const formatNumber = (value) =>
  new Intl.NumberFormat('zh-CN').format(Number(value) || 0)
