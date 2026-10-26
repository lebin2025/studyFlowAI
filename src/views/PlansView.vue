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
      eyebrow=""
      title="学习计划"
      description="管理阶段、任务与进度。"
    >
      <template #actions>
        <AppButton to="/app/plans/new" variant="ai">
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
        :title="hasFilters ? '没有匹配的计划' : '暂无计划'"
        :description="
          hasFilters
            ? '换一个筛选条件。'
            : ''
        "
      >
        <template v-if="hasFilters">
          <AppButton variant="secondary" @click="clearFilters">清除筛选</AppButton>
        </template>
        <template v-else>
          <AppButton to="/app/plans/new">
            <template #icon><Sparkles :size="15" /></template>
            创建计划
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
        <span class="plan-add__text">
          <strong>新建 AI 学习计划</strong>
          <span>告诉 AI 你的目标与时间，它会把计划拆到每一天。</span>
        </span>
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
  gap: 16px;
}

.plans-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.plans-toolbar__search {
  width: min(100%, 320px);
}

.plans-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plans-toolbar__select {
  min-width: 118px;
}

.plans-count {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
  color: var(--ink-muted);
  font-size: 12px;
}

.plans-count__clear {
  color: var(--accent);
  font-size: 12px;
  font-weight: 550;
}

.plans-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.plans-error,
.plans-empty {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 22px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.plans-error__icon {
  color: var(--accent);
}

.plans-error h2,
.plans-empty h2 {
  font-size: 14px;
  font-weight: 600;
}

.plans-error p,
.plans-empty p {
  max-width: 50ch;
  margin-top: 4px;
  color: var(--ink-muted);
  font-size: 12px;
  line-height: 1.6;
}

.plans-empty {
  display: block;
  padding: 0;
}

.plans-empty :deep(.empty) {
  padding: 24px;
}

.plan-add {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--surface-soft);
  color: var(--ink);
  transition:
    background-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.plan-add:hover {
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

.plan-add__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--surface);
  color: var(--accent);
  box-shadow: var(--shadow-xs);
}

.plan-add__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.plan-add__text strong {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.plan-add__text span {
  color: var(--ink-muted);
  font-size: 11.5px;
}

@media (max-width: 820px) {
  .plans-toolbar {
    display: block;
  }

  .plans-toolbar__search {
    width: 100%;
  }

  .plans-toolbar__filters {
    margin-top: 9px;
  }

  .plans-toolbar__select {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 560px) {
  .plan-add {
    padding: 13px 14px;
  }

  .plan-add__text strong {
    white-space: normal;
  }
}
</style>