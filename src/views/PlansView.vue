<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, Plus, Search, Sparkles } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import PlanCard from '@/components/plans/PlanCard.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { plansApi } from '@/api/index.js'
import { useUiStore } from '@/stores/ui.js'

const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const plans = ref([])
const subjects = ref([])
const total = ref(0)
const deletingPlan = ref(null)
const deleteLoading = ref(false)

const filters = reactive({
  search: typeof route.query.q === 'string' ? route.query.q : '',
  status: ['active', 'completed', 'archived'].includes(route.query.status)
    ? route.query.status
    : 'all',
  subject: typeof route.query.subject === 'string' ? route.query.subject : '',
  sort: ['updated', 'start', 'end', 'progress', 'title'].includes(route.query.sort)
    ? route.query.sort
    : 'updated',
})

const sortOptions = [
  { value: 'updated', label: '最近更新' },
  { value: 'start', label: '开始日期' },
  { value: 'end', label: '结束日期' },
  { value: 'progress', label: '完成进度' },
  { value: 'title', label: '计划名称' },
]

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
]

const subjectOptions = computed(() => [
  { value: '', label: '全部科目' },
  ...subjects.value.map((subject) => ({ value: subject, label: subject })),
])

const hasFilters = computed(
  () => Boolean(filters.search || filters.status !== 'all' || filters.subject),
)

let debounceTimer = null
let requestSeq = 0

const sortParams = () => {
  if (filters.sort === 'updated') return { sort: 'updated', order: 'desc' }
  if (filters.sort === 'progress') return { sort: 'progress', order: 'desc' }
  if (filters.sort === 'title') return { sort: 'title', order: 'asc' }
  return { sort: filters.sort, order: 'asc' }
}

const load = async () => {
  const seq = ++requestSeq
  loading.value = true
  error.value = ''
  try {
    const data = await plansApi.list({
      search: filters.search || undefined,
      status: filters.status,
      subject: filters.subject || undefined,
      ...sortParams(),
    })
    if (seq !== requestSeq) return
    plans.value = data.items
    subjects.value = data.subjects
    total.value = data.total
  } catch (loadError) {
    if (seq !== requestSeq) return
    error.value = loadError.message || '加载学习计划失败'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const scheduleLoad = (immediate = false) => {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(load, immediate ? 0 : 300)
}

const clearFilters = () => {
  filters.search = ''
  filters.status = 'all'
  filters.subject = ''
  filters.sort = 'updated'
}

const askDelete = (plan) => {
  deletingPlan.value = plan
}

const confirmDelete = async () => {
  if (!deletingPlan.value || deleteLoading.value) return
  deleteLoading.value = true
  try {
    await plansApi.remove(deletingPlan.value.id)
    ui.success('学习计划已删除，相关任务也已清理')
    deletingPlan.value = null
    await load()
  } catch (deleteError) {
    ui.error(deleteError.message, '删除学习计划失败')
  } finally {
    deleteLoading.value = false
  }
}

watch(
  () => [filters.status, filters.subject, filters.sort],
  () => {
    const query = {}
    if (filters.search) query.q = filters.search
    if (filters.status !== 'all') query.status = filters.status
    if (filters.subject) query.subject = filters.subject
    if (filters.sort !== 'updated') query.sort = filters.sort
    router.replace({ query })
    scheduleLoad()
  },
)

watch(
  () => filters.search,
  () => {
    const query = {}
    if (filters.search) query.q = filters.search
    if (filters.status !== 'all') query.status = filters.status
    if (filters.subject) query.subject = filters.subject
    if (filters.sort !== 'updated') query.sort = filters.sort
    router.replace({ query })
    scheduleLoad()
  },
)

onMounted(load)
onBeforeUnmount(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <div class="plans-page">
    <PageHeader
      eyebrow="学习计划"
      title="你想学什么，我们都记得"
      description="每一个目标都有阶段、每日任务和复习安排。可以随时调整，也可以让 AI 重新规划。"
    >
      <template #actions>
        <AppButton to="/app/plans/new">
          <template #icon><Sparkles :size="16" /></template>
          新建 AI 计划
        </AppButton>
      </template>
    </PageHeader>

    <div class="plans-toolbar">
      <AppInput
        v-model="filters.search"
        placeholder="搜索计划名称、目标或科目"
        class="plans-toolbar__search"
        aria-label="搜索学习计划"
        maxlength="80"
      >
        <template #prefix><Search :size="16" /></template>
      </AppInput>

      <div class="plans-toolbar__filters">
        <SegmentedControl v-model="filters.status" :options="statusOptions" label="按状态筛选" />
        <AppSelect
          v-model="filters.subject"
          :options="subjectOptions"
          class="plans-toolbar__select"
          aria-label="按科目筛选"
        />
        <AppSelect
          v-model="filters.sort"
          :options="sortOptions"
          class="plans-toolbar__select"
          aria-label="排序方式"
        />
      </div>
    </div>

    <div class="plans-count">
      <span v-if="!loading">共 {{ total }} 个计划</span>
      <span v-else>正在整理你的学习计划…</span>
      <button v-if="hasFilters" type="button" class="plans-count__clear" @click="clearFilters">
        清除筛选
      </button>
    </div>

    <div v-if="loading" class="plans-grid" aria-busy="true">
      <SkeletonBlock v-for="index in 6" :key="index" height="240px" radius="var(--radius-lg)" />
    </div>

    <div v-else-if="error" class="plans-error card">
      <span class="plans-error__icon"><AlertCircle :size="20" /></span>
      <div>
        <h2>计划没有加载出来</h2>
        <p>{{ error }}</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="load">重新加载</AppButton>
    </div>

    <div v-else-if="!plans.length" class="plans-empty card">
      <AppEmptyState
        :title="hasFilters ? '没有找到匹配的计划' : '从第一份学习计划开始'"
        :description="
          hasFilters
            ? '换一个关键词或筛选条件试试。'
            : '告诉 AI 你的目标、基础和时间，它会生成一份拆到每一天的计划。'
        "
        :variant="hasFilters ? 'thinking' : 'happy'"
      >
        <template v-if="hasFilters">
          <AppButton variant="secondary" @click="clearFilters">清除筛选</AppButton>
        </template>
        <template v-else>
          <AppButton to="/app/plans/new">
            <template #icon><Sparkles :size="15" /></template>
            生成第一份计划
          </AppButton>
        </template>
      </AppEmptyState>
    </div>

    <div v-else class="plans-grid">
      <PlanCard
        v-for="plan in plans"
        :key="plan.id"
        :plan="plan"
        @delete="askDelete"
      />
      <RouterLink to="/app/plans/new" class="plan-add">
        <span class="plan-add__icon"><Plus :size="20" /></span>
        <strong>新建 AI 学习计划</strong>
        <span>告诉 AI 你的目标与时间，它会把计划拆到每一天。</span>
      </RouterLink>
    </div>

    <ConfirmDialog
      :model-value="Boolean(deletingPlan)"
      title="删除这份学习计划？"
      :message="
        deletingPlan
          ? `「${deletingPlan.title}」下的 ${deletingPlan.taskCount} 个任务也会一起删除，且无法恢复。`
          : ''
      "
      confirm-label="删除计划"
      :loading="deleteLoading"
      @update:model-value="(value) => !value && (deletingPlan = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.plans-page {
  display: flex;
  flex-direction: column;
}

.plans-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.plans-toolbar__search {
  width: min(100%, 330px);
}

.plans-toolbar__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.plans-toolbar__select {
  width: 132px;
}

.plans-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  color: var(--ink-faint);
  font-size: 11px;
}

.plans-count__clear {
  color: var(--lav-700);
  font-size: 11px;
  font-weight: 550;
}

.plans-count__clear:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr));
  gap: 16px;
}

.plan-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 236px;
  padding: 24px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.38);
  color: var(--ink-muted);
  text-align: center;
  transition:
    border-color var(--duration) var(--ease),
    background-color var(--duration) var(--ease),
    transform var(--duration) var(--ease);
}

.plan-add:hover {
  border-color: var(--lav-300);
  background: rgba(255, 255, 255, 0.72);
  transform: translateY(-2px);
}

.plan-add__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 4px;
  border-radius: 50%;
  background: var(--lav-100);
  color: var(--lav-700);
}

.plan-add strong {
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 620;
}

.plan-add > span:last-child {
  max-width: 26ch;
  color: var(--ink-faint);
  font-size: 10.5px;
  line-height: 1.55;
}

.plans-empty {
  padding: 18px;
}

.plans-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px;
}

.plans-error__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--danger-100);
  color: var(--danger-600);
}

.plans-error h2 {
  font-size: 14px;
}

.plans-error p {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 11.5px;
}

.plans-error .btn {
  margin-left: auto;
}

@media (max-width: 1080px) {
  .plans-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .plans-toolbar__search {
    width: 100%;
  }

  .plans-toolbar__filters {
    justify-content: space-between;
  }

  .plans-toolbar__select {
    flex: 1;
    min-width: 120px;
  }
}

@media (max-width: 620px) {
  .plans-toolbar__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .plans-toolbar__select {
    width: 100%;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .plans-error {
    flex-wrap: wrap;
  }

  .plans-error .btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>

<style scoped>
/* 2026 / plan library */
.plans-toolbar {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(252, 249, 243, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px);
}

.plans-toolbar__search {
  width: min(100%, 400px);
}

.plans-toolbar__filters {
  gap: 7px;
}

.plans-count {
  margin: 0 2px 16px;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.plans-count__clear {
  color: var(--lav-700);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.plans-empty,
.plans-error {
  padding: 26px;
  border-radius: 26px;
}

.plan-add {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 286px;
  padding: 28px;
  border: 1px dashed var(--line-strong);
  border-radius: 26px;
  color: var(--ink);
  background:
    radial-gradient(100% 100% at 100% 100%, rgba(157, 232, 203, 0.08), transparent 56%),
    transparent;
  transition:
    border-color var(--duration) var(--ease),
    background-color var(--duration) var(--ease),
    transform var(--duration) var(--ease);
}

.plan-add:hover {
  border-color: rgba(133, 114, 239, 0.38);
  background: rgba(252, 249, 243, 0.5);
  transform: translateY(-3px);
}

.plan-add__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(133, 114, 239, 0.2);
  border-radius: 50%;
  background: rgba(133, 114, 239, 0.08);
  color: var(--lav-700);
}

.plan-add strong {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 620;
  letter-spacing: -0.03em;
}

.plan-add > span:last-child {
  max-width: 28ch;
  margin-top: 8px;
  color: var(--ink-muted);
  font-size: 11.5px;
  line-height: 1.7;
}

@media (max-width: 1080px) {
  .plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .plans-toolbar {
    padding: 10px;
  }

  .plans-toolbar__filters {
    width: 100%;
  }

  .plans-toolbar__select {
    flex: 1;
    width: auto;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .plan-add {
    min-height: 220px;
    padding: 24px;
  }
}
</style>
