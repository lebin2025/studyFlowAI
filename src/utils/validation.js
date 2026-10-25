import { countStudyDays, diffDays, todayISO } from './date.js'

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim())

export const passwordChecks = (password = '') => ({
  length: password.length >= 8 && password.length <= 72,
  letter: /[A-Za-z]/.test(password),
  number: /\d/.test(password),
})

export const passwordStrength = (password = '') => {
  const checks = passwordChecks(password)
  const passed = Object.values(checks).filter(Boolean).length
  let score = passed
  if (password.length >= 12) score = Math.min(4, score + 1)
  if (/[^A-Za-z0-9]/.test(password)) score = Math.min(4, score + 1)
  const labels = ['太弱了', '还差一点', '可以使用', '比较安全', '非常安全']
  return { score, max: 4, label: labels[score], checks, valid: passed === 3 }
}

export const validateRegisterForm = ({ displayName, email, password, confirmPassword }) => {
  const errors = {}
  if (!displayName?.trim()) errors.displayName = '给自己取一个昵称吧'
  else if (displayName.trim().length < 2) errors.displayName = '昵称至少需要 2 个字符'
  else if (displayName.trim().length > 40) errors.displayName = '昵称不能超过 40 个字符'

  if (!email?.trim()) errors.email = '请输入邮箱'
  else if (!isEmail(email)) errors.email = '邮箱格式看起来不太对'

  const checks = passwordChecks(password || '')
  if (!password) errors.password = '请设置密码'
  else if (!checks.length) errors.password = '密码至少需要 8 个字符'
  else if (!checks.letter) errors.password = '密码需要包含字母'
  else if (!checks.number) errors.password = '密码需要包含数字'

  if (!confirmPassword) errors.confirmPassword = '请再输入一次密码'
  else if (confirmPassword !== password) errors.confirmPassword = '两次输入的密码不一致'

  return errors
}

export const validateLoginForm = ({ email, password }) => {
  const errors = {}
  if (!email?.trim()) errors.email = '请输入邮箱'
  else if (!isEmail(email)) errors.email = '邮箱格式看起来不太对'
  if (!password) errors.password = '请输入密码'
  return errors
}

export const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {}
  if (!currentPassword) errors.currentPassword = '请输入当前密码'
  if (!newPassword) errors.newPassword = '请设置新密码'
  else {
    const checks = passwordChecks(newPassword)
    if (!checks.length) errors.newPassword = '新密码至少需要 8 个字符'
    else if (!checks.letter) errors.newPassword = '新密码需要包含字母'
    else if (!checks.number) errors.newPassword = '新密码需要包含数字'
    else if (newPassword === currentPassword) errors.newPassword = '新密码不能与当前密码相同'
  }
  if (!confirmPassword) errors.confirmPassword = '请再输入一次新密码'
  else if (confirmPassword !== newPassword) errors.confirmPassword = '两次输入的新密码不一致'
  return errors
}

/**
 * Returns hard errors and soft warnings for the AI wizard. The server repeats
 * every hard check — this exists to give immediate, friendly feedback.
 */
export const validatePlanWindow = ({ startDate, endDate, studyWeekdays, dailyMinutes }) => {
  const errors = {}
  const warnings = {}
  const today = todayISO()

  if (!startDate) errors.startDate = '请选择开始日期'
  else if (startDate < today) errors.startDate = '开始日期不能早于今天'

  if (!endDate) errors.endDate = '请选择结束日期'
  else if (startDate && endDate < startDate) errors.endDate = '结束日期不能早于开始日期'
  else if (startDate && diffDays(startDate, endDate) + 1 > 366) {
    errors.endDate = '计划周期不能超过 366 天'
  }

  if (!studyWeekdays?.length) errors.studyWeekdays = '请至少选择一个可学习的星期'

  if (!dailyMinutes || dailyMinutes < 10) errors.dailyMinutes = '每日学习时间至少 10 分钟'
  else if (dailyMinutes > 480) errors.dailyMinutes = '每日学习时间不能超过 8 小时'

  if (startDate && endDate && endDate >= startDate && studyWeekdays?.length) {
    const studyDays = countStudyDays(startDate, endDate, studyWeekdays)
    if (studyDays === 0) errors.endDate = '所选范围内没有可学习的日期，请调整日期或学习日'
    else if (studyDays < 2) errors.endDate = '可学习日不足 2 天，建议延长周期'
    else if (studyDays * dailyMinutes < 60) {
      errors.dailyMinutes = '总可用时间不足 60 分钟，建议延长周期或增加每日时长'
    } else {
      if (studyDays < 4) warnings.studyDays = '可学习日较少，AI 会压缩内容，计划可能偏紧'
      if (dailyMinutes < 20) warnings.dailyMinutes = '每天少于 20 分钟，建议聚焦单一小目标'
      if (diffDays(startDate, endDate) + 1 > 120) {
        warnings.endDate = '周期较长，AI 会以阶段和每周任务为主，避免计划过重'
      }
    }
  }

  return { errors, warnings }
}

export const validateTaskForm = (task) => {
  const errors = {}
  if (!task.title?.trim()) errors.title = '请填写任务名称'
  else if (task.title.trim().length > 160) errors.title = '任务名称不能超过 160 个字符'
  if (!task.planId) errors.planId = '请选择所属学习计划'
  if (!task.taskDate) errors.taskDate = '请选择任务日期'
  if (!task.durationMinutes) errors.durationMinutes = '请填写预计时长'
  else if (task.durationMinutes < 5 || task.durationMinutes > 480) {
    errors.durationMinutes = '预计时长需要在 5 - 480 分钟之间'
  }
  if (task.actualMinutes !== null && task.actualMinutes !== undefined && task.actualMinutes !== '') {
    const actual = Number(task.actualMinutes)
    if (!Number.isFinite(actual) || actual < 0 || actual > 1440) {
      errors.actualMinutes = '实际用时需要在 0 - 1440 分钟之间'
    }
  }
  return errors
}
