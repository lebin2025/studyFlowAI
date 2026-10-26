<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { aiApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'
import { formatDate, formatMinutes, formatWeekly, todayISO, WEEKDAYS } from '@/utils/date.js'
import { LEARNING_STYLE_LABELS, formatNumber, formatUsd } from '@/utils/format.js'
import { validatePasswordChange } from '@/utils/validation.js'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const profile = reactive({
  displayName: auth.user?.displayName || '',
  bio: auth.user?.bio || '',
})
const profileErrors = reactive({})
const profileSaving = ref(false)

const preferences = reactive({
  defaultDailyMinutes: auth.preferences?.defaultDailyMinutes ?? 60,
  studyWeekdays: [...(auth.preferences?.studyWeekdays || [1, 2, 3, 4, 5])],
  preferredSubjects: auth.preferences?.preferredSubjects || '',
  learningStyle: auth.preferences?.learningStyle || 'balanced',
})
const preferenceErrors = reactive({})
const preferenceSaving = ref(false)

const password = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordErrors = reactive({})
const passwordSaving = ref(false)

const aiStatus = ref(null)
const aiLoading = ref(true)
const aiError = ref('')
const logoutOpen = ref(false)
const logoutLoading = ref(false)

const weekdaysLabel = computed(() => formatWeekly(preferences.studyWeekdays))

const accountAge = computed(() => {
  const created = auth.user?.createdAt
  if (!created) return ''
  return formatDate(created.slice(0, 10), { weekday: false, year: true })
})

const loadAi = async () => {
  aiLoading.value = true
  aiError.value = ''
  try {
    aiStatus.value = await aiApi.status()
  } catch (error) {
    aiError.value = error.message
  } finally {
    aiLoading.value = false
  }
}

const toggleWeekday = (day) => {
  if (preferences.studyWeekdays.includes(day)) {
    if (preferences.studyWeekdays.length === 1) {
      ui.warning('至少要保留一个可学习日')
      return
    }
    preferences.studyWeekdays = preferences.studyWeekdays.filter((item) => item !== day)
  } else {
    preferences.studyWeekdays = [...preferences.studyWeekdays, day].sort((a, b) => a - b)
  }
  delete preferenceErrors.studyWeekdays
}

const saveProfile = async () => {
  Object.keys(profileErrors).forEach((key) => delete profileErrors[key])
  if (!profile.displayName.trim()) profileErrors.displayName = '昵称不能为空'
  else if (profile.displayName.trim().length < 2) profileErrors.displayName = '昵称至少 2 个字符'
  else if (profile.displayName.trim().length > 40) profileErrors.displayName = '昵称不能超过 40 个字符'
  if (profile.bio.length > 280) profileErrors.bio = '个人简介不能超过 280 个字符'
  if (Object.keys(profileErrors).length || profileSaving.value) return

  profileSaving.value = true
  try {
    await auth.updateProfile({
      displayName: profile.displayName.trim(),
      bio: profile.bio.trim(),
    })
    ui.success('个人资料已更新')
  } catch (error) {
    ui.error(error.message, '保存个人资料失败')
  } finally {
    profileSaving.value = false
  }
}

const savePreferences = async () => {
  Object.keys(preferenceErrors).forEach((key) => delete preferenceErrors[key])
  const minutes = Number(preferences.defaultDailyMinutes)
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 480) {
    preferenceErrors.defaultDailyMinutes = '每日学习时长需要在 10 - 480 分钟之间'
  }
  if (!preferences.studyWeekdays.length) {
    preferenceErrors.studyWeekdays = '请至少选择一个可学习日'
  }
  if (Object.keys(preferenceErrors).length || preferenceSaving.value) return

  preferenceSaving.value = true
  try {
    await auth.updatePreferences({
      defaultDailyMinutes: minutes,
      studyWeekdays: [...preferences.studyWeekdays].sort((a, b) => a - b),
      preferredSubjects: preferences.preferredSubjects.trim(),
      learningStyle: preferences.learningStyle,
    })
    ui.success('学习偏好已保存，下次生成计划会默认使用')
  } catch (error) {
    ui.error(error.message, '保存学习偏好失败')
  } finally {
    preferenceSaving.value = false
  }
}

const changePassword = async () => {
  Object.keys(passwordErrors).forEach((key) => delete passwordErrors[key])
  Object.assign(passwordErrors, validatePasswordChange(password))
  if (Object.keys(passwordErrors).length || passwordSaving.value) return

  passwordSaving.value = true
  try {
    await auth.changePassword({
      currentPassword: password.currentPassword,
      newPassword: password.newPassword,
    })
    password.currentPassword = ''
    password.newPassword = ''
    password.confirmPassword = ''
    ui.success('密码已更新，其他设备上的登录已失效', '账户更安全了')
  } catch (error) {
    if (error.code === 'INVALID_PASSWORD') {
      passwordErrors.currentPassword = '当前密码不正确'
    } else {
      ui.error(error.message, '修改密码失败')
    }
  } finally {
    passwordSaving.value = false
  }
}

const logout = async () => {
  if (logoutLoading.value) return
  logoutLoading.value = true
  try {
    await auth.logout()
    ui.success('已安全退出登录')
    router.push({ name: 'login' })
  } catch {
    ui.error('退出登录失败，请稍后重试')
  } finally {
    logoutLoading.value = false
    logoutOpen.value = false
  }
}

onMounted(loadAi)
</script>

<template>
  <div class="settings-page">
    <PageHeader
      eyebrow="个人设置"
      title="让这里更像你的学习空间"
      description="更新资料、学习偏好和账户安全设置。所有修改都会真实保存到后端。"
    />

    <div class="settings-grid">
      <div class="settings-main">
        <section class="settings-card">
          <header class="settings-card__head">
            <span class="settings-card__icon settings-card__icon--lav"><UserRound :size="17" /></span>
            <div>
              <h2>个人资料</h2>
              <p>昵称会显示在仪表盘和导航里。</p>
            </div>
          </header>
          <div class="settings-card__body">
            <div class="form-grid">
              <AppInput
                v-model="profile.displayName"
                label="昵称"
                maxlength="40"
                :error="profileErrors.displayName"
                required
              />
              <AppInput
                :model-value="auth.user?.email || ''"
                label="邮箱"
                disabled
                hint="邮箱用于登录，当前版本暂不支持修改"
              />
            </div>
            <AppTextarea
              v-model="profile.bio"
              label="个人简介（可选）"
              placeholder="写一句关于自己的话，例如：正在准备六级，每天进步一点点。"
              :rows="3"
              :maxlength="280"
              show-count
              :error="profileErrors.bio"
            />
            <div class="settings-card__actions">
              <AppButton :loading="profileSaving" @click="saveProfile">保存资料</AppButton>
            </div>
          </div>
        </section>

        <section class="settings-card">
          <header class="settings-card__head">
            <span class="settings-card__icon settings-card__icon--mint"><Sparkles :size="17" /></span>
            <div>
              <h2>学习偏好</h2>
              <p>新建 AI 计划时，会默认使用这里的时长和学习日。</p>
            </div>
          </header>
          <div class="settings-card__body">
            <div class="form-grid">
              <div>
                <AppInput
                  v-model="preferences.defaultDailyMinutes"
                  label="默认每日学习时长（分钟）"
                  type="number"
                  min="10"
                  max="480"
                  step="5"
                  :error="preferenceErrors.defaultDailyMinutes"
                />
                <div class="quick-row">
                  <button
                    v-for="minutes in [30, 45, 60, 90]"
                    :key="minutes"
                    type="button"
                    class="quick-chip"
                    :class="{ 'is-active': Number(preferences.defaultDailyMinutes) === minutes }"
                    @click="preferences.defaultDailyMinutes = minutes"
                  >
                    {{ minutes }} 分钟
                  </button>
                </div>
              </div>
              <AppSelect
                v-model="preferences.learningStyle"
                label="学习方式偏好"
                :options="
                  Object.entries(LEARNING_STYLE_LABELS).map(([value, label]) => ({ value, label }))
                "
              />
            </div>

            <fieldset class="weekday-field">
              <legend>默认可学习日</legend>
              <div class="weekday-row">
                <button
                  v-for="day in WEEKDAYS"
                  :key="day.value"
                  type="button"
                  class="weekday"
                  :class="{ 'is-active': preferences.studyWeekdays.includes(day.value) }"
                  :aria-pressed="preferences.studyWeekdays.includes(day.value)"
                  @click="toggleWeekday(day.value)"
                >
                  {{ day.label }}
                </button>
              </div>
              <p class="weekday-hint">{{ weekdaysLabel }}</p>
              <p v-if="preferenceErrors.studyWeekdays" class="field-error">
                {{ preferenceErrors.studyWeekdays }}
              </p>
            </fieldset>

            <AppInput
              v-model="preferences.preferredSubjects"
              label="常学科目（可选）"
              placeholder="例如：英语、编程、数学"
              maxlength="120"
              hint="多个科目可以用顿号或逗号分隔"
            />

            <div class="settings-card__actions">
              <AppButton :loading="preferenceSaving" @click="savePreferences">保存偏好</AppButton>
            </div>
          </div>
        </section>

        <section class="settings-card">
          <header class="settings-card__head">
            <span class="settings-card__icon settings-card__icon--peach"><ShieldCheck :size="17" /></span>
            <div>
              <h2>账户安全</h2>
              <p>修改密码后，其他设备上的登录会自动失效。</p>
            </div>
          </header>
          <div class="settings-card__body">
            <form class="password-form" @submit.prevent="changePassword">
              <AppInput
                v-model="password.currentPassword"
                label="当前密码"
                type="password"
                autocomplete="current-password"
                :error="passwordErrors.currentPassword"
              />
              <div class="form-grid">
                <AppInput
                  v-model="password.newPassword"
                  label="新密码"
                  type="password"
                  autocomplete="new-password"
                  hint="至少 8 位，包含字母和数字"
                  :error="passwordErrors.newPassword"
                />
                <AppInput
                  v-model="password.confirmPassword"
                  label="确认新密码"
                  type="password"
                  autocomplete="new-password"
                  :error="passwordErrors.confirmPassword"
                />
              </div>
              <div class="settings-card__actions">
                <AppButton type="submit" variant="secondary" :loading="passwordSaving">
                  <template #icon><KeyRound :size="15" /></template>
                  更新密码
                </AppButton>
              </div>
            </form>
          </div>
        </section>
      </div>

      <aside class="settings-aside">
        <section class="settings-card">
          <header class="settings-card__head settings-card__head--tight">
            <span class="settings-card__icon settings-card__icon--lav"><Sparkles :size="17" /></span>
            <div>
              <h2>AI 使用情况</h2>
              <p>最近 30 天，按真实 token 用量统计。</p>
            </div>
            <button
              type="button"
              class="refresh-button"
              aria-label="刷新 AI 使用情况"
              :disabled="aiLoading"
              @click="loadAi"
            >
              <RefreshCw :size="14" :class="{ spin: aiLoading }" />
            </button>
          </header>
          <div class="settings-card__body">
            <div v-if="aiLoading" class="ai-usage-skeleton">
              <span class="skeleton" style="height: 14px; width: 60%" />
              <span class="skeleton" style="height: 40px; width: 100%" />
              <span class="skeleton" style="height: 14px; width: 80%" />
            </div>

            <p v-else-if="aiError" class="ai-error">{{ aiError }}</p>

            <template v-else-if="aiStatus">
              <div class="ai-status" :class="{ 'is-ready': aiStatus.configured }">
                <span class="ai-status__dot" />
                <div>
                  <strong>{{ aiStatus.configured ? 'AI 已就绪' : 'AI 尚未配置' }}</strong>
                  <p>
                    {{ aiStatus.configured ? `${aiStatus.model} · 每小时最多 ${aiStatus.rateLimitPerHour} 次` : '在后端 .env 中配置 DEEPSEEK_API_KEY' }}
                  </p>
                </div>
              </div>

              <div class="usage-grid">
                <div>
                  <strong>{{ aiStatus.usage?.calls ?? 0 }}</strong>
                  <span>调用次数</span>
                </div>
                <div>
                  <strong>{{ formatNumber(aiStatus.usage?.totalTokens ?? 0) }}</strong>
                  <span>Token</span>
                </div>
                <div>
                  <strong>{{ formatUsd(aiStatus.usage?.costUsd ?? 0) }}</strong>
                  <span>估算费用</span>
                </div>
              </div>

              <div v-if="aiStatus.recent?.length" class="usage-list">
                <p class="usage-list__title">最近调用</p>
                <div v-for="item in aiStatus.recent" :key="item.id" class="usage-item">
                  <span class="usage-item__icon" :class="item.success ? 'is-ok' : 'is-fail'">
                    <CheckCircle2 v-if="item.success" :size="12" />
                    <XCircle v-else :size="12" />
                  </span>
                  <div class="usage-item__text">
                    <strong>{{ item.kind === 'adjust' ? '调整计划' : '生成计划' }}</strong>
                    <span>
                      {{ formatDate(item.createdAt.slice(0, 10), { weekday: false }) }} ·
                      {{ formatNumber(item.totalTokens) }} token
                    </span>
                  </div>
                  <span class="usage-item__cost">{{ formatUsd(item.costUsd) }}</span>
                </div>
              </div>
              <p v-else class="usage-empty">还没有 AI 调用记录。</p>

              <p class="usage-note">
                费用按模型返回的 token 用量估算，实际以 DeepSeek 账单为准。密钥不会出现在浏览器里。
              </p>
            </template>
          </div>
        </section>

        <section class="settings-card">
          <header class="settings-card__head settings-card__head--tight">
            <span class="settings-card__icon settings-card__icon--mint"><UserRound :size="17" /></span>
            <div>
              <h2>账户</h2>
              <p>你的数据在后端按账户隔离。</p>
            </div>
          </header>
          <div class="settings-card__body">
            <dl class="account-rows">
              <div>
                <dt>登录邮箱</dt>
                <dd>{{ auth.user?.email }}</dd>
              </div>
              <div>
                <dt>加入时间</dt>
                <dd>{{ accountAge || '—' }}</dd>
              </div>
              <div>
                <dt>学习偏好</dt>
                <dd>{{ formatMinutes(preferences.defaultDailyMinutes) }}/天</dd>
              </div>
              <div>
                <dt>今天</dt>
                <dd>{{ formatDate(todayISO(), { weekday: true }) }}</dd>
              </div>
            </dl>
            <AppButton variant="secondary" block @click="logoutOpen = true">
              <template #icon><LogOut :size="15" /></template>
              退出登录
            </AppButton>
            <p class="account-note">
              退出会清除浏览器中的登录 Cookie；已过期或失效的 Token 会被后端拒绝。
            </p>
          </div>
        </section>
      </aside>
    </div>

    <ConfirmDialog
      :model-value="logoutOpen"
      title="退出当前账户？"
      message="退出后需要重新输入邮箱和密码才能进入学习空间。"
      confirm-label="退出登录"
      :loading="logoutLoading"
      @update:model-value="logoutOpen = $event"
      @confirm="logout"
    />
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.settings-main,
.settings-aside {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
}

.settings-card__head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 18px 20px 12px;
}

.settings-card__head--tight {
  padding-bottom: 8px;
}

.settings-card__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.settings-card__icon--lav {
  background: var(--lav-100);
  color: var(--lav-700);
}

.settings-card__icon--mint {
  background: var(--mint-100);
  color: var(--mint-700);
}

.settings-card__icon--peach {
  background: var(--peach-100);
  color: var(--peach-600);
}

.settings-card__head h2 {
  font-size: 15px;
  font-weight: 640;
  letter-spacing: -0.02em;
}

.settings-card__head p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 10.5px;
  line-height: 1.5;
}

.settings-card__body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 6px 20px 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.settings-card__actions {
  display: flex;
  justify-content: flex-end;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.quick-chip {
  padding: 3px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 9.5px;
}

.quick-chip:hover {
  border-color: var(--lav-300);
  color: var(--lav-700);
}

.quick-chip.is-active {
  border-color: rgba(130, 114, 239, 0.3);
  background: var(--lav-50);
  color: var(--lav-700);
}

.weekday-field {
  margin: 0;
  padding: 0;
  border: 0;
}

.weekday-field legend {
  margin-bottom: 7px;
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.weekday {
  padding: 7px 2px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 10.5px;
  transition:
    border-color var(--duration-fast) var(--ease),
    background-color var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.weekday:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.weekday.is-active {
  border-color: var(--lav-500);
  background: var(--lav-50);
  color: var(--lav-700);
  font-weight: 600;
}

.weekday-hint {
  margin-top: 6px;
  color: var(--ink-faint);
  font-size: 9.5px;
}

.field-error {
  margin-top: 4px;
  color: var(--danger-700);
  font-size: 10.5px;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.refresh-button {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin-left: auto;
  border-radius: 8px;
  color: var(--ink-faint);
}

.refresh-button:hover {
  background: var(--surface-muted);
  color: var(--ink);
}

.ai-usage-skeleton {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.ai-status {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 11px;
  border-radius: var(--radius-sm);
  background: var(--warning-100);
}

.ai-status.is-ready {
  background: var(--mint-50);
}

.ai-status__dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--warning-600);
}

.ai-status.is-ready .ai-status__dot {
  background: var(--mint-600);
  box-shadow: 0 0 0 3px var(--mint-100);
}

.ai-status strong {
  font-size: 11px;
  font-weight: 640;
}

.ai-status p {
  margin-top: 2px;
  color: var(--ink-muted);
  font-size: 9.5px;
  line-height: 1.5;
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--line);
}

.usage-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 10px;
  background: var(--surface-soft);
}

.usage-grid strong {
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.usage-grid span {
  color: var(--ink-faint);
  font-size: 8.5px;
}

.usage-list__title {
  margin-bottom: 4px;
  color: var(--ink-faint);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--line);
}

.usage-item:last-child {
  border-bottom: 0;
}

.usage-item__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
}

.usage-item__icon.is-ok {
  background: var(--mint-100);
  color: var(--mint-700);
}

.usage-item__icon.is-fail {
  background: var(--danger-100);
  color: var(--danger-700);
}

.usage-item__text {
  flex: 1;
  min-width: 0;
  line-height: 1.35;
}

.usage-item__text strong {
  display: block;
  font-size: 10px;
  font-weight: 580;
}

.usage-item__text span {
  color: var(--ink-faint);
  font-size: 8.5px;
}

.usage-item__cost {
  flex: none;
  color: var(--ink-muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.usage-empty {
  color: var(--ink-faint);
  font-size: 10px;
}

.usage-note {
  color: var(--ink-faint);
  font-size: 8.5px;
  line-height: 1.55;
}

.ai-error {
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  background: var(--danger-100);
  color: var(--danger-700);
  font-size: 10px;
  line-height: 1.55;
}

.account-rows {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.account-rows > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 10px;
}

.account-rows dt {
  color: var(--ink-faint);
}

.account-rows dd {
  margin: 0;
  color: var(--ink-soft);
  font-weight: 550;
  text-align: right;
  overflow-wrap: anywhere;
}

.account-note {
  color: var(--ink-faint);
  font-size: 8.5px;
  line-height: 1.55;
  text-align: center;
}

@media (max-width: 1000px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .settings-aside {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 700px) {
  .settings-aside {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .settings-card__body {
    padding: 4px 16px 16px;
  }

  .settings-card__head {
    padding: 16px 16px 10px;
  }

  .weekday-row {
    gap: 3px;
  }

  .weekday {
    font-size: 9.5px;
    padding: 6px 0;
  }
}
</style>

<style scoped>
/* 2026 / settings as a quiet control room */
.settings-grid {
  gap: 20px;
}

.settings-card {
  border: 1px solid var(--line);
  border-radius: 26px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.settings-card__head {
  padding: 22px 24px 14px;
}

.settings-card__head h2 {
  font-size: 21px;
  letter-spacing: -0.04em;
}

.settings-card__head p {
  color: var(--ink-muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.03em;
}

.settings-card__icon {
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: transparent;
}

.settings-card__body {
  padding: 8px 24px 24px;
}

.settings-card__actions {
  border-top-color: var(--line);
}

.quick-chip {
  border-color: var(--line);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.quick-chip.is-active {
  border-color: rgba(133, 114, 239, 0.26);
  background: var(--lav-100);
  color: var(--lav-700);
}

.weekday {
  border-color: var(--line);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 9px;
}

.weekday.is-active {
  border-color: rgba(133, 114, 239, 0.26);
  background: var(--lav-100);
  color: var(--lav-700);
}

.refresh-button {
  border: 1px solid var(--line);
  background: transparent;
}

.settings-aside .settings-card:first-child {
  --ink: var(--on-dark);
  --ink-soft: var(--on-dark-soft);
  --ink-muted: var(--on-dark-soft);
  --ink-faint: var(--on-dark-faint);
  --line: var(--line-dark);
  --surface: rgba(255, 255, 255, 0.06);
  color: var(--on-dark);
  border-color: rgba(215, 201, 255, 0.16);
  background:
    radial-gradient(100% 100% at 100% 0%, rgba(215, 201, 255, 0.18), transparent 56%),
    linear-gradient(150deg, #1a1429 0%, #0e0b16 58%, #09080e 100%);
  box-shadow: var(--shadow-deep);
}

.settings-aside .settings-card:first-child .settings-card__head h2 {
  color: var(--on-dark);
}

.settings-aside .settings-card:first-child .settings-card__head p {
  color: var(--on-dark-faint);
}

.settings-aside .settings-card:first-child .settings-card__icon {
  border-color: rgba(215, 201, 255, 0.2);
  color: var(--lumen);
}

.ai-status.is-ready {
  border: 1px solid rgba(157, 232, 203, 0.16);
  background: rgba(157, 232, 203, 0.08);
  color: var(--aurora);
}

.ai-status.is-ready strong {
  color: var(--aurora);
}

.ai-status.is-ready p {
  color: var(--on-dark-soft);
}

.ai-status__dot {
  background: var(--aurora);
  box-shadow: 0 0 12px rgba(157, 232, 203, 0.6);
}

.account-rows > div {
  border-bottom-color: var(--line-dark);
}

.account-rows dt {
  color: var(--on-dark-faint);
  font-family: var(--font-mono);
  font-size: 8px;
}

.account-rows dd {
  color: var(--on-dark);
  font-size: 10.5px;
}

.account-note {
  color: var(--on-dark-faint);
  font-size: 9px;
}

.settings-aside .settings-card:first-child :deep(.btn--secondary) {
  color: var(--on-dark);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--line-dark-strong);
}

@media (max-width: 720px) {
  .settings-card__head {
    padding: 18px 18px 10px;
  }

  .settings-card__body {
    padding: 6px 18px 20px;
  }
}
</style>

<style scoped>
/* Keep the account card in the daylight palette. */
.settings-aside .settings-card:nth-child(2) .account-rows > div {
  border-bottom-color: var(--line);
}

.settings-aside .settings-card:nth-child(2) .account-rows dt {
  color: var(--ink-faint);
}

.settings-aside .settings-card:nth-child(2) .account-rows dd {
  color: var(--ink);
}

.settings-aside .settings-card:nth-child(2) .account-note {
  color: var(--ink-faint);
}
</style>

<style scoped>
.settings-aside .settings-card:first-child .usage-grid {
  border-color: var(--line-dark);
  background: var(--line-dark);
}

.settings-aside .settings-card:first-child .usage-grid > div {
  background: rgba(255, 255, 255, 0.055);
}

.settings-aside .settings-card:first-child .usage-grid strong {
  color: var(--on-dark);
}

.settings-aside .settings-card:first-child .usage-grid span {
  color: var(--on-dark-faint);
}

.settings-aside .settings-card:first-child .usage-empty,
.settings-aside .settings-card:first-child .usage-note {
  color: var(--on-dark-faint);
}

.settings-aside .settings-card:first-child .usage-list__title {
  color: var(--on-dark-faint);
}
</style>
