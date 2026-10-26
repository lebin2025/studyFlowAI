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
  --btn-height: 46px;
  --btn-padding: 22px;
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
  font-size: 14px;
  font-weight: 610;
  line-height: 1;
  letter-spacing: -0.012em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  transition:
    transform var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.btn::after {
  content: '';
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 42%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  transform: translateX(-160%) skewX(-18deg);
  pointer-events: none;
}

.btn:hover::after {
  animation: sheen 900ms var(--ease-out);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn--sm {
  --btn-height: 36px;
  --btn-padding: 15px;
  gap: 6px;
  font-size: 12.5px;
}

.btn--lg {
  --btn-height: 56px;
  --btn-padding: 30px;
  font-size: 15px;
  letter-spacing: -0.018em;
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
  color: #fdfaf4;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 52%),
    var(--ink);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 20px 40px -22px rgba(23, 19, 29, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.btn--primary:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 52%),
    #2a2433;
  transform: translateY(-2px);
  box-shadow:
    0 26px 48px -24px rgba(23, 19, 29, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
  background: var(--ink);
}

.btn--secondary {
  color: var(--ink);
  background: rgba(252, 249, 243, 0.62);
  border-color: var(--line-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(14px);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--surface);
  border-color: rgba(133, 114, 239, 0.46);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.btn--mint {
  color: #06251c;
  background: var(--aurora);
  box-shadow: var(--shadow-mint);
}

.btn--mint:hover:not(:disabled) {
  background: #b8f3dd;
  transform: translateY(-2px);
}

.btn--soft {
  color: var(--lav-700);
  background: var(--lav-100);
  border-color: rgba(133, 114, 239, 0.18);
}

.btn--soft:hover:not(:disabled) {
  background: #e2dbff;
  transform: translateY(-2px);
}

.btn--ghost {
  color: var(--ink-soft);
  background: transparent;
}

.btn--ghost:hover:not(:disabled) {
  background: rgba(27, 24, 33, 0.06);
  color: var(--ink);
}

.btn--inverse {
  color: #15111c;
  background:
    linear-gradient(180deg, #fffaf1, #e9e0d2);
  border-color: rgba(255, 255, 255, 0.75);
  box-shadow:
    0 18px 40px -20px rgba(0, 0, 0, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.btn--inverse:hover:not(:disabled) {
  background: #fffdf7;
  transform: translateY(-2px);
  box-shadow:
    0 26px 48px -22px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 #fff;
}

.btn--glass {
  color: var(--on-dark);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--line-dark-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}

.btn--glass:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.11);
  border-color: rgba(255, 255, 255, 0.36);
  transform: translateY(-2px);
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
