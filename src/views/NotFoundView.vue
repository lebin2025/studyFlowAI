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
        <AppButton to="/app" variant="inverse">
          <template #icon><House :size="15" /></template>
          回到学习空间
        </AppButton>
        <AppButton variant="glass" @click="router.back()">
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

<style scoped>
.not-found {
  min-height: 100vh;
  color: var(--on-dark);
  background:
    radial-gradient(70rem 50rem at 70% 18%, rgba(101, 82, 210, 0.22), transparent 60%),
    radial-gradient(40rem 30rem at 20% 90%, rgba(55, 140, 115, 0.12), transparent 58%),
    var(--void);
  overflow: hidden;
}

.not-found__header {
  padding-top: 26px;
}

.not-found__main {
  position: relative;
  isolation: isolate;
}

.not-found__main::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: min(72vw, 720px);
  height: min(72vw, 720px);
  border: 1px solid rgba(215, 201, 255, 0.12);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow:
    0 0 0 80px rgba(215, 201, 255, 0.025),
    0 0 0 160px rgba(215, 201, 255, 0.016);
}

.not-found__code {
  top: -38px;
  right: -80px;
  color: transparent;
  font-family: var(--font-editorial);
  font-size: clamp(150px, 22vw, 300px);
  font-style: italic;
  font-weight: 400;
  line-height: 1;
  -webkit-text-stroke: 1px rgba(215, 201, 255, 0.16);
}

.not-found h1 {
  max-width: 14ch;
  color: var(--on-dark);
  font-size: clamp(38px, 5.6vw, 72px);
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.not-found .eyebrow {
  color: var(--lumen);
}

.not-found__text {
  max-width: 38ch;
  color: var(--on-dark-soft);
  font-size: 13.5px;
}

.not-found__art :deep(svg) {
  filter: drop-shadow(0 26px 40px rgba(0, 0, 0, 0.5));
}
</style>
