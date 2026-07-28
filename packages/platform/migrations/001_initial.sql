-- Canonical demo persistence model. Runtime uses the identical SCHEMA_SQL
-- constant so Fresh's production bundle does not depend on a loose SQL file.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  label TEXT NOT NULL,
  encrypted_secrets TEXT NOT NULL,
  nonce TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  flow TEXT NOT NULL,
  state TEXT NOT NULL,
  amount_value INTEGER NOT NULL,
  currency TEXT NOT NULL,
  paid_value INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  payment_link_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE payment_sessions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  adyen_session_id TEXT,
  state TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  payment_method TEXT,
  psp_reference TEXT,
  amount_value INTEGER NOT NULL,
  currency TEXT NOT NULL,
  refusal_reason TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE payment_parts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL,
  psp_reference TEXT,
  amount_value INTEGER NOT NULL,
  currency TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE api_calls (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  request_payload TEXT NOT NULL,
  response_payload TEXT NOT NULL,
  error TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE frontend_callbacks (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  psp_reference TEXT,
  hmac_valid INTEGER NOT NULL,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  processing_error TEXT
);

CREATE TABLE lifecycle_actions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  correlation_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  payload TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

