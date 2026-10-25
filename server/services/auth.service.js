import bcrypt from 'bcryptjs'
import { getDb } from '../db/database.js'
import { AppError, conflict, notFound, unauthorized } from '../utils/httpError.js'
import { nowIsoString } from '../utils/dates.js'
import { cleanText } from '../utils/text.js'

const BCRYPT_ROUNDS = 12
// Used to keep response timing similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('studyflow-timing-equalizer', BCRYPT_ROUNDS)

export const publicUser = (row) => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName ?? row.display_name,
  bio: row.bio ?? '',
  createdAt: row.createdAt ?? row.created_at,
})

export const mapPreferences = (row) => {
  if (!row) return null
  let studyWeekdays = [1, 2, 3, 4, 5]
  try {
    const parsed = JSON.parse(row.study_weekdays)
    if (Array.isArray(parsed) && parsed.length) studyWeekdays = parsed
  } catch {
    /* keep default */
  }
  return {
    defaultDailyMinutes: row.default_daily_minutes,
    studyWeekdays,
    preferredSubjects: row.preferred_subjects,
    learningStyle: row.learning_style,
  }
}

export const getPreferences = (userId) => {
  const row = getDb()
    .prepare('SELECT * FROM user_preferences WHERE user_id = ?')
    .get(userId)
  return mapPreferences(row)
}

export const registerUser = async ({ email, password, displayName }) => {
  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) throw conflict('EMAIL_TAKEN', '这个邮箱已经注册过了，直接登录吧')

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const timestamp = nowIsoString()

  try {
    const create = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO users (email, password_hash, display_name, bio, created_at, updated_at)
           VALUES (?, ?, ?, '', ?, ?)`,
        )
        .run(email, passwordHash, cleanText(displayName, 40), timestamp, timestamp)
      const userId = Number(result.lastInsertRowid)
      db.prepare(
        `INSERT INTO user_preferences
          (user_id, default_daily_minutes, study_weekdays, preferred_subjects, learning_style, created_at, updated_at)
         VALUES (?, 60, '[1,2,3,4,5]', '', 'balanced', ?, ?)`,
      ).run(userId, timestamp, timestamp)
      return userId
    })

    const userId = create()
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    return {
      user: publicUser({
        ...row,
        displayName: row.display_name,
      }),
      preferences: getPreferences(userId),
      tokenVersion: Number(row.token_version) || 0,
    }
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw conflict('EMAIL_TAKEN', '这个邮箱已经注册过了，直接登录吧')
    }
    throw error
  }
}

export const authenticateUser = async ({ email, password }) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  const hash = row?.password_hash || DUMMY_HASH
  const matches = await bcrypt.compare(password, hash)

  if (!row || !matches) {
    throw unauthorized('邮箱或密码不正确')
  }

  return {
    user: publicUser({ ...row, displayName: row.display_name }),
    preferences: getPreferences(row.id),
    tokenVersion: Number(row.token_version) || 0,
  }
}

export const getUserById = (userId) => {
  const row = getDb()
    .prepare(
      `SELECT id, email, display_name AS displayName, bio,
              created_at AS createdAt, updated_at AS updatedAt
       FROM users WHERE id = ?`,
    )
    .get(userId)
  return row ? publicUser(row) : null
}

export const updateProfile = (userId, { displayName, bio }) => {
  const db = getDb()
  const updates = []
  const values = []
  if (displayName !== undefined) {
    updates.push('display_name = ?')
    values.push(cleanText(displayName, 40))
  }
  if (bio !== undefined) {
    updates.push('bio = ?')
    values.push(cleanText(bio, 280, { multiline: true }))
  }
  updates.push('updated_at = ?')
  values.push(nowIsoString(), userId)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const user = getUserById(userId)
  if (!user) throw notFound('账户不存在')
  return user
}

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const db = getDb()
  const row = db.prepare('SELECT password_hash, token_version FROM users WHERE id = ?').get(userId)
  if (!row) throw notFound('账户不存在')
  const matches = await bcrypt.compare(currentPassword, row.password_hash)
  if (!matches) throw new AppError(400, 'INVALID_PASSWORD', '当前密码不正确')
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  const nextVersion = (Number(row.token_version) || 0) + 1
  db.prepare(
    'UPDATE users SET password_hash = ?, token_version = ?, updated_at = ? WHERE id = ?',
  ).run(passwordHash, nextVersion, nowIsoString(), userId)
  return { changed: true, tokenVersion: nextVersion }
}

export const updatePreferences = (userId, input) => {
  const db = getDb()
  const timestamp = nowIsoString()
  db.prepare(
    `UPDATE user_preferences
     SET default_daily_minutes = ?, study_weekdays = ?, preferred_subjects = ?,
         learning_style = ?, updated_at = ?
     WHERE user_id = ?`,
  ).run(
    input.defaultDailyMinutes,
    JSON.stringify(input.studyWeekdays),
    cleanText(input.preferredSubjects, 120),
    input.learningStyle,
    timestamp,
    userId,
  )
  return getPreferences(userId)
}
