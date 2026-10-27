<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId, watch } from 'vue'
import { Check, ChevronDown, CircleAlert } from 'lucide-vue-next'

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
const menuId = computed(() => `${selectId.value}-menu`)

const trigger = ref(null)
const menu = ref(null)
const open = ref(false)
const activeIndex = ref(-1)
const menuStyle = ref({})

const ITEM_HEIGHT = 36
const MENU_PADDING = 6
const MENU_MAX = 300

const normalizedOptions = computed(() =>
  props.options.map((option) =>
    typeof option === 'object'
      ? { value: option.value, label: option.label ?? String(option.value) }
      : { value: option, label: String(option) },
  ),
)

const selectedIndex = computed(() =>
  normalizedOptions.value.findIndex(
    (option) => String(option.value) === String(props.modelValue ?? ''),
  ),
)

const selectedOption = computed(() =>
  selectedIndex.value >= 0 ? normalizedOptions.value[selectedIndex.value] : null,
)

const showPlaceholder = computed(
  () =>
    Boolean(props.placeholder) &&
    !normalizedOptions.value.some((option) => String(option.value) === ''),
)

const displayLabel = computed(() => selectedOption.value?.label || props.placeholder)

const optionId = (index) => `${selectId.value}-option-${index}`

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const updatePosition = () => {
  if (!open.value || !trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const width = Math.max(rect.width, 168)
  const maxHeight = Math.min(MENU_MAX, viewportHeight - 16)
  const listHeight = Math.min(
    maxHeight,
    normalizedOptions.value.length * ITEM_HEIGHT + MENU_PADDING * 2,
  )
  const index = selectedIndex.value >= 0 ? selectedIndex.value : 0
  const selectedCenter = MENU_PADDING + index * ITEM_HEIGHT + ITEM_HEIGHT / 2
  const top = clamp(
    rect.top + rect.height / 2 - selectedCenter,
    8,
    viewportHeight - listHeight - 8,
  )
  const left = clamp(rect.left, 8, viewportWidth - width - 8)

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${listHeight}px`,
  }

  nextTick(() => {
    if (!menu.value) return
    const selected = menu.value.querySelector(`[data-index="${index}"]`)
    if (selected) {
      menu.value.scrollTop =
        selected.offsetTop - (menu.value.clientHeight - ITEM_HEIGHT) / 2
    }
  })
}

const openMenu = async () => {
  if (props.disabled) return
  open.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  await nextTick()
  updatePosition()
}

const closeMenu = ({ focusTrigger = false } = {}) => {
  if (!open.value) return
  open.value = false
  if (focusTrigger) trigger.value?.focus()
}

const toggle = () => {
  if (open.value) closeMenu()
  else openMenu()
}

const choose = (option) => {
  if (!option) {
    closeMenu({ focusTrigger: true })
    return
  }
  emit('update:modelValue', option.value)
  closeMenu({ focusTrigger: true })
}

const moveActive = (direction) => {
  if (!open.value) {
    openMenu()
    return
  }
  const count = normalizedOptions.value.length
  activeIndex.value = (activeIndex.value + direction + count) % count
  nextTick(() => {
    if (!menu.value) return
    const active = menu.value.querySelector(`[data-index="${activeIndex.value}"]`)
    if (active) {
      menu.value.scrollTop =
        active.offsetTop - (menu.value.clientHeight - ITEM_HEIGHT) / 2
    }
  })
}

const onTriggerKeydown = (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!open.value) openMenu()
    else moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) openMenu()
    else moveActive(-1)
    return
  }
  if (event.key === 'Home' && open.value) {
    event.preventDefault()
    activeIndex.value = 0
    return
  }
  if (event.key === 'End' && open.value) {
    event.preventDefault()
    activeIndex.value = normalizedOptions.value.length - 1
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (open.value) choose(normalizedOptions.value[activeIndex.value])
    else openMenu()
    return
  }
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closeMenu({ focusTrigger: true })
    return
  }
  if (event.key === 'Tab') closeMenu()
}

const onDocumentPointerDown = (event) => {
  if (!open.value) return
  if (trigger.value?.contains(event.target) || menu.value?.contains(event.target)) return
  closeMenu()
}

const onViewportChange = (event) => {
  if (event?.type === 'scroll' && menu.value?.contains(event.target)) return
  if (open.value) updatePosition()
}

watch(
  () => props.modelValue,
  () => {
    if (!open.value) return
    activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
    updatePosition()
  },
)

watch(
  () => props.options,
  () => {
    if (open.value) updatePosition()
  },
  { deep: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<template>
  <div
    class="field"
    :class="[
      { 'field--error': error, 'field--disabled': disabled, 'field--open': open },
      $attrs.class,
    ]"
    :style="$attrs.style"
  >
    <label v-if="label" class="field__label" :for="selectId">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>
    <div class="field__control">
      <span v-if="$slots.prefix" class="field__icon"><slot name="prefix" /></span>
      <button
        v-bind="controlAttrs"
        :id="selectId"
        ref="trigger"
        type="button"
        class="field__select-trigger"
        :class="{ 'is-placeholder': !selectedOption }"
        :disabled="disabled"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="menuId"
        :aria-activedescendant="
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        "
        :aria-required="required ? 'true' : undefined"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        @click="toggle"
        @keydown="onTriggerKeydown"
      >
        <span class="field__select-value">{{ displayLabel }}</span>
        <ChevronDown
          class="field__chevron"
          :class="{ 'is-open': open }"
          :size="16"
          aria-hidden="true"
        />
      </button>
    </div>
    <p v-if="hint && !error" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="errorId" class="field__error" role="alert">
      <CircleAlert :size="13" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>

    <Teleport to="body">
      <Transition name="select-menu">
        <div
          v-if="open"
          :id="menuId"
          ref="menu"
          class="select-menu"
          :style="menuStyle"
          role="listbox"
          :aria-labelledby="label ? selectId : undefined"
          @pointerdown.stop
        >
          <button
            v-for="(option, index) in normalizedOptions"
            :id="optionId(index)"
            :key="String(option.value)"
            type="button"
            class="select-menu__option"
            :class="{
              'is-selected': index === selectedIndex,
              'is-active': index === activeIndex,
            }"
            role="option"
            :aria-selected="index === selectedIndex"
            :data-index="index"
            @click="choose(option)"
            @pointermove="activeIndex = index"
          >
            <span>{{ option.label }}</span>
            <Check
              v-if="index === selectedIndex"
              class="select-menu__check"
              :size="14"
              aria-hidden="true"
            />
          </button>
          <p v-if="showPlaceholder && !normalizedOptions.length" class="select-menu__empty">
            暂无可选项
          </p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.field__select-trigger {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 44px;
  padding: 0 24px 0 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.field__select-trigger.is-placeholder {
  color: var(--ink-faint);
}

.field__select-trigger:disabled {
  cursor: not-allowed;
}

.field__select-value {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field__chevron {
  flex: none;
  color: var(--ink-muted);
  pointer-events: none;
  transition: transform 220ms var(--ease-spring);
}

.field__chevron.is-open {
  transform: rotate(180deg);
}

.select-menu {
  position: fixed;
  z-index: 420;
  display: flex;
  overflow-y: auto;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  padding: 6px;
  border: 1px solid rgb(255 255 255 / 0.66);
  border-radius: 14px;
  background: rgb(var(--macaron-cream-rgb) / 0.96);
  box-shadow:
    0 22px 52px -26px rgb(57 72 62 / 0.46),
    inset 0 1px 0 rgb(255 255 255 / 0.9);
  backdrop-filter: blur(20px) saturate(112%);
  -webkit-backdrop-filter: blur(20px) saturate(112%);
  scrollbar-width: thin;
}

.select-menu__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 36px;
  flex: none;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--ink-soft);
  font-size: 12px;
  text-align: left;
  transition:
    background-color 160ms var(--ease),
    color 160ms var(--ease);
}

.select-menu__option.is-active {
  background: rgb(var(--macaron-cream-rgb) / 0.55);
}

.select-menu__option.is-selected {
  background: rgb(var(--macaron-mint-rgb) / 0.62);
  color: var(--glass-ink);
  font-weight: 600;
}

.select-menu__option.is-selected.is-active {
  background: rgb(var(--macaron-mint-rgb) / 0.76);
}

.select-menu__check {
  flex: none;
  color: var(--accent);
}

.select-menu__empty {
  padding: 12px;
  color: var(--ink-faint);
  font-size: 11px;
  text-align: center;
}

.select-menu-enter-active,
.select-menu-leave-active {
  transition:
    opacity 140ms var(--ease),
    transform 220ms var(--ease-spring);
}

.select-menu-enter-from,
.select-menu-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.98);
}

.select-menu-enter-to,
.select-menu-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .field__chevron,
  .select-menu-enter-active,
  .select-menu-leave-active {
    transition: none;
  }
}
</style>
