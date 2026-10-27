<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppToastHost from '@/components/ui/AppToastHost.vue'
import FloatingOrb from '@/components/orb/FloatingOrb.vue'
import FocusOverlay from '@/components/focus/FocusOverlay.vue'
import FocusTimerBar from '@/components/focus/FocusTimerBar.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useAmbienceStore } from '@/stores/ambience.js'
import { useDraftsStore } from '@/stores/drafts.js'
import { useFocusStore } from '@/stores/focus.js'

const route = useRoute()
const auth = useAuthStore()
const ambience = useAmbienceStore()
const drafts = useDraftsStore()
const focus = useFocusStore()
const viewKey = computed(() => route.matched[0]?.path || route.path)

watch(
  () => auth.user?.id,
  (id) => {
    focus.bindUser(id)
    drafts.bindUser(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  ambience.dispose()
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="viewKey" />
    </Transition>
  </RouterView>
  <FloatingOrb />
  <FocusTimerBar />
  <FocusOverlay />
  <AppToastHost />
</template>
