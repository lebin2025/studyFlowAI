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
