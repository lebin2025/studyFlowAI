let observer = null

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const ensureObserver = () => {
  if (observer || typeof IntersectionObserver === 'undefined') return observer
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
      })
    },
    { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
  )
  return observer
}

/**
 * v-reveal — a tiny, dependency-free scroll reveal. Content stays visible when
 * JS/IntersectionObserver is unavailable or motion is reduced.
 */
export const revealDirective = {
  mounted(el, binding) {
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal', 'is-visible')
      return
    }
    el.classList.add('reveal')
    if (binding.value?.delay) el.style.transitionDelay = `${binding.value.delay}ms`
    ensureObserver()?.observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
