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
        <h2 class="auth__art-title">把大目标，<br />变成每天的一小步。</h2>
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
