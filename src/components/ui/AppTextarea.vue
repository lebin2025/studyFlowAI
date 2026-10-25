<script setup>
import { computed, useAttrs, useId } from 'vue'
import { CircleAlert } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  maxlength: { type: Number, default: 1000 },
  showCount: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
const generatedId = useId()
const fieldId = computed(() => props.id || `textarea-${generatedId}`)
const errorId = computed(() => `${fieldId.value}-error`)
const hintId = computed(() => `${fieldId.value}-hint`)

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
    <label v-if="label" class="field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__control field__control--area">
      <textarea
        v-bind="controlAttrs"
        :id="fieldId"
        class="field__textarea"
        :value="modelValue"
        :rows="rows"
        :maxlength="maxlength"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="onInput"
      />
    </div>
    <div class="row-between">
      <p v-if="hint && !error" :id="hintId" class="field__hint">{{ hint }}</p>
      <span v-else-if="error" :id="errorId" class="field__error" role="alert">
        <CircleAlert :size="13" aria-hidden="true" />
        <span>{{ error }}</span>
      </span>
      <span v-if="showCount" class="field__counter">{{ modelValue.length }} / {{ maxlength }}</span>
    </div>
  </div>
</template>
