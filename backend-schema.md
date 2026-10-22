# ShadowBank PostgreSQL schema

## SQL setup

Create the database and a non-superuser application role, then run the migration:

```sql
CREATE ROLE shadowbank_app LOGIN PASSWORD 'replace-with-a-long-random-password';
CREATE ROLE shadowbank_owner LOGIN PASSWORD 'another-long-random-password';
CREATE DATABASE shadowbank OWNER shadowbank_owner;
```

Run [`backend/migrations/001_initial_schema.sql`](./backend/migrations/001_initial_schema.sql) as `shadowbank_owner`. Then, connected to the `shadowbank` database as an administrator, grant the runtime role only the required data privileges:

```sql
GRANT CONNECT ON DATABASE shadowbank TO shadowbank_app;
GRANT USAGE ON SCHEMA public TO shadowbank_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shadowbank_app;
ALTER DEFAULT PRIVILEGES FOR ROLE shadowbank_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shadowbank_app;
```

The migration creates the `users`, `accounts`, `transactions`, and `fraud_logs` tables from the supplied design, plus `otp_challenges` for expiring one-time verification codes and `audit_logs` for administrator/customer actions. It uses UUID primary keys, foreign keys, state checks, numeric balances, idempotency keys, and useful lookup indexes. Account numbers are encrypted using AES-256-GCM; a keyed HMAC hash supports account-number matching without decrypting stored numbers.

## Schema diagram structure

- **users** (`user_id` PK, `full_name`, `email`, `password_hash`, `role`, `email_verified`, `status`, `created_at`, `updated_at`)
- **accounts** (`account_id` PK, `user_id` FK UNIQUE, `account_no_ciphertext`, `account_no_iv`, `account_no_auth_tag`, `account_no_hash` UNIQUE, `account_no_last4`, `balance`, `status`, `created_at`, `updated_at`)
- **transactions** (`transaction_id` PK, `sender_account_id` FK nullable, `receiver_account_id` FK nullable, `transaction_type`, `amount`, `status`, `created_by` FK, `idempotency_key`, `created_at`, `reviewed_at`, `reviewed_by` FK; unique (`created_by`, `idempotency_key`))
- **fraud_logs** (`log_id` PK, `transaction_id` FK UNIQUE, `risk_score`, `flag_reason`, `ai_summary`, `logged_at`)
- **otp_challenges** (`challenge_id` PK, `user_id` FK, `purpose`, `otp_hash`, `expires_at`, `attempts`, `consumed_at`, `created_at`; one active challenge per user/purpose)
- **audit_logs** (`audit_id` PK, `actor_user_id` FK nullable, `action`, `entity_type`, `entity_id`, `details`, `created_at`)

## ER diagram details

```mermaid
erDiagram
    USERS ||--o| ACCOUNTS : owns
    USERS ||--o{ OTP_CHALLENGES : verifies
    USERS o|--o{ AUDIT_LOGS : performs
    USERS ||--o{ TRANSACTIONS : creates
    USERS o|--o{ TRANSACTIONS : reviews
    ACCOUNTS o|--o{ TRANSACTIONS : sends
    ACCOUNTS o|--o{ TRANSACTIONS : receives
    TRANSACTIONS ||--o| FRAUD_LOGS : evaluated_by

    USERS {
        uuid user_id PK
        text full_name
        text email UK
        text password_hash
        text role
        boolean email_verified
        text status
        timestamptz created_at
    }
    ACCOUNTS {
        uuid account_id PK
        uuid user_id FK_UK
        bytea account_no_ciphertext
        bytea account_no_iv
        bytea account_no_auth_tag
        text account_no_hash UK
        char account_no_last4
        numeric balance
        text status
    }
    TRANSACTIONS {
        uuid transaction_id PK
        uuid sender_account_id FK
        uuid receiver_account_id FK
        text transaction_type
        numeric amount
        text status
        uuid created_by FK
        uuid idempotency_key
        timestamptz created_at
        timestamptz reviewed_at
        uuid reviewed_by FK
    }
    FRAUD_LOGS {
        uuid log_id PK
        uuid transaction_id FK_UK
        smallint risk_score
        text flag_reason
        text ai_summary
        timestamptz logged_at
    }
    OTP_CHALLENGES {
        uuid challenge_id PK
        uuid user_id FK
        text purpose
        text otp_hash
        timestamptz expires_at
        smallint attempts
        timestamptz consumed_at
    }
    AUDIT_LOGS {
        uuid audit_id PK
        uuid actor_user_id FK
        text action
        text entity_type
        uuid entity_id
        jsonb details
        timestamptz created_at
    }
```
