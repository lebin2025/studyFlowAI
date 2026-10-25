import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppSelect from '@/components/ui/AppSelect.vue'

describe('AppSelect', () => {
  it('uses an empty-valued option instead of a placeholder when one exists', () => {
    const wrapper = mount(AppSelect, {
      props: {
        modelValue: '',
        options: [
          { value: '', label: '全部科目' },
          { value: '雅思', label: '雅思' },
        ],
      },
    })
    const options = wrapper.findAll('option')
    expect(options.map((option) => option.text())).toEqual(['全部科目', '雅思'])
    expect(wrapper.find('select').element.value).toBe('')
  })

  it('shows a placeholder only when no empty option is supplied', () => {
    const wrapper = mount(AppSelect, {
      props: {
        modelValue: '',
        placeholder: '选择学习计划',
        options: [
          { value: 1, label: '雅思计划' },
          { value: 2, label: '六级计划' },
        ],
      },
    })
    const placeholder = wrapper.findAll('option')[0]
    expect(placeholder.text()).toBe('选择学习计划')
    expect(placeholder.attributes('disabled')).toBeDefined()
  })

  it('emits the original numeric option value', async () => {
    const wrapper = mount(AppSelect, {
      props: {
        modelValue: '',
        placeholder: '选择学习计划',
        options: [
          { value: 1, label: '雅思计划' },
          { value: 2, label: '六级计划' },
        ],
      },
    })
    await wrapper.find('select').setValue('2')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([2])
  })
})
