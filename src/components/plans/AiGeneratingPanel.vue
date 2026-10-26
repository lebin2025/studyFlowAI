<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Clock3, Sparkles, X } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps({
  model: { type: String, default: 'deepseek-flash' },
})

const emit = defineEmits(['cancel'])
const elapsed = ref(0)
let timer = null

const elapsedLabel = computed(() => {
  const minutes = Math.floor(elapsed.value / 60)
  const seconds = elapsed.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const hints = [
  '理解你的目标、基础和时间约束',
  '拆解阶段、每日任务与复习安排',
  '校验日期、每日时长和计划规模',
]

onMounted(() => {
  timer = window.setInterval(() => (elapsed.value += 1), 1000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="generating" role="status" aria-live="polite">
    <div class="generating__art">
      <span class="generating__spinner" aria-hidden="true" />
      <Sparkles :size="22" aria-hidden="true" />
    </div>

    <span class="generating__badge">
      <Sparkles :size="12" />
      {{ model }}
    </span>
    <h2 class="generating__title">AI 正在为你规划</h2>
    <p class="generating__text">
      它在读你的目标、基础和真实时间，再把它们拆成每天能完成的任务。
      长计划可能需要更久一点。
    </p>

    <ul class="generating__hints">
      <li v-for="(hint, index) in hints" :key="hint" :style="{ animationDelay: `${index * 260}ms` }">
        <span class="generating__dot" />
        {{ hint }}
      </li>
    </ul>

    <div class="generating__meta">
      <span><Clock3 :size="13" /> 已等待 {{ elapsedLabel }}</span>
      <span>不显示虚假的进度百分比</span>
    </div>

    <AppButton variant="ghost" size="sm" @click="emit('cancel')">
      <template #icon><X :size="14" /></template>
      取消本次生成
    </AppButton>

    <p class="generating__note">
      取消不会恢复已消耗的 token 费用；如果生成成功但网络中断，使用同样的请求标识重试不会重复计费。
    </p>
  </div>
</template>

<style scoped>
.generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 12px 14px;
  text-align: center;
}

.generating__art {
  position: relative;
  display: grid;
  place-items: center;
  width: 176px;
  height: 176px;
  margin-bottom: 4px;
}

.generating__pulse {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(130, 114, 239, 0.18);
  animation: generating-pulse 3.4s var(--ease-in-out) infinite;
}

.generating__pulse--one {
  width: 168px;
  height: 168px;
}

.generating__pulse--two {
  width: 128px;
  height: 128px;
  background: rgba(130, 114, 239, 0.06);
  animation-delay: 1.1s;
}

@keyframes generating-pulse {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.03);
    opacity: 1;
  }
}

.generating__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: var(--lav-50);
  color: var(--lav-700);
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.generating__title {
  margin-top: 12px;
  font-size: 22px;
  font-weight: 660;
  letter-spacing: -0.03em;
}

.generating__text {
  max-width: 40ch;
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.7;
}

.generating__hints {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: min(100%, 330px);
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  text-align: left;
}

.generating__hints li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-muted);
  font-size: 11.5px;
  animation: hint-glow 2.6s var(--ease-in-out) infinite;
}

@keyframes hint-glow {
  0%,
  100% {
    opacity: 0.55;
  }
  40% {
    opacity: 1;
  }
}

.generating__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--lav-500);
}

.generating__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin-top: 16px;
  color: var(--ink-faint);
  font-size: 10px;
}

.generating__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.generating .btn {
  margin-top: 12px;
}

.generating__note {
  max-width: 42ch;
  margin-top: 6px;
  color: var(--ink-faint);
  font-size: 9.5px;
  line-height: 1.6;
}

@media (prefers-reduced-motion: reduce) {
  .generating__pulse,
  .generating__hints li {
    animation: none;
  }
}
</style>

<style scoped>
.generating__badge {
  padding: 3px 7px;
  border: 1px solid var(--accent);
  border-radius: 0;
  background: transparent;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8px;
}

.generating__pulse {
  display: none;
}

.generating__hints {
  padding: 12px 0;
  border: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
}

.generating__meta {
  font-family: var(--font-mono);
  font-size: 8px;
}

.generating__note {
  font-size: 8.5px;
}
</style>

<style scoped>
.generating__art {
  position: relative;
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  margin: 6px auto 20px;
  color: var(--accent);
}

.generating__spinner {
  position: absolute;
  inset: 0;
  border: 2px solid var(--line);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
}

.generating__badge {
  border: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.generating__hints {
  border: 0;
  border-radius: 12px;
  background: var(--surface-soft);
}

.generating__title {
  font-size: 22px;
}

.generating__text {
  color: var(--ink-muted);
}
</style>
