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
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(19, 17, 14, 0.46);
}

.modal__panel {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 90dvh;
  overflow: auto;
  background: var(--bg);
  border: 1px solid var(--ink);
  border-top: 3px solid var(--accent);
  border-radius: 0;
  box-shadow: 12px 12px 0 rgba(19, 17, 14, 0.1);
}

.modal__panel--sm {
  max-width: 400px;
}

.modal__panel--lg {
  max-width: 760px;
}

.modal__panel--xl {
  max-width: 980px;
}

.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--line);
}

.modal__heading {
  min-width: 0;
}

.modal__title {
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.05em;
}

.modal__description {
  max-width: 52ch;
  margin-top: 7px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.modal__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line-strong);
  color: var(--ink-muted);
  transition:
    color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.modal__close:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.modal__body {
  padding: 18px 24px 22px;
}

.modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--line);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration) var(--ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal__panel,
.modal-leave-active .modal__panel {
  transition: transform var(--duration-slow) var(--ease);
}

.modal-enter-from .modal__panel,
.modal-leave-to .modal__panel {
  transform: translateY(16px);
}

@media (max-width: 640px) {
  .modal {
    align-items: flex-end;
    padding: 0;
  }

  .modal__panel {
    max-width: none;
    max-height: 92dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
    box-shadow: none;
  }

  .modal__header {
    padding: 18px 18px 12px;
  }

  .modal__body {
    padding: 16px 18px 20px;
  }

  .modal__footer {
    padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .modal-enter-from .modal__panel,
  .modal-leave-to .modal__panel {
    transform: translateY(100%);
  }
}
</style>