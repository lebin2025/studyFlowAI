<script setup>
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppMobileNav from '@/components/layout/AppMobileNav.vue'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import { useAuthStore } from '@/stores/auth.js'
import { formatDate, todayISO } from '@/utils/date.js'

const auth = useAuthStore()
const dateLabel = computed(() => formatDate(todayISO(), { weekday: true }))
</script>

<template>
  <div class="shell">
    <AppSidebar />

    <div class="shell__body">
      <header class="mobile-bar">
        <BrandLogo :size="30" />
        <div class="mobile-bar__right">
          <span class="mobile-bar__date">{{ dateLabel }}</span>
          <RouterLink to="/app/settings" class="mobile-bar__avatar" aria-label="个人设置">
            {{ auth.initials }}
          </RouterLink>
        </div>
      </header>

      <main id="main-content" class="shell__content" tabindex="-1">
        <RouterView v-slot="{ Component, route: childRoute }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="childRoute.path" />
          </Transition>
        </RouterView>
      </main>

      <AppMobileNav />
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
}

.shell__body {
  min-height: 100vh;
  margin-left: var(--sidebar-width);
  padding: 34px clamp(24px, 3.6vw, 46px) 72px;
}

.shell__content {
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
  outline: none;
}

.mobile-bar {
  display: none;
}

@media (max-width: 900px) {
  .shell__body {
    margin-left: 0;
    padding: 0 16px calc(94px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-bar {
    position: sticky;
    top: 0;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 60px;
    margin: 0 -16px 18px;
    padding: 0 16px;
    background: rgba(251, 248, 243, 0.92);
    border-bottom: 1px solid rgba(236, 229, 218, 0.75);
    backdrop-filter: blur(12px);
  }

  .mobile-bar__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mobile-bar__date {
    color: var(--ink-muted);
    font-size: 11.5px;
  }

  .mobile-bar__avatar {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--lav-100);
    color: var(--lav-700);
    font-size: 12px;
    font-weight: 680;
  }
}

@media (max-width: 1100px) and (min-width: 901px) {
  .shell__body {
    padding-inline: 28px;
  }
}
</style>
