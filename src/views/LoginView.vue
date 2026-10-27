<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Lock, Mail } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import { validateLoginForm } from '@/utils/validation.js'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errors = reactive({})
const submitted = ref(false)
const submitting = ref(false)
const apiError = ref(null)
const shakeSignal = ref(0)

const resolveTarget = () => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/app'
}

const applyErrors = () => {
  const next = validateLoginForm(form)
  // Empty fields are not input errors: leave them neutral until something is typed.
  if (!form.email.trim()) delete next.email
  if (!form.password) delete next.password
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(errors, next)
  return Object.keys(next).length === 0
}

watch(
  form,
  () => {
    apiError.value = null
    if (submitted.value) applyErrors()
  },
  { deep: true },
)

const submit = async () => {
  submitted.value = true
  apiError.value = null
  const missingFields = !form.email.trim() || !form.password
  if (!applyErrors() || submitting.value) {
    if (Object.keys(errors).length) shakeSignal.value += 1
    return
  }
  if (missingFields) return

  submitting.value = true
  try {
    const user = await auth.login({ email: form.email.trim(), password: form.password })
    ui.success(`欢迎回来，${user.displayName}`, '登录成功')
    router.replace(resolveTarget())
  } catch (error) {
    apiError.value = {
      message: error.message || '登录失败，请稍后重试',
      requestId: error.requestId,
    }
    if (error.status === 401) {
      errors.password = '邮箱或密码不正确'
      shakeSignal.value += 1
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow=""
    title="登录"
    description="继续你的学习计划。"
  >
    <div v-if="apiError" class="form-alert" role="alert">
      <p class="form-alert__title">{{ apiError.message }}</p>
      <p v-if="apiError.requestId" class="form-alert__meta">
        请求编号：{{ apiError.requestId }}
      </p>
    </div>

    <form class="auth-form" novalidate @submit.prevent="submit">
      <AppInput
        v-model="form.email"
        label="邮箱"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :error="errors.email"
        :shake-signal="shakeSignal"
        required
      >
        <template #prefix><Mail :size="16" /></template>
      </AppInput>

      <AppInput
        v-model="form.password"
        label="密码"
        type="password"
        placeholder="输入你的密码"
        autocomplete="current-password"
        :error="errors.password"
        :shake-signal="shakeSignal"
        required
      >
        <template #prefix><Lock :size="16" /></template>
      </AppInput>

      <AppButton
        type="submit"
        size="lg"
        block
        :loading="submitting || auth.loading"
        class="auth-form__submit"
      >
        {{ submitting ? '正在登录…' : '登录' }}
        <template #trailing>
          <ArrowRight v-if="!submitting" :size="17" />
        </template>
      </AppButton>
    </form>

    <p class="auth-switch">
      没有账户？
      <RouterLink to="/register">创建账户</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-form__submit {
  margin-top: 6px;
}

.auth-switch {
  margin-top: 20px;
  color: var(--ink-muted);
  font-size: 13px;
  text-align: center;
}

.auth-switch a {
  color: var(--lav-700);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.auth-tip {
  display: flex;
  gap: 10px;
  margin-top: 26px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface-soft);
}

.auth-tip__icon {
  font-size: 16px;
  line-height: 1.5;
}

.auth-tip p {
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.65;
}

.form-alert {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid rgba(201, 88, 88, 0.16);
  border-radius: var(--radius-md);
  background: var(--danger-100);
}

.form-alert__title {
  color: var(--danger-700);
  font-size: 12.5px;
  line-height: 1.55;
}

.form-alert__meta {
  margin-top: 4px;
  color: rgba(169, 68, 68, 0.72);
  font-size: 10.5px;
  font-family: var(--font-mono);
}
</style>
