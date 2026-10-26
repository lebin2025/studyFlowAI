<script setup>
import { Sparkles } from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import Mascot from '@/components/illustrations/Mascot.vue'
import ProgressRing from '@/components/ui/ProgressRing.vue'

defineProps({
  eyebrow: { type: String, default: '欢迎回来' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="auth">
    <div class="auth__form-side">
      <header class="auth__header">
        <BrandLogo :size="32" />
        <RouterLink to="/" class="auth__home">返回首页</RouterLink>
      </header>

      <main id="main-content" class="auth__main">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1 class="auth__title">{{ title }}</h1>
        <p v-if="description" class="auth__description">{{ description }}</p>
        <div class="auth__slot">
          <slot />
        </div>
      </main>

      <footer class="auth__footer">
        <span>© 2026 StudyFlow AI</span>
        <span class="auth__footer-dot" aria-hidden="true">·</span>
        <span>你的学习数据只属于你</span>
      </footer>
    </div>

    <aside class="auth__art" aria-hidden="true">
      <div class="auth__art-glow auth__art-glow--one" />
      <div class="auth__art-glow auth__art-glow--two" />

      <div class="auth__art-content">
        <span class="auth__art-chip">
          <Sparkles :size="13" />
          AI 学习规划
        </span>
        <h2 class="auth__art-title">把大目标，<br />变成每天<br />的一小步。</h2>
        <p class="auth__art-text">
          AI 根据你的目标、基础和真实时间，拆出今天就能开始的任务。
          你只需要完成这一小步，剩下的交给节奏。
        </p>

        <div class="auth__art-visual">
          <Mascot :size="188" variant="happy" />
          <div class="auth__float-card auth__float-card--progress">
            <ProgressRing :value="68" :size="58" :stroke="6" label="今日" />
            <div>
              <strong>今日专注</strong>
              <span>2 / 3 个任务</span>
            </div>
          </div>
          <div class="auth__float-card auth__float-card--note">
            <span class="auth__note-dot" />
            <div>
              <strong>下一步</strong>
              <span>精听 Section 1</span>
            </div>
          </div>
        </div>

        <p class="auth__art-quote">“不追求今天做完所有事，只追求今天往前一点点。”</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  min-height: 100vh;
}

.auth__form-side {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 28px clamp(24px, 5vw, 64px) 24px;
}

.auth__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth__home {
  color: var(--ink-muted);
  font-size: 12.5px;
  transition: color var(--duration-fast) var(--ease);
}

.auth__home:hover {
  color: var(--lav-700);
}

.auth__main {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 48px 0 32px;
}

.auth__title {
  margin-top: 8px;
  font-size: clamp(29px, 3.2vw, 36px);
  font-weight: 670;
  letter-spacing: -0.04em;
}

.auth__description {
  margin-top: 10px;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;
}

.auth__slot {
  margin-top: 28px;
}

.auth__footer {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink-faint);
  font-size: 11px;
}

.auth__footer-dot {
  opacity: 0.6;
}

.auth__art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 14px 14px 14px 0;
  padding: 44px clamp(28px, 4vw, 60px);
  border-radius: 30px;
  background:
    radial-gradient(60% 60% at 80% 15%, rgba(255, 255, 255, 0.8), transparent 70%),
    linear-gradient(150deg, #f3efff 0%, #f8f3ff 44%, #eef9f4 100%);
  overflow: hidden;
}

.auth__art-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
}

.auth__art-glow--one {
  top: -80px;
  right: -60px;
  width: 280px;
  height: 280px;
  background: rgba(130, 114, 239, 0.13);
}

.auth__art-glow--two {
  bottom: -70px;
  left: -50px;
  width: 240px;
  height: 240px;
  background: rgba(111, 195, 168, 0.15);
}

.auth__art-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 460px;
}

.auth__art-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: 1px solid rgba(106, 88, 223, 0.15);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.7);
  color: var(--lav-700);
  font-size: 11.5px;
  font-weight: 600;
}

.auth__art-title {
  margin-top: 18px;
  font-size: clamp(30px, 3.6vw, 42px);
  font-weight: 680;
  line-height: 1.22;
  letter-spacing: -0.045em;
}

.auth__art-text {
  max-width: 40ch;
  margin-top: 14px;
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.8;
}

.auth__art-visual {
  position: relative;
  display: flex;
  justify-content: center;
  margin: 18px 0 8px;
}

.auth__float-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  font-size: 11px;
  line-height: 1.4;
}

.auth__float-card strong {
  display: block;
  font-size: 11.5px;
  font-weight: 640;
}

.auth__float-card span {
  color: var(--ink-muted);
}

.auth__float-card--progress {
  bottom: 12px;
  left: 0;
}

.auth__float-card--note {
  top: 44px;
  right: 0;
}

.auth__note-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mint-500);
  box-shadow: 0 0 0 4px var(--mint-100);
}

.auth__art-quote {
  margin-top: 10px;
  color: var(--ink-muted);
  font-size: 11.5px;
  text-align: center;
}

@media (max-width: 980px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .auth__art {
    display: none;
  }

  .auth__main {
    max-width: 440px;
  }
}

@media (max-width: 560px) {
  .auth__form-side {
    padding: 18px 20px 22px;
  }

  .auth__main {
    padding: 28px 0 24px;
  }

  .auth__title {
    font-size: 28px;
  }

  .auth__footer {
    font-size: 10.5px;
  }
}
</style>

<style scoped>
/* ==========================================================================
   2026 / Auth as a threshold between daylight and deep space
   ========================================================================== */
.auth {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  background: var(--bg);
}

.auth__form-side {
  position: relative;
  padding: 30px clamp(24px, 5vw, 68px) 26px;
  background:
    radial-gradient(36rem 26rem at 0% 0%, rgba(133, 114, 239, 0.08), transparent 64%),
    var(--bg);
}

.auth__form-side::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--line-strong), transparent);
}

.auth__header {
  position: relative;
  z-index: 1;
}

.auth__home {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.auth__home:hover {
  color: var(--ink);
}

.auth__main {
  max-width: 430px;
  padding: 54px 0 36px;
}

.auth .eyebrow {
  font-size: 9.5px;
}

.auth__title {
  margin-top: 14px;
  color: var(--ink);
  font-size: clamp(36px, 4vw, 52px);
  font-weight: 660;
  line-height: 1.02;
  letter-spacing: -0.055em;
}

.auth__description {
  max-width: 42ch;
  margin-top: 14px;
  color: var(--ink-muted);
  font-size: 13.5px;
  line-height: 1.75;
}

.auth__slot {
  margin-top: 32px;
}

.auth__footer {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.02em;
}

.auth__art {
  position: relative;
  align-items: flex-start;
  min-height: calc(100vh - 24px);
  margin: 12px 12px 12px 0;
  padding: clamp(38px, 5vw, 72px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 42px;
  color: var(--on-dark);
  background:
    radial-gradient(90% 60% at 80% 0%, rgba(215, 201, 255, 0.22), transparent 54%),
    radial-gradient(80% 60% at 0% 100%, rgba(157, 232, 203, 0.14), transparent 58%),
    linear-gradient(150deg, #171125 0%, #0b0911 54%, #07070c 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 40px 100px -50px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.auth__art::before {
  content: '';
  position: absolute;
  top: 50%;
  right: -18%;
  width: min(70vw, 760px);
  height: min(70vw, 760px);
  border: 1px solid rgba(215, 201, 255, 0.14);
  border-radius: 50%;
  transform: translateY(-50%);
  box-shadow:
    0 0 0 70px rgba(215, 201, 255, 0.025),
    0 0 0 140px rgba(215, 201, 255, 0.018);
  animation: orbit-slow 52s linear infinite;
}

.auth__art::after {
  content: '';
  position: absolute;
  top: 20%;
  right: 8%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--aurora);
  box-shadow:
    0 0 0 8px rgba(157, 232, 203, 0.06),
    0 0 34px rgba(157, 232, 203, 0.45);
}

.auth__art-glow {
  filter: blur(70px);
}

.auth__art-glow--one {
  top: -120px;
  right: -80px;
  width: 380px;
  height: 380px;
  background: rgba(133, 114, 239, 0.24);
}

.auth__art-glow--two {
  bottom: -110px;
  left: -60px;
  width: 320px;
  height: 320px;
  background: rgba(55, 140, 115, 0.18);
}

.auth__art-content {
  z-index: 1;
  max-width: 500px;
  padding-top: clamp(10px, 5vh, 56px);
}

.auth__art-chip {
  padding: 7px 12px;
  border: 1px solid rgba(215, 201, 255, 0.22);
  background: rgba(255, 255, 255, 0.06);
  color: var(--lumen);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(18px);
}

.auth__art-title {
  max-width: 11ch;
  margin-top: 26px;
  color: var(--on-dark);
  font-size: clamp(42px, 5vw, 70px);
  font-weight: 650;
  line-height: 0.98;
  letter-spacing: -0.065em;
}

.auth__art-title br {
  display: block;
}

.auth__art-text {
  max-width: 38ch;
  margin-top: 20px;
  color: var(--on-dark-soft);
  font-size: 13.5px;
  line-height: 1.85;
}

.auth__art-visual {
  min-height: 240px;
  margin: 24px 0 12px;
  align-items: center;
}

.auth__art-visual :deep(svg) {
  filter: drop-shadow(0 26px 30px rgba(0, 0, 0, 0.45));
}

.auth__float-card {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(10, 8, 15, 0.78);
  color: var(--on-dark);
  box-shadow:
    0 28px 60px -28px rgba(0, 0, 0, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(24px) saturate(140%);
}

.auth__float-card :deep(.ring) {
  --line: rgba(248, 242, 233, 0.14);
  --ink: var(--on-dark);
  --ink-soft: var(--on-dark-soft);
  --ink-muted: var(--on-dark-soft);
  --ink-faint: var(--on-dark-faint);
}

.auth__float-card strong {
  color: var(--on-dark);
}

.auth__float-card span:not(.auth__note-dot) {
  color: var(--on-dark-soft);
}

.auth__float-card--progress {
  bottom: 0;
  left: 2%;
}

.auth__float-card--note {
  top: 32px;
  right: 0;
}

.auth__note-dot {
  background: var(--aurora);
  box-shadow: 0 0 0 4px rgba(157, 232, 203, 0.1), 0 0 18px rgba(157, 232, 203, 0.5);
}

.auth__art-quote {
  max-width: 34ch;
  margin-top: 14px;
  color: var(--on-dark-faint);
  font-family: var(--font-editorial);
  font-size: 13px;
  font-style: italic;
  line-height: 1.65;
  text-align: left;
}

@media (max-width: 1120px) {
  .auth {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }

  .auth__art-title {
    font-size: clamp(38px, 4.6vw, 58px);
  }
}

@media (max-width: 980px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .auth__art {
    display: none;
  }

  .auth__form-side::after {
    display: none;
  }

  .auth__main {
    max-width: 460px;
    margin-inline: auto;
  }
}

@media (max-width: 560px) {
  .auth__form-side {
    padding: 18px 20px 22px;
  }

  .auth__main {
    padding: 34px 0 24px;
  }

  .auth__title {
    font-size: 38px;
  }
}
</style>
