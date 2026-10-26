<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Menu,
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-vue-next'
import BrandLogo from '@/components/layout/BrandLogo.vue'
import StudyLoom from '@/components/visuals/StudyLoom.vue'
import AppButton from '@/components/ui/AppButton.vue'
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
    title: 'AI 真的替你拆解',
    text: '把「学好英语」这类模糊目标，拆成阶段、每日任务、完成标准和复习安排，而不是给一份漂亮但用不上的计划。',
    foot: ['真实调用 DeepSeek', '结构化校验', '时间约束优先'],
  },
  {
    icon: CalendarCheck,
    title: '每天只面对今天',
    text: '仪表盘只呈现今天要做的一小步。做完打勾，进度自动同步到计划与统计，不需要手动维护表格。',
    foot: ['今日任务', '优先级', '一键完成'],
  },
  {
    icon: TrendingUp,
    title: '进度来自真实记录',
    text: '完成率、学习趋势、连续天数都来自你实际保存和完成的任务。没有数据时，我们诚实地显示空状态。',
    foot: ['真实统计', '趋势图', '阶段进度'],
  },
]

const steps = [
  {
    step: '01',
    title: '说出目标与时间',
    text: '描述想学什么、现在的基础、截止日期、每天能拿出多少时间。',
    meta: '约 2 分钟',
  },
  {
    step: '02',
    title: 'AI 生成并校验',
    text: '模型生成计划，系统再检查日期、每日时长、任务数量和结构是否合理。',
    meta: '通常 20–60 秒',
  },
  {
    step: '03',
    title: '每天完成一小步',
    text: '完成后打勾，进度自动更新；计划不合适时，用一句话让 AI 重新安排。',
    meta: '每天一点点',
  },
]

const scenes = ['四六级', '考研', '雅思 / 托福', '编程自学', '教师资格证', '语言入门', '期末复习']

const rhythm = [
  { day: '一', value: 72 },
  { day: '二', value: 46 },
  { day: '三', value: 88 },
  { day: '四', value: 34 },
  { day: '五', value: 64 },
  { day: '六', value: 100 },
  { day: '日', value: 54 },
]

const onScroll = () => {
  scrolled.value = window.scrollY > 10
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
        <BrandLogo :size="30" />

        <nav class="site-nav" aria-label="首页导航">
          <a href="#features">能力</a>
          <a href="#how">方法</a>
          <a href="#why">理念</a>
          <a href="#scenes">场景</a>
        </nav>

        <div class="site-header__actions">
          <RouterLink v-if="!auth.isAuthenticated" to="/login" class="site-header__login">
            登录
          </RouterLink>
          <AppButton :to="spaceTarget" size="sm">
            {{ auth.isAuthenticated ? '进入学习空间' : '开始使用' }}
            <template #trailing><ArrowRight :size="13" /></template>
          </AppButton>
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
          <a href="#features" @click="closeMenu">能力</a>
          <a href="#how" @click="closeMenu">方法</a>
          <a href="#why" @click="closeMenu">理念</a>
          <a href="#scenes" @click="closeMenu">场景</a>
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
      <section class="hero">
        <div class="container">
          <div class="hero__masthead">
            <span>STUDYFLOW / AI LEARNING ATELIER</span>
            <span>01 — 04</span>
          </div>

          <div class="hero__grid">
            <div class="hero__copy">
              <p class="eyebrow">为认真对待学习的人</p>
              <h1>
                <span>把目标</span>
                <span>织成</span>
                <span class="hero__accent">今天的一小步</span>
              </h1>
              <p class="hero__lead">
                StudyFlow AI 读你的目标、基础和时间，把它织成一张可以每天走通的网：
                阶段、任务、复习与进度，都落在今天。
              </p>
              <div class="hero__actions">
                <AppButton :to="primaryTarget" size="lg">
                  {{ primaryLabel }}
                  <template #trailing><ArrowRight :size="16" /></template>
                </AppButton>
                <a href="#how" class="hero__text-link">
                  看它如何工作
                  <ArrowRight :size="14" />
                </a>
              </div>
              <div class="hero__notes">
                <span><Check :size="12" /> 真实 AI 生成</span>
                <span><Check :size="12" /> 时间约束优先</span>
                <span><Check :size="12" /> 数据仅你可见</span>
              </div>
            </div>

            <div class="hero__diagram">
              <div class="hero__diagram-head">
                <span>FIG. 01 / LEARNING LOOM</span>
                <span>目标 × 时间 × 行动</span>
              </div>
              <StudyLoom />
            </div>
          </div>

          <div class="hero__foot">
            <span>不是把日程塞满，而是让今天有一个清楚的落点。</span>
            <span class="hero__foot-rule" aria-hidden="true" />
            <span class="hero__scroll">SCROLL / 继续阅读</span>
          </div>
        </div>
      </section>

      <section id="scenes" class="scenes">
        <div class="container scenes__inner">
          <span class="mono-label">适用场景 / SCENES</span>
          <ul>
            <li v-for="scene in scenes" :key="scene">{{ scene }}</li>
          </ul>
        </div>
      </section>

      <section id="features" class="features">
        <div class="container">
          <div class="section-heading" v-reveal>
            <span class="index-number">02</span>
            <h2>计划不是装饰，<br />是每天能走的一步。</h2>
            <p>
              从目标到今日任务，再到真实进度，整条链路都在同一个地方完成。
              没有漂亮但用不上的计划，也没有替你虚构的完成感。
            </p>
          </div>

          <div class="feature-ledger">
            <article v-for="(feature, index) in features" :key="feature.title" class="feature-row" v-reveal="{ delay: index * 80 }">
              <span class="feature-row__num">0{{ index + 1 }}</span>
              <span class="feature-row__icon">
                <component :is="feature.icon" :size="18" :stroke-width="1.6" />
              </span>
              <div class="feature-row__body">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.text }}</p>
              </div>
              <ul class="feature-row__tags">
                <li v-for="item in feature.foot" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="how" class="how">
        <div class="container">
          <div class="section-heading" v-reveal>
            <span class="index-number">03</span>
            <h2>三步，<br />从模糊到清晰。</h2>
            <p>不需要学习复杂的工具，也不需要先整理一份完美计划。先说出你想去哪，剩下的由系统接住。</p>
          </div>

          <div class="process">
            <article v-for="(step, index) in steps" :key="step.step" class="process-step" v-reveal="{ delay: index * 100 }">
              <span class="process-step__num">{{ step.step }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.text }}</p>
              </div>
              <span class="process-step__meta">{{ step.meta }}</span>
            </article>
          </div>
        </div>
      </section>

      <section id="why" class="why">
        <div class="container">
          <div class="section-heading" v-reveal>
            <span class="index-number">04</span>
            <h2>少一点计划焦虑，<br />多一点真实进步。</h2>
            <p>很多学习工具帮你把日程塞得更满，却没有回答「今天到底该做什么」。</p>
          </div>

          <div class="why__grid">
            <div class="why__copy" v-reveal>
              <p class="why__lead">
                StudyFlow 把注意力放回今天的一小步。计划可以复杂，但入口必须简单；
                AI 可以强大，但结果必须由你确认。
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
                    <p>完成率、趋势、连续天数都与真实任务记录一致；没有历史数据时，我们不会编造。</p>
                  </div>
                </li>
                <li>
                  <span class="why__check"><Check :size="12" /></span>
                  <div>
                    <strong>你的数据只属于你</strong>
                    <p>每个读写接口都在后端校验身份与归属，不同账户之间的数据完全隔离。</p>
                  </div>
                </li>
              </ul>
            </div>

            <div class="why__data" v-reveal="{ delay: 120 }">
              <div class="rhythm-head">
                <span class="mono-label">本周节奏 / RHYTHM</span>
                <span>示意 · 你的数据来自真实记录</span>
              </div>
              <div class="rhythm">
                <div v-for="day in rhythm" :key="day.day" class="rhythm__bar">
                  <span class="rhythm__track">
                    <span class="rhythm__fill" :style="{ height: `${day.value}%` }" />
                  </span>
                  <span class="rhythm__day">{{ day.day }}</span>
                </div>
              </div>
              <div class="rhythm-stats">
                <div>
                  <strong>5.5h</strong>
                  <span>本周投入</span>
                </div>
                <div>
                  <strong>78%</strong>
                  <span>任务完成率</span>
                </div>
                <div>
                  <strong>04</strong>
                  <span>阶段复习</span>
                </div>
              </div>

              <blockquote class="why__quote">
                “不追求今天做完所有事，只追求今天往前一点点。”
                <cite>StudyFlow 小芽</cite>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section class="cta-section">
        <div class="container">
          <div class="cta" v-reveal>
            <div class="cta__copy">
              <p class="eyebrow">现在开始</p>
              <h2>今天，<br />就从一小步<br />开始。</h2>
              <p>告诉 AI 你的目标与时间，几分钟后，你会得到一份明天就能执行的计划。</p>
              <div class="cta__actions">
                <AppButton :to="primaryTarget" size="lg" variant="inverse">
                  {{ auth.isAuthenticated ? '生成新的学习计划' : '免费创建账户' }}
                  <template #trailing><ArrowRight :size="16" /></template>
                </AppButton>
                <AppButton v-if="!auth.isAuthenticated" to="/login" variant="glass" size="lg">
                  我已有账户
                </AppButton>
              </div>
            </div>
            <div class="cta__mark" aria-hidden="true">
              <span>FLOW</span>
              <span class="cta__mark-line" />
              <span>2026</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container">
        <div class="site-footer__inner">
          <div class="site-footer__brand">
            <BrandLogo :size="28" />
            <p>一个认真对待你时间的 AI 学习规划工具。</p>
          </div>
          <div class="site-footer__cols">
            <div>
              <h4>产品</h4>
              <a href="#features">能力</a>
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
              <span>Postgres · DeepSeek</span>
            </div>
          </div>
        </div>
        <div class="site-footer__bottom">
          <span>© 2026 StudyFlow AI</span>
          <span>AI 生成内容仅供学习参考，请结合自身情况调整。</span>
        </div>
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
  border-bottom: 1px solid var(--line);
  transition: border-color var(--duration) var(--ease);
}

.site-header.is-scrolled {
  border-bottom-color: var(--ink);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 70px;
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 26px;
}

.site-nav a {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color var(--duration-fast) var(--ease);
}

.site-nav a:hover {
  color: var(--accent);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.site-header__login {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.site-header__login:hover {
  color: var(--ink);
}

.site-header__menu {
  display: none;
  width: 34px;
  height: 34px;
  border: 1px solid var(--line-strong);
  color: var(--ink);
}

.mobile-menu {
  display: none;
  padding: 10px 20px 20px;
  background: var(--bg);
  border-bottom: 1px solid var(--ink);
}

.mobile-menu a {
  display: block;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mobile-menu__actions {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

/* Hero -------------------------------------------------------------------- */
.hero {
  padding: clamp(38px, 5vw, 76px) 0 0;
  background: var(--bg);
}

.hero__masthead {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--ink);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
}

.hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.03fr) minmax(0, 0.97fr);
  gap: clamp(28px, 4vw, 66px);
  padding: clamp(34px, 5vw, 58px) 0 28px;
}

.hero__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hero h1 {
  margin-top: 24px;
  font-size: clamp(54px, 6.7vw, 104px);
  font-weight: 600;
  line-height: 0.84;
  letter-spacing: -0.075em;
}

.hero h1 span {
  display: block;
  white-space: nowrap;
}

.hero h1 span:nth-child(2) {
  margin-left: 0.72em;
  font-style: italic;
  font-weight: 400;
}

.hero__accent {
  color: var(--accent);
}

.hero__lead {
  max-width: 40ch;
  margin-top: 30px;
  color: var(--ink-muted);
  font-size: 14.5px;
  line-height: 1.8;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  margin-top: 32px;
}

.hero__text-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--ink);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: color var(--duration-fast) var(--ease);
}

.hero__text-link:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.hero__notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin-top: 34px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.05em;
}

.hero__notes span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hero__notes svg {
  color: var(--accent);
}

.hero__diagram {
  min-width: 0;
  align-self: center;
}

.hero__diagram-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.hero__diagram :deep(.loom) {
  margin-top: 16px;
}

.hero__foot {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 0 26px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.05em;
}

.hero__foot-rule {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.hero__scroll {
  flex: none;
}

/* Scenes ------------------------------------------------------------------ */
.scenes {
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.scenes__inner {
  display: flex;
  align-items: center;
  gap: 32px;
  min-height: 62px;
}

.scenes__inner ul {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 24px;
  color: var(--ink-muted);
  font-size: 12px;
}

.scenes__inner li::before {
  content: '·';
  margin-right: 24px;
  color: var(--accent);
}

.scenes__inner li:first-child::before {
  display: none;
}

/* Shared section rhythm --------------------------------------------------- */
.features,
.how,
.why {
  padding: clamp(64px, 8vw, 120px) 0;
}

.features {
  background: var(--bg);
}

/* Features as a ledger, not cards ---------------------------------------- */
.feature-ledger {
  border-top: 1px solid var(--ink);
}

.feature-row {
  display: grid;
  grid-template-columns: 52px 42px minmax(0, 1fr) minmax(180px, 0.38fr);
  gap: 20px;
  align-items: start;
  padding: 26px 0;
  border-bottom: 1px solid var(--line);
  transition: background-color var(--duration) var(--ease);
}

.feature-row:hover {
  background: var(--surface);
}

.feature-row__num {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 28px;
  font-style: italic;
  line-height: 1;
}

.feature-row__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--ink);
  color: var(--ink);
}

.feature-row__body h3 {
  max-width: 18ch;
  font-family: var(--font-sans);
  font-size: clamp(18px, 2vw, 26px);
  font-weight: 520;
  letter-spacing: -0.04em;
  line-height: 1.2;
}

.feature-row__body p {
  max-width: 58ch;
  margin-top: 9px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.8;
}

.feature-row__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
}

.feature-row__tags li {
  padding: 3px 7px;
  border: 1px solid var(--line);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

/* How as a vertical score ------------------------------------------------- */
.how {
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.process {
  border-top: 1px solid var(--line);
}

.process-step {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 180px;
  gap: 28px;
  align-items: start;
  padding: 28px 0;
  border-bottom: 1px solid var(--line);
}

.process-step__num {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(52px, 6vw, 88px);
  font-style: italic;
  font-weight: 400;
  line-height: 0.75;
  letter-spacing: -0.06em;
}

.process-step h3 {
  font-family: var(--font-sans);
  font-size: 20px;
  font-weight: 540;
  letter-spacing: -0.03em;
}

.process-step p {
  max-width: 46ch;
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 12.5px;
  line-height: 1.8;
}

.process-step__meta {
  justify-self: end;
  padding-top: 4px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.05em;
  text-align: right;
  text-transform: uppercase;
}

/* Why --------------------------------------------------------------------- */
.why {
  background: var(--surface);
}

.why__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: clamp(34px, 6vw, 100px);
  padding-top: 10px;
}

.why__lead {
  max-width: 48ch;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.8;
}

.why__list {
  margin-top: 34px;
  border-top: 1px solid var(--line);
}

.why__list li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}

.why__check {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  border: 1px solid var(--accent);
  color: var(--accent);
}

.why__list strong {
  font-size: 13px;
  font-weight: 600;
}

.why__list p {
  max-width: 48ch;
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.why__data {
  position: relative;
  padding-left: clamp(20px, 3vw, 44px);
  border-left: 1px solid var(--ink);
}

.rhythm-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.rhythm-head > span:last-child {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  text-align: right;
}

.rhythm {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 240px;
  margin-top: 28px;
  padding-bottom: 25px;
  border-bottom: 1px solid var(--ink);
}

.rhythm__bar {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  height: 100%;
}

.rhythm__track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 100%;
  max-width: 34px;
  border-top: 1px solid var(--line);
}

.rhythm__fill {
  width: 100%;
  border-top: 2px solid var(--accent);
  background: var(--accent-soft);
}

.rhythm__day {
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.rhythm-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--line);
}

.rhythm-stats > div {
  padding: 18px 12px 16px 0;
  border-right: 1px solid var(--line);
}

.rhythm-stats > div:last-child {
  border-right: 0;
}

.rhythm-stats strong {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 42px);
  font-style: italic;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.05em;
}

.rhythm-stats span {
  display: block;
  margin-top: 7px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.04em;
}

.why__quote {
  margin: 30px 0 0;
  padding: 0 0 0 20px;
  border-left: 2px solid var(--accent);
  font-family: var(--font-display);
  font-size: clamp(18px, 2vw, 25px);
  line-height: 1.5;
  letter-spacing: -0.04em;
}

.why__quote cite {
  display: block;
  margin-top: 10px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  font-style: normal;
  letter-spacing: 0.05em;
}

/* CTA --------------------------------------------------------------------- */
.cta-section {
  padding: clamp(58px, 8vw, 110px) 0;
  background: var(--bg);
}

.cta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 0.32fr);
  gap: 30px;
  padding: clamp(32px, 6vw, 76px);
  background: var(--ink);
  color: var(--bg);
}

.cta h2 {
  margin-top: 22px;
  color: var(--bg);
  font-size: clamp(48px, 7vw, 104px);
  font-weight: 600;
  line-height: 0.86;
  letter-spacing: -0.07em;
}

.cta p {
  max-width: 40ch;
  margin-top: 20px;
  color: var(--on-dark-soft);
  font-size: 13px;
  line-height: 1.8;
}

.cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.cta__mark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  border-left: 1px solid var(--line-dark);
  padding-left: 22px;
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
}

.cta__mark-line {
  flex: 1;
  width: 1px;
  margin: 16px 0;
  background: var(--accent);
}

/* Footer ------------------------------------------------------------------ */
.site-footer {
  padding: 46px 0 24px;
  border-top: 1px solid var(--ink);
  background: var(--bg);
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  gap: 44px;
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
  gap: clamp(34px, 6vw, 76px);
}

.site-footer__cols h4 {
  margin-bottom: 10px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.site-footer__cols a,
.site-footer__cols span {
  display: block;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 11px;
}

.site-footer__cols a:hover {
  color: var(--accent);
}

.site-footer__bottom {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 34px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

/* Responsive -------------------------------------------------------------- */
@media (max-width: 1080px) {
  .hero h1 {
    font-size: clamp(52px, 7.8vw, 96px);
  }

  .hero__grid {
    gap: 28px;
  }

  .feature-row {
    grid-template-columns: 46px 38px minmax(0, 1fr);
  }

  .feature-row__tags {
    grid-column: 3;
    justify-content: flex-start;
  }
}

@media (max-width: 860px) {
  .site-nav,
  .site-header__login {
    display: none;
  }

  .site-header__menu {
    display: grid;
    place-items: center;
  }

  .mobile-menu {
    display: block;
  }

  .hero__grid {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .hero__copy {
    max-width: 720px;
  }

  .hero h1 {
    font-size: clamp(56px, 13vw, 96px);
  }

  .hero__diagram {
    max-width: 760px;
  }

  .why__grid {
    grid-template-columns: 1fr;
    gap: 42px;
  }

  .why__data {
    padding-left: 0;
    border-left: 0;
    border-top: 1px solid var(--ink);
    padding-top: 22px;
  }

  .cta {
    grid-template-columns: 1fr;
  }

  .cta__mark {
    display: none;
  }

  .site-footer__inner {
    flex-direction: column;
  }
}

@media (max-width: 620px) {
  .site-header__inner {
    height: 62px;
  }

  .hero {
    padding-top: 26px;
  }

  .hero__masthead {
    font-size: 7.5px;
  }

  .hero__grid {
    padding-top: 28px;
  }

  .hero h1 {
    margin-top: 18px;
    font-size: clamp(48px, 14.4vw, 72px);
  }

  .hero h1 span:nth-child(2) {
    margin-left: 0.45em;
  }

  .hero__lead {
    margin-top: 24px;
    font-size: 13.5px;
  }

  .hero__actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .hero__notes {
    gap: 7px 14px;
  }

  .hero__diagram-head {
    display: block;
    font-size: 7px;
  }

  .hero__diagram-head span:last-child {
    display: block;
    margin-top: 4px;
  }

  .hero__foot {
    display: block;
    font-size: 7.5px;
  }

  .hero__foot-rule,
  .hero__scroll {
    display: none;
  }

  .scenes__inner {
    display: block;
    padding-top: 16px;
    padding-bottom: 16px;
  }

  .scenes__inner ul {
    margin-top: 10px;
    gap: 6px 14px;
    font-size: 11px;
  }

  .scenes__inner li::before {
    margin-right: 14px;
  }

  .features,
  .how,
  .why {
    padding: 58px 0;
  }

  .feature-row {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 12px;
    padding: 20px 0;
  }

  .feature-row__num {
    grid-row: span 2;
    font-size: 24px;
  }

  .feature-row__icon {
    display: none;
  }

  .feature-row__body h3 {
    font-size: 20px;
  }

  .feature-row__tags {
    grid-column: 2;
  }

  .process-step {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 14px;
    padding: 22px 0;
  }

  .process-step__num {
    font-size: 46px;
  }

  .process-step__meta {
    grid-column: 2;
    justify-self: start;
    padding-top: 0;
    text-align: left;
  }

  .rhythm {
    height: 180px;
    gap: 6px;
  }

  .rhythm-stats strong {
    font-size: 28px;
  }

  .cta {
    padding: 28px 22px;
  }

  .cta h2 {
    font-size: clamp(46px, 13vw, 68px);
  }

  .cta__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .site-footer__cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .site-footer__bottom {
    display: block;
    line-height: 1.8;
  }

  .site-footer__bottom span {
    display: block;
  }
}
</style>
