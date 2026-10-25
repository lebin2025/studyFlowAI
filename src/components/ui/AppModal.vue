<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' },
  closeOnOverlay: { type: Boolean, default: true },
  showClose: { type: Boolean, default: true },
  ariaLabel: { type: String, default: '对话框' },
})

const emit = defineEmits(['update:modelValue', 'close'])
const panel = ref(null)
const titleId = `modal-title-${useId()}`
let previous = null
let open = false

const focusables = () => {
  if (!panel.value) return []
  return Array.from(
    panel.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const onKeydown = (event) => {
  if (!open) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (!items.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const focusTarget = () => {
  if (!panel.value) return null
  return (
    panel.value.querySelector(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
    ) ||
    panel.value.querySelector('.modal__footer .btn:not([disabled])') ||
    focusables()[0] ||
    panel.value
  )
}

const activate = async () => {
  if (open) return
  open = true
  previous = document.activeElement
  document.body.style.overflow = 'hidden'
  await nextTick()
  focusTarget()?.focus?.()
  document.addEventListener('keydown', onKeydown, true)
}

const deactivate = () => {
  if (!open) return
  open = false
  document.removeEventListener('keydown', onKeydown, true)
  document.body.style.overflow = ''
  if (previous?.focus) previous.focus()
  previous = null
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) activate()
    else deactivate()
  },
  { immediate: true },
)

onBeforeUnmount(deactivate)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal"
        @mousedown.self="closeOnOverlay && close()"
      >
        <div
          ref="panel"
          class="modal__panel"
          :class="`modal__panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="title ? undefined : ariaLabel"
          tabindex="-1"
        >
          <header class="modal__header">
            <div class="modal__heading">
              <h2 v-if="title" :id="titleId" class="modal__title">{{ title }}</h2>
              <p v-if="description" class="modal__description">{{ description }}</p>
            </div>
            <button
              v-if="showClose"
              type="button"
              class="modal__close"
              aria-label="关闭对话框"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>
          <div class="modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(35, 31, 43, 0.42);
  backdrop-filter: blur(5px);
  overflow-y: auto;
}

.modal__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 48px);
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-xl);
  box-shadow: 0 40px 90px -30px rgba(31, 27, 39, 0.45);
  overflow: hidden;
}

.modal__panel--sm {
  max-width: 420px;
}

.modal__panel--md {
  max-width: 560px;
}

.modal__panel--lg {
  max-width: 760px;
}

.modal__panel--xl {
  max-width: 940px;
}

.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px 16px;
}

.modal__heading {
  min-width: 0;
}

.modal__title {
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.modal__description {
  margin-top: 6px;
  color: var(--ink-muted);
  font-size: 13.5px;
  line-height: 1.6;
}

.modal__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--ink-muted);
  background: var(--surface-muted);
  transition:
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease);
}

.modal__close:hover {
  background: var(--line);
  color: var(--ink);
  transform: rotate(90deg);
}

.modal__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 28px 26px;
}

.modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 28px;
  border-top: 1px solid var(--line);
  background: var(--surface-soft);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 220ms var(--ease);
}

.modal-enter-active .modal__panel,
.modal-leave-active .modal__panel {
  transition:
    transform 260ms var(--ease),
    opacity 220ms var(--ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal__panel,
.modal-leave-to .modal__panel {
  opacity: 0;
  transform: translateY(14px) scale(0.975);
}

@media (max-width: 640px) {
  .modal {
    align-items: flex-end;
    padding: 0;
  }

  .modal__panel {
    max-width: none;
    max-height: 92dvh;
    border-radius: 26px 26px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .modal__panel::before {
    content: '';
    position: absolute;
    top: 9px;
    left: 50%;
    width: 38px;
    height: 4px;
    margin-left: -19px;
    border-radius: 999px;
    background: var(--line-strong);
  }

  .modal__header {
    padding: 26px 20px 14px;
  }

  .modal__body {
    padding: 2px 20px 22px;
  }

  .modal__footer {
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0));
  }

  .modal__title {
    font-size: 18px;
  }

  .modal-enter-from .modal__panel,
  .modal-leave-to .modal__panel {
    transform: translateY(100%);
  }
}
</style>
