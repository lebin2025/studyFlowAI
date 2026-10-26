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
  padding: 38px clamp(24px, 3.6vw, 52px) 88px;
}

.shell__body::before {
  content: '';
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-width);
  z-index: 30;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(133, 114, 239, 0.3), rgba(114, 201, 173, 0.22), transparent);
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
    padding: 0 16px calc(102px + env(safe-area-inset-bottom, 0px));
  }

  .shell__body::before {
    left: 0;
  }

  .mobile-bar {
    position: sticky;
    top: 0;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 62px;
    margin: 0 -16px 20px;
    padding: 0 16px;
    color: var(--on-dark);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), transparent),
      rgba(8, 7, 13, 0.9);
    border-bottom: 1px solid var(--line-dark);
    backdrop-filter: blur(22px) saturate(150%);
    -webkit-backdrop-filter: blur(22px) saturate(150%);
  }

  .mobile-bar__right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mobile-bar__date {
    color: var(--on-dark-faint);
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.04em;
  }

  .mobile-bar__avatar {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.8), transparent 42%),
      linear-gradient(135deg, var(--lav-500), var(--mint-500));
    color: #171321;
    font-size: 11px;
    font-weight: 760;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
}

@media (max-width: 1100px) and (min-width: 901px) {
  .shell__body {
    padding-inline: 30px;
  }
}
</style>