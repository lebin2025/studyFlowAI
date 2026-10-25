<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChartNoAxesColumnIncreasing,
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
  { name: 'dashboard', label: '仪表盘', caption: '今天学什么', icon: LayoutDashboard, to: '/app' },
  { name: 'plans', label: '学习计划', caption: '目标与阶段', icon: NotebookPen, to: '/app/plans' },
  { name: 'tasks', label: '学习任务', caption: '每天的小步', icon: ListChecks, to: '/app/tasks' },
  { name: 'stats', label: '学习统计', caption: '真实的进度', icon: ChartNoAxesColumnIncreasing, to: '/app/stats' },
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
      <p class="sidebar__label">学习空间</p>
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'is-active': isActive(item) }"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <span class="nav-item__icon">
          <component :is="item.icon" :size="18" :stroke-width="1.8" />
        </span>
        <span class="nav-item__text">
          <span class="nav-item__title">{{ item.label }}</span>
          <span class="nav-item__caption">{{ item.caption }}</span>
        </span>
        <span v-if="isActive(item)" class="nav-item__dot" aria-hidden="true" />
      </RouterLink>
    </nav>

    <div class="sidebar__bottom">
      <div class="ai-card">
        <div class="ai-card__icon">
          <Sparkles :size="17" />
        </div>
        <p class="ai-card__title">把计划交给 AI</p>
        <p class="ai-card__text">说说你的目标和时间，剩下的交给 StudyFlow。</p>
        <RouterLink to="/app/plans/new" class="ai-card__link">
          生成新计划
          <span aria-hidden="true">→</span>
        </RouterLink>
      </div>

      <div class="user-card">
        <RouterLink to="/app/settings" class="user-card__profile">
          <span class="avatar" aria-hidden="true">{{ auth.initials }}</span>
          <span class="user-card__text">
            <span class="user-card__name">{{ greeting }}</span>
            <span class="user-card__caption">查看个人设置</span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="user-card__action"
          :aria-label="loggingOut ? '正在退出' : '退出登录'"
          :disabled="loggingOut"
          @click="logout"
        >
          <LogOut :size="16" />
        </button>
      </div>

      <RouterLink to="/app/settings" class="sidebar__settings">
        <Settings :size="15" />
        设置与偏好
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
  background: rgba(253, 250, 245, 0.9);
  border-right: 1px solid var(--line);
}

.sidebar__top {
  padding: 0 8px 26px;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar__label {
  padding: 0 12px 8px;
  color: var(--ink-faint);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--ink-soft);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.75);
  color: var(--ink);
}

.nav-item.is-active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-xs);
}

.nav-item__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--surface-muted);
  color: var(--ink-muted);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.nav-item.is-active .nav-item__icon {
  background: var(--lav-100);
  color: var(--lav-700);
}

.nav-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.nav-item__title {
  font-size: 13.5px;
  font-weight: 590;
}

.nav-item__caption {
  font-size: 10.5px;
  color: var(--ink-faint);
}

.nav-item__dot {
  position: absolute;
  right: 12px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--lav-500);
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.ai-card {
  position: relative;
  padding: 15px;
  border-radius: var(--radius-lg);
  background: linear-gradient(155deg, var(--lav-50), #fbf9ff 55%, var(--mint-50));
  border: 1px solid rgba(130, 114, 239, 0.13);
  overflow: hidden;
}

.ai-card::after {
  content: '';
  position: absolute;
  top: -26px;
  right: -22px;
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: rgba(130, 114, 239, 0.12);
}

.ai-card__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin-bottom: 9px;
  border-radius: 9px;
  background: var(--surface);
  color: var(--lav-700);
  box-shadow: var(--shadow-xs);
}

.ai-card__title {
  font-size: 13px;
  font-weight: 640;
}

.ai-card__text {
  margin-top: 3px;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.ai-card__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--lav-700);
  font-size: 11.5px;
  font-weight: 620;
}

.ai-card__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius-md);
  transition: background-color var(--duration-fast) var(--ease);
}

.user-card:hover {
  background: rgba(255, 255, 255, 0.8);
}

.user-card__profile {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 1;
  min-width: 0;
}

.avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--lav-100);
  color: var(--lav-700);
  font-size: 13px;
  font-weight: 680;
}

.user-card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.user-card__name {
  font-size: 12.5px;
  font-weight: 620;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__caption {
  font-size: 10.5px;
  color: var(--ink-faint);
}

.user-card__action {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  color: var(--ink-faint);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.user-card__action:hover {
  background: var(--danger-100);
  color: var(--danger-700);
}

.sidebar__settings {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 10px;
  color: var(--ink-faint);
  font-size: 11.5px;
  transition: color var(--duration-fast) var(--ease);
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
