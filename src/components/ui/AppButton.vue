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
  --btn-height: 40px;
  --btn-padding: 16px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: var(--btn-height);
  padding: 0 var(--btn-padding);
  border: 1px solid transparent;
  border-radius: 10px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.005em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    transform var(--duration-fast) var(--ease);
}

.btn:active {
  transform: scale(0.985);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn:disabled,
.btn[aria-disabled='true'] {
  opacity: 0.42;
  pointer-events: none;
}

.btn--primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--bg);
  box-shadow: var(--shadow-xs);
}

.btn--primary:hover {
  background: #2b2924;
  border-color: #2b2924;
}

.btn--secondary {
  background: var(--surface);
  color: var(--ink-soft);
  box-shadow: var(--shadow-xs);
}

.btn--secondary:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.btn--soft {
  background: var(--surface-soft);
  color: var(--ink-soft);
}

.btn--soft:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.btn--ghost {
  height: auto;
  min-height: 30px;
  padding: 0 6px;
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 550;
}

.btn--ghost:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.btn--ai {
  background: transparent;
  color: var(--accent-deep);
  font-weight: 600;
}

.btn--ai :deep(svg) {
  color: var(--accent);
}

.btn--ai:hover {
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.btn--danger {
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.btn--danger:hover {
  background: var(--accent);
  color: var(--accent-ink);
}

.btn--inverse {
  background: var(--bg);
  border-color: var(--bg);
  color: var(--ink);
}

.btn--inverse:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.btn--glass {
  background: transparent;
  border-color: var(--line-dark-strong);
  color: var(--bg);
}

.btn--glass:hover {
  background: var(--bg);
  border-color: var(--bg);
  color: var(--ink);
}

.btn--sm {
  --btn-height: 32px;
  --btn-padding: 11px;
  gap: 5px;
  border-radius: 8px;
  font-size: 11.5px;
}

.btn--lg {
  --btn-height: 46px;
  --btn-padding: 20px;
  gap: 8px;
  border-radius: 11px;
  font-size: 13.5px;
}

.btn--block {
  width: 100%;
}

.btn--icon {
  --btn-padding: 0;
  width: var(--btn-height);
}

.btn__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn__spinner {
  animation: spin 0.9s linear infinite;
}

.btn :deep(svg) {
  flex: none;
}
</style>
<style scoped>
.btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 30% 0%, rgba(255, 255, 255, 0.2), transparent 58%);
  opacity: 0;
  transition: opacity var(--duration) var(--ease);
  pointer-events: none;
}

.btn--primary::before,
.btn--inverse::before {
  background: radial-gradient(circle at 32% -10%, rgba(255, 255, 255, 0.22), transparent 62%);
}

.btn--ai::before {
  background: radial-gradient(circle at 20% 20%, rgba(208, 69, 45, 0.16), transparent 70%);
}

.btn:hover::before {
  opacity: 1;
}

.btn > * {
  position: relative;
  z-index: 1;
}

.btn:active {
  transform: scale(0.975);
  transition-duration: 80ms;
}

.btn--primary:hover,
.btn--inverse:hover {
  box-shadow: var(--shadow-sm);
}

.btn--ai:hover {
  box-shadow: 0 8px 24px -20px rgba(208, 69, 45, 0.7);
}

.btn:hover .btn__label :deep(svg) {
  transform: translateX(1.5px);
}

.btn .btn__label :deep(svg) {
  transition: transform var(--duration) var(--ease);
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn::before,
  .btn .btn__label :deep(svg) {
    transition: none;
  }

  .btn:active {
    transform: none;
  }
}
</style>
