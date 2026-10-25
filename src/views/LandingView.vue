<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  Menu,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import Mascot from '@/components/illustrations/Mascot.vue'
import AppButton from '@/components/ui/AppButton.vue'
import ProgressRing from '@/components/ui/ProgressRing.vue'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const scrolled = ref(false)
const menuOpen = ref(false)

const primaryTarget = computed(() => (auth.isAuthenticated ? '/app/plans/new' : '/register'))
const spaceTarget = computed(() => (auth.isAuthenticated ? '/app' : '/register'))
const primaryLabel = computed(() => (auth.isAuthenticated ? '生成新的学习计划' : '免费生成学习计划'))

const features = [
  {
    icon: WandSparkles,
    tone: 'lav',
    title: 'AI 真的替你拆解',
    text: '把「学好英语」这类模糊目标，拆成阶段、每日任务、完成标准和复习安排，而不是给一份漂亮但用不上的计划。',
    foot: ['真实调用 DeepSeek', '结构化校验', '时间约束优先'],
  },
  {
    icon: CalendarCheck,
    tone: 'mint',
    title: '每天只面对今天',
    text: '仪表盘只呈现今天要做的一小步。做完打勾，进度自动同步到计划与统计，不需要手动维护表格。',
    foot: ['今日任务', '优先级', '一键完成'],
  },
  {
    icon: TrendingUp,
    tone: 'peach',
    title: '进度来自真实记录',
    text: '完成率、学习趋势、连续天数都来自你实际保存和完成的任务。没有数据时，我们诚实地显示空状态。',
    foot: ['真实统计', '趋势图', '阶段进度'],
  },
]

const steps = [
  {
    icon: Target,
    step: '01',
    title: '说出目标与时间',
    text: '描述想学什么、现在的基础、截止日期、每天能拿出多少时间。',
    meta: '约 2 分钟',
  },
  {
    icon: Sparkles,
    step: '02',
    title: 'AI 生成并校验',
    text: '模型生成计划，系统再检查日期、每日时长、任务数量和结构是否合理。',
    meta: '通常 20–60 秒',
  },
  {
    icon: CheckCircle2,
    step: '03',
    title: '每天完成一小步',
    text: '完成后打勾，进度自动更新；计划不合适时，用一句话让 AI 重新安排。',
    meta: '每天一点点',
  },
]

const scenes = ['四六级', '考研', '雅思 / 托福', '编程自学', '教师资格证', '语言入门', '期末复习']

const rhythm = [
  { day: '一', value: 72, tone: 'lav' },
  { day: '二', value: 46, tone: 'mint' },
  { day: '三', value: 88, tone: 'lav' },
  { day: '四', value: 34, tone: 'peach' },
  { day: '五', value: 64, tone: 'mint' },
  { day: '六', value: 100, tone: 'lav' },
  { day: '日', value: 54, tone: 'mint' },
]

const onScroll = () => {
  scrolled.value = window.scrollY > 12
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
        <BrandLogo :size="34" />

        <nav class="site-nav" aria-label="首页导航">
          <a href="#features">功能</a>
          <a href="#how">如何工作</a>
          <a href="#why">为什么是 StudyFlow</a>
          <a href="#scenes">适用场景</a>
        </nav>

        <div class="site-header__actions">
          <RouterLink
            v-if="!auth.isAuthenticated"
            to="/login"
            class="site-header__login"
          >
            登录
          </RouterLink>
          <AppButton :to="spaceTarget" size="sm" class="site-header__cta">
            {{ auth.isAuthenticated ? '进入学习空间' : '开始使用' }}
            <template #trailing><ArrowRight :size="14" /></template>
          </AppButton>
          <button
            type="button"
            class="site-header__menu"
            :aria-expanded="menuOpen"
            aria-controls="mobile-menu"
            :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
            @click="menuOpen = !menuOpen"
          >
            <X v-if="menuOpen" :size="20" />
            <Menu v-else :size="20" />
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="menuOpen" id="mobile-menu" class="mobile-menu">
          <a href="#features" @click="closeMenu">功能</a>
          <a href="#how" @click="closeMenu">如何工作</a>
          <a href="#why" @click="closeMenu">为什么是 StudyFlow</a>
          <a href="#scenes" @click="closeMenu">适用场景</a>
          <div class="mobile-menu__actions">
            <AppButton v-if="!auth.isAuthenticated" to="/login" variant="secondary" block @click="closeMenu">
              登录
            </AppButton>
            <AppButton :to="spaceTarget" block @click="closeMenu">
              {{ auth.isAuthenticated ? '进入学习空间' : '免费开始' }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </header>

    <main id="main-content">
      <!-- Hero ------------------------------------------------------------- -->
      <section class="hero">
        <div class="container hero__inner">
          <div class="hero__copy">
            <span class="hero__badge">
              <span class="hero__badge-dot" />
              由 DeepSeek 驱动的学习规划
            </span>
            <h1 class="hero__title">
              把大目标，<br />
              <span class="hero__highlight">拆成今天</span>的一小步
            </h1>
            <p class="hero__lead">
              StudyFlow AI 会读你的目标、基础和时间，生成一份真正能执行的每日计划——
              然后陪你把今天这一小步走完。
            </p>
            <div class="hero__actions">
              <AppButton :to="primaryTarget" size="lg">
                {{ primaryLabel }}
                <template #trailing><ArrowRight :size="18" /></template>
              </AppButton>
              <AppButton href="#how" variant="secondary" size="lg">
                看看它如何工作
              </AppButton>
            </div>
            <div class="hero__trust">
              <span><Check :size="13" /> 真实 AI 生成</span>
              <span><ShieldCheck :size="13" /> 数据仅你可见</span>
              <span><Clock3 :size="13" /> 时间约束优先</span>
            </div>
          </div>

          <div class="hero__art" aria-label="StudyFlow 界面示例">
            <div class="hero__halo" />
            <div class="preview-card">
              <div class="preview-card__head">
                <span class="preview-card__chip">
                  <Sparkles :size="12" />
                  今日专注
                </span>
                <span class="preview-card__date">10 月 25 日 · 周日</span>
              </div>
              <div class="preview-card__summary">
                <ProgressRing :value="67" :size="92" :stroke="9" label="今日" />
                <div class="preview-card__meta">
                  <strong>2 / 3 已完成</strong>
                  <span>预计还需要 30 分钟</span>
                  <span class="preview-card__ai">AI 已按你的时间调整</span>
                </div>
              </div>
              <ul class="preview-card__tasks">
                <li class="is-done">
                  <CheckCircle2 :size="17" />
                  <span>背诵 50 个核心词汇</span>
                  <em>45m</em>
                </li>
                <li class="is-done">
                  <CheckCircle2 :size="17" />
                  <span>精听 Section 2 并对照原文</span>
                  <em>45m</em>
                </li>
                <li>
                  <Circle :size="17" />
                  <span>整理 10 组同义替换</span>
                  <em>30m</em>
                </li>
              </ul>
              <div class="preview-card__foot">
                <span>无需手动维护表格</span>
                <span class="preview-card__sample">界面示例</span>
              </div>
            </div>

            <div class="float-card float-card--plan">
              <span class="float-card__icon float-card__icon--lav">
                <WandSparkles :size="15" />
              </span>
              <div>
                <strong>14 天学习计划</strong>
                <span>3 个阶段 · 27 个任务</span>
              </div>
            </div>

            <Mascot class="hero__mascot" :size="148" variant="happy" />
          </div>
        </div>
      </section>

      <!-- Scenes ----------------------------------------------------------- -->
      <section id="scenes" class="scenes">
        <div class="container scenes__inner" v-reveal>
          <p class="scenes__label">为这些认真对待自己的学习场景而做</p>
          <ul class="scenes__list">
            <li v-for="scene in scenes" :key="scene">{{ scene }}</li>
          </ul>
        </div>
      </section>

      <!-- Features --------------------------------------------------------- -->
      <section id="features" class="section features">
        <div class="container">
          <div class="section-heading" v-reveal>
            <div>
              <p class="eyebrow">核心能力</p>
              <h2>计划不是装饰，是每天能走的一步</h2>
            </div>
            <p>
              从目标到今日任务，再到真实进度，整条链路都在同一个地方完成。
            </p>
          </div>

          <div class="feature-grid">
            <article
              v-for="(feature, index) in features"
              :key="feature.title"
              class="feature-card"
              :class="`feature-card--${feature.tone}`"
              v-reveal="{ delay: index * 70 }"
            >
              <span class="feature-card__icon">
                <component :is="feature.icon" :size="20" :stroke-width="1.8" />
              </span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.text }}</p>
              <ul class="feature-card__foot">
                <li v-for="item in feature.foot" :key="item">
                  <Check :size="11" />
                  {{ item }}
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <!-- How it works ----------------------------------------------------- -->
      <section id="how" class="section how">
        <div class="container">
          <div class="section-heading section-heading--center" v-reveal>
            <div>
              <p class="eyebrow">如何工作</p>
              <h2>三步，从模糊到清晰</h2>
              <p>不需要学习复杂的工具，也不需要先整理一份完美计划。</p>
            </div>
          </div>

          <div class="steps">
            <article
              v-for="(step, index) in steps"
              :key="step.step"
              class="step"
              v-reveal="{ delay: index * 90 }"
            >
              <div class="step__top">
                <span class="step__icon">
                  <component :is="step.icon" :size="19" />
                </span>
                <span class="step__number">{{ step.step }}</span>
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
              <span class="step__meta">{{ step.meta }}</span>
            </article>
          </div>
        </div>
      </section>

      <!-- Why -------------------------------------------------------------- -->
      <section id="why" class="section why">
        <div class="container why__inner">
          <div class="why__copy" v-reveal>
            <p class="eyebrow">为什么是 StudyFlow</p>
            <h2>少一点计划焦虑，<br />多一点真实的进步。</h2>
            <p class="why__lead">
              很多学习工具帮你把日程塞得更满，却没有回答「今天到底该做什么」。
              StudyFlow 把注意力放回今天的一小步。
            </p>
            <ul class="why__list">
              <li>
                <span class="why__check"><Check :size="12" /></span>
                <div>
                  <strong>时间约束会被认真对待</strong>
                  <p>每日时长、可学习日、截止日期都会参与规划；不合理的安排会先被拦下来。</p>
                </div>
              </li>
              <li>
                <span class="why__check"><Check :size="12" /></span>
                <div>
                  <strong>计划可以随时用一句话调整</strong>
                  <p>「每天只能学一小时」「任务拆细一点」——AI 会重排计划，并保留你已完成的部分。</p>
                </div>
              </li>
              <li>
                <span class="why__check"><Check :size="12" /></span>
                <div>
                  <strong>进度来自数据，不来自想象</strong>
                  <p>完成率、趋势和连续天数都与真实任务记录一致；没有历史数据时，我们不会编造。</p>
                </div>
              </li>
              <li>
                <span class="why__check"><Check :size="12" /></span>
                <div>
                  <strong>你的数据只属于你</strong>
                  <p>每一个读写接口都在后端校验身份与归属，不同账户之间的数据完全隔离。</p>
                </div>
              </li>
            </ul>
          </div>

          <div class="why__panel" v-reveal="{ delay: 120 }">
            <div class="rhythm-card">
              <div class="rhythm-card__head">
                <div>
                  <p class="rhythm-card__eyebrow">本周节奏</p>
                  <h3>稳稳地，比用力过猛更远</h3>
                </div>
                <span class="rhythm-card__badge">
                  <Flame :size="12" />
                  6 天连续
                </span>
              </div>
              <div class="rhythm-card__chart" aria-hidden="true">
                <div
                  v-for="day in rhythm"
                  :key="day.day"
                  class="rhythm-bar"
                  :class="`rhythm-bar--${day.tone}`"
                >
                  <span class="rhythm-bar__fill" :style="{ height: `${day.value}%` }" />
                  <span class="rhythm-bar__day">{{ day.day }}</span>
                </div>
              </div>
              <div class="rhythm-card__stats">
                <div>
                  <strong>5.5h</strong>
                  <span>本周投入</span>
                </div>
                <div>
                  <strong>78%</strong>
                  <span>任务完成率</span>
                </div>
                <div>
                  <strong>4</strong>
                  <span>阶段复习</span>
                </div>
              </div>
              <p class="rhythm-card__note">示意图 · 你的数据会来自真实记录</p>
            </div>

            <div class="quote-card">
              <p>“不追求今天做完所有事，只追求今天往前一点点。”</p>
              <div class="quote-card__foot">
                <Mascot :size="44" :animated="false" />
                <span>StudyFlow 小芽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Final CTA -------------------------------------------------------- -->
      <section class="section cta-section">
        <div class="container">
          <div class="cta" v-reveal>
            <div class="cta__copy">
              <p class="eyebrow">现在开始</p>
              <h2>今天，就从一小步开始。</h2>
              <p>告诉 AI 你的目标与时间，几分钟后，你会得到一份明天就能执行的计划。</p>
              <div class="cta__actions">
                <AppButton :to="primaryTarget" size="lg">
                  {{ auth.isAuthenticated ? '生成新的学习计划' : '免费创建账户' }}
                  <template #trailing><ArrowRight :size="18" /></template>
                </AppButton>
                <AppButton v-if="!auth.isAuthenticated" to="/login" variant="ghost" size="lg">
                  我已有账户
                </AppButton>
              </div>
            </div>
            <div class="cta__art" aria-hidden="true">
              <div class="cta__ring cta__ring--one" />
              <div class="cta__ring cta__ring--two" />
              <Mascot :size="200" variant="cheer" />
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div class="site-footer__brand">
          <BrandLogo :size="30" />
          <p>一个认真对待你时间的 AI 学习规划工具。</p>
        </div>
        <div class="site-footer__cols">
          <div>
            <h4>产品</h4>
            <a href="#features">功能</a>
            <a href="#how">如何工作</a>
            <a href="#scenes">适用场景</a>
          </div>
          <div>
            <h4>开始</h4>
            <RouterLink to="/register">创建账户</RouterLink>
            <RouterLink to="/login">登录</RouterLink>
            <RouterLink :to="auth.isAuthenticated ? '/app' : '/login'">学习空间</RouterLink>
          </div>
          <div>
            <h4>技术</h4>
            <span>Vue 3 · Vite</span>
            <span>Node.js · Express</span>
            <span>SQLite · DeepSeek</span>
          </div>
        </div>
      </div>
      <div class="container site-footer__bottom">
        <span>© 2026 StudyFlow AI</span>
        <span>AI 生成内容仅供学习参考，请结合自身情况调整。</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  overflow-x: clip;
}

/* Header ---------------------------------------------------------------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 14px 0;
  transition:
    background-color var(--duration) var(--ease),
    border-color var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease);
  border-bottom: 1px solid transparent;
}

.site-header.is-scrolled,
.site-header.is-open {
  background: rgba(251, 248, 243, 0.92);
  border-color: rgba(236, 229, 218, 0.8);
  backdrop-filter: blur(14px);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-nav a {
  padding: 7px 12px;
  border-radius: var(--radius-pill);
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 520;
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.site-nav a:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.site-header__login {
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 550;
}

.site-header__login:hover {
  color: var(--lav-700);
}

.site-header__menu {
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
}

.mobile-menu {
  display: none;
  flex-direction: column;
  gap: 4px;
  margin: 10px 16px 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.mobile-menu a {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--ink-soft);
  font-size: 14px;
}

.mobile-menu a:hover {
  background: var(--surface-muted);
}

.mobile-menu__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

/* Hero ------------------------------------------------------------------ */
.hero {
  position: relative;
  padding: clamp(44px, 6vw, 78px) 0 clamp(52px, 6vw, 88px);
}

.hero__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(0, 0.96fr);
  align-items: center;
  gap: clamp(32px, 5vw, 72px);
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(130, 114, 239, 0.16);
  background: rgba(255, 255, 255, 0.66);
  color: var(--lav-700);
  font-size: 11.5px;
  font-weight: 550;
}

.hero__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mint-500);
  box-shadow: 0 0 0 3px var(--mint-100);
}

.hero__title {
  margin-top: 20px;
  font-size: clamp(40px, 5.4vw, 66px);
  font-weight: 680;
  line-height: 1.12;
  letter-spacing: -0.05em;
}

.hero__highlight {
  position: relative;
  isolation: isolate;
  color: var(--lav-700);
  white-space: nowrap;
}

.hero__highlight::after {
  content: '';
  position: absolute;
  right: 2px;
  bottom: 4px;
  left: 2px;
  height: 11px;
  border-radius: 6px;
  background: rgba(130, 114, 239, 0.16);
  z-index: -1;
}

.hero__lead {
  max-width: 47ch;
  margin-top: 20px;
  color: var(--ink-soft);
  font-size: clamp(15px, 1.35vw, 17px);
  line-height: 1.8;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 30px;
}

.hero__trust {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 24px;
}

.hero__trust span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.hero__trust svg {
  color: var(--mint-600);
}

/* Hero art -------------------------------------------------------------- */
.hero__art {
  position: relative;
  min-height: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 6px 26px;
}

.hero__halo {
  position: absolute;
  inset: 8% 2% 4% 8%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 45%, rgba(130, 114, 239, 0.16), transparent 66%);
  filter: blur(6px);
}

.preview-card {
  position: relative;
  z-index: 2;
  width: min(100%, 374px);
  padding: 19px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  background: var(--surface);
  box-shadow:
    0 2px 4px rgba(41, 37, 49, 0.03),
    0 34px 70px -30px rgba(41, 37, 49, 0.34);
  transform: rotate(-1.4deg);
  animation: hero-card-in 900ms var(--ease) both;
}

@keyframes hero-card-in {
  from {
    opacity: 0;
    transform: translateY(22px) rotate(-3deg) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(-1.4deg) scale(1);
  }
}

.preview-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  background: var(--lav-50);
  color: var(--lav-700);
  font-size: 10.5px;
  font-weight: 600;
}

.preview-card__date {
  color: var(--ink-faint);
  font-size: 10px;
}

.preview-card__summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.preview-card__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.preview-card__meta strong {
  font-size: 15px;
  font-weight: 650;
}

.preview-card__meta > span {
  color: var(--ink-muted);
  font-size: 11px;
}

.preview-card__meta .preview-card__ai {
  margin-top: 4px;
  color: var(--mint-700);
  font-size: 10px;
}

.preview-card__tasks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.preview-card__tasks li {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border-radius: 10px;
  background: var(--surface-soft);
  color: var(--ink-soft);
  font-size: 11.5px;
}

.preview-card__tasks li svg {
  flex: none;
  color: var(--ink-faint);
}

.preview-card__tasks li.is-done {
  color: var(--ink-muted);
}

.preview-card__tasks li.is-done svg {
  color: var(--mint-600);
}

.preview-card__tasks li.is-done span {
  text-decoration: line-through;
  text-decoration-color: rgba(124, 117, 134, 0.45);
}

.preview-card__tasks li span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-card__tasks em {
  color: var(--ink-faint);
  font-size: 10px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.preview-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.preview-card__sample {
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--surface-muted);
}

.float-card {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  font-size: 10px;
  line-height: 1.4;
}

.float-card strong {
  display: block;
  font-size: 11px;
  font-weight: 640;
}

.float-card span:not(.float-card__icon) {
  color: var(--ink-muted);
}

.float-card__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
}

.float-card__icon--lav {
  background: var(--lav-100);
  color: var(--lav-700);
}

.float-card--plan {
  top: 4px;
  right: -6px;
  animation: float-soft 7s var(--ease-in-out) infinite;
}

.hero__mascot {
  position: absolute;
  z-index: 4;
  right: -48px;
  bottom: -30px;
  width: 130px;
  height: 130px;
  filter: drop-shadow(0 16px 22px rgba(41, 37, 49, 0.1));
}

/* Scenes ---------------------------------------------------------------- */
.scenes {
  padding: 6px 0 24px;
}

.scenes__inner {
  display: flex;
  align-items: center;
  gap: 20px;
}

.scenes__label {
  flex: none;
  color: var(--ink-faint);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

.scenes__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scenes__list li {
  padding: 4px 11px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink-muted);
  font-size: 11px;
}

/* Sections -------------------------------------------------------------- */
.section {
  padding: clamp(56px, 7vw, 96px) 0;
}

.section-heading--center {
  justify-content: center;
  text-align: center;
}

.section-heading--center > div {
  max-width: 620px;
}

.section-heading--center p {
  margin-inline: auto;
}

/* Features -------------------------------------------------------------- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  padding: 26px 24px 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition:
    transform var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease),
    border-color var(--duration) var(--ease);
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
}

.feature-card__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
}

.feature-card--lav .feature-card__icon {
  background: var(--lav-100);
  color: var(--lav-700);
}

.feature-card--mint .feature-card__icon {
  background: var(--mint-100);
  color: var(--mint-700);
}

.feature-card--peach .feature-card__icon {
  background: var(--peach-100);
  color: var(--peach-600);
}

.feature-card h3 {
  margin-top: 17px;
  font-size: 18px;
  font-weight: 640;
}

.feature-card p {
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.75;
}

.feature-card__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: auto;
  padding-top: 18px;
}

.feature-card__foot li {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 6px;
  background: var(--surface-muted);
  color: var(--ink-muted);
  font-size: 9.5px;
}

/* Steps ----------------------------------------------------------------- */
.steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  position: relative;
  margin-top: 34px;
}

.step {
  position: relative;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.7);
}

.step__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--lav-700);
  box-shadow: var(--shadow-xs);
}

.step__number {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 680;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}

.step h3 {
  margin-top: 18px;
  font-size: 16.5px;
}

.step p {
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.7;
}

.step__meta {
  display: inline-block;
  margin-top: 14px;
  color: var(--lav-700);
  font-size: 10.5px;
  font-weight: 600;
}

/* Why ------------------------------------------------------------------- */
.why__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: clamp(32px, 5vw, 68px);
  align-items: center;
}

.why__copy h2 {
  margin-top: 10px;
  font-size: clamp(28px, 3.4vw, 40px);
  font-weight: 670;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.why__lead {
  margin-top: 14px;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.8;
}

.why__list {
  display: flex;
  flex-direction: column;
  gap: 17px;
  margin-top: 26px;
}

.why__list li {
  display: flex;
  gap: 11px;
}

.why__check {
  display: grid;
  place-items: center;
  flex: none;
  width: 21px;
  height: 21px;
  margin-top: 2px;
  border-radius: 50%;
  background: var(--mint-100);
  color: var(--mint-700);
}

.why__list strong {
  display: block;
  font-size: 13.5px;
  font-weight: 620;
}

.why__list p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.65;
}

.why__panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rhythm-card {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.rhythm-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.rhythm-card__eyebrow {
  color: var(--ink-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rhythm-card h3 {
  margin-top: 5px;
  font-size: 16px;
  font-weight: 630;
}

.rhythm-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background: var(--peach-100);
  color: var(--peach-600);
  font-size: 10px;
  font-weight: 600;
}

.rhythm-card__chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 132px;
  margin-top: 22px;
  padding-top: 8px;
}

.rhythm-bar {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 7px;
}

.rhythm-bar__fill {
  width: 100%;
  max-width: 26px;
  min-height: 8px;
  border-radius: 7px 7px 3px 3px;
  background: var(--lav-300);
  transition: height 700ms var(--ease);
}

.rhythm-bar--mint .rhythm-bar__fill {
  background: #a8dccb;
}

.rhythm-bar--peach .rhythm-bar__fill {
  background: #f3c6ac;
}

.rhythm-bar__day {
  color: var(--ink-faint);
  font-size: 9.5px;
}

.rhythm-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.rhythm-card__stats strong {
  display: block;
  font-size: 18px;
  font-weight: 660;
  letter-spacing: -0.03em;
}

.rhythm-card__stats span {
  color: var(--ink-faint);
  font-size: 9.5px;
}

.rhythm-card__note {
  margin-top: 14px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.quote-card {
  padding: 19px 22px;
  border: 1px solid rgba(130, 114, 239, 0.12);
  border-radius: var(--radius-lg);
  background: var(--lav-50);
}

.quote-card > p {
  font-size: 13px;
  line-height: 1.75;
  color: var(--ink-soft);
}

.quote-card__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: var(--ink-faint);
  font-size: 10px;
}

/* CTA ------------------------------------------------------------------- */
.cta-section {
  padding-top: 16px;
}

.cta {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(30px, 5vw, 54px);
  border: 1px solid rgba(130, 114, 239, 0.14);
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, #f4f0ff 0%, #fbf8ff 48%, #eef9f4 100%);
  overflow: hidden;
}

.cta__copy {
  position: relative;
  z-index: 2;
  max-width: 55ch;
}

.cta h2 {
  margin-top: 9px;
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 670;
  letter-spacing: -0.04em;
}

.cta p {
  margin-top: 10px;
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.7;
}

.cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.cta__art {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240px;
  min-height: 200px;
}

.cta__ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(130, 114, 239, 0.18);
}

.cta__ring--one {
  width: 220px;
  height: 220px;
}

.cta__ring--two {
  width: 168px;
  height: 168px;
  background: rgba(255, 255, 255, 0.4);
}

/* Footer ---------------------------------------------------------------- */
.site-footer {
  margin-top: 30px;
  padding: 40px 0 26px;
  border-top: 1px solid var(--line);
  background: rgba(255, 253, 249, 0.6);
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  gap: 40px;
}

.site-footer__brand p {
  max-width: 28ch;
  margin-top: 12px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.site-footer__cols {
  display: flex;
  gap: clamp(32px, 6vw, 74px);
}

.site-footer__cols h4 {
  margin-bottom: 9px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.site-footer__cols a,
.site-footer__cols span {
  display: block;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 11px;
}

.site-footer__cols a:hover {
  color: var(--lav-700);
}

.site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-size: 9.5px;
}

/* Responsive ------------------------------------------------------------ */
@media (max-width: 1080px) {
  .feature-card {
    padding: 22px 20px 18px;
  }

  .float-card--plan {
    right: -2px;
  }

  .hero__mascot {
    right: -14px;
  }
}

@media (max-width: 980px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }

  .hero__copy {
    max-width: 640px;
  }

  .hero__art {
    min-height: 420px;
    max-width: 520px;
    margin: 6px auto 0;
    width: 100%;
  }

  .why__inner {
    grid-template-columns: 1fr;
  }

  .why__copy {
    max-width: 660px;
  }

  .why__panel {
    max-width: 560px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
    max-width: 620px;
    margin-inline: auto;
  }

  .feature-card {
    padding: 24px;
  }

  .steps {
    grid-template-columns: 1fr;
    max-width: 560px;
    margin-inline: auto;
  }

  .cta {
    flex-direction: column;
    align-items: flex-start;
  }

  .cta__art {
    align-self: center;
  }
}

@media (max-width: 820px) {
  .site-nav,
  .site-header__login,
  .site-header__cta {
    display: none;
  }

  .site-header__menu {
    display: inline-flex;
  }

  .mobile-menu {
    display: flex;
  }

  .scenes__inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
  }

  .site-footer__inner {
    flex-direction: column;
    gap: 26px;
  }

  .site-footer__cols {
    justify-content: space-between;
    gap: 20px;
  }
}

@media (max-width: 560px) {
  .hero {
    padding-top: 30px;
  }

  .hero__title {
    font-size: clamp(36px, 11vw, 46px);
  }

  .hero__actions .btn {
    width: 100%;
  }

  .hero__trust {
    gap: 8px 14px;
  }

  .hero__art {
    min-height: 386px;
    padding-inline: 0;
  }

  .preview-card {
    width: 100%;
    padding: 16px;
    transform: none;
  }

  .preview-card__summary {
    gap: 12px;
  }

  .float-card--plan {
    top: -14px;
    right: 0;
  }

  .hero__mascot {
    width: 96px;
    height: 96px;
    right: -6px;
    bottom: -34px;
  }

  .section {
    padding: 48px 0;
  }

  .section-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .cta__art {
    width: 100%;
    min-height: 160px;
  }

  .cta__ring--one {
    width: 170px;
    height: 170px;
  }

  .cta__ring--two {
    width: 130px;
    height: 130px;
  }

  .cta__art :deep(.mascot) {
    width: 150px;
    height: 150px;
  }

  .site-footer__cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .site-footer__bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
