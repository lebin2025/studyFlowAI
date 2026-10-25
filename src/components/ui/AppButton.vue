<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  iconOnly: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['click'])

const isDisabled = computed(() => props.disabled || props.loading)
const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
const bindings = computed(() =>
  props.to ? { to: props.to } : props.href ? { href: props.href } : {},
)

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  {
    'btn--block': props.block,
    'btn--icon': props.iconOnly,
    'btn--loading': props.loading,
  },
])

const onClick = (event) => {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="tag"
    v-bind="{ ...$attrs, ...bindings }"
    :class="classes"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? isDisabled : undefined"
    :aria-disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel || undefined"
    :tabindex="isDisabled && tag !== 'button' ? -1 : $attrs.tabindex"
    @click="onClick"
  >
    <Loader2 v-if="loading" class="btn__spinner" :size="size === 'sm' ? 14 : 17" aria-hidden="true" />
    <slot v-else name="icon" />
    <span v-if="!iconOnly" class="btn__label"><slot /></span>
    <slot name="trailing" />
  </component>
</template>

<style scoped>
.btn {
  --btn-height: 44px;
  --btn-padding: 20px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: var(--btn-height);
  padding: 0 var(--btn-padding);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 14.5px;
  font-weight: 590;
  line-height: 1;
  letter-spacing: -0.005em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition:
    transform var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn--sm {
  --btn-height: 34px;
  --btn-padding: 14px;
  gap: 6px;
  font-size: 13px;
}

.btn--lg {
  --btn-height: 52px;
  --btn-padding: 26px;
  font-size: 15.5px;
}

.btn--block {
  display: flex;
  width: 100%;
}

.btn--icon {
  width: var(--btn-height);
  padding: 0;
}

.btn--primary {
  color: #fff;
  background: var(--lav-600);
  box-shadow:
    var(--shadow-accent),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.btn--primary:hover:not(:disabled) {
  background: var(--lav-500);
  transform: translateY(-1px);
  box-shadow:
    0 18px 34px -16px rgba(106, 88, 223, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
  background: var(--lav-700);
}

.btn--secondary {
  color: var(--ink);
  background: var(--surface);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-xs);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--surface-soft);
  border-color: var(--lav-300);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn--mint {
  color: #fff;
  background: var(--mint-600);
  box-shadow: var(--shadow-mint);
}

.btn--mint:hover:not(:disabled) {
  background: #359076;
  transform: translateY(-1px);
}

.btn--soft {
  color: var(--lav-700);
  background: var(--lav-100);
}

.btn--soft:hover:not(:disabled) {
  background: #e6e0ff;
  transform: translateY(-1px);
}

.btn--ghost {
  color: var(--ink-soft);
  background: transparent;
}

.btn--ghost:hover:not(:disabled) {
  background: var(--surface-muted);
  color: var(--ink);
}

.btn--danger {
  color: var(--danger-700);
  background: var(--danger-100);
}

.btn--danger:hover:not(:disabled) {
  background: #fbdede;
  transform: translateY(-1px);
}

.btn--link {
  height: auto;
  padding: 0;
  border-radius: 4px;
  color: var(--lav-700);
  background: transparent;
}

.btn--link:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.btn:disabled,
.btn--loading {
  cursor: not-allowed;
  opacity: 0.58;
  transform: none;
  box-shadow: none;
}

.btn--loading {
  cursor: progress;
}

.btn__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.btn__spinner {
  animation: spin 0.9s linear infinite;
}
</style>
