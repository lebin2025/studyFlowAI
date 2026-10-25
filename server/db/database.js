import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { env, ROOT_DIR } from '../config/env.js'
import { logger } from '../utils/logger.js'

const SQLITE_SCHEMA_PATH = path.join(ROOT_DIR, 'server', 'db', 'schema.sql')
const POSTGRES_SCHEMA_PATH = path.join(ROOT_DIR, 'server', 'db', 'schema.postgres.sql')

// PostgreSQL returns int8/numeric as strings by default. The UI and progress
// calculations expect numbers, so normalize them at the driver boundary.
pg.types.setTypeParser(20, (value) => Number(value))
pg.types.setTypeParser(1700, (value) => Number(value))

const convertPlaceholders = (sql) => {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

// PostgreSQL folds unquoted aliases to lowercase; SQLite preserves their case.
// Quote aliases so the existing camelCase mappers work with both dialects.
const quoteAliases = (sql) =>
  sql.replace(/\bAS\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi, (_, alias) => `AS "${alias}"`)

const preparePostgresSql = (sql) => convertPlaceholders(quoteAliases(sql))

const ensureParentDirectory = (filePath) => {
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
  }
}

const nowIso = () => new Date().toISOString()

export const isUniqueViolation = (error) => {
  if (!error) return false
  return (
    error.code === '23505' || // PostgreSQL unique_violation
    error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
    /UNIQUE constraint failed/i.test(error.message || '')
  )
}

/**
 * SQLite adapter. All operations go through one serialized queue so an async
 * transaction can never interleave with another request on the single
 * better-sqlite3 connection.
 */
class SqliteAdapter {
  constructor(filePath) {
    this.dialect = 'sqlite'
    this.filePath = filePath
    this._queue = Promise.resolve()
    this.ready = this.#initialize()
  }

  async #initialize() {
    ensureParentDirectory(this.filePath)
    // Lazy-load the native SQLite binding. PostgreSQL deployments never touch
    // it, so a missing native binary cannot break the Supabase path.
    const { default: Database } = await import('better-sqlite3')
    this.db = new Database(this.filePath)
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('busy_timeout = 5000')
    if (this.filePath !== ':memory:') {
      this.db.pragma('journal_mode = WAL')
    }
    this.db.pragma('synchronous = NORMAL')
    this.db.exec(fs.readFileSync(SQLITE_SCHEMA_PATH, 'utf8'))
    const version = this.db.pragma('user_version', { simple: true })
    if (version < 1) this.db.pragma('user_version = 1')
    logger.info('SQLite database ready', { path: this.filePath })
  }

  #enqueue(operation) {
    const run = this._queue.then(operation, operation)
    this._queue = run.catch(() => {})
    return run
  }

  async get(sql, params = []) {
    await this.ready
    return this.#enqueue(() => this.db.prepare(sql).get(...params))
  }

  async all(sql, params = []) {
    await this.ready
    return this.#enqueue(() => this.db.prepare(sql).all(...params))
  }

  async run(sql, params = []) {
    await this.ready
    return this.#enqueue(() => {
      const result = this.db.prepare(sql).run(...params)
      return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }
    })
  }

  async insert(sql, params = []) {
    await this.ready
    return this.#enqueue(() => {
      const result = this.db.prepare(sql).run(...params)
      return Number(result.lastInsertRowid)
    })
  }

  async transaction(callback) {
    await this.ready
    return this.#enqueue(async () => {
      this.db.exec('BEGIN IMMEDIATE')
      const tx = this.#transactionClient()
      try {
        const result = await callback(tx)
        this.db.exec('COMMIT')
        return result
      } catch (error) {
        try {
          this.db.exec('ROLLBACK')
        } catch {
          // The original error is more useful than a rollback error.
        }
        throw error
      }
    })
  }

  #transactionClient() {
    return {
      dialect: this.dialect,
      get: async (sql, params = []) => this.db.prepare(sql).get(...params),
      all: async (sql, params = []) => this.db.prepare(sql).all(...params),
      run: async (sql, params = []) => {
        const result = this.db.prepare(sql).run(...params)
        return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }
      },
      insert: async (sql, params = []) =>
        Number(this.db.prepare(sql).run(...params).lastInsertRowid),
    }
  }

  async health() {
    await this.ready
    return this.#enqueue(() => this.db.prepare('SELECT 1 AS ok').get())
  }

  async listTables() {
    await this.ready
    return this.#enqueue(() =>
      this.db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all()
        .map((row) => row.name),
    )
  }

  async close() {
    await this.ready.catch(() => {})
    this.db?.close()
  }
}

/**
 * PostgreSQL / Supabase adapter. Migrations are applied on first use and every
 * query waits for readiness, so routes do not need a separate init phase.
 */
class PostgresAdapter {
  constructor(connectionString) {
    this.dialect = 'postgres'
    this.connectionString = connectionString
    this.ready = this.#initialize()
  }

  async #initialize() {
    const source = process.env.DATABASE_URL ? 'DATABASE_URL' : 'SUPABASE_DB_URL'
    let target = {}
    try {
      const parsed = new URL(this.connectionString)
      let decodedPassword = parsed.password
      try {
        decodedPassword = decodeURIComponent(parsed.password)
      } catch {
        /* keep raw value */
      }
      target = {
        host: parsed.hostname,
        port: parsed.port || '5432',
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        user: parsed.username,
        hasProjectSuffix: parsed.username.includes('.'),
        passwordLength: parsed.password.length,
        passwordLooksLikePlaceholder: /YOUR-PASSWORD|<password>|REPLACE/i.test(decodedPassword),
      }
    } catch {
      target = { parseError: true }
    }
    logger.info('PostgreSQL connection target', {
      source,
      ...target,
      ssl: env.databaseSsl,
    })
    if (process.env.DATABASE_URL && process.env.SUPABASE_DB_URL) {
      logger.warn('Both DATABASE_URL and SUPABASE_DB_URL are set; DATABASE_URL takes precedence')
    }

    this.pool = new pg.Pool({
      connectionString: this.connectionString,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
      max: env.dbPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      application_name: 'studyflow-ai',
    })
    this.pool.on('error', (error) => {
      logger.error('Unexpected PostgreSQL pool error', { error })
    })

    let client
    try {
      client = await this.pool.connect()
    } catch (error) {
      if (error.code === '28P01') {
        logger.error('PostgreSQL authentication failed', {
          source,
          host: target.host,
          user: target.user,
          hasProjectSuffix: target.hasProjectSuffix,
          passwordLength: target.passwordLength,
          passwordLooksLikePlaceholder: target.passwordLooksLikePlaceholder,
          hint: target.passwordLooksLikePlaceholder
            ? 'Password still contains a placeholder such as [YOUR-PASSWORD]. Replace it with the real database password.'
            : target.hasProjectSuffix
              ? 'Username has the project suffix. Check the database password and project ref; URL-encode special characters.'
              : 'Session pooler username must be postgres.<project-ref>, not just postgres.',
        })
      }
      throw error
    }
    try {
      await client.query('SELECT 1')

      const schema = fs.readFileSync(POSTGRES_SCHEMA_PATH, 'utf8')
      const statements = schema
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean)

      // Serialize schema creation across app instances. The transaction-scoped
      // advisory lock is released automatically on COMMIT/ROLLBACK.
      await client.query('BEGIN')
      try {
        await client.query('SELECT pg_advisory_xact_lock(727001)')
        for (const statement of statements) {
          await client.query(statement)
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      }
    } finally {
      client.release()
    }
    logger.info('PostgreSQL database ready', {
      host: (() => {
        try {
          return new URL(this.connectionString).host
        } catch {
          return 'configured'
        }
      })(),
    })
  }

  async get(sql, params = []) {
    await this.ready
    const result = await this.pool.query(preparePostgresSql(sql), params)
    return result.rows[0]
  }

  async all(sql, params = []) {
    await this.ready
    const result = await this.pool.query(preparePostgresSql(sql), params)
    return result.rows
  }

  async run(sql, params = []) {
    await this.ready
    const result = await this.pool.query(preparePostgresSql(sql), params)
    return { changes: result.rowCount ?? 0 }
  }

  async insert(sql, params = []) {
    await this.ready
    const text = /\breturning\b/i.test(sql) ? sql : `${sql} RETURNING id`
    const result = await this.pool.query(preparePostgresSql(text), params)
    return Number(result.rows[0]?.id)
  }

  async transaction(callback) {
    await this.ready
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(this.#transactionClient(client))
      await client.query('COMMIT')
      return result
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Keep the original error.
      }
      throw error
    } finally {
      client.release()
    }
  }

  #transactionClient(client) {
    return {
      dialect: this.dialect,
      get: async (sql, params = []) => {
        const result = await client.query(preparePostgresSql(sql), params)
        return result.rows[0]
      },
      all: async (sql, params = []) => {
        const result = await client.query(preparePostgresSql(sql), params)
        return result.rows
      },
      run: async (sql, params = []) => {
        const result = await client.query(preparePostgresSql(sql), params)
        return { changes: result.rowCount ?? 0 }
      },
      insert: async (sql, params = []) => {
        const text = /\breturning\b/i.test(sql) ? sql : `${sql} RETURNING id`
        const result = await client.query(preparePostgresSql(text), params)
        return Number(result.rows[0]?.id)
      },
    }
  }

  async health() {
    await this.ready
    const result = await this.pool.query('SELECT 1 AS ok')
    return result.rows[0]
  }

  async listTables() {
    await this.ready
    const result = await this.pool.query(
      "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    )
    return result.rows.map((row) => row.name)
  }

  async close() {
    await this.ready.catch(() => {})
    await this.pool?.end()
  }
}

let singleton = null

export const getDb = () => {
  if (!singleton) {
    if (env.databaseUrl) {
      singleton = new PostgresAdapter(env.databaseUrl)
      logger.info('Database configured', { dialect: 'postgres' })
    } else {
      singleton = new SqliteAdapter(env.dbPath)
      logger.info('Database configured', { dialect: 'sqlite', path: env.dbPath })
    }
  }
  return singleton
}

export const closeDb = async () => {
  if (singleton) {
    await singleton.close()
    singleton = null
  }
}

// Kept for tests or scripts that explicitly want an isolated SQLite instance.
export const createSqliteDatabase = (filePath = env.dbPath) => new SqliteAdapter(filePath)

export const databaseTimestamp = nowIso
