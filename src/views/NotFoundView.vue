<script setup>
import { useRouter } from 'vue-router'
import { ArrowRight, House } from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import Mascot from '@/components/illustrations/Mascot.vue'
import AppButton from '@/components/ui/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <header class="not-found__header container">
      <BrandLogo :size="30" />
    </header>

    <main id="main-content" class="not-found__main">
      <div class="not-found__art">
        <span class="not-found__code">404</span>
        <Mascot :size="188" variant="thinking" />
      </div>
      <p class="eyebrow">走丢了一小步</p>
      <h1>这个页面不在这里</h1>
      <p class="not-found__text">
        可能是链接过期了，或者我们把它移到别处了。回到学习空间，继续今天的计划吧。
      </p>
      <div class="not-found__actions">
        <AppButton to="/app">
          <template #icon><House :size="15" /></template>
          回到学习空间
        </AppButton>
        <AppButton variant="secondary" @click="router.back()">
          返回上一页
          <template #trailing><ArrowRight :size="15" /></template>
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
}

.not-found__header {
  padding-top: 24px;
  padding-bottom: 24px;
}

.not-found__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 24px 80px;
  text-align: center;
}

.not-found__art {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
}

.not-found__code {
  position: absolute;
  top: -8px;
  right: -34px;
  font-family: var(--font-display);
  font-size: 84px;
  font-weight: 720;
  letter-spacing: -0.06em;
  color: rgba(130, 114, 239, 0.1);
  line-height: 1;
  pointer-events: none;
}

.not-found h1 {
  margin-top: 8px;
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 670;
  letter-spacing: -0.04em;
}

.not-found__text {
  max-width: 40ch;
  margin-top: 10px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.7;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 24px;
}
</style>
