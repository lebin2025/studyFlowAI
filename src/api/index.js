import http from './http.js'

export const authApi = {
  session: () => http.get('/auth/session'),
  me: () => http.get('/auth/me'),
  login: (payload) => http.post('/auth/login', payload),
  register: (payload) => http.post('/auth/register', payload),
  logout: () => http.post('/auth/logout'),
  changePassword: (payload) => http.patch('/auth/password', payload),
}

export const usersApi = {
  updateProfile: (payload) => http.patch('/users/me', payload),
  getPreferences: () => http.get('/users/me/preferences'),
  updatePreferences: (payload) => http.put('/users/me/preferences', payload),
}

export const plansApi = {
  list: (params = {}) => http.get('/plans', { params }),
  get: (id) => http.get(`/plans/${id}`),
  create: (payload) => http.post('/plans', payload),
  update: (id, payload) => http.patch(`/plans/${id}`, payload),
  remove: (id) => http.delete(`/plans/${id}`),
}

export const tasksApi = {
  list: (params = {}) => http.get('/tasks', { params }),
  get: (id) => http.get(`/tasks/${id}`),
  create: (payload) => http.post('/tasks', payload),
  update: (id, payload) => http.patch(`/tasks/${id}`, payload),
  toggle: (id, payload) => http.patch(`/tasks/${id}/toggle`, payload),
  remove: (id) => http.delete(`/tasks/${id}`),
}

export const statsApi = {
  overview: (days = 30) => http.get('/stats/overview', { params: { days } }),
}

export const aiApi = {
  status: () => http.get('/ai/status'),
  usage: (limit = 10) => http.get('/ai/usage', { params: { limit } }),
  generate: (payload, options = {}) =>
    http.post('/ai/plans', payload, { timeout: 240000, signal: options.signal }),
  previewAdjustment: (planId, payload, options = {}) =>
    http.post(`/ai/plans/${planId}/adjust/preview`, payload, {
      timeout: 240000,
      signal: options.signal,
    }),
  applyAdjustment: (planId, payload) =>
    http.post(`/ai/plans/${planId}/adjust/apply`, payload),
}
