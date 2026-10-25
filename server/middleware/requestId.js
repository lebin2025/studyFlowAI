import crypto from 'node:crypto'

export const requestId = (req, res, next) => {
  const incoming = req.get('x-request-id')
  req.id =
    incoming && /^[A-Za-z0-9_-]{6,80}$/.test(incoming) ? incoming : crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}
