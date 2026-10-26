<script setup>
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  backTo: { type: [String, Object], default: null },
  backLabel: { type: String, default: '返回' },
})
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <RouterLink v-if="backTo" :to="backTo" class="page-header__back">
        <ArrowLeft :size="15" />
        {{ backLabel }}
      </RouterLink>
      <p v-if="eyebrow" class="eyebrow page-header__eyebrow">{{ eyebrow }}</p>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="description" class="page-header__description">{{ description }}</p>
      <div v-if="$slots.meta" class="page-header__meta">
        <slot name="meta" />
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.page-header__main {
  min-width: 0;
}

.page-header__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 12px;
  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 550;
  transition: color var(--duration-fast) var(--ease);
}

.page-header__back:hover {
  color: var(--lav-700);
}

.page-header__eyebrow {
  display: flex;
  margin-bottom: 8px;
}

.page-header__title {
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 660;
  letter-spacing: -0.035em;
}

.page-header__description {
  max-width: 62ch;
  margin-top: 9px;
  color: var(--ink-muted);
  font-size: 14.5px;
  line-height: 1.7;
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  flex: none;
}

@media (max-width: 760px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
    margin-bottom: 22px;
  }

  .page-header__actions {
    width: 100%;
  }

  .page-header__actions :deep(.btn) {
    flex: 1;
  }

  .page-header__title {
    font-size: 27px;
  }
}
</style>

<style scoped>
/* 2026 / editorial page masthead */
.page-header {
  position: relative;
  margin-bottom: 30px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.page-header::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -1px;
  width: 96px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--lav-500));
}

.page-header__back {
  margin-bottom: 14px;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.04em;
}

.page-header__eyebrow {
  margin-bottom: 10px;
  font-size: 9px;
}

.page-header__title {
  max-width: 18ch;
  font-size: clamp(34px, 4vw, 52px);
  font-weight: 650;
  line-height: 1;
  letter-spacing: -0.055em;
}

.page-header__description {
  max-width: 58ch;
  margin-top: 12px;
  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.75;
}

.page-header__actions {
  gap: 9px;
}

@media (max-width: 760px) {
  .page-header {
    margin-bottom: 22px;
    padding-bottom: 18px;
  }

  .page-header__title {
    font-size: clamp(30px, 8vw, 40px);
  }

  .page-header__actions :deep(.btn) {
    flex: 1;
  }
}
</style>
