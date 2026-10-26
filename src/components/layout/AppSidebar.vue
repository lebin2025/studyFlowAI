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
  { name: 'dashboard', label: '仪表盘', caption: '今天学什么', to: '/app' },
  { name: 'plans', label: '学习计划', caption: '目标与阶段', to: '/app/plans' },
  { name: 'tasks', label: '学习任务', caption: '每天的小步', to: '/app/tasks' },
  { name: 'stats', label: '学习统计', caption: '真实的进度', to: '/app/stats' },
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
      <p class="sidebar__label">INDEX / 学习空间</p>
      <RouterLink
        v-for="(item, index) in items"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ 'is-active': isActive(item) }"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <span class="nav-item__index">0{{ index + 1 }}</span>
        <span class="nav-item__text">
          <span class="nav-item__title">{{ item.label }}</span>
          <span class="nav-item__caption">{{ item.caption }}</span>
        </span>
        <span v-if="isActive(item)" class="nav-item__dot" aria-hidden="true" />
      </RouterLink>
    </nav>

    <div class="sidebar__bottom">
      <div class="ai-card">
        <p class="ai-card__title">把目标交给 AI</p>
        <p class="ai-card__text">说出你想学什么、有多少时间。剩下的，交给 StudyFlow。</p>
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
  padding: 24px 20px 18px;
  background: var(--bg);
  border-right: 1px solid var(--ink);
}

.sidebar__top {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--line);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  padding-top: 18px;
}

.sidebar__label {
  padding-bottom: 8px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.nav-item {
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 11px 8px 11px 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink-muted);
  transition:
    color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease);
}

.nav-item:hover {
  color: var(--ink);
  background: var(--surface);
}

.nav-item.is-active {
  color: var(--ink);
}

.nav-item.is-active::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: -20px;
  width: 3px;
  background: var(--accent);
}

.nav-item__index {
  padding-top: 1px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.02em;
}

.nav-item.is-active .nav-item__index {
  color: var(--accent);
}

.nav-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.nav-item__title {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 560;
}

.nav-item__caption {
  margin-top: 1px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.02em;
}

.nav-item__dot {
  display: none;
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: auto;
}

.ai-card {
  padding: 14px 0 0;
  border-top: 1px solid var(--ink);
}

.ai-card__title {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 17px;
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.ai-card__text {
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 10px;
  line-height: 1.6;
}

.ai-card__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--accent);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 13px;
  border-top: 1px solid var(--line);
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
  width: 30px;
  height: 30px;
  border: 1px solid var(--ink);
  border-radius: 50%;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
}

.user-card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.user-card__name {
  overflow: hidden;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__caption {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.user-card__action {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  color: var(--ink-faint);
  transition:
    color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.user-card__action:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.sidebar__settings {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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