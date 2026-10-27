<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CalendarCheck,
  Menu,
  Sparkles,
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import StudyLoom from '@/components/visuals/StudyLoom.vue'
import AppButton from '@/components/ui/AppButton.vue'
import LiquidGlassButton from '@/components/ui/LiquidGlassButton.vue'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const scrolled = ref(false)
const menuOpen = ref(false)

const primaryTarget = computed(() => (auth.isAuthenticated ? '/app/plans/new' : '/register'))
const spaceTarget = computed(() => (auth.isAuthenticated ? '/app' : '/register'))

const features = [
  {
    icon: WandSparkles,
    title: 'AI 拆解目标',
    text: '阶段、每日任务和完成标准，一次生成。',
  },
  {
    icon: CalendarCheck,
    title: '只做今天的事',
    text: '每天打开，先看到今天最重要的一步。',
  },
  {
    icon: TrendingUp,
    title: '进度来自记录',
    text: '完成率和趋势只统计你真正完成的任务。',
  },
]

const steps = [
  { number: '1', title: '描述目标', text: '想学什么、基础如何、每天有多少时间。' },
  { number: '2', title: 'AI 生成计划', text: '拆成阶段与每日任务，自动校验时间约束。' },
  { number: '3', title: '每天完成', text: '打勾、调整、查看真实进度。' },
]

const onScroll = () => {
  scrolled.value = window.scrollY > 8
}

const closeMenu = () => {
  menuOpen.value = false
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="landing">
    <header class="site-header" :class="{ 'is-scrolled': scrolled, 'is-open': menuOpen }">
      <div class="container site-header__inner">
        <BrandLogo :size="28" />

        <nav class="site-nav" aria-label="首页导航">
          <a href="#features">功能</a>
          <a href="#how">如何使用</a>
          <a href="#start">开始</a>
        </nav>

        <div class="site-header__actions">
          <RouterLink v-if="!auth.isAuthenticated" to="/login" class="site-header__login">
            登录
          </RouterLink>
          <LiquidGlassButton :to="spaceTarget">
            {{ auth.isAuthenticated ? '进入学习空间' : '开始使用' }}
          </LiquidGlassButton>
          <button
            type="button"
            class="site-header__menu"
            :aria-expanded="menuOpen"
            aria-controls="mobile-menu"
            aria-label="打开导航"
            @click="menuOpen = !menuOpen"
          >
            <X v-if="menuOpen" :size="18" />
            <Menu v-else :size="18" />
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="menuOpen" id="mobile-menu" class="mobile-menu">
          <a href="#features" @click="closeMenu">功能</a>
          <a href="#how" @click="closeMenu">如何使用</a>
          <a href="#start" @click="closeMenu">开始</a>
          <div class="mobile-menu__actions">
            <AppButton v-if="!auth.isAuthenticated" to="/login" variant="secondary" block @click="closeMenu">
              登录
            </AppButton>
            <AppButton :to="spaceTarget" block @click="closeMenu">
              {{ auth.isAuthenticated ? '进入学习空间' : '开始使用' }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </header>

    <main id="main-content">
      <section class="hero">
        <div class="container hero__grid">
          <div class="hero__copy">
            <span class="hero__badge">
              <Sparkles :size="12" />
              AI 学习规划
            </span>
            <h1>把目标，变成<br /><span>今天</span>可执行的任务。</h1>
            <p class="hero__lead">
              AI 读你的目标、基础和时间，生成一份每天可执行的学习计划。
            </p>
            <div class="hero__actions">
              <AppButton :to="primaryTarget" size="lg">
                {{ auth.isAuthenticated ? '新建学习计划' : '免费开始规划' }}
                <template #trailing><ArrowRight :size="15" /></template>
              </AppButton>
              <a href="#how" class="hero__link">
                看看如何使用
                <ArrowRight :size="13" />
              </a>
            </div>
            <div class="hero__meta">
              <span>真实 AI 生成</span>
              <span>时间约束优先</span>
              <span>数据仅你可见</span>
            </div>
          </div>

          <div class="hero__visual">
            <div class="visual-card">
              <header class="visual-card__head">
                <div class="visual-card__title">
                  <span class="visual-card__dot" />
                  学习路径
                </div>
                <span class="visual-card__ai">
                  <Sparkles :size="11" />
                  AI
                </span>
              </header>
              <StudyLoom compact />
              <footer class="visual-card__foot">
                <span>目标</span>
                <span>阶段</span>
                <span>每日任务</span>
                <span class="is-today">今天</span>
              </footer>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="features">
        <div class="container feature-layout">
          <div class="feature-intro" v-reveal>
            <span class="eyebrow">学习计划</span>
            <h2>从目标到每天，<br />只有一条路径。</h2>
            <p>不需要维护表格，也不需要每天重新决定学什么。</p>
          </div>

          <div class="feature-list">
            <article v-for="(feature, index) in features" :key="feature.title" class="feature-row" v-reveal="{ delay: index * 70 }">
              <span class="feature-row__icon">
                <component :is="feature.icon" :size="19" :stroke-width="1.8" />
              </span>
              <div>
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.text }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="how" class="how">
        <div class="container">
          <div class="how__head" v-reveal>
            <span class="eyebrow">如何使用</span>
            <h2>三步，开始今天。</h2>
          </div>

          <div class="process" v-reveal="{ delay: 80 }">
            <article v-for="step in steps" :key="step.number" class="process-step">
              <span class="process-step__number">{{ step.number }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.text }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="start" class="start">
        <div class="container">
          <div class="start__panel" v-reveal>
            <div>
              <span class="start__badge">
                <Sparkles :size="12" />
                StudyFlow AI
              </span>
              <h2>今天，先完成一件事。</h2>
              <p>把目标交给 AI，从一份能执行的计划开始。</p>
            </div>
            <div class="start__actions">
              <AppButton :to="primaryTarget" size="lg">
                {{ auth.isAuthenticated ? '新建学习计划' : '免费开始' }}
                <template #trailing><ArrowRight :size="15" /></template>
              </AppButton>
              <RouterLink v-if="!auth.isAuthenticated" to="/login" class="start__login">
                已有账户
              </RouterLink>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <BrandLogo :size="24" />
        <nav aria-label="页脚导航">
          <RouterLink :to="auth.isAuthenticated ? '/app' : '/register'">学习空间</RouterLink>
          <RouterLink v-if="!auth.isAuthenticated" to="/login">登录</RouterLink>
          <RouterLink v-if="!auth.isAuthenticated" to="/register">创建账户</RouterLink>
        </nav>
        <span>© 2026 StudyFlow AI</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  overflow-x: clip;
  background: var(--bg);
  color: var(--ink);
}

/* Header ------------------------------------------------------------------ */
.site-header {
  position: sticky;
  top: 0;
  z-index: 60;
  background: var(--bg);
  transition: box-shadow var(--duration) var(--ease);
}

.site-header.is-scrolled {
  box-shadow: 0 1px 0 var(--line), 0 10px 30px -24px rgba(23, 22, 20, 0.24);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 68px;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.site-nav a {
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 500;
  transition: color var(--duration-fast) var(--ease);
}

.site-nav a:hover {
  color: var(--ink);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.site-header__login {
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 500;
}

.site-header__login:hover {
  color: var(--ink);
}

.site-header__menu {
  display: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.mobile-menu {
  display: none;
  padding: 8px 20px 18px;
  background: var(--bg);
}

.mobile-menu a {
  display: block;
  padding: 11px 0;
  color: var(--ink-soft);
  font-size: 14px;
}

.mobile-menu__actions {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

/* Hero -------------------------------------------------------------------- */
.hero {
  padding: clamp(50px, 7vw, 92px) 0 clamp(48px, 6vw, 82px);
}

.hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  align-items: center;
  gap: clamp(36px, 6vw, 80px);
}

.hero__copy {
  min-width: 0;
}

.hero__badge,
.start__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 11px;
  font-weight: 600;
}

.hero h1 {
  max-width: 16ch;
  margin-top: 20px;
  font-size: clamp(40px, 4.4vw, 60px);
  font-weight: 660;
  line-height: 1.04;
  letter-spacing: -0.058em;
}

.hero h1 span {
  color: var(--accent);
}

.hero__lead {
  max-width: 38ch;
  margin-top: 22px;
  color: var(--ink-muted);
  font-size: 16px;
  line-height: 1.65;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  margin-top: 28px;
}

.hero__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 550;
}

.hero__link:hover {
  color: var(--accent);
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 28px;
  color: var(--ink-faint);
  font-size: 11.5px;
}

.hero__meta span::before {
  content: '·';
  margin-right: 10px;
  color: var(--accent);
}

.hero__meta span:first-child::before {
  display: none;
}

.hero__visual {
  min-width: 0;
}

.visual-card {
  padding: 18px 18px 14px;
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.visual-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 2px 12px;
}

.visual-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.visual-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.visual-card__ai {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 10px;
  font-weight: 650;
}

.visual-card :deep(.loom) {
  padding: 6px 2px 2px;
}

.visual-card__foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 4px 0;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.visual-card__foot .is-today {
  margin-left: auto;
  color: var(--accent);
  font-weight: 600;
}

/* Features ---------------------------------------------------------------- */
.features {
  padding: clamp(52px, 7vw, 92px) 0;
  background: var(--surface-soft);
}

.feature-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(36px, 7vw, 100px);
  align-items: start;
}

.feature-intro h2 {
  margin-top: 12px;
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: 1.08;
}

.feature-intro p {
  max-width: 34ch;
  margin-top: 14px;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.feature-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.feature-row__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--surface);
  color: var(--accent);
  box-shadow: var(--shadow-xs);
}

.feature-row h3 {
  font-size: 17px;
  font-weight: 620;
  line-height: 1.3;
}

.feature-row p {
  max-width: 40ch;
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.65;
}

/* How --------------------------------------------------------------------- */
.how {
  padding: clamp(52px, 7vw, 92px) 0;
}

.how__head h2 {
  margin-top: 12px;
  font-size: clamp(30px, 3.6vw, 44px);
}

.process {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 34px;
  padding: 28px 0;
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.process-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 0 24px;
}

.process-step + .process-step {
  border-left: 1px solid var(--line);
}

.process-step__number {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-size: 11px;
  font-weight: 650;
}

.process-step h3 {
  font-size: 15px;
  font-weight: 620;
}

.process-step p {
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.6;
}

/* CTA --------------------------------------------------------------------- */
.start {
  padding: 18px 0 clamp(56px, 7vw, 92px);
}

.start__panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: clamp(28px, 4vw, 44px);
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.start__badge {
  background: var(--accent-soft);
}

.start h2 {
  margin-top: 12px;
  font-size: clamp(28px, 3.8vw, 44px);
  line-height: 1.08;
}

.start p {
  max-width: 40ch;
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 13.5px;
}

.start__actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: none;
}

.start__login {
  color: var(--ink-muted);
  font-size: 13px;
}

.start__login:hover {
  color: var(--ink);
}

/* Footer ------------------------------------------------------------------ */
.site-footer {
  padding: 26px 0;
  background: var(--bg-deep);
}

.site-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.site-footer nav {
  display: flex;
  gap: 20px;
}

.site-footer a,
.site-footer span {
  color: var(--ink-muted);
  font-size: 11.5px;
}

.site-footer a:hover {
  color: var(--ink);
}

/* Responsive -------------------------------------------------------------- */
@media (max-width: 900px) {
  .site-nav,
  .site-header__login {
    display: none;
  }

  .site-header__menu {
    display: grid;
  }

  .mobile-menu {
    display: block;
  }

  .hero__grid {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .hero__copy {
    max-width: 660px;
  }

  .hero h1 {
    max-width: 13ch;
    font-size: clamp(46px, 8.6vw, 72px);
  }

  .hero__visual {
    max-width: 680px;
  }

  .feature-layout {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .process {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 24px;
  }

  .process-step + .process-step {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding-top: 22px;
  }

  .process-step {
    padding: 0;
  }

  .start__panel {
    display: block;
  }

  .start__actions {
    margin-top: 22px;
  }
}

@media (max-width: 620px) {
  .site-header__inner {
    height: 62px;
  }

  .hero {
    padding-top: 32px;
  }

  .hero h1 {
    max-width: 100%;
    font-size: clamp(34px, 10vw, 44px);
  }

  .hero__lead {
    margin-top: 18px;
    font-size: 14.5px;
  }

  .hero__actions {
    align-items: flex-start;
    gap: 16px;
  }

  .hero__meta {
    gap: 5px 12px;
    font-size: 10.5px;
  }

  .visual-card {
    padding: 14px 14px 10px;
    border-radius: 22px;
  }

  .visual-card__foot {
    gap: 12px;
    font-size: 10px;
  }

  .features,
  .how {
    padding: 52px 0;
  }

  .feature-intro h2 {
    font-size: 30px;
  }

  .feature-list {
    gap: 22px;
  }

  .start {
    padding-bottom: 48px;
  }

  .start__panel {
    padding: 24px 20px;
    border-radius: 22px;
  }

  .start__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .start__login {
    text-align: center;
  }

  .site-footer__inner {
    display: block;
    text-align: left;
  }

  .site-footer nav {
    margin: 12px 0;
  }

  .site-footer span {
    display: block;
  }
}
</style>
