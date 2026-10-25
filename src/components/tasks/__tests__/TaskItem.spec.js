import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import TaskItem from '@/components/tasks/TaskItem.vue'

const RouterLinkStub = {
  props: ['to'],
  render() {
    return h('a', { class: 'task-plan' }, this.$slots.default?.())
  },
}

const mountItem = (props) =>
  mount(TaskItem, {
    props,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

const baseTask = {
  id: 12,
  planId: 3,
  stageId: 1,
  title: '精听 Section 1 并整理同义替换',
  description: '逐句听写，圈出转折词。',
  taskDate: '2026-10-25',
  durationMinutes: 45,
  priority: 'high',
  completionCriteria: '能复述 8 组同义替换',
  isCompleted: false,
  isReview: true,
  actualMinutes: null,
  source: 'ai',
}

describe('TaskItem', () => {
  it('emits toggle with the next completion state', async () => {
    const wrapper = mountItem({ task: baseTask })
    await wrapper.find('.task-check').trigger('click')
    expect(wrapper.emitted('toggle')[0]).toEqual([true])
  })

  it('renders a completed task with strike-through state and un-completes on click', async () => {
    const wrapper = mountItem({ task: { ...baseTask, isCompleted: true, actualMinutes: 40 } })
    expect(wrapper.classes()).toContain('is-done')
    expect(wrapper.text()).toContain('复习')
    expect(wrapper.text()).toContain('实际 40 分钟')
    await wrapper.find('.task-check').trigger('click')
    expect(wrapper.emitted('toggle')[0]).toEqual([false])
  })

  it('emits edit and delete with the task', async () => {
    const wrapper = mountItem({ task: baseTask })
    const actions = wrapper.findAll('.task-action')
    await actions[0].trigger('click')
    await actions[1].trigger('click')
    expect(wrapper.emitted('edit')[0]).toEqual([baseTask])
    expect(wrapper.emitted('delete')[0]).toEqual([baseTask])
  })

  it('shows the plan link only when requested', () => {
    const withoutPlan = mount(TaskItem, {
      props: { task: { ...baseTask, planTitle: '雅思计划' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(withoutPlan.find('.task-plan').exists()).toBe(false)

    const withPlan = mount(TaskItem, {
      props: { task: { ...baseTask, planTitle: '雅思计划' }, showPlan: true },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(withPlan.find('.task-plan').exists()).toBe(true)
    expect(withPlan.text()).toContain('雅思计划')
  })
})
