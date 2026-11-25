# ShadowBank API

The frontend calls this API for all account, transaction, authentication, and administrator data. The API stores records in PostgreSQL; browser local storage is not used as the source of account state.

## Connect PostgreSQL

1. Install PostgreSQL locally or create a managed PostgreSQL database. Create separate migration-owner and least-privilege runtime roles:

   ```sql
   CREATE ROLE shadowbank_app LOGIN PASSWORD 'use-a-long-unique-password';
   CREATE ROLE shadowbank_owner LOGIN PASSWORD 'use-another-long-unique-password';
   CREATE DATABASE shadowbank OWNER shadowbank_owner;
   ```

2. Apply the schema using the migration-owner connection:

   ```powershell
   psql "postgresql://shadowbank_owner:OWNER_PASSWORD@localhost:5432/shadowbank" -f "C:\Web Development\shadowbank\backend\migrations\001_initial_schema.sql"
   ```

   Then, connected to the `shadowbank` database as the owner or database administrator, grant runtime privileges:

   ```sql
   GRANT CONNECT ON DATABASE shadowbank TO shadowbank_app;
   GRANT USAGE ON SCHEMA public TO shadowbank_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO shadowbank_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE shadowbank_owner IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shadowbank_app;
   ```

   Set `DATABASE_URL` to the runtime `shadowbank_app` role. The schema and updated ER diagram are documented in [`backend-schema.md`](../backend-schema.md).

3. Set up `backend\.env` using the local PowerShell helper. It securely prompts for your PostgreSQL password and a **newly generated** Google App Password, URL-encodes them, and never prints the secrets. Before running it, rotate the credentials that were shared in chat:

   - Change the PostgreSQL role password in pgAdmin (for example, `Login/Group Roles → postgres → Properties → Definition → Password`; the exact UI may vary).
   - Revoke the old Google App Password and create a new one in your Google Account security settings.
   - Then run this from the backend folder:

     ```powershell
     Set-Location "C:\Web Development\shadowbank\backend"
     powershell -ExecutionPolicy Bypass -File .\scripts\configure-local-env.ps1
     ```

   The helper uses `localhost`, port `5432`, database `shadowbank`, and PostgreSQL user `postgres` by default; press Enter to accept defaults or enter different local values. It preserves existing valid application secrets and creates them if missing. Never commit or share `.env`. For hosted databases, manually set `DATABASE_SSL=true` and, where required, `DATABASE_CA_CERT` to the provider's trusted CA certificate path.

4. Install and start both services in separate PowerShell windows:

   ```powershell
   Set-Location "C:\Web Development\shadowbank\backend"
   npm install
   npm run dev
   ```

   ```powershell
   Set-Location "C:\Web Development\shadowbank\frontend"
   npm run dev
   ```

   Vite proxies `/api` calls to `http://localhost:3001`. The Vite server is pinned to port `5173` so it matches the default `FRONTEND_ORIGIN`; stop any existing process using that port before starting it.

5. Configure a real SMTP relay in `SMTP_URL` and `EMAIL_FROM`. Test both signup/login OTP delivery and account-onboarding mail before deploying. The server reports email-send failures; it does not return a successful OTP challenge when delivery failed.

6. Provision the first administrator out-of-band. Temporarily set `ADMIN_INITIAL_EMAIL`, `ADMIN_INITIAL_NAME`, and `ADMIN_INITIAL_PASSWORD` in the process environment (`ADMIN_INITIAL_PASSWORD` must be 12-72 UTF-8 bytes), then run:

   ```powershell
   Set-Location "C:\Web Development\shadowbank\backend"
   npm run create-admin
   Remove-Item Env:ADMIN_INITIAL_PASSWORD
   ```

   Remove the bootstrap variables after the command. Admins sign in at `/admin`; public signup only accepts customer accounts previously created by an administrator.

## Account and authentication lifecycle

- Admin onboarding accepts customer name and email, creates a customer user/account, generates a 16-digit account number, and emails it. The number is encrypted in PostgreSQL and shown to the admin once for delivery-failure recovery. The admin can retry the onboarding email from the success dialog.
- Customer signup requires the invited email, 16-digit account number, a password of at least 12 characters (maximum 72 UTF-8 bytes), and a valid emailed OTP. Passwords use bcrypt cost 12.
- Sign-in requires email/password and a separate emailed OTP. After OTP verification, the API issues an eight-hour JWT in an HttpOnly, SameSite=Strict cookie. The browser never stores the JWT in local storage.
- `/admin` requires an active database user with the `admin` role. Changing a client route or editing frontend code does not grant server access.
- OTP codes expire after 10 minutes, are stored as keyed hashes, allow at most five attempts, and a newer challenge invalidates earlier active challenges for the same purpose. Requests are limited to one code per 30 seconds per user and purpose.
- Transaction submissions require a UUID idempotency key, preventing retried network requests from applying the same ledger movement twice.
- If running behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the exact proxy count so request IP rate limits use the client address; never trust arbitrary forwarded headers.

## API routes

- `POST /api/auth/signup`, `POST /api/auth/signup/verify`
- `POST /api/auth/login`, `POST /api/auth/login/verify`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/customer/overview`, `PATCH /api/customer/profile`
- `POST /api/transactions` (customer transfers only)
- `GET /api/admin/dashboard`, `POST /api/admin/accounts`, `POST /api/admin/accounts/:accountId/resend-onboarding`
- `PATCH /api/admin/accounts/:accountId/status`, `POST /api/admin/accounts/:accountId/deposit`
- `POST /api/admin/transactions/:transactionId/review`
- `GET /api/health`

## Important deployment boundary

The app now persists and authorizes its application workflows through the API/database, but this is not a licensed bank or a connection to payment rails. Customers can transfer money between accounts; administrators can post deposits to customer accounts. These actions update the application's internal account ledger and do not settle external cash. Customers cannot initiate deposits or withdrawals. Transfer screening uses an explainable behavioral anomaly score based on amount, recent outgoing frequency, deviation from the sender's completed-transfer median, recipient history, and balance impact. Scores of 75 or higher are held without changing balances and appear in the administrator review queue with their score and reasons. This is a transparent, deterministic baseline, not a trained machine-learning model; evaluate and calibrate it against labeled outcomes before production use. Before handling real funds, integrate a regulated banking/payment provider, reconcile settlement, obtain the necessary legal/compliance review, and add operational monitoring, backup/restore, key rotation, and security testing.
