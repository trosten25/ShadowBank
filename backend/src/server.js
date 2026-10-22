import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import { clearSessionCookie, createOtpChallenge, findSessionUser, requestLogin, requestSignup, SESSION_COOKIE, setSessionCookie, verifyOtp } from './auth.js';
import { decryptAccountNumber, encryptAccountNumber, accountNumberHash, generateAccountNumber } from './security.js';
import { sendOnboardingEmail } from './mailer.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use((request, response, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.get('origin') === process.env.FRONTEND_ORIGIN) return next();
  return response.status(403).json({ error: 'Request origin is not allowed.' });
});

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function validateEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function requirePassword(password) {
  return typeof password === 'string' && password.length >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requireAuth(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return response.status(401).json({ error: 'Authentication required.' });
  request.authToken = token;
  next();
}

const cookieParser = (request, _response, next) => {
  const cookieHeader = request.headers.cookie || '';
  request.cookies = Object.fromEntries(cookieHeader.split(';').map((item) => {
    const separator = item.indexOf('=');
    return separator < 0 ? ['', ''] : [item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1).trim())];
  }).filter(([key]) => key));
  next();
};
app.use(cookieParser);

const loadUser = asyncRoute(async (request, response, next) => {
  if (!request.authToken) return response.status(401).json({ error: 'Authentication required.' });
  request.user = await findSessionUser(request.authToken);
  if (!request.user) return response.status(401).json({ error: 'Your session is no longer valid. Please sign in again.' });
  next();
});

function requireRole(role) {
  return (request, response, next) => {
    if (request.user.role !== role) return response.status(403).json({ error: 'You do not have permission to access this resource.' });
    next();
  };
}

function publicAccount(row) {
  const status = row.account_status;
  return {
    id: row.account_id,
    userId: row.user_id,
    name: row.full_name,
    email: row.email,
    emailVerified: row.email_verified,
    accountNumber: `•••• •••• ${row.account_no_last4}`,
    balance: Number(row.balance),
    status: status.charAt(0).toUpperCase() + status.slice(1),
    createdAt: row.account_created_at,
  };
}

function publicRecipient(row) {
  return {
    id: row.account_id,
    name: row.full_name,
    accountNumber: `•••• •••• ${row.account_no_last4}`,
    status: row.account_status.charAt(0).toUpperCase() + row.account_status.slice(1),
  };
}

function publicTransaction(row) {
  return {
    id: row.transaction_id,
    senderId: row.sender_account_id,
    receiverId: row.receiver_account_id,
    kind: row.transaction_type,
    amount: Number(row.amount),
    status: row.status === 'pending_review' ? 'Review' : row.status === 'completed' ? 'Completed' : 'Declined',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    riskScore: row.risk_score ?? 0,
    riskReason: row.flag_reason ?? '',
  };
}

function accountSelect(where = '') {
  return `SELECT a.account_id, a.user_id, u.full_name, u.email, a.account_no_last4,
          u.email_verified, a.balance, a.status AS account_status, a.created_at AS account_created_at
          FROM accounts a JOIN users u ON u.user_id = a.user_id ${where}`;
}

app.get('/api/health', asyncRoute(async (_request, response) => {
  await pool.query('SELECT 1');
  response.json({ status: 'ok' });
}));

app.post('/api/auth/signup', authLimiter, asyncRoute(async (request, response) => {
  const { email, accountNumber, password } = request.body ?? {};
  if (!validateEmail(email) || typeof accountNumber !== 'string' || !/^[\d\s-]{12,24}$/.test(accountNumber) || accountNumber.replace(/\D/g, '').length !== 16 || !requirePassword(password)) {
    return response.status(400).json({ error: 'Enter a valid email, 16-digit account number, and password of at least 12 characters and no more than 72 UTF-8 bytes.' });
  }
  const result = await requestSignup({ email, accountNumber, password });
  response.json({ challengeId: result.challengeId, message: 'A verification code has been sent to your email address.' });
}));

app.post('/api/auth/signup/verify', authLimiter, asyncRoute(async (request, response) => {
  const { challengeId, code } = request.body ?? {};
  if (!isUuid(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: 'Enter the six-digit verification code.' });
  }
  await verifyOtp({ challengeId, code, purpose: 'signup' });
  response.json({ message: 'Email verified. You can now sign in with your password and a verification code.' });
}));

app.post('/api/auth/login', authLimiter, asyncRoute(async (request, response) => {
  const { email, password } = request.body ?? {};
  if (!validateEmail(email) || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
    return response.status(400).json({ error: 'Enter your email address and password.' });
  }
  const result = await requestLogin({ email, password });
  response.json({ challengeId: result.challengeId, message: 'A sign-in code has been sent to your email address.' });
}));

app.post('/api/auth/login/verify', authLimiter, asyncRoute(async (request, response) => {
  const { challengeId, code } = request.body ?? {};
  if (!isUuid(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return response.status(400).json({ error: 'Enter the six-digit sign-in code.' });
  }
  const user = await verifyOtp({ challengeId, code, purpose: 'login' });
  setSessionCookie(response, user);
  response.json({ user: { id: user.user_id, email: user.email, role: user.role } });
}));

app.post('/api/auth/logout', requireAuth, loadUser, asyncRoute(async (request, response) => {
  await pool.query(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $1)',
    [request.user.user_id, 'logout', 'user'],
  );
  clearSessionCookie(response);
  response.json({ message: 'Signed out.' });
}));

app.get('/api/auth/me', requireAuth, loadUser, (request, response) => {
  response.json({ user: { id: request.user.user_id, name: request.user.full_name, email: request.user.email, role: request.user.role } });
});

app.get('/api/customer/overview', requireAuth, loadUser, requireRole('customer'), asyncRoute(async (request, response) => {
  const accountResult = await pool.query(
    `${accountSelect('WHERE a.user_id = $1')}`,
    [request.user.user_id],
  );
  const account = accountResult.rows[0];
  if (!account) return response.status(404).json({ error: 'No active account is associated with this user.' });
  const [transactionsResult, recipientsResult] = await Promise.all([
    pool.query(
      `SELECT t.*, f.risk_score, f.flag_reason FROM transactions t
       LEFT JOIN fraud_logs f ON f.transaction_id = t.transaction_id
       WHERE t.sender_account_id = $1 OR t.receiver_account_id = $1 ORDER BY t.created_at DESC`,
      [account.account_id],
    ),
    pool.query(`${accountSelect('WHERE a.account_id <> $1 AND a.status = $2 AND u.status = $3 AND u.email_verified = true')}`, [account.account_id, 'active', 'active']),
  ]);
  response.json({
    account: publicAccount(account),
    customers: [publicAccount(account), ...recipientsResult.rows.map(publicRecipient)],
    transactions: transactionsResult.rows.map(publicTransaction),
  });
}));

app.patch('/api/customer/profile', requireAuth, loadUser, requireRole('customer'), asyncRoute(async (request, response) => {
  const { name } = request.body ?? {};
  if (!requireText(name, 100)) return response.status(400).json({ error: 'Enter a name between 1 and 100 characters.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE users SET full_name = $1, updated_at = now() WHERE user_id = $2 RETURNING user_id, full_name, email',
      [name.trim(), request.user.user_id],
    );
    await client.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $1)',
      [request.user.user_id, 'profile_updated', 'user'],
    );
    await client.query('COMMIT');
    response.json({ user: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Profile update rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/admin/dashboard', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (_request, response) => {
  const [accountsResult, transactionsResult, auditResult] = await Promise.all([
    pool.query(accountSelect('ORDER BY a.created_at DESC')),
    pool.query(
      `SELECT t.*, f.risk_score, f.flag_reason FROM transactions t
       LEFT JOIN fraud_logs f ON f.transaction_id = t.transaction_id ORDER BY t.created_at DESC`,
    ),
    pool.query(
      `SELECT l.audit_id, l.actor_user_id, u.email AS actor_email, l.action,
              l.entity_type, l.entity_id, l.details, l.created_at
       FROM audit_logs l LEFT JOIN users u ON u.user_id = l.actor_user_id
       ORDER BY l.created_at DESC LIMIT 500`,
    ),
  ]);
  response.json({
    customers: accountsResult.rows.map(publicAccount),
    transactions: transactionsResult.rows.map(publicTransaction),
    auditLogs: auditResult.rows,
  });
}));

app.post('/api/admin/accounts', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (request, response) => {
  const { name, email } = request.body ?? {};
  if (!requireText(name, 100) || !validateEmail(email)) {
    return response.status(400).json({ error: 'Enter a customer name and valid email address.' });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();
  let accountNumber;
  let account;
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, role)
       VALUES ($1, $2, 'customer') RETURNING user_id, full_name, email`,
      [name.trim(), normalizedEmail],
    );
    accountNumber = generateAccountNumber();
    const encrypted = encryptAccountNumber(accountNumber);
    const accountResult = await client.query(
      `INSERT INTO accounts (user_id, account_no_ciphertext, account_no_iv, account_no_auth_tag, account_no_hash, account_no_last4)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING account_id, user_id, account_no_last4, balance, status AS account_status, created_at AS account_created_at`,
      [userResult.rows[0].user_id, encrypted.ciphertext, encrypted.iv, encrypted.authTag, accountNumberHash(accountNumber), accountNumber.slice(-4)],
    );
    account = { ...accountResult.rows[0], full_name: userResult.rows[0].full_name, email: userResult.rows[0].email };
    await client.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [request.user.user_id, 'customer_account_created', 'account', account.account_id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Account creation rollback failed:', rollbackError));
    if (error.code === '23505') {
      return response.status(409).json({ error: 'An account with this email address already exists.' });
    }
    throw error;
  } finally {
    client.release();
  }

  let emailSent = true;
  try {
    await sendOnboardingEmail(normalizedEmail, name.trim(), accountNumber);
  } catch (error) {
    emailSent = false;
    console.error('Unable to send customer onboarding email:', error);
  }
  response.status(201).json({
    account: publicAccount(account),
    accountNumber,
    emailSent,
    message: emailSent
      ? 'Account created and account details emailed to the customer.'
      : 'Account created, but email delivery failed. The account number is shown here; configure SMTP and resend it securely.',
  });
}));

app.post('/api/admin/accounts/:accountId/resend-onboarding', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (request, response) => {
  if (!isUuid(request.params.accountId)) return response.status(400).json({ error: 'Invalid account identifier.' });
  const result = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, a.account_no_ciphertext, a.account_no_iv, a.account_no_auth_tag
     FROM accounts a JOIN users u ON u.user_id = a.user_id WHERE a.account_id = $1`,
    [request.params.accountId],
  );
  const customer = result.rows[0];
  if (!customer) return response.status(404).json({ error: 'Account not found.' });
  const accountNumber = decryptAccountNumber({
    ciphertext: customer.account_no_ciphertext,
    iv: customer.account_no_iv,
    authTag: customer.account_no_auth_tag,
  });
  await sendOnboardingEmail(customer.email, customer.full_name, accountNumber);
  await pool.query(
    'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
    [request.user.user_id, 'onboarding_email_resent', 'account', request.params.accountId],
  );
  response.json({ message: `Account details emailed to ${customer.email}.` });
}));

app.patch('/api/admin/accounts/:accountId/status', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (request, response) => {
  if (!isUuid(request.params.accountId)) return response.status(400).json({ error: 'Invalid account identifier.' });
  const { status } = request.body ?? {};
  if (!['active', 'paused'].includes(status)) return response.status(400).json({ error: 'Status must be active or paused.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE accounts SET status = $1, updated_at = now()
       WHERE account_id = $2 RETURNING account_id`,
      [status, request.params.accountId],
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return response.status(404).json({ error: 'Account not found.' });
    }
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'account', $3, jsonb_build_object('status', $4::text))`,
      [request.user.user_id, 'account_status_changed', request.params.accountId, status],
    );
    await client.query('COMMIT');
    response.json({ message: `Account ${status}.` });
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Account status rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
}));

app.post('/api/admin/accounts/:accountId/deposit', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (request, response) => {
  if (!isUuid(request.params.accountId)) return response.status(400).json({ error: 'Invalid account identifier.' });
  const { amount: rawAmount, idempotencyKey } = request.body ?? {};
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7 || !isUuid(idempotencyKey)) {
    return response.status(400).json({ error: 'Enter a deposit amount with up to two decimal places between $0.01 and $1,000,000.' });
  }

  const client = await pool.connect();
  let created;
  try {
    await client.query('BEGIN');
    const duplicate = await client.query(
      `SELECT * FROM transactions WHERE created_by = $1 AND idempotency_key = $2`,
      [request.user.user_id, idempotencyKey],
    );
    if (duplicate.rowCount) {
      await client.query('COMMIT');
      return response.json({
        transaction: publicTransaction(duplicate.rows[0]),
        message: 'This deposit request was already received.',
      });
    }

    const accountResult = await client.query(
      'SELECT account_id FROM accounts WHERE account_id = $1 FOR UPDATE',
      [request.params.accountId],
    );
    if (!accountResult.rowCount) {
      const error = new Error('Account not found.');
      error.status = 404;
      throw error;
    }

    const transactionResult = await client.query(
      `INSERT INTO transactions (sender_account_id, receiver_account_id, transaction_type, amount, status, created_by, idempotency_key)
       VALUES (NULL, $1, 'deposit', $2, 'completed', $3, $4)
       ON CONFLICT (created_by, idempotency_key) DO NOTHING RETURNING *`,
      [request.params.accountId, amount, request.user.user_id, idempotencyKey],
    );
    if (!transactionResult.rowCount) {
      const existingResult = await client.query(
        'SELECT * FROM transactions WHERE created_by = $1 AND idempotency_key = $2',
        [request.user.user_id, idempotencyKey],
      );
      created = existingResult.rows[0];
      await client.query('COMMIT');
      return response.json({
        transaction: publicTransaction(created),
        message: 'This deposit request was already received.',
      });
    }
    created = transactionResult.rows[0];
    await client.query('UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE account_id = $2', [amount, request.params.accountId]);
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'admin_deposit_created', 'transaction', $2, jsonb_build_object('account_id', $3::text, 'amount', $4::numeric))`,
      [request.user.user_id, created.transaction_id, request.params.accountId, amount],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Admin deposit rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
  response.status(201).json({
    transaction: publicTransaction(created),
    message: `Deposit of $${amount.toFixed(2)} completed successfully.`,
  });
}));

app.post('/api/transactions', requireAuth, loadUser, requireRole('customer'), asyncRoute(async (request, response) => {
  const { kind, amount: rawAmount, recipientId, idempotencyKey } = request.body ?? {};
  const amount = Number(rawAmount);
  if (kind !== 'transfer') {
    return response.status(403).json({ error: 'Customers can only transfer money to another account. Contact an administrator for deposits or withdrawals.' });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7 || !isUuid(idempotencyKey)) {
    return response.status(400).json({ error: 'Enter a transfer amount with up to two decimal places between $0.01 and $1,000,000.' });
  }
  if (kind === 'transfer' && !isUuid(recipientId)) return response.status(400).json({ error: 'Choose a valid recipient account.' });
  const client = await pool.connect();
  let created;
  try {
    await client.query('BEGIN');
    const duplicate = await client.query(
      `SELECT t.*, f.risk_score, f.flag_reason FROM transactions t
       LEFT JOIN fraud_logs f ON f.transaction_id = t.transaction_id
       WHERE t.created_by = $1 AND t.idempotency_key = $2`,
      [request.user.user_id, idempotencyKey],
    );
    if (duplicate.rowCount) {
      created = duplicate.rows[0];
      await client.query('COMMIT');
      return response.status(200).json({
        transaction: publicTransaction(created),
        message: 'This transaction request was already received.',
      });
    }
    const senderResult = await client.query(
      `SELECT a.account_id FROM accounts a WHERE a.user_id = $1 AND a.status = 'active'`,
      [request.user.user_id],
    );
    const senderId = senderResult.rows[0]?.account_id;
    if (!senderId) {
      const error = new Error('Your account is not active.');
      error.status = 409;
      throw error;
    }
    let recipientIdValue = null;
    if (kind === 'transfer') {
      const recipientResult = await client.query(
        `SELECT a.account_id FROM accounts a JOIN users u ON u.user_id = a.user_id
         WHERE a.account_id = $1 AND a.status = 'active' AND u.status = 'active' AND u.email_verified = true`,
        [recipientId],
      );
      recipientIdValue = recipientResult.rows[0]?.account_id;
      if (!recipientIdValue || recipientIdValue === senderId) {
        const error = new Error('Choose an active recipient account.');
        error.status = 400;
        throw error;
      }
    }
    const lockIds = [...new Set([senderId, recipientIdValue].filter(Boolean))].sort();
    const lockedAccounts = await client.query(
      'SELECT a.*, u.status AS user_status, u.email_verified FROM accounts a JOIN users u ON u.user_id = a.user_id WHERE a.account_id = ANY($1::uuid[]) ORDER BY a.account_id FOR UPDATE OF a',
      [lockIds],
    );
    const accountMap = new Map(lockedAccounts.rows.map((row) => [row.account_id, row]));
    const sender = accountMap.get(senderId);
    const recipient = recipientIdValue ? accountMap.get(recipientIdValue) : null;
    if (!sender || sender.status !== 'active' || sender.user_status !== 'active' || !sender.email_verified) {
      const error = new Error('Your account is not active.');
      error.status = 409;
      throw error;
    }
    if (kind === 'transfer' && (!recipient || recipient.status !== 'active' || recipient.user_status !== 'active' || !recipient.email_verified)) {
      const error = new Error('Choose an active recipient account.');
      error.status = 400;
      throw error;
    }
    const replayCheck = await client.query(
      `SELECT t.*, f.risk_score, f.flag_reason FROM transactions t
       LEFT JOIN fraud_logs f ON f.transaction_id = t.transaction_id
       WHERE t.created_by = $1 AND t.idempotency_key = $2`,
      [request.user.user_id, idempotencyKey],
    );
    if (replayCheck.rowCount) {
      created = replayCheck.rows[0];
      await client.query('COMMIT');
      return response.status(200).json({
        transaction: publicTransaction(created),
        message: 'This transaction request was already received.',
      });
    }
    if (Number(sender.balance) < amount) {
      const error = new Error('This amount exceeds the available balance.');
      error.status = 409;
      throw error;
    }
    const recent = await client.query(
      `SELECT count(*)::int AS count FROM transactions
       WHERE sender_account_id = $1 AND created_at > now() - interval '5 minutes'`,
      [sender.account_id],
    );
    const recentOutgoing = recent.rows[0].count;
    const riskScore = Math.min(98, (amount >= 5000 ? 82 : amount >= 2000 ? 48 : 12) + (recentOutgoing >= 2 ? 18 : 0));
    const mustReview = riskScore >= 75;
    const flagReason = riskScore >= 75 ? (amount >= 5000 ? 'Amount exceeds the review threshold' : 'Unusual transaction frequency') : '';
    const transactionResult = await client.query(
      `INSERT INTO transactions (sender_account_id, receiver_account_id, transaction_type, amount, status, created_by, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (created_by, idempotency_key) DO NOTHING RETURNING *`,
      [sender.account_id, recipient.account_id, kind, amount, mustReview ? 'pending_review' : 'completed', request.user.user_id, idempotencyKey],
    );
    if (!transactionResult.rowCount) {
      const existingResult = await client.query(
        `SELECT t.*, f.risk_score, f.flag_reason FROM transactions t
         LEFT JOIN fraud_logs f ON f.transaction_id = t.transaction_id
         WHERE t.created_by = $1 AND t.idempotency_key = $2`,
        [request.user.user_id, idempotencyKey],
      );
      created = existingResult.rows[0];
      await client.query('COMMIT');
      return response.status(200).json({
        transaction: publicTransaction(created),
        message: 'This transaction request was already received.',
      });
    }
    created = transactionResult.rows[0];
    await client.query(
      'INSERT INTO fraud_logs (transaction_id, risk_score, flag_reason) VALUES ($1, $2, $3)',
      [created.transaction_id, riskScore, flagReason],
    );
    if (!mustReview) {
      await client.query('UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE account_id = $2', [amount, sender.account_id]);
      await client.query('UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE account_id = $2', [amount, recipient.account_id]);
    }
    await client.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [request.user.user_id, 'transaction_created', 'transaction', created.transaction_id],
    );
    await client.query('COMMIT');
    created = { ...created, risk_score: riskScore, flag_reason: flagReason };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Transaction rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
  response.status(201).json({
    transaction: publicTransaction(created),
    message: created.status === 'pending_review' ? 'Transfer request held for administrator review.' : 'Transfer completed successfully.',
  });
}));

app.post('/api/admin/transactions/:transactionId/review', requireAuth, loadUser, requireRole('admin'), asyncRoute(async (request, response) => {
  if (!isUuid(request.params.transactionId)) return response.status(400).json({ error: 'Invalid transaction identifier.' });
  const { approve } = request.body ?? {};
  if (typeof approve !== 'boolean') return response.status(400).json({ error: 'Choose approve or decline.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT * FROM transactions WHERE transaction_id = $1 AND status = $2 FOR UPDATE',
      [request.params.transactionId, 'pending_review'],
    );
    const transaction = result.rows[0];
    if (!transaction) {
      const error = new Error('This transaction is no longer awaiting review.');
      error.status = 404;
      throw error;
    }
    if (approve) {
      const accountIds = [transaction.sender_account_id, transaction.receiver_account_id].filter(Boolean).sort();
      const accountsResult = await client.query('SELECT * FROM accounts WHERE account_id = ANY($1::uuid[]) ORDER BY account_id FOR UPDATE', [accountIds]);
      const accounts = new Map(accountsResult.rows.map((account) => [account.account_id, account]));
      const sender = transaction.sender_account_id ? accounts.get(transaction.sender_account_id) : null;
      const receiver = transaction.receiver_account_id ? accounts.get(transaction.receiver_account_id) : null;
      if (sender && (sender.status !== 'active' || Number(sender.balance) < Number(transaction.amount))) {
        const error = new Error('Cannot approve: the sender account is inactive or has insufficient balance.');
        error.status = 409;
        throw error;
      }
      if (receiver && receiver.status !== 'active') {
        const error = new Error('Cannot approve: the receiver account is inactive.');
        error.status = 409;
        throw error;
      }
      if (sender) await client.query('UPDATE accounts SET balance = balance - $1, updated_at = now() WHERE account_id = $2', [transaction.amount, sender.account_id]);
      if (receiver) await client.query('UPDATE accounts SET balance = balance + $1, updated_at = now() WHERE account_id = $2', [transaction.amount, receiver.account_id]);
    }
    await client.query(
      'UPDATE transactions SET status = $1, reviewed_at = now(), reviewed_by = $2 WHERE transaction_id = $3',
      [approve ? 'completed' : 'declined', request.user.user_id, transaction.transaction_id],
    );
    await client.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, jsonb_build_object($5::text, true))',
      [request.user.user_id, approve ? 'transaction_approved' : 'transaction_declined', 'transaction', transaction.transaction_id, approve ? 'approved' : 'declined'],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Transaction review rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
  response.json({ message: approve ? 'Transaction approved.' : 'Transaction declined.' });
}));

app.use((error, _request, response, _next) => {
  if (error.code === '23505') return response.status(409).json({ error: 'A record with the supplied unique value already exists.' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error);
  response.status(status).json({ error: status >= 500 ? 'A server error occurred. Please try again later.' : error.message });
});

const requiredEnvironment = ['DATABASE_URL', 'APP_JWT_SECRET', 'ACCOUNT_ENCRYPTION_KEY', 'ACCOUNT_NUMBER_HMAC_KEY', 'FRONTEND_ORIGIN'];
for (const key of requiredEnvironment) {
  if (!process.env[key]) throw new Error(`${key} is required.`);
}
if (process.env.APP_JWT_SECRET.length < 32 || process.env.ACCOUNT_NUMBER_HMAC_KEY.length < 32) {
  throw new Error('APP_JWT_SECRET and ACCOUNT_NUMBER_HMAC_KEY must each contain at least 32 characters.');
}
if (Buffer.from(process.env.ACCOUNT_ENCRYPTION_KEY, 'base64').length !== 32) {
  throw new Error('ACCOUNT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
}

const server = app.listen(Number(process.env.PORT || 3001), () => {
  console.log(`ShadowBank API listening on port ${process.env.PORT || 3001}`);
});

const otpCleanup = setInterval(() => {
  pool.query("DELETE FROM otp_challenges WHERE created_at < now() - interval '30 days'")
    .catch((error) => console.error('Could not remove expired OTP challenges:', error));
}, 60 * 60 * 1000);
otpCleanup.unref();

async function shutdown() {
  clearInterval(otpCleanup);
  server.close();
  await pool.end();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
