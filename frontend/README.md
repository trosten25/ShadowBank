# ShadowBank

ShadowBank is a React/Vite application backed by a PostgreSQL API.

## Local development

Follow [the API setup guide](../backend/README.md) to provision PostgreSQL, apply the schema, configure environment variables and SMTP, create the first administrator, and run both services. The API runs on port `3001`; Vite proxies `/api` requests to it.

The [PostgreSQL schema and ER diagram](../backend-schema.md) describe the database entities and relationships.

## Security and deployment

The API uses bcrypt cost 12, emailed OTP verification for signup and every login, HttpOnly JWT cookies, origin checking, role-based authorization, account-number encryption, rate limits, and transactional ledger updates. Production deployment still requires secure managed secrets, HTTPS, trusted database TLS, reliable SMTP, monitoring, backups, security review, and a regulated payment/banking provider before representing any transfer or cash movement as settled.
