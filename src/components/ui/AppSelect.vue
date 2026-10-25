<script setup>
import { computed, useAttrs, useId } from 'vue'
import { ChevronDown, CircleAlert } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
const generatedId = useId()
const selectId = computed(() => props.id || `select-${generatedId}`)
const errorId = computed(() => `${selectId.value}-error`)

const normalizedOptions = computed(() =>
  props.options.map((option) =>
    typeof option === 'object'
      ? { value: option.value, label: option.label ?? String(option.value) }
      : { value: option, label: String(option) },
  ),
)

const showPlaceholder = computed(
  () =>
    Boolean(props.placeholder) &&
    !normalizedOptions.value.some((option) => String(option.value) === ''),
)

const onChange = (event) => {
  const raw = event.target.value
  const matched = normalizedOptions.value.find((option) => String(option.value) === raw)
  emit('update:modelValue', matched ? matched.value : raw)
}
</script>

<template>
  <div
    class="field"
    :class="[{ 'field--error': error, 'field--disabled': disabled }, $attrs.class]"
    :style="$attrs.style"
  >
    <label v-if="label" class="field__label" :for="selectId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__control">
      <span v-if="$slots.prefix" class="field__icon"><slot name="prefix" /></span>
      <span class="field__select-wrap">
        <select
          v-bind="controlAttrs"
          :id="selectId"
          class="field__select"
          :value="modelValue"
          :disabled="disabled"
          :required="required"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? errorId : undefined"
          @change="onChange"
        >
          <option v-if="showPlaceholder" value="" disabled>{{ placeholder }}</option>
          <option
            v-for="option in normalizedOptions"
            :key="String(option.value)"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <ChevronDown class="field__chevron" :size="16" aria-hidden="true" />
      </span>
    </div>
    <p v-if="hint && !error" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error" role="alert">
      <CircleAlert :size="13" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
