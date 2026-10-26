<script setup>
defineProps({
  size: { type: Number, default: 140 },
  variant: { type: String, default: 'happy' },
  animated: { type: Boolean, default: true },
  label: { type: String, default: '' },
})
</script>

<template>
  <svg
    class="mascot"
    :class="{ 'mascot--animated': animated }"
    :width="size"
    :height="size"
    viewBox="0 0 200 200"
    fill="none"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <ellipse cx="100" cy="178" rx="49" ry="8" fill="#E8DFD2" opacity=".7" />

    <path
      d="M94 44c-2-14 5-25 17-30 2 13-5 24-17 30Z"
      fill="#5D705D"
      stroke="#455944"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <path
      d="M96 45C84 36 72 37 63 44c9 9 21 11 33 1Z"
      fill="#B83E27"
      stroke="#8A2C1B"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <path d="M96 47c0-5 1-9 2-13" stroke="#455944" stroke-width="2.4" stroke-linecap="round" />

    <path
      d="M100 48c30-1 55 21 57 50 2 30-22 55-57 56-35 1-59-24-57-54 2-30 27-51 57-52Z"
      fill="#FFF8EC"
      stroke="#E7DCC9"
      stroke-width="2.2"
    />

    <g v-if="variant === 'happy'">
      <path d="M74 96c3.5-6 10.5-6 14 0" stroke="#3A3442" stroke-width="3.4" stroke-linecap="round" />
      <path d="M112 96c3.5-6 10.5-6 14 0" stroke="#3A3442" stroke-width="3.4" stroke-linecap="round" />
    </g>
    <g v-else-if="variant === 'sleepy'">
      <path d="M75 98c4 4 9 4 13 0" stroke="#3A3442" stroke-width="3.2" stroke-linecap="round" />
      <path d="M112 98c4 4 9 4 13 0" stroke="#3A3442" stroke-width="3.2" stroke-linecap="round" />
    </g>
    <g v-else-if="variant === 'thinking'">
      <circle cx="81" cy="97" r="3.2" fill="#3A3442" />
      <path d="M112 97c4-4 9-4 13 0" stroke="#3A3442" stroke-width="3.2" stroke-linecap="round" />
    </g>
    <g v-else>
      <path d="M74 94c3.5-6 10.5-6 14 0" stroke="#3A3442" stroke-width="3.4" stroke-linecap="round" />
      <path d="M112 94c3.5-6 10.5-6 14 0" stroke="#3A3442" stroke-width="3.4" stroke-linecap="round" />
    </g>

    <ellipse cx="68" cy="111" rx="7.5" ry="4.6" fill="#F2B3A0" opacity=".65" />
    <ellipse cx="132" cy="111" rx="7.5" ry="4.6" fill="#F2B3A0" opacity=".65" />

    <path
      d="M92 114c2.5 4.5 5.5 6.5 8.5 6.5s6-2 8.5-6.5"
      stroke="#3A3442"
      stroke-width="3.2"
      stroke-linecap="round"
      fill="none"
    />

    <g>
      <rect
        x="61"
        y="130"
        width="78"
        height="35"
        rx="9"
        fill="#F7F3EA"
        stroke="#CEC4B3"
        stroke-width="2"
      />
      <path d="M100 132v31" stroke="#CEC4B3" stroke-width="2" />
      <path d="M71 140h20M71 148h20M109 140h20M109 148h20" stroke="#A99D89" stroke-width="2.4" stroke-linecap="round" opacity=".8" />
      <path d="M100 147c2.4-3.2 7-2.6 7 1.3 0 2.4-3.4 4.5-7 7-3.6-2.5-7-4.6-7-7 0-3.9 4.6-4.5 7-1.3Z" fill="#F2B3A0" opacity=".85" />
    </g>

    <circle cx="63" cy="134" r="5.2" fill="#FFF8EC" stroke="#E7DCC9" stroke-width="2" />
    <circle cx="137" cy="134" r="5.2" fill="#FFF8EC" stroke="#E7DCC9" stroke-width="2" />

    <g v-if="variant === 'cheer'" class="mascot__sparkles">
      <path d="M44 66l2.4 6.2L53 75l-6.6 2.6L44 84l-2.4-6.4L35 75l6.6-2.8L44 66Z" fill="#A77B37" />
      <path d="M156 48l1.8 4.8 4.9 1.9-4.9 2-1.8 4.7-1.9-4.7-4.8-2 4.8-1.9L156 48Z" fill="#B83E27" />
    </g>
    <g v-else>
      <path d="M48 70l1.6 4.3 4.4 1.7-4.4 1.7-1.6 4.3-1.7-4.3-4.3-1.7 4.3-1.7L48 70Z" fill="#F0D8D0" />
      <circle cx="153" cy="73" r="3.2" fill="#F4C9A9" />
    </g>
  </svg>
</template>

<style scoped>
.mascot {
  display: block;
  overflow: visible;
}

.mascot--animated {
  animation: float-soft 6s var(--ease-in-out) infinite;
}

.mascot__sparkles {
  animation: pulse-soft 3.4s var(--ease-in-out) infinite;
  transform-origin: center;
}

@media (prefers-reduced-motion: reduce) {
  .mascot--animated,
  .mascot__sparkles {
    animation: none;
  }
}
</style>
