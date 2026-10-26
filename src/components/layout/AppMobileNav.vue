<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChartNoAxesColumnIncreasing,
  House,
  ListChecks,
  NotebookPen,
  Plus,
} from 'lucide-vue-next'

const route = useRoute()

const items = [
  { name: 'dashboard', label: '首页', icon: House, to: '/app' },
  { name: 'plans', label: '计划', icon: NotebookPen, to: '/app/plans' },
  { name: 'tasks', label: '任务', icon: ListChecks, to: '/app/tasks' },
  { name: 'stats', label: '统计', icon: ChartNoAxesColumnIncreasing, to: '/app/stats' },
]

const isActive = (item) => {
  if (item.name === 'dashboard') return route.name === 'dashboard'
  return route.path.startsWith(item.to)
}

const isComposing = computed(() => route.name === 'plan-new')
</script>

<template>
  <nav class="mobile-nav" aria-label="移动端主导航">
    <RouterLink
      :to="items[0].to"
      class="mobile-nav__item"
      :class="{ 'is-active': isActive(items[0]) }"
      :aria-current="isActive(items[0]) ? 'page' : undefined"
    >
      <component :is="items[0].icon" :size="20" :stroke-width="1.8" />
      <span>{{ items[0].label }}</span>
    </RouterLink>
    <RouterLink
      :to="items[1].to"
      class="mobile-nav__item"
      :class="{ 'is-active': isActive(items[1]) }"
      :aria-current="isActive(items[1]) ? 'page' : undefined"
    >
      <component :is="items[1].icon" :size="20" :stroke-width="1.8" />
      <span>{{ items[1].label }}</span>
    </RouterLink>

    <RouterLink
      to="/app/plans/new"
      class="mobile-nav__compose"
      :class="{ 'is-active': isComposing }"
      aria-label="用 AI 生成新的学习计划"
    >
      <span class="mobile-nav__compose-circle">
        <Plus :size="22" :stroke-width="2.2" />
      </span>
      <span>新建</span>
    </RouterLink>

    <RouterLink
      :to="items[2].to"
      class="mobile-nav__item"
      :class="{ 'is-active': isActive(items[2]) }"
      :aria-current="isActive(items[2]) ? 'page' : undefined"
    >
      <component :is="items[2].icon" :size="20" :stroke-width="1.8" />
      <span>{{ items[2].label }}</span>
    </RouterLink>
    <RouterLink
      :to="items[3].to"
      class="mobile-nav__item"
      :class="{ 'is-active': isActive(items[3]) }"
      :aria-current="isActive(items[3]) ? 'page' : undefined"
    >
      <component :is="items[3].icon" :size="20" :stroke-width="1.8" />
      <span>{{ items[3].label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  display: none;
  grid-template-columns: repeat(5, 1fr);
  align-items: end;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 50%),
    rgba(8, 7, 13, 0.92);
  border-top: 1px solid var(--line-dark);
  box-shadow: 0 -18px 50px -30px rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
}

.mobile-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 2px;
  border-radius: 12px;
  color: var(--on-dark-faint);
  font-size: 9.5px;
  font-weight: 560;
  line-height: 1.3;
  transition:
    color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease);
}

.mobile-nav__item.is-active {
  color: var(--lumen);
  background: rgba(215, 201, 255, 0.08);
}

.mobile-nav__item.is-active svg {
  stroke-width: 2.2;
  filter: drop-shadow(0 0 8px rgba(215, 201, 255, 0.55));
}

.mobile-nav__compose {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--on-dark-soft);
  font-size: 9.5px;
  font-weight: 560;
  line-height: 1.3;
}

.mobile-nav__compose-circle {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  margin-top: -28px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.9), transparent 34%),
    var(--spectral);
  color: #14111c;
  box-shadow:
    0 18px 38px -16px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.75);
  transition:
    transform var(--duration-fast) var(--ease),
    filter var(--duration-fast) var(--ease);
}

.mobile-nav__compose:active .mobile-nav__compose-circle {
  transform: scale(0.93);
  filter: brightness(0.96);
}

.mobile-nav__compose.is-active {
  color: var(--lumen);
}

@media (max-width: 900px) {
  .mobile-nav {
    display: grid;
  }
}
</style>
<style scoped>
.mobile-nav {
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

.mobile-nav__item {
  padding: 5px 2px 4px;
}
</style>
