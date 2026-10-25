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
  align-items: center;
  justify-content: center;
  padding: 40px 24px 44px;
  text-align: center;
}

.empty--compact {
  padding: 22px 18px;
}

.empty__art {
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

.empty__art::before {
  content: '';
  position: absolute;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(130, 114, 239, 0.1), transparent 68%);
}

.empty--compact .empty__art::before {
  width: 88px;
  height: 88px;
}

.empty__title {
  position: relative;
  font-size: 16.5px;
  font-weight: 640;
  letter-spacing: -0.02em;
}

.empty--compact .empty__title {
  font-size: 14.5px;
}

.empty__description {
  position: relative;
  max-width: 38ch;
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 13px;
  line-height: 1.65;
}

.empty__actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 18px;
}
</style>
