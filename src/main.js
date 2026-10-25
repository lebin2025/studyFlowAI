import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { setUnauthorizedHandler } from './api/http.js'
import { useAuthStore } from './stores/auth.js'
import { useUiStore } from './stores/ui.js'
import { revealDirective } from './composables/reveal.js'
import './assets/styles/base.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.directive('reveal', revealDirective)

let sessionToastShown = false

setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia)
  const ui = useUiStore(pinia)
  const wasAuthenticated = auth.isAuthenticated
  const route = router.currentRoute.value

  auth.clearSession()

  if (wasAuthenticated && !sessionToastShown) {
    sessionToastShown = true
    ui.error('登录已过期，请重新登录', '会话已结束')
    window.setTimeout(() => {
      sessionToastShown = false
    }, 3000)
  }

  if (route.meta.requiresAuth) {
    router.replace({
      name: 'login',
      query: route.fullPath !== '/app' ? { redirect: route.fullPath } : {},
    })
  }
})

app.config.errorHandler = (error, instance, info) => {
  if (import.meta.env.DEV) {
    console.error('[StudyFlow]', info, error)
  }
}

app.mount('#app')
