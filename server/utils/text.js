/**
 * Cleans text coming from users or from the AI before it reaches the database.
 * Output is rendered as plain text by Vue, so this is about length and hygiene,
 * not HTML sanitising.
 */
export const cleanText = (value, maxLength = 2000, { multiline = false } = {}) => {
  if (value === null || value === undefined) return ''
  let text = String(value)
  // Drop control characters (keep newlines/tabs when multiline is allowed).
  text = multiline
    ? text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    : text.replace(/[\u0000-\u001F\u007F]/g, ' ')
  text = text.normalize('NFC').replace(/\r\n/g, '\n')
  text = multiline
    ? text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : text.replace(/\s+/g, ' ').trim()
  return text.slice(0, maxLength)
}

/** Escapes a user search term for use with `LIKE ? ESCAPE '\'`. */
export const escapeLike = (value) =>
  String(value).replace(/[\\%_]/g, (character) => `\\${character}`)

export const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export const uniqueBy = (items, keyFn) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
