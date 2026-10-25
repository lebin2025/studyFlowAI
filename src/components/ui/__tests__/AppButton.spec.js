import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '@/components/ui/AppButton.vue'

describe('AppButton', () => {
  it('renders its label, variant and size', () => {
    const wrapper = mount(AppButton, {
      props: { variant: 'secondary', size: 'sm' },
      slots: { default: '保存修改' },
    })
    expect(wrapper.text()).toContain('保存修改')
    expect(wrapper.classes()).toContain('btn--secondary')
    expect(wrapper.classes()).toContain('btn--sm')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('emits click and does not emit while disabled', async () => {
    const wrapper = mount(AppButton, { slots: { default: '下一步' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)

    await wrapper.setProps({ disabled: true })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows a spinner and blocks clicks while loading', async () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      slots: { default: '保存中' },
    })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.btn__spinner').exists()).toBe(true)
    expect(wrapper.attributes('disabled')).toBeDefined()

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
