import { defineStore } from 'pinia'

const KEY = 'studyflow:ambience:v1'
let context = null
let source = null
let filter = null
let gain = null
let stopTimer = null

const read = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      mode: ['focus', 'relax', 'minimal'].includes(data.mode) ? data.mode : 'minimal',
      volume: Math.min(1, Math.max(0, Number(data.volume ?? 0.35))),
    }
  } catch {
    return { mode: 'minimal', volume: 0.35 }
  }
}

const createNoise = (ctx) => {
  const length = Math.floor(ctx.sampleRate * 2)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

export const useAmbienceStore = defineStore('ambience', {
  state: () => {
    const saved = read()
    return {
      mode: saved.mode,
      volume: saved.volume,
      playing: false,
      supported: typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext),
      error: '',
    }
  },

  getters: {
    label: (state) => ({ focus: '专注', relax: '放松', minimal: '静音' })[state.mode],
    modeLabel: (state) =>
      ({ focus: '专注白噪音', relax: '放松环境音', minimal: '静音' })[state.mode],
  },

  actions: {
    ensureContext() {
      if (!this.supported) {
        this.error = '当前浏览器不支持环境音。'
        return null
      }
      if (!context) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext
        context = new AudioCtor()
        filter = context.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 720
        filter.Q.value = 0.7
        gain = context.createGain()
        gain.gain.value = 0
        filter.connect(gain)
        gain.connect(context.destination)
      }
      return context
    },

    applyTone() {
      if (!filter) return
      filter.type = this.mode === 'relax' ? 'bandpass' : 'lowpass'
      filter.frequency.value = this.mode === 'relax' ? 1450 : 720
      filter.Q.value = this.mode === 'relax' ? 0.45 : 0.7
    },

    async play(mode = this.mode) {
      if (mode === 'minimal') {
        this.mode = 'minimal'
        this.pause()
        return
      }
      this.mode = mode
      const ctx = this.ensureContext()
      if (!ctx) return
      try {
        if (ctx.state === 'suspended') await ctx.resume()
        this.applyTone()
        if (stopTimer) {
          window.clearTimeout(stopTimer)
          stopTimer = null
        }
        if (source) {
          try {
            source.stop()
          } catch {
            /* already stopped */
          }
          source.disconnect()
          source = null
        }
        source = ctx.createBufferSource()
        source.buffer = createNoise(ctx)
        source.loop = true
        source.connect(filter)
        source.start()
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(this.volume, ctx.currentTime + 0.25)
        this.playing = true
        this.error = ''
        this.persist()
      } catch {
        this.error = '环境音播放失败，请检查浏览器音频权限。'
        this.playing = false
      }
    },

    pause() {
      if (!context || !gain) {
        this.playing = false
        return
      }
      const ctx = context
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
        if (stopTimer) window.clearTimeout(stopTimer)
        stopTimer = window.setTimeout(() => {
          try {
            source?.stop()
          } catch {
            /* already stopped */
          }
          source?.disconnect()
          source = null
        }, 260)
      } catch {
        /* ignore */
      }
      this.playing = false
      this.persist()
    },

    async toggle() {
      if (this.playing) {
        this.pause()
        return
      }
      await this.play(this.mode === 'minimal' ? 'focus' : this.mode)
    },

    async setMode(mode) {
      if (!['focus', 'relax', 'minimal'].includes(mode)) return
      this.mode = mode
      this.persist()
      if (mode === 'minimal') {
        this.pause()
        return
      }
      if (this.playing) await this.play(mode)
    },

    setVolume(value) {
      this.volume = Math.min(1, Math.max(0, Number(value) || 0))
      if (gain && context) {
        gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.linearRampToValueAtTime(this.volume, context.currentTime + 0.08)
      }
      this.persist()
    },

    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ mode: this.mode, volume: this.volume }))
      } catch {
        /* ignore */
      }
    },

    reset() {
      this.pause()
      this.mode = 'minimal'
      this.volume = 0.35
      this.persist()
    },

    dispose() {
      this.pause()
      try {
        context?.close()
      } catch {
        /* ignore */
      }
      context = null
      filter = null
      gain = null
      source = null
    },
  },
})
