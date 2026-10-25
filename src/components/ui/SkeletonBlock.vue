<script setup>
defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '16px' },
  radius: { type: String, default: 'var(--radius-sm)' },
  circle: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="skeleton"
    :style="{
      width,
      height,
      borderRadius: circle ? '50%' : radius,
    }"
    aria-hidden="true"
  />
</template>
