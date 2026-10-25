<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Check, Lock, Mail, UserRound } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import { passwordStrength, validateRegisterForm } from '@/utils/validation.js'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const form = reactive({
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const errors = reactive({})
const submitted = ref(false)
const submitting = ref(false)
const apiError = ref(null)
const strength = computed(() => passwordStrength(form.password))

const checks = computed(() => [
  { label: '至少 8 个字符', valid: strength.value.checks.length },
  { label: '包含字母', valid: strength.value.checks.letter },
  { label: '包含数字', valid: strength.value.checks.number },
])

const applyErrors = () => {
  const next = validateRegisterForm(form)
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
  if (!applyErrors() || submitting.value) return

  submitting.value = true
  try {
    const user = await auth.register({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    ui.success(`欢迎加入，${user.displayName}`, '账户创建成功')
    router.replace('/app')
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') {
      errors.email = '这个邮箱已经注册过了，直接登录吧'
    } else {
      apiError.value = {
        message: error.message || '注册失败，请稍后重试',
        requestId: error.requestId,
      }
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="开始使用"
    title="给自己一个清晰的开始"
    description="创建账户后，AI 会根据你的目标、基础和时间，生成第一份学习计划。"
  >
    <div v-if="apiError" class="form-alert" role="alert">
      <p class="form-alert__title">{{ apiError.message }}</p>
      <p v-if="apiError.requestId" class="form-alert__meta">
        请求编号：{{ apiError.requestId }}
      </p>
    </div>

    <form class="auth-form" novalidate @submit.prevent="submit">
      <AppInput
        v-model="form.displayName"
        label="昵称"
        placeholder="想让我们怎么称呼你？"
        autocomplete="nickname"
        maxlength="40"
        :error="errors.displayName"
        required
      >
        <template #prefix><UserRound :size="16" /></template>
      </AppInput>

      <AppInput
        v-model="form.email"
        label="邮箱"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :error="errors.email"
        required
      >
        <template #prefix><Mail :size="16" /></template>
      </AppInput>

      <div>
        <AppInput
          v-model="form.password"
          label="密码"
          type="password"
          placeholder="至少 8 位，包含字母和数字"
          autocomplete="new-password"
          :error="errors.password"
          required
        >
          <template #prefix><Lock :size="16" /></template>
        </AppInput>

        <div v-if="form.password" class="strength">
          <div class="strength__head">
            <div class="strength__bars" aria-hidden="true">
              <span
                v-for="index in 4"
                :key="index"
                :class="{
                  'is-filled': index <= strength.score,
                  'is-weak': strength.score <= 1,
                  'is-mid': strength.score === 2,
                }"
              />
            </div>
            <span class="strength__label" :class="{ 'is-weak': strength.score <= 1 }">
              {{ strength.label }}
            </span>
          </div>
          <ul class="strength__checks">
            <li v-for="check in checks" :key="check.label" :class="{ 'is-valid': check.valid }">
              <Check :size="11" aria-hidden="true" />
              {{ check.label }}
            </li>
          </ul>
        </div>
      </div>

      <AppInput
        v-model="form.confirmPassword"
        label="确认密码"
        type="password"
        placeholder="再输入一次密码"
        autocomplete="new-password"
        :error="errors.confirmPassword"
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
        {{ submitting ? '正在创建…' : '创建账户' }}
        <template #trailing>
          <ArrowRight v-if="!submitting" :size="17" />
        </template>
      </AppButton>
    </form>

    <p class="auth-switch">
      已经有账户？
      <RouterLink to="/login">直接登录</RouterLink>
    </p>

    <p class="auth-note">
      密码会经过加盐哈希保存，你的学习内容不会出现在任何公开页面。
    </p>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.auth-form__submit {
  margin-top: 4px;
}

.strength {
  margin-top: 8px;
}

.strength__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength__bars {
  display: flex;
  flex: 1;
  gap: 4px;
}

.strength__bars span {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: var(--line);
  transition: background-color var(--duration) var(--ease);
}

.strength__bars span.is-filled {
  background: var(--mint-500);
}

.strength__bars span.is-filled.is-weak {
  background: var(--danger-600);
}

.strength__bars span.is-filled.is-mid {
  background: var(--peach-500);
}

.strength__label {
  flex: none;
  color: var(--mint-700);
  font-size: 10.5px;
  font-weight: 600;
}

.strength__label.is-weak {
  color: var(--danger-700);
}

.strength__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 7px;
}

.strength__checks li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-faint);
  font-size: 10.5px;
}

.strength__checks li svg {
  opacity: 0.4;
}

.strength__checks li.is-valid {
  color: var(--mint-700);
}

.strength__checks li.is-valid svg {
  opacity: 1;
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

.auth-note {
  margin-top: 18px;
  color: var(--ink-faint);
  font-size: 10.5px;
  line-height: 1.6;
  text-align: center;
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
