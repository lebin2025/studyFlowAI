<script setup>
import { useRouter } from 'vue-router'
import { ArrowRight, House } from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <header class="not-found__header container">
      <BrandLogo :size="28" />
    </header>

    <main id="main-content" class="not-found__main container">
      <span class="not-found__code">404</span>
      <h1>页面不存在</h1>
      <p class="not-found__text">链接可能已失效。</p>
      <div class="not-found__actions">
        <AppButton to="/app">
          <template #icon><House :size="15" /></template>
          回到学习空间
        </AppButton>
        <AppButton variant="secondary" @click="router.back()">
          返回
          <template #trailing><ArrowRight :size="14" /></template>
        </AppButton>
      </div>
    </main>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
}

.not-found__header {
  padding-top: 24px;
  padding-bottom: 24px;
}

.not-found__main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  padding-top: 40px;
  padding-bottom: 120px;
}

.not-found__code {
  color: var(--accent);
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.not-found h1 {
  margin-top: 10px;
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 660;
  line-height: 1.08;
  letter-spacing: -0.05em;
}

.not-found__text {
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 14px;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

@media (max-width: 560px) {
  .not-found__main {
    padding-bottom: 80px;
  }

  .not-found h1 {
    font-size: 34px;
  }
}
</style>
