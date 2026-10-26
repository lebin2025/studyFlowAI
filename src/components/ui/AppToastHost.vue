<script setup>
import { storeToRefs } from 'pinia'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui.js'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="status"
        >
          <span class="toast__icon" aria-hidden="true">
            <component :is="icons[toast.type] || Info" :size="18" />
          </span>
          <div class="toast__content">
            <p v-if="toast.title" class="toast__title">{{ toast.title }}</p>
            <p class="toast__message">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="toast__close"
            aria-label="关闭提示"
            @click="ui.dismiss(toast.id)"
          >
            <X :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: max(20px, env(safe-area-inset-top, 0px));
  right: 20px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.toast__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 30px;
  height: 30px;
  margin-top: 1px;
  border-radius: 0;
}

.toast--success .toast__icon {
  color: var(--success-600);
  background: var(--success-100);
}

.toast--error .toast__icon {
  color: var(--danger-600);
  background: var(--danger-100);
}

.toast--warning .toast__icon {
  color: var(--warning-600);
  background: var(--warning-100);
}

.toast--info .toast__icon {
  color: var(--lav-700);
  background: var(--lav-100);
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--ink);
}

.toast__message {
  margin-top: 1px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--ink-faint);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.toast__close:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 220ms var(--ease),
    transform 260ms var(--ease);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(18px) scale(0.97);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.97);
}

.toast-move {
  transition: transform 260ms var(--ease);
}

@media (max-width: 640px) {
  .toast-host {
    top: auto;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    right: 12px;
    left: 12px;
    width: auto;
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(12px) scale(0.98);
  }
}
</style>
