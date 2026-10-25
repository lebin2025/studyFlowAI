import { getDb, closeDb } from './database.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const db = getDb()
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()

logger.info('Migration complete', {
  db: env.dbPath,
  schemaVersion: db.pragma('user_version', { simple: true }),
  tables: tables.map((row) => row.name),
})

closeDb()
