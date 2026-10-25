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
  padding: 7px 8px calc(7px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 253, 249, 0.96);
  border-top: 1px solid var(--line);
  box-shadow: 0 -12px 30px -24px rgba(41, 37, 49, 0.4);
}

.mobile-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px;
  border-radius: 12px;
  color: var(--ink-faint);
  font-size: 10px;
  font-weight: 560;
  line-height: 1.3;
  transition: color var(--duration-fast) var(--ease);
}

.mobile-nav__item.is-active {
  color: var(--lav-700);
}

.mobile-nav__item.is-active svg {
  stroke-width: 2.2;
}

.mobile-nav__compose {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--ink-muted);
  font-size: 10px;
  font-weight: 560;
  line-height: 1.3;
}

.mobile-nav__compose-circle {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-top: -24px;
  border-radius: 50%;
  background: var(--lav-600);
  color: #fff;
  border: 4px solid var(--bg);
  box-shadow: var(--shadow-accent);
  transition:
    transform var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease);
}

.mobile-nav__compose:active .mobile-nav__compose-circle {
  transform: scale(0.94);
  background: var(--lav-700);
}

.mobile-nav__compose.is-active {
  color: var(--lav-700);
}

@media (max-width: 900px) {
  .mobile-nav {
    display: grid;
  }
}
</style>
