CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 100),
  email text NOT NULL,
  password_hash text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  email_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE accounts (
  account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
  account_no_ciphertext bytea NOT NULL,
  account_no_iv bytea NOT NULL,
  account_no_auth_tag bytea NOT NULL,
  account_no_hash text NOT NULL UNIQUE,
  account_no_last4 char(4) NOT NULL,
  balance numeric(18, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accounts_status_idx ON accounts (status);

CREATE TABLE transactions (
  transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_account_id uuid REFERENCES accounts(account_id) ON DELETE RESTRICT,
  receiver_account_id uuid REFERENCES accounts(account_id) ON DELETE RESTRICT,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
  amount numeric(18, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'completed', 'declined')),
  created_by uuid NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(user_id) ON DELETE RESTRICT,
  CHECK (sender_account_id IS NOT NULL OR receiver_account_id IS NOT NULL),
  CHECK (sender_account_id IS NULL OR sender_account_id <> receiver_account_id)
);
CREATE UNIQUE INDEX transactions_idempotency_unique ON transactions (created_by, idempotency_key);
CREATE INDEX transactions_sender_created_idx ON transactions (sender_account_id, created_at DESC);
CREATE INDEX transactions_receiver_created_idx ON transactions (receiver_account_id, created_at DESC);
CREATE INDEX transactions_status_created_idx ON transactions (status, created_at DESC);

CREATE TABLE fraud_logs (
  log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(transaction_id) ON DELETE RESTRICT,
  risk_score smallint NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  flag_reason text NOT NULL DEFAULT '',
  ai_summary text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_challenges (
  challenge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('signup', 'login')),
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_challenges_user_purpose_idx ON otp_challenges (user_id, purpose, created_at DESC);
CREATE UNIQUE INDEX otp_challenges_one_active_idx
  ON otp_challenges (user_id, purpose) WHERE consumed_at IS NULL;

CREATE TABLE audit_logs (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
