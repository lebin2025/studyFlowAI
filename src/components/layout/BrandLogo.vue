<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  size: { type: Number, default: 34 },
  showWordmark: { type: Boolean, default: true },
  to: { type: [String, Object], default: '/' },
  compact: { type: Boolean, default: false },
})

const tag = computed(() => (props.to ? RouterLink : 'span'))
</script>

<template>
  <component :is="tag" :to="to || undefined" class="brand" :class="{ 'brand--compact': compact }">
    <span class="brand__mark" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M32 47c-9.4 0-17-6.7-17-15 0-1.4.2-2.7.5-4 2.5 1.2 5.3 1.8 8.2 1.8 3.6 0 7-1 9.9-2.7 2.2 1 4.6 1.5 7.2 1.6 2.4.1 4.8-.2 6.9-1A15.2 15.2 0 0 1 49 32c0 8.3-7.6 15-17 15Z"
          fill="#F1EADF"
        />
        <circle cx="25.5" cy="34" r="2.2" fill="#292531" />
        <circle cx="38.5" cy="34" r="2.2" fill="#292531" />
        <path d="M28.5 40c1.1 1.3 2.3 2 3.5 2s2.4-.7 3.5-2" stroke="#292531" stroke-width="2.2" stroke-linecap="round" fill="none" />
        <path d="M32 25c-1.8-6.2.7-11.6 6.6-15.1.9 5.9-1.4 11.2-6.6 15.1Z" fill="#6FC3A8" />
        <path d="M32 25c-4.3-3.6-9.4-4.4-14.2-1.9 3.5 4.6 8.3 6.2 14.2 1.9Z" fill="#8272EF" />
        <path d="M32 25v-2" stroke="#3F9D82" stroke-width="2" stroke-linecap="round" />
      </svg>
    </span>
    <span v-if="showWordmark" class="brand__text">
      <span class="brand__name">StudyFlow</span>
      <span class="brand__ai">AI</span>
    </span>
  </component>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  color: inherit;
}

.brand__mark {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 12px;
  background: rgba(252, 249, 243, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    0 10px 24px -14px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: transform var(--duration) var(--ease);
}

.brand:hover .brand__mark {
  transform: rotate(-4deg) scale(1.03);
}

.brand__mark svg {
  width: 100%;
  height: 100%;
}

.brand__text {
  display: inline-flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.brand__name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 680;
  letter-spacing: -0.045em;
  line-height: 1;
}

.brand__ai {
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(133, 114, 239, 0.16);
  color: var(--lav-700);
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.06em;
  line-height: 1;
  transform: translateY(-1px);
}

.brand--compact .brand__name {
  font-size: 16px;
}
</style>
