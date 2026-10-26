<script setup>
import Mascot from '@/components/illustrations/Mascot.vue'

defineProps({
  title: { type: String, default: '这里还空空的' },
  description: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  variant: { type: String, default: 'happy' },
})
</script>

<template>
  <div class="empty" :class="{ 'empty--compact': compact }">
    <div class="empty__art">
      <Mascot :size="compact ? 92 : 124" :variant="variant" :animated="!compact" />
    </div>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="description" class="empty__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 0;
  text-align: left;
}

.empty--compact {
  padding: 16px 0;
}

.empty__art {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  padding: 0;
}

.empty__art::before {
  display: none;
}

.empty__title {
  position: relative;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.empty--compact .empty__title {
  font-size: 18px;
}

.empty__description {
  position: relative;
  max-width: 40ch;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.7;
}

.empty__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
</style>