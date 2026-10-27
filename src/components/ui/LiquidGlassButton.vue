<script setup>
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'

defineProps({
  to: { type: [String, Object], required: true },
  label: { type: String, default: '' },
})
</script>

<template>
  <RouterLink :to="to" class="liquid-glass">
    <span class="liquid-glass__layer liquid-glass__layer--transparent" aria-hidden="true" />
    <span class="liquid-glass__layer liquid-glass__layer--refraction" aria-hidden="true" />
    <span class="liquid-glass__layer liquid-glass__layer--highlight" aria-hidden="true" />
    <span class="liquid-glass__layer liquid-glass__layer--shadow" aria-hidden="true" />
    <span class="liquid-glass__label">
      <slot>{{ label }}</slot>
      <ArrowRight :size="13" />
    </span>
  </RouterLink>
</template>

<style scoped>
.liquid-glass {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 15px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.66);
  border-radius: 999px;
  color: #364b40;
  text-decoration: none;
  isolation: isolate;
  box-shadow:
    0 12px 26px -18px rgba(79, 105, 90, 0.55),
    0 2px 6px -4px rgba(71, 91, 79, 0.2);
  transition:
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 280ms var(--ease),
    filter 260ms var(--ease);
}

.liquid-glass__layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

/* 1. Transparent macaron body */
.liquid-glass__layer--transparent {
  z-index: 0;
  background: rgb(var(--macaron-mint-rgb) / 0.5);
}

/* 2. Refraction lens */
.liquid-glass__layer--refraction {
  z-index: 0;
  transform: scale(1.04);
  background: rgb(255 255 255 / 0.04);
  backdrop-filter: blur(18px) saturate(155%) contrast(104%);
  -webkit-backdrop-filter: blur(18px) saturate(155%) contrast(104%);
}

/* 3. Specular highlight */
.liquid-glass__layer--highlight {
  z-index: 1;
  background:
    radial-gradient(
      120% 170% at 18% -35%,
      rgba(255, 255, 255, 0.7) 0%,
      rgba(255, 255, 255, 0.22) 28%,
      transparent 55%
    ),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), transparent 42%);
  mix-blend-mode: screen;
  transition: opacity 220ms var(--ease);
}

/* 4. Inner shadow + edge */
.liquid-glass__layer--shadow {
  z-index: 2;
  box-shadow:
    inset 0 -7px 12px rgba(132, 155, 139, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 0 0 1px rgba(255, 255, 255, 0.34);
}

.liquid-glass__label {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 620;
  letter-spacing: -0.01em;
  line-height: 1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
  white-space: nowrap;
}

.liquid-glass:hover {
  transform: translateY(-1px) scale(1.035);
  filter: drop-shadow(0 9px 14px rgba(56, 72, 61, 0.15));
  box-shadow:
    0 17px 32px -19px rgba(79, 105, 90, 0.62),
    0 3px 8px -5px rgba(71, 91, 79, 0.24);
}

.liquid-glass:hover .liquid-glass__layer--highlight {
  opacity: 0.86;
}

.liquid-glass:active {
  transform: translateY(0) scale(0.955);
  filter: brightness(1.035) drop-shadow(0 3px 6px rgba(56, 72, 61, 0.13));
}

.liquid-glass:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(208, 69, 45, 0.18),
    0 12px 26px -18px rgba(79, 105, 90, 0.55);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .liquid-glass {
    background: #e2efe7;
  }
}

@media (prefers-reduced-motion: reduce) {
  .liquid-glass,
  .liquid-glass__layer--highlight {
    transition: none;
  }

  .liquid-glass:hover,
  .liquid-glass:active {
    transform: none;
  }
}
</style>
