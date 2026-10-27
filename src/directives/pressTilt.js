import router from '@/router'

const DEFAULT_TILT = {
  tiltX: 2.4,
  tiltY: 2.4,
  tiltZ: 8,
  scale: 0.97,
  perspective: 900,
}

const SUBTLE_TILT = {
  tiltX: 3.2,
  tiltY: 3.2,
  tiltZ: 0,
  scale: 0.988,
  perspective: 650,
}

const RECOVER_MS = 400
const states = new WeakMap()

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const setTransform = (el, nx, ny, pressed, config) => {
  const rz = clamp(nx * config.tiltZ, -config.tiltZ, config.tiltZ)
  const ry = clamp(nx * config.tiltY, -config.tiltY, config.tiltY)
  const rx = clamp(-ny * config.tiltX, -config.tiltX, config.tiltX)
  el.style.transform = pressed
    ? `perspective(${config.perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${config.scale})`
    : ''
  el.style.setProperty('--press-x', `${((nx + 1) / 2) * 100}%`)
  el.style.setProperty('--press-y', `${((ny + 1) / 2) * 100}%`)
}

const onPointerDown = (event, el, binding) => {
  if (event.button !== undefined && event.button !== 0) return
  if (event.target.closest('button, input, textarea, select, [data-no-tilt]')) return

  const rect = el.getBoundingClientRect()
  const config = binding.value?.subtle ? SUBTLE_TILT : DEFAULT_TILT
  const state = {
    pointerId: event.pointerId,
    rect,
    binding,
    config,
    active: true,
    pendingNav: Boolean(binding.value?.to),
  }
  states.set(el, state)

  el.classList.add('press-tilt')
  el.classList.add('is-pressing')
  el.classList.remove('is-releasing')
  el.style.transition = 'none'
  el.style.transformStyle = 'preserve-3d'
  el.style.touchAction = 'pan-y'
  el.style.userSelect = 'none'

  const nx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1)
  const ny = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1)
  setTransform(el, nx, ny, true, config)

  el.setPointerCapture?.(event.pointerId)

  const onMove = (moveEvent) => {
    if (!state.active || moveEvent.pointerId !== state.pointerId) return
    const current = el.getBoundingClientRect()
    const mx = clamp(((moveEvent.clientX - current.left) / current.width) * 2 - 1, -1, 1)
    const my = clamp(((moveEvent.clientY - current.top) / current.height) * 2 - 1, -1, 1)
    setTransform(el, mx, my, true, state.config)
  }

  const onUp = (upEvent) => {
    if (!state.active || upEvent.pointerId !== state.pointerId) return
    state.active = false
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    el.classList.remove('is-pressing')
    el.classList.add('is-releasing')
    el.style.transition = `transform ${RECOVER_MS}ms cubic-bezier(0.2, 1.35, 0.35, 1)`
    el.style.transform = `perspective(${state.config.perspective}px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`
    el.style.setProperty('--press-x', '50%')
    el.style.setProperty('--press-y', '50%')

    window.setTimeout(() => {
      el.classList.remove('is-releasing')
      el.style.transition = ''
      el.style.transform = ''
      el.style.transformStyle = ''
      el.style.touchAction = ''
      el.style.userSelect = ''
      states.delete(el)
    }, RECOVER_MS + 40)

    try {
      el.releasePointerCapture?.(upEvent.pointerId)
    } catch {
      /* pointer capture may already be released */
    }
  }

  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}

const onClickCapture = (event, el) => {
  const state = states.get(el)
  if (!state?.pendingNav || !state.binding.value?.to) return
  event.preventDefault()
  event.stopPropagation()
  state.pendingNav = false
  const target = state.binding.value.to
  window.setTimeout(() => {
    if (typeof target === 'string') router.push(target)
    else if (target && typeof target === 'object') router.push(target)
  }, RECOVER_MS)
}

export const pressTilt = {
  mounted(el, binding) {
    el.classList.add('press-tilt')
    el.__pressBinding = binding
    el.__pressDown = (event) => onPointerDown(event, el, el.__pressBinding)
    el.__pressClick = (event) => onClickCapture(event, el)
    el.addEventListener('pointerdown', el.__pressDown)
    el.addEventListener('click', el.__pressClick, true)
  },
  updated(el, binding) {
    el.__pressBinding = binding
  },
  unmounted(el) {
    el.removeEventListener('pointerdown', el.__pressDown)
    el.removeEventListener('click', el.__pressClick, true)
    delete el.__pressDown
    delete el.__pressClick
  },
}
