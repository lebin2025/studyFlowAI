import { getDb, closeDb } from './database.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

const db = getDb()
await db.ready
const tables = await db.listTables()

logger.info('Migration complete', {
  dialect: db.dialect,
  target: db.dialect === 'postgres' ? 'DATABASE_URL' : env.dbPath,
  tables,
})

await closeDb()
