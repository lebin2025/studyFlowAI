import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { env, ROOT_DIR } from '../config/env.js'
import { logger } from '../utils/logger.js'

const SCHEMA_PATH = path.join(ROOT_DIR, 'server', 'db', 'schema.sql')

export const applyMigrations = (db) => {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  db.exec(schema)
  const version = db.pragma('user_version', { simple: true })
  if (version < 1) db.pragma('user_version = 1')
  return db.pragma('user_version', { simple: true })
}

export const createDatabase = (filePath = env.dbPath) => {
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
  }
  const db = new Database(filePath)
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  if (filePath !== ':memory:') {
    db.pragma('journal_mode = WAL')
  }
  db.pragma('synchronous = NORMAL')
  applyMigrations(db)
  return db
}

let singleton = null

export const getDb = () => {
  if (!singleton) {
    singleton = createDatabase()
    logger.info('Database ready', { path: env.dbPath })
  }
  return singleton
}

export const closeDb = () => {
  if (singleton) {
    singleton.close()
    singleton = null
  }
}
