import { defineStore } from 'pinia'

const KEY = 'studyflow:ambience:v2'

export const TRACKS = [
  { id: 'forest', label: '森林', caption: '专注', src: '/audio/forest.mp3' },
  { id: 'moon', label: '月光', caption: '放松', src: '/audio/moon.mp3' },
  { id: 'snow', label: '雪', caption: '安静', src: '/audio/snow.mp3' },
  { id: 'sunset', label: '日落', caption: '松弛', src: '/audio/sunset.mp3' },
  { id: 'minimal', label: '静音', caption: '关闭', src: '' },
]

const TRACK_MAP = new Map(TRACKS.map((track) => [track.id, track]))

const read = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      mode: TRACK_MAP.has(data.mode) ? data.mode : 'forest',
      volume: Math.min(1, Math.max(0, Number(data.volume ?? 0.35))),
    }
  } catch {
    return { mode: 'forest', volume: 0.35 }
  }
}

let audio = null
let fadeFrame = null
let playToken = 0

const cancelFade = () => {
  if (fadeFrame) cancelAnimationFrame(fadeFrame)
  fadeFrame = null
}

const fadeTo = (target, duration = 220) =>
  new Promise((resolve) => {
    if (!audio) {
      resolve()
      return
    }
    cancelFade()
    const start = audio.volume
    const startedAt = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - (1 - progress) ** 2
      audio.volume = start + (target - start) * eased
      if (progress < 1) {
        fadeFrame = requestAnimationFrame(step)
      } else {
        fadeFrame = null
        resolve()
      }
    }
    fadeFrame = requestAnimationFrame(step)
  })

export const useAmbienceStore = defineStore('ambience', {
  state: () => {
    const saved = read()
    return {
      tracks: TRACKS,
      mode: saved.mode,
      volume: saved.volume,
      playing: false,
      loading: false,
      supported: typeof window !== 'undefined' && typeof window.Audio !== 'undefined',
      error: '',
    }
  },

  getters: {
    currentTrack: (state) => TRACK_MAP.get(state.mode) || TRACK_MAP.get('forest'),
    label: (state) => TRACK_MAP.get(state.mode)?.label || '静音',
    modeLabel: (state) => {
      const track = TRACK_MAP.get(state.mode)
      return track && track.id !== 'minimal' ? `${track.label}环境音` : '静音'
    },
    isMuted: (state) => state.mode === 'minimal',
  },

  actions: {
    ensureAudio() {
      if (!this.supported) {
        this.error = '当前浏览器不支持音频播放。'
        return null
      }
      if (!audio) {
        audio = new Audio()
        audio.loop = true
        audio.preload = 'none'
        audio.volume = this.volume
        audio.addEventListener('error', () => {
          this.error = '音频加载失败，请检查 public/audio 文件。'
          this.playing = false
        })
      }
      return audio
    },

    async play(mode = this.mode) {
      if (mode === 'minimal') {
        this.mode = 'minimal'
        this.pause()
        return
      }
      this.mode = mode
      const track = TRACK_MAP.get(mode)
      if (!track?.src) {
        this.error = '这个环境音没有配置文件。'
        return
      }
      const element = this.ensureAudio()
      if (!element) return
      this.error = ''
      this.loading = true
      const token = ++playToken
      try {
        if (element.src && element.src !== window.location.origin + track.src) {
          await fadeTo(0, 180)
          element.pause()
        }
        if (element.src !== window.location.origin + track.src) {
          element.src = track.src
          element.load()
        }
        element.volume = 0
        await element.play()
        if (token !== playToken) {
          element.pause()
          return
        }
        this.playing = true
        this.loading = false
        await fadeTo(this.volume, 260)
        this.persist()
      } catch {
        this.error = '音频播放失败，请检查浏览器音频权限。'
        this.playing = false
        this.loading = false
      }
    },

    pause() {
      playToken += 1
      this.playing = false
      this.loading = false
      this.persist()
      if (!audio) return
      cancelFade()
      const token = playToken
      fadeTo(0, 180).then(() => {
        if (token !== playToken) return
        try {
          audio.pause()
        } catch {
          /* ignore */
        }
      })
    },

    async toggle() {
      if (this.playing) {
        this.pause()
        return
      }
      await this.play(this.mode === 'minimal' ? 'forest' : this.mode)
    },

    async setMode(mode) {
      if (!TRACK_MAP.has(mode)) return
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
      if (audio) audio.volume = this.volume
      this.persist()
    },

    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ mode: this.mode, volume: this.volume }))
      } catch {
        /* storage is best-effort */
      }
    },

    reset() {
      this.pause()
      this.mode = 'forest'
      this.volume = 0.35
      this.persist()
    },

    dispose() {
      playToken += 1
      cancelFade()
      if (!audio) return
      try {
        audio.pause()
        audio.src = ''
        audio.load()
      } catch {
        /* ignore */
      }
      audio = null
    },
  },
})
