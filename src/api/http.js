import axios from 'axios'

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN_ERROR', status = 0, details = null, requestId = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
    this.requestId = requestId
  }

  get isCanceled() {
    return this.code === 'CANCELLED'
  }
}

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

let unauthorizedHandler = null

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler
}

const isAuthRequest = (config = {}) => {
  const url = config.url || ''
  return (
    url.includes('/auth/session') ||
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/me') ||
    url.includes('/auth/logout')
  )
}

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      throw new ApiError('已取消本次请求', { code: 'CANCELLED' })
    }

    const status = error.response?.status || 0
    const payload = error.response?.data?.error
    let message = payload?.message
    let code = payload?.code

    if (!message) {
      if (error.code === 'ECONNABORTED') {
        message = '请求超时了，请稍后重试'
        code = 'TIMEOUT'
      } else if (!error.response) {
        message = '无法连接服务器，请确认后端已经启动'
        code = 'NETWORK_ERROR'
      } else if (status === 413) {
        message = '提交的内容过大'
        code = 'PAYLOAD_TOO_LARGE'
      } else {
        message = '请求失败，请稍后重试'
        code = 'REQUEST_FAILED'
      }
    }

    const apiError = new ApiError(message, {
      code: code || 'REQUEST_FAILED',
      status,
      details: payload?.details || null,
      requestId: payload?.requestId || null,
    })

    if (status === 401 && unauthorizedHandler && !isAuthRequest(error.config)) {
      unauthorizedHandler(apiError)
    }

    throw apiError
  },
)

export default http
