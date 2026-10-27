<script setup>
import { computed, onBeforeUnmount, ref, useAttrs, useId, watch } from 'vue'
import { CircleAlert, Eye, EyeOff } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  revealable: { type: Boolean, default: true },
  id: { type: String, default: '' },
  autocomplete: { type: String, default: undefined },
  shakeSignal: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])
const generatedId = useId()
const inputId = computed(() => props.id || `field-${generatedId}`)
const errorId = computed(() => `${inputId.value}-error`)
const hintId = computed(() => `${inputId.value}-hint`)
const showPassword = ref(false)
const shaking = ref(false)
let shakeTimer = null

const triggerShake = () => {
  if (!props.error) return
  shaking.value = false
  window.clearTimeout(shakeTimer)
  window.requestAnimationFrame(() => {
    shaking.value = true
    shakeTimer = window.setTimeout(() => {
      shaking.value = false
    }, 560)
  })
}

watch(
  () => props.error,
  (next, previous) => {
    if (next && next !== previous) triggerShake()
  },
)

watch(
  () => props.shakeSignal,
  (next, previous) => {
    if (next !== previous) triggerShake()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(shakeTimer)
})

const actualType = computed(() => {
  if (props.type !== 'password') return props.type
  return showPassword.value ? 'text' : 'password'
})

const describedBy = computed(() => {
  if (props.error) return errorId.value
  if (props.hint) return hintId.value
  return undefined
})

const onInput = (event) => emit('update:modelValue', event.target.value)
</script>

<template>
  <div
    class="field"
    :class="[{ 'field--error': error, 'field--disabled': disabled }, $attrs.class]"
    :style="$attrs.style"
  >
    <label v-if="label" class="field__label" :for="inputId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__control" :class="{ 'is-shaking': shaking }">
      <span v-if="$slots.prefix" class="field__icon"><slot name="prefix" /></span>
      <input
        v-bind="controlAttrs"
        :id="inputId"
        class="field__input"
        :value="modelValue"
        :type="actualType"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="onInput"
      />
      <button
        v-if="type === 'password' && revealable"
        type="button"
        class="field__reveal"
        :aria-label="showPassword ? '隐藏密码' : '显示密码'"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        <EyeOff v-if="showPassword" :size="16" />
        <Eye v-else :size="16" />
      </button>
      <slot name="suffix" />
    </div>
    <p v-if="hint && !error" :id="hintId" class="field__hint">{{ hint }}</p>
    <Transition name="field-error">
      <p v-if="error" :id="errorId" class="field__error" role="alert">
        <CircleAlert :size="13" aria-hidden="true" />
        <span>{{ error }}</span>
      </p>
    </Transition>
  </div>
</template>
