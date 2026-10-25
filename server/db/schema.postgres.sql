-- StudyFlow AI schema (PostgreSQL / Supabase)
-- Mirrors server/db/schema.sql. Calendar dates stay as YYYY-MM-DD text.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT    NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT    NOT NULL,
  display_name  TEXT    NOT NULL,
  bio           TEXT    NOT NULL DEFAULT '',
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_daily_minutes INTEGER NOT NULL DEFAULT 60
                        CHECK (default_daily_minutes BETWEEN 10 AND 480),
  study_weekdays        TEXT    NOT NULL DEFAULT '[1,2,3,4,5]',
  preferred_subjects    TEXT    NOT NULL DEFAULT '',
  learning_style        TEXT    NOT NULL DEFAULT 'balanced'
                        CHECK (learning_style IN ('balanced', 'deep', 'practice', 'review')),
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  goal            TEXT    NOT NULL,
  subject         TEXT    NOT NULL,
  level           TEXT    NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  start_date      TEXT    NOT NULL,
  end_date        TEXT    NOT NULL,
  daily_minutes   INTEGER NOT NULL CHECK (daily_minutes BETWEEN 10 AND 480),
  study_weekdays  TEXT    NOT NULL,
  preferences     TEXT    NOT NULL DEFAULT '',
  overview        TEXT    NOT NULL DEFAULT '',
  risks           TEXT    NOT NULL DEFAULT '[]',
  advice          TEXT    NOT NULL DEFAULT '',
  status          TEXT    NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'archived')),
  source          TEXT    NOT NULL DEFAULT 'ai'
                  CHECK (source IN ('ai', 'manual')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  CHECK (start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS plan_stages (
  id          SERIAL PRIMARY KEY,
  plan_id     INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  objective   TEXT    NOT NULL DEFAULT '',
  start_date  TEXT    NOT NULL,
  end_date    TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL,
  CHECK (start_date <= end_date)
);

CREATE TABLE IF NOT EXISTS tasks (
  id                  SERIAL PRIMARY KEY,
  plan_id             INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  stage_id            INTEGER REFERENCES plan_stages(id) ON DELETE SET NULL,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  description         TEXT    NOT NULL DEFAULT '',
  task_date           TEXT    NOT NULL,
  duration_minutes    INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),
  priority            TEXT    NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('high', 'medium', 'low')),
  completion_criteria TEXT    NOT NULL DEFAULT '',
  is_completed        INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  completed_at        TEXT,
  is_review           INTEGER NOT NULL DEFAULT 0 CHECK (is_review IN (0, 1)),
  actual_minutes      INTEGER CHECK (actual_minutes IS NULL OR actual_minutes BETWEEN 0 AND 1440),
  source              TEXT    NOT NULL DEFAULT 'ai'
                      CHECK (source IN ('ai', 'manual', 'ai_adjust')),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id           INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  request_id        TEXT,
  kind              TEXT    NOT NULL CHECK (kind IN ('generate', 'adjust')),
  model             TEXT    NOT NULL,
  success           INTEGER NOT NULL DEFAULT 1 CHECK (success IN (0, 1)),
  error_code        TEXT,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cache_hit_tokens  INTEGER NOT NULL DEFAULT 0,
  cache_miss_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  cost_usd          DOUBLE PRECISION NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_drafts (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT    NOT NULL,
  kind       TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  created_at TEXT    NOT NULL,
  expires_at TEXT    NOT NULL,
  PRIMARY KEY (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_plans_user_status ON plans (user_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_user_updated ON plans (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stages_plan ON plan_stages (plan_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks (user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_plan_date ON tasks (plan_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks (user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks (stage_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_expiry ON ai_drafts (expires_at);
