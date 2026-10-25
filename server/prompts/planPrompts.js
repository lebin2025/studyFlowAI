import { formatWeekdays } from '../utils/dates.js'
import { cleanText } from '../utils/text.js'

export const AI_SYSTEM_PROMPT = `你是 StudyFlow AI 的首席学习规划师。你擅长把模糊的学习目标拆解为具体、可执行、有复习节奏的每日任务，并且尊重学习者真实的时间约束。
你的回复必须是一个合法的 JSON 对象，只输出 JSON，不输出 Markdown、代码围栏或任何解释性文字。`

const levelLabels = {
  beginner: '零基础 / 初学者',
  intermediate: '有一定基础，想要系统提升',
  advanced: '基础扎实，目标为进阶或应试冲刺',
}

const jsonShape = `{
  "title": "计划名称（不超过 40 字）",
  "goal": "对学习目标的清晰复述（1-2 句）",
  "overview": "整体学习策略与阶段安排思路（2-4 句）",
  "stages": [
    {
      "title": "阶段名称",
      "objective": "这个阶段要达成的可检验目标",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD"
    }
  ],
  "tasks": [
    {
      "title": "具体动作，例如：精读《XXX》第 1 章并整理 3 条要点",
      "description": "怎么做、用什么材料、注意什么（1-2 句）",
      "date": "YYYY-MM-DD",
      "durationMinutes": 45,
      "priority": "high | medium | low",
      "completionCriteria": "可检验的完成标准，例如：能不看笔记复述 3 条要点",
      "isReview": false,
      "stageIndex": 0
    }
  ],
  "risks": [
    { "title": "风险标题", "detail": "可能发生的情况与应对方式" }
  ],
  "advice": "给学习者的 1-3 条调整建议"
}`

export const buildGeneratePrompt = (input, context) => {
  const weekdays = formatWeekdays(input.studyWeekdays)
  return `请为下面的学习者生成一份完整、可执行的学习计划。

【学习者输入】
- 今天日期：${context.today}
- 学习目标：${input.goal}
- 科目 / 领域：${input.subject}
- 当前水平：${levelLabels[input.level]}
- 计划周期：${input.startDate} 至 ${input.endDate}（共 ${context.planDays} 天）
- 可学习日：每周 ${weekdays}（共 ${context.studyDays} 个可学习日）
- 每日可用学习时间：${input.dailyMinutes} 分钟
- 学习偏好：${input.preferences || '没有特别说明'}
- 补充要求：${input.notes || '没有特别说明'}

【规划要求】
1. 把整个周期划分为 2-5 个连续阶段，阶段日期必须落在计划周期内且前后衔接；每个阶段写清可检验的阶段目标。
2. 所有任务只能安排在可学习日（${weekdays}），日期格式 YYYY-MM-DD，且必须落在计划周期内。
3. 每个可学习日安排 1-2 个任务，当天任务总时长不得超过 ${input.dailyMinutes} 分钟；任务时长要现实（单个任务 10-120 分钟）。如果可学习日超过 50 天，可以把相邻的 2 个学习日合并为一个阶段性任务，但总任务数不得超过 160 个。
4. 任务必须具体到「读什么、练什么、做多少」，避免「学习英语」「复习数学」这类空泛描述。完成标准必须可检验。
5. 安排复习：在每个阶段结束后的 1-2 个学习日内安排回顾或自测任务，设置 "isReview": true；也可以使用间隔复习。复习任务同样计入每日时长。
6. 优先级要合理：核心难点、阶段收尾和模拟测试用 high；日常输入用 medium；轻量整理用 low。
7. 识别 2-4 个真实风险（时间不足、难度跳跃、遗忘、材料不合适等），并给出可执行的应对方式，不要空话。
8. 不要编造学习者的经历、考试成绩或材料名称；需要材料时用通用描述。
9. 严格遵守时间约束。如果时间明显偏紧，通过减少任务数量、聚焦高优先级内容来适配，而不是超出每日可用时间。

【输出 JSON 结构】
${jsonShape}

只输出一个符合上述结构的 JSON 对象。tasks 中每一项的 stageIndex 必须对应 stages 数组的下标。`
}

export const buildAdjustPrompt = (input, plan, context) => {
  const planSnapshot = {
    title: plan.title,
    goal: plan.goal,
    subject: plan.subject,
    level: plan.level,
    startDate: plan.startDate,
    endDate: plan.endDate,
    dailyMinutes: plan.dailyMinutes,
    studyWeekdays: plan.studyWeekdays,
    overview: plan.overview,
    stages: plan.stages.map((stage, index) => ({
      index,
      title: stage.title,
      objective: stage.objective,
      startDate: stage.startDate,
      endDate: stage.endDate,
    })),
    tasks: plan.tasks.map((task) => ({
      title: task.title,
      date: task.taskDate,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
      isReview: task.isReview,
      isCompleted: task.isCompleted,
      source: task.source,
      stageId: task.stageId,
    })),
    risks: plan.risks,
    advice: plan.advice,
  }

  return `请根据学习者的自然语言要求，调整下面这份已有的学习计划。

【今天日期】
${context.today}

【当前计划 JSON】
${JSON.stringify(planSnapshot)}

【用户调整要求】
${input.instruction}

【调整规则】
1. 输出一份完整的新计划（不是补丁），结构与当前计划一致，包含 title、goal、overview、stages、tasks、risks、advice。
2. 已完成任务（isCompleted 为 true）代表学习者已经投入的时间，不要要求重做；新计划中不要再安排相同内容。请把后续任务建立在已完成内容之上。
3. 可以调整结束日期 endDate、每日可用时长 dailyMinutes、可学习日 studyWeekdays，但必须在下面给出的范围内；开始日期 startDate 保持不变。若无需调整这些字段，可以省略。
4. 任务只能安排在可学习日，日期必须在 ${plan.startDate} 至新的结束日期之间；当天总时长不得超过新的 dailyMinutes。
5. 如果用户要求「任务更细」「增加复习」「降低难度」「缩短周期」等，要真实体现在任务粒度、复习标记（isReview）和阶段目标上，而不是只改描述。
6. 保持计划总量现实：总任务数不超过 160 个；无法在时间内完成时，明确减少范围并在 advice 中说明取舍。
7. 阶段日期继续覆盖整个新周期，阶段目标可检验。
8. 另外输出 "changeSummary"：用 1-3 句话说明你改了什么、为什么这样改。

【输出 JSON 结构】
${jsonShape}
在相同结构基础上额外包含：
"changeSummary": "本次调整说明",
"endDate": "YYYY-MM-DD（可选，仅当需要修改时）",
"dailyMinutes": 60,
"studyWeekdays": [1, 3, 5]

只输出一个 JSON 对象。`
}

export const normalizeInstruction = (value) => cleanText(value, 600, { multiline: true })
