<script setup>
defineProps({
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="empty" :class="{ 'empty--compact': compact }">
    <span class="empty__mark" aria-hidden="true"><i /><i /><i /></span>
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
  padding: 22px 0;
  text-align: left;
}

.empty--compact {
  padding: 14px 0;
}

.empty__mark {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 18px;
  margin-bottom: 12px;
}

.empty__mark i {
  display: block;
  width: 5px;
  border-radius: 3px;
  background: var(--line-strong);
}

.empty__mark i:nth-child(1) {
  height: 7px;
}

.empty__mark i:nth-child(2) {
  height: 15px;
  background: var(--accent);
}

.empty__mark i:nth-child(3) {
  height: 10px;
}

.empty__title {
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.025em;
}

.empty--compact .empty__title {
  font-size: 14px;
}

.empty__description {
  max-width: 42ch;
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.6;
}

.empty__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
</style>