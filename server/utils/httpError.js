/**
 * An error that is safe to expose to API clients.
 * Unexpected errors are converted to a generic 500 response by the error handler.
 */
export class AppError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
    this.expose = true
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details)
export const unauthorized = (message = '请先登录后再继续') =>
  new AppError(401, 'UNAUTHORIZED', message)
export const notFound = (message = '没有找到对应的数据') =>
  new AppError(404, 'NOT_FOUND', message)
export const conflict = (code, message, details) => new AppError(409, code, message, details)

/** Wraps async route handlers so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
