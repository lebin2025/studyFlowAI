<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppToastHost from '@/components/ui/AppToastHost.vue'

const route = useRoute()
const viewKey = computed(() => route.matched[0]?.path || route.path)
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="viewKey" />
    </Transition>
  </RouterView>
  <AppToastHost />
</template>
