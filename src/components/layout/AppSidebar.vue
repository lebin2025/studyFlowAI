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
  padding: 24px 16px 18px;
  color: var(--on-dark);
  background:
    radial-gradient(120% 55% at 18% 0%, rgba(133, 114, 239, 0.2), transparent 62%),
    radial-gradient(90% 40% at 100% 100%, rgba(114, 201, 173, 0.1), transparent 64%),
    linear-gradient(180deg, #0b0a11 0%, #0a0910 58%, #08080d 100%);
  border-right: 1px solid var(--line-dark);
  overflow: hidden;
}

.sidebar::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--grain);
  opacity: 0.03;
}

.sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 18px;
  left: 18px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(215, 201, 255, 0.5), transparent);
}

.sidebar > * {
  position: relative;
  z-index: 1;
}

.sidebar__top {
  padding: 0 8px 30px;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sidebar__label {
  padding: 0 12px 10px;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  border: 1px solid transparent;
  border-radius: 15px;
  color: var(--on-dark-soft);
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--on-dark);
  transform: translateX(2px);
}

.nav-item.is-active {
  color: var(--on-dark);
  background:
    linear-gradient(105deg, rgba(215, 201, 255, 0.16), rgba(255, 255, 255, 0.045)),
    rgba(255, 255, 255, 0.04);
  border-color: rgba(215, 201, 255, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 40px -30px rgba(0, 0, 0, 0.9);
}

.nav-item.is-active::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: -1px;
  width: 2px;
  border-radius: 99px;
  background: linear-gradient(180deg, var(--lumen), var(--aurora));
}

.nav-item__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--on-dark-soft);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.nav-item.is-active .nav-item__icon {
  background: rgba(215, 201, 255, 0.16);
  border-color: rgba(215, 201, 255, 0.24);
  color: var(--lumen);
  box-shadow: inset 0 0 18px rgba(215, 201, 255, 0.12);
}

.nav-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.nav-item__title {
  font-size: 13px;
  font-weight: 570;
}

.nav-item__caption {
  font-size: 10px;
  color: var(--on-dark-faint);
}

.nav-item__dot {
  position: absolute;
  right: 13px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--aurora);
  box-shadow: 0 0 12px rgba(157, 232, 203, 0.9);
}

.sidebar__bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.ai-card {
  position: relative;
  padding: 17px;
  border: 1px solid rgba(215, 201, 255, 0.16);
  border-radius: 20px;
  background:
    radial-gradient(120% 100% at 100% 0%, rgba(215, 201, 255, 0.18), transparent 55%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 24px 50px -36px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.ai-card::after {
  content: '';
  position: absolute;
  top: -42px;
  right: -34px;
  width: 110px;
  height: 110px;
  border: 1px solid rgba(215, 201, 255, 0.18);
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(133, 114, 239, 0.12) inset;
}

.ai-card__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-bottom: 11px;
  border: 1px solid rgba(215, 201, 255, 0.2);
  border-radius: 10px;
  background: rgba(215, 201, 255, 0.1);
  color: var(--lumen);
}

.ai-card__title {
  font-size: 13px;
  font-weight: 630;
  color: var(--on-dark);
}

.ai-card__text {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--on-dark-soft);
}

.ai-card__link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  color: var(--lumen);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ai-card__link:hover {
  color: #fff;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 14px;
  transition: background-color var(--duration-fast) var(--ease);
}

.user-card:hover {
  background: rgba(255, 255, 255, 0.05);
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
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.75), transparent 42%),
    linear-gradient(135deg, var(--lav-500), var(--mint-500));
  color: #171321;
  font-size: 12px;
  font-weight: 760;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.user-card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.user-card__name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--on-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__caption {
  font-size: 10px;
  color: var(--on-dark-faint);
}

.user-card__action {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: var(--on-dark-faint);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.user-card__action:hover {
  background: rgba(194, 86, 92, 0.18);
  color: #ffb7b9;
}

.sidebar__settings {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 10px;
  color: var(--on-dark-faint);
  font-size: 11px;
  transition: color var(--duration-fast) var(--ease);
}

.sidebar__settings:hover {
  color: var(--on-dark);
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
}
</style>