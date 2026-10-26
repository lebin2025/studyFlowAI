<script setup>
import BrandLogo from '@/components/layout/BrandLogo.vue'
import StudyLoom from '@/components/visuals/StudyLoom.vue'

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
        <BrandLogo :size="30" />
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
        <span>你的学习数据只属于你</span>
      </footer>
    </div>

    <aside class="auth__art" aria-hidden="true">
      <div class="auth__art-head">
        <span>FIG. 02 / LEARNING LOOM</span>
        <span>目标 × 时间 × 行动</span>
      </div>

      <div class="auth__art-copy">
        <h2>把目标，<br />织成每天<br />的一小步。</h2>
        <p>
          AI 根据你的目标、基础和真实时间，拆出今天就能开始的任务。
          你只需要完成这一小步，剩下的交给节奏。
        </p>
      </div>

      <StudyLoom compact />

      <blockquote>
        “不追求今天做完所有事，只追求今天往前一点点。”
        <cite>StudyFlow 小芽</cite>
      </blockquote>
    </aside>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  min-height: 100vh;
  background: var(--bg);
}

.auth__form-side {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 26px clamp(24px, 5vw, 68px) 22px;
}

.auth__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth__home {
  padding-bottom: 3px;
  border-bottom: 1px solid var(--line-strong);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: color var(--duration-fast) var(--ease);
}

.auth__home:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.auth__main {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 48px 0 32px;
}

.auth__title {
  max-width: 12ch;
  margin-top: 14px;
  font-size: clamp(36px, 4.3vw, 56px);
  line-height: 0.98;
  letter-spacing: -0.06em;
}

.auth__description {
  max-width: 40ch;
  margin-top: 14px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.75;
}

.auth__slot {
  margin-top: 30px;
}

.auth__footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

.auth__art {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  padding: clamp(30px, 5vw, 70px);
  border-left: 1px solid var(--ink);
  background: var(--surface);
}

.auth__art-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ink);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.06em;
}

.auth__art-copy {
  max-width: 520px;
  margin-top: 30px;
}

.auth__art-copy h2 {
  font-size: clamp(38px, 4.6vw, 66px);
  line-height: 0.94;
  letter-spacing: -0.065em;
}

.auth__art-copy p {
  max-width: 38ch;
  margin-top: 18px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.8;
}

.auth__art :deep(.loom) {
  margin-top: 26px;
}

.auth__art blockquote {
  max-width: 34ch;
  margin: 24px 0 0;
  padding-left: 16px;
  border-left: 2px solid var(--accent);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.5;
  letter-spacing: -0.035em;
}

.auth__art cite {
  display: block;
  margin-top: 8px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  font-style: normal;
  letter-spacing: 0.04em;
}

@media (max-width: 980px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .auth__art {
    display: none;
  }

  .auth__main {
    max-width: 460px;
    margin-inline: auto;
  }
}

@media (max-width: 560px) {
  .auth__form-side {
    padding: 18px 20px 20px;
  }

  .auth__main {
    padding: 36px 0 26px;
  }

  .auth__title {
    font-size: 40px;
  }

  .auth__footer {
    display: block;
    line-height: 1.8;
  }

  .auth__footer span {
    display: block;
  }
}
</style>

<style scoped>
.auth__slot :deep(.auth-tip) {
  margin-top: 18px;
  padding: 10px 0 10px 12px;
  border: 0;
  border-left: 2px solid var(--accent);
  border-radius: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.65;
}

.auth__slot :deep(.auth-tip__icon) {
  color: var(--accent);
}

.auth__slot :deep(.auth-switch) {
  margin-top: 18px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.auth__slot :deep(.auth-switch a) {
  color: var(--accent);
  border-bottom: 1px solid var(--accent);
}
</style>
