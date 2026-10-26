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
  border: 1px solid var(--ink);
  border-radius: 0;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 580;
  line-height: 1;
  letter-spacing: -0.005em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition:
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.btn:disabled,
.btn[aria-disabled='true'] {
  opacity: 0.42;
  pointer-events: none;
}

.btn--primary {
  background: var(--ink);
  color: var(--bg);
}

.btn--primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
}

.btn--secondary {
  background: transparent;
  color: var(--ink);
}

.btn--secondary:hover {
  background: var(--ink);
  color: var(--bg);
}

.btn--soft {
  border-color: var(--line);
  background: transparent;
  color: var(--ink-muted);
}

.btn--soft:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.btn--ghost {
  height: auto;
  min-height: 30px;
  padding: 0;
  border-color: transparent;
  border-bottom: 1px solid var(--line-strong);
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.btn--ghost:hover {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.btn--danger {
  border-color: var(--accent);
  background: transparent;
  color: var(--accent);
}

.btn--danger:hover {
  background: var(--accent);
  color: var(--accent-ink);
}

.btn--inverse {
  border-color: var(--bg);
  background: var(--bg);
  color: var(--ink);
}

.btn--inverse:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
}

.btn--glass {
  border-color: rgba(241, 237, 228, 0.34);
  background: transparent;
  color: var(--bg);
}

.btn--glass:hover {
  border-color: var(--bg);
  background: var(--bg);
  color: var(--ink);
}

.btn--sm {
  --btn-height: 34px;
  --btn-padding: 13px;
  gap: 6px;
  font-size: 11px;
}

.btn--lg {
  --btn-height: 50px;
  --btn-padding: 24px;
  gap: 9px;
  font-size: 13px;
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