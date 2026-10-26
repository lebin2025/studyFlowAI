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
  background: var(--bg);
  color: var(--ink);
}

.not-found__header {
  padding-top: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

.not-found__main {
  width: 100%;
  max-width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  grid-template-areas:
    'art eyebrow'
    'art title'
    'art text'
    'art actions';
  align-content: center;
  align-items: start;
  gap: 12px 6vw;
  flex: 1;
  padding: 48px clamp(20px, 4.2vw, 52px) 72px;
}

.not-found__art {
  grid-area: art;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  min-height: 360px;
  border-right: 1px solid var(--ink);
}

.not-found__code {
  color: transparent;
  font-family: var(--font-display);
  font-size: clamp(180px, 26vw, 360px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.7;
  letter-spacing: -0.1em;
  -webkit-text-stroke: 1px var(--ink);
}

.not-found__art :deep(svg) {
  width: 150px;
  margin-left: -36px;
  margin-top: 150px;
}

.not-found .eyebrow {
  grid-area: eyebrow;
  align-self: end;
  color: var(--accent);
}

.not-found h1 {
  grid-area: title;
  max-width: 12ch;
  font-size: clamp(40px, 5.6vw, 76px);
  line-height: 0.94;
  letter-spacing: -0.065em;
}

.not-found__text {
  grid-area: text;
  max-width: 40ch;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.75;
}

.not-found__actions {
  grid-area: actions;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

@media (max-width: 860px) {
  .not-found__main {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-top: 30px;
    overflow: hidden;
  }

  .not-found__art {
    width: 100%;
    min-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    padding-bottom: 20px;
  }

  .not-found__code {
    font-size: clamp(150px, 55vw, 260px);
  }

  .not-found__art :deep(svg) {
    width: 100px;
    margin-left: -18px;
    margin-top: 90px;
  }

  .not-found h1 {
    margin-top: 6px;
    font-size: clamp(38px, 12vw, 56px);
  }
}
</style>
<style scoped>
@media (max-width: 860px) {
  .not-found .eyebrow {
    align-self: flex-start;
  }
}
</style>
