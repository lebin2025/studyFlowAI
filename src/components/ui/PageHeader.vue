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
  gap: 28px;
  margin-bottom: 24px;
}

.page-header__main {
  min-width: 0;
}

.page-header__back {
  display: flex;
  width: max-content;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 550;
  transition: color var(--duration-fast) var(--ease);
}

.page-header__back:hover {
  color: var(--ink);
}

.page-header__eyebrow {
  color: var(--accent);
  font-size: 11px;
}

.page-header__title {
  max-width: 18ch;
  margin-top: 6px;
  font-size: clamp(30px, 3.6vw, 42px);
  font-weight: 660;
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.page-header__description {
  max-width: 58ch;
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.65;
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 14px;
  margin-top: 12px;
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
    margin-bottom: 18px;
  }

  .page-header__title {
    font-size: clamp(28px, 8vw, 36px);
  }

  .page-header__actions {
    justify-content: flex-start;
    margin-top: 14px;
  }
}
</style>