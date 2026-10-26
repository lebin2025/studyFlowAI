<script setup>
import { TriangleAlert } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '确认' },
  cancelLabel: { type: String, default: '取消' },
  danger: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="confirm">
      <span class="confirm__icon" :class="{ 'confirm__icon--danger': danger }">
        <TriangleAlert :size="20" />
      </span>
      <div>
        <p class="confirm__message">{{ message }}</p>
        <slot />
      </div>
    </div>

    <template #footer>
      <AppButton variant="ghost" :disabled="loading" @click="emit('update:modelValue', false)">
        {{ cancelLabel }}
      </AppButton>
      <AppButton
        :variant="danger ? 'danger' : 'primary'"
        :loading="loading"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.confirm {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 4px 0 8px;
}

.confirm__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-strong);
  border-radius: 0;
  background: transparent;
  color: var(--warning-600);
}

.confirm__icon--danger {
  background: transparent;
  color: var(--danger-600);
}

.confirm__message {
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.7;
}
</style>
