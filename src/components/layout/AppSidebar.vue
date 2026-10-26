<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChartNoAxesColumnIncreasing,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  NotebookPen,
  Settings,
  Sparkles,
} from 'lucide-vue-next'
import BrandLogo from './BrandLogo.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const loggingOut = ref(false)

const items = [
  { name: 'dashboard', label: '仪表盘', icon: LayoutDashboard, to: '/app' },
  { name: 'plans', label: '学习计划', icon: NotebookPen, to: '/app/plans' },
  { name: 'drafts', label: '草稿箱', icon: FileText, to: '/app/drafts' },
  { name: 'tasks', label: '学习任务', icon: ListChecks, to: '/app/tasks' },
  { name: 'stats', label: '学习统计', icon: ChartNoAxesColumnIncreasing, to: '/app/stats' },
]

const isActive = (item) => {
  if (item.name === 'dashboard') return route.name === 'dashboard'
  return route.path.startsWith(item.to)
}

const greeting = computed(() => (auth.displayName || '同学').slice(0, 8))

const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await auth.logout()
    ui.success('已安全退出登录', '下次见')
    router.push({ name: 'login' })
  } catch {
    ui.error('退出登录失败，请稍后重试')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__top">
      <BrandLogo :size="34" />
    </div>

    <nav class="sidebar__nav" aria-label="主导航">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'is-active': isActive(item) }"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="17" :stroke-width="1.8" />
        <span class="nav-item__title">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__bottom">
      <RouterLink to="/app/plans/new" class="ai-shortcut">
        <span class="ai-shortcut__icon"><Sparkles :size="14" /></span>
        <span>AI 计划</span>
        <span class="ai-shortcut__arrow" aria-hidden="true">→</span>
      </RouterLink>

      <div class="user-card">
        <RouterLink to="/app/settings" class="user-card__profile">
          <span class="avatar" aria-hidden="true">{{ auth.initials }}</span>
          <span class="user-card__name">{{ greeting }}</span>
        </RouterLink>
        <button
          type="button"
          class="user-card__action"
          :aria-label="loggingOut ? '正在退出' : '退出登录'"
          :disabled="loggingOut"
          @click="logout"
        >
          <LogOut :size="15" />
        </button>
      </div>

      <RouterLink to="/app/settings" class="sidebar__settings">
        <Settings :size="14" />
        设置
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 22px 16px 18px;
  background: var(--bg);
}

.sidebar__top {
  padding: 0 6px 24px;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 520;
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.nav-item:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.nav-item.is-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-xs);
  font-weight: 600;
}

.nav-item.is-active :deep(svg) {
  color: var(--accent);
}

.nav-item__title {
  white-space: nowrap;
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.ai-shortcut {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--accent-deep);
  font-size: 12px;
  font-weight: 600;
  transition: background-color var(--duration-fast) var(--ease);
}

.ai-shortcut:hover {
  background: var(--accent-soft);
}

.ai-shortcut__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent);
}

.ai-shortcut__arrow {
  margin-left: auto;
  color: var(--ink-faint);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: 12px;
  background: var(--surface-soft);
}

.user-card__profile {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink);
  font-size: 10px;
  font-weight: 650;
  box-shadow: var(--shadow-xs);
}

.user-card__name {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__action {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--ink-faint);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.user-card__action:hover {
  background: var(--surface);
  color: var(--ink);
}

.sidebar__settings {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  color: var(--ink-faint);
  font-size: 11.5px;
}

.sidebar__settings:hover {
  color: var(--ink);
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
}
</style>
<style scoped>
.nav-item {
  position: relative;
  overflow: hidden;
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    transform 160ms var(--ease-spring);
}

.nav-item::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 18% 20%, rgba(208, 69, 45, 0.08), transparent 60%);
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
  pointer-events: none;
}

.nav-item:hover::before,
.nav-item.is-active::before {
  opacity: 1;
}

.nav-item > * {
  position: relative;
  z-index: 1;
}

.nav-item:active {
  transform: scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-item::before {
    transition: none;
  }

  .nav-item:active {
    transform: none;
  }
}
</style>
