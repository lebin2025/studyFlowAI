<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  FileText,
  PencilLine,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { plansApi } from '@/api/index.js'
import { useDraftsStore } from '@/stores/drafts.js'
import { useUiStore } from '@/stores/ui.js'

const drafts = useDraftsStore()
const ui = useUiStore()
const router = useRouter()
const deletingDraft = ref(null)
const creatingId = ref('')
const createError = ref('')

const list = computed(() => drafts.sorted)

const updatedLabel = (timestamp) =>
  new Date(timestamp).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const continueDraft = (draft) => {
  router.push({ name: 'plan-new', query: { draft: draft.id } })
}

const createPlan = async (draft) => {
  if (!draft.planPayload || creatingId.value) return
  creatingId.value = draft.id
  createError.value = ''
  try {
    const detail = await plansApi.create({ ...draft.planPayload, source: 'ai' })
    drafts.remove(draft.id)
    ui.success('计划已创建', '已写入学习空间')
    router.push({ name: 'plan-detail', params: { id: detail.plan.id } })
  } catch (error) {
    createError.value = error.message || '创建失败，草稿已保留'
    ui.error(createError.value, '创建失败')
  } finally {
    creatingId.value = ''
  }
}

const askDelete = (draft) => {
  deletingDraft.value = draft
}

const confirmDelete = () => {
  if (!deletingDraft.value) return
  drafts.remove(deletingDraft.value.id)
  deletingDraft.value = null
  ui.success('草稿已删除')
}
</script>

<template>
  <div class="drafts-page">
    <PageHeader title="草稿箱">
      <template #actions>
        <AppButton to="/app/plans/new" variant="ai">
          <template #icon><Sparkles :size="15" /></template>
          新建计划
        </AppButton>
      </template>
    </PageHeader>

    <p v-if="drafts.storageError" class="drafts-error" role="alert">{{ drafts.storageError }}</p>
    <p v-if="createError" class="drafts-error" role="alert">{{ createError }}</p>

    <section v-if="list.length" class="draft-list" aria-label="学习计划草稿">
      <article v-for="draft in list" :key="draft.id" class="draft-row">
        <div class="draft-row__main">
          <div class="draft-row__head">
            <span class="draft-type" :class="{ 'is-ai': draft.source === 'preview' }">
              <Sparkles v-if="draft.source === 'preview'" :size="10" />
              <FileText v-else :size="10" />
              {{ draft.source === 'preview' ? 'AI 草稿' : '表单草稿' }}
            </span>
            <span class="draft-status">{{ draft.planPayload ? '可创建' : '待完善' }}</span>
            <span class="draft-time">{{ updatedLabel(draft.updatedAt) }}</span>
          </div>
          <h2>{{ draft.title }}</h2>
          <p>
            {{ draft.form.subject || '未填写科目' }}
            <span v-if="draft.form.goal">· {{ draft.form.goal }}</span>
          </p>
        </div>

        <div class="draft-row__actions">
          <button type="button" class="draft-action" @click="continueDraft(draft)">
            <PencilLine :size="14" />
            继续编辑
          </button>
          <button
            v-if="draft.planPayload"
            type="button"
            class="draft-action draft-action--primary"
            :disabled="creatingId === draft.id"
            @click="createPlan(draft)"
          >
            <ArrowRight :size="14" />
            {{ creatingId === draft.id ? '创建中…' : '正式创建' }}
          </button>
          <button type="button" class="draft-action draft-action--danger" aria-label="删除草稿" @click="askDelete(draft)">
            <Trash2 :size="14" />
          </button>
        </div>
      </article>
    </section>

    <div v-else class="draft-empty">
      <AppEmptyState title="暂无草稿" description="创建一份计划，内容会自动保存在这里。">
        <AppButton to="/app/plans/new">
          <template #icon><Plus :size="15" /></template>
          创建计划
        </AppButton>
      </AppEmptyState>
    </div>

    <ConfirmDialog
      :model-value="Boolean(deletingDraft)"
      title="删除这份草稿？"
      :message="deletingDraft ? `「${deletingDraft.title}」删除后无法恢复。` : ''"
      confirm-label="删除草稿"
      @update:model-value="(value) => !value && (deletingDraft = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.drafts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drafts-notice {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 11px;
}

.drafts-error {
  color: var(--danger-700);
  font-size: 12px;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.draft-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
  transition:
    box-shadow var(--duration) var(--ease),
    transform var(--duration) var(--ease);
}

.draft-row:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.draft-row__main {
  min-width: 0;
}

.draft-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.draft-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ink-faint);
  font-size: 10px;
}

.draft-type.is-ai {
  color: var(--accent);
}

.draft-time {
  color: var(--ink-faint);
  font-size: 10px;
}

.draft-row h2 {
  max-width: 48ch;
  margin-top: 5px;
  overflow: hidden;
  color: var(--ink);
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-row p {
  max-width: 60ch;
  margin-top: 3px;
  overflow: hidden;
  color: var(--ink-muted);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-row__actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: none;
}

.draft-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  color: var(--ink-muted);
  font-size: 11px;
  white-space: nowrap;
}

.draft-action:hover {
  background: var(--surface-soft);
  color: var(--ink);
}

.draft-action--primary {
  background: var(--ink);
  color: var(--bg);
}

.draft-action--primary:hover {
  background: var(--accent);
  color: var(--accent-ink);
}

.draft-action--danger:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.draft-empty {
  padding: 6px 18px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 760px) {
  .draft-row {
    display: block;
    padding: 14px;
  }

  .draft-row__actions {
    margin-top: 12px;
  }

  .draft-row h2 {
    white-space: normal;
  }

  .draft-row p {
    white-space: normal;
  }
}
</style>

<style scoped>
.draft-status {
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--surface-soft);
  color: var(--ink-muted);
  font-size: 9.5px;
}
</style>
