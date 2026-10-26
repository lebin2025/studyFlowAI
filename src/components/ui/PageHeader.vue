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
  gap: 32px;
  padding-top: 12px;
  padding-bottom: 18px;
  margin-bottom: 26px;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
}

.page-header__main {
  min-width: 0;
}

.page-header__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 14px;
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: color var(--duration-fast) var(--ease);
}

.page-header__back:hover {
  color: var(--accent);
}

.page-header__eyebrow {
  color: var(--accent);
}

.page-header__title {
  max-width: 16ch;
  margin-top: 10px;
  font-size: clamp(38px, 5vw, 66px);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.page-header__description {
  max-width: 56ch;
  margin-top: 12px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.75;
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 16px;
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: none;
}

@media (max-width: 760px) {
  .page-header {
    display: block;
  }

  .page-header__title {
    max-width: 12ch;
    font-size: clamp(34px, 10vw, 48px);
  }

  .page-header__actions {
    justify-content: flex-start;
    margin-top: 18px;
  }
}
</style>