import { AppError } from '../utils/httpError.js'
import { logger } from '../utils/logger.js'

export const notFoundHandler = (req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', '请求的接口不存在'))
}

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  let status = err instanceof AppError ? err.status : 500
  let code = err instanceof AppError ? err.code : 'INTERNAL_ERROR'
  let message = err instanceof AppError ? err.message : '服务器开小差了，请稍后重试'
  let details = err instanceof AppError ? err.details : undefined

  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    status = 400
    code = 'INVALID_JSON'
    message = '请求内容格式不正确'
  } else if (err?.type === 'entity.too.large') {
    status = 413
    code = 'PAYLOAD_TOO_LARGE'
    message = '提交的内容过大'
  } else if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    status = 409
    code = 'CONSTRAINT_VIOLATION'
    message =
      err.code === 'SQLITE_CONSTRAINT_UNIQUE'
        ? '该数据已存在，请勿重复提交'
        : '提交的数据不符合要求'
    details = undefined
  }

  const logMeta = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl?.split('?')[0],
    status,
    code,
    userId: req.user?.id,
  }

  if (status >= 500) {
    logger.error('Request failed', { ...logMeta, error: err })
  } else if (status !== 401 && status !== 404) {
    logger.warn('Request rejected', { ...logMeta, message: err?.message })
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      requestId: req.id,
    },
  })
}
