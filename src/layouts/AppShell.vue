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
  position: relative;
  min-height: 100vh;
  margin-left: var(--sidebar-width);
  padding: 30px clamp(24px, 4vw, 56px) 70px;
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
    padding: 0 18px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-bar {
    position: sticky;
    top: 0;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 58px;
    margin: 0 -18px 22px;
    padding: 0 18px;
    color: var(--ink);
    background: var(--bg);
    border-bottom: 1px solid var(--ink);
  }

  .mobile-bar__right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mobile-bar__date {
    color: var(--ink-faint);
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.04em;
  }

  .mobile-bar__avatar {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--ink);
    border-radius: 50%;
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 600;
  }
}
</style>