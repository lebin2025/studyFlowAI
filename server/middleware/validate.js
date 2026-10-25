import { badRequest } from '../utils/httpError.js'

/**
 * Validates req.body / req.query / req.params and stores the parsed result in
 * req.validated[source]. The raw request is never trusted downstream.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {})
  if (!result.success) {
    const issues = result.error.issues.slice(0, 20).map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }))
    next(badRequest('VALIDATION_ERROR', issues[0]?.message || '提交的信息有误，请检查后重试', issues))
    return
  }
  req.validated = req.validated || {}
  req.validated[source] = result.data
  next()
}
