import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { accountNumberHash, generateOtp, hashOtp, timingSafeStringEqual } from './security.js';
import { sendOtpEmail } from './mailer.js';

export const SESSION_COOKIE = 'shadowbank_session';
const PASSWORD_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH = await bcrypt.hash('not-a-real-shadowbank-password', PASSWORD_ROUNDS);

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(response, user) {
  const secret = process.env.APP_JWT_SECRET;
  const token = jwt.sign({ role: user.role }, secret, { subject: user.user_id, expiresIn: '8h', issuer: 'shadowbank-api' });
  response.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(response) {
  response.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
}

export async function createOtpChallenge(userId, email, purpose, database = pool) {
  const recent = await database.query(
    `SELECT 1 FROM otp_challenges
     WHERE user_id = $1 AND purpose = $2 AND created_at > now() - interval '30 seconds'
     LIMIT 1`,
    [userId, purpose],
  );
  if (recent.rowCount) {
    const error = new Error('Please wait 30 seconds before requesting another verification code.');
    error.status = 429;
    throw error;
  }
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  await database.query(
    `UPDATE otp_challenges SET consumed_at = now()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose],
  );
  const result = await database.query(
    `INSERT INTO otp_challenges (user_id, purpose, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING challenge_id`,
    [userId, purpose, otpHash, expiresAt],
  );
  const challengeId = result.rows[0].challenge_id;
  try {
    await sendOtpEmail(email, otp, purpose);
  } catch (error) {
    await database.query('DELETE FROM otp_challenges WHERE challenge_id = $1', [challengeId]);
    throw error;
  }
  return challengeId;
}

export async function requestSignup({ email, accountNumber, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const accountHash = accountNumberHash(accountNumber);
  const client = await pool.connect();
  let userId;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT u.user_id, u.email_verified, u.password_hash, u.status
       FROM users u JOIN accounts a ON a.user_id = u.user_id
       WHERE lower(u.email) = $1 AND a.account_no_hash = $2 AND u.role = 'customer'
       FOR UPDATE OF u`,
      [normalizedEmail, accountHash],
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active' || user.email_verified) {
      const error = new Error('The email and account number could not be verified for registration.');
      error.status = 400;
      throw error;
    }
    const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
    await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE user_id = $2', [passwordHash, user.user_id]);
    await client.query('COMMIT');
    userId = user.user_id;
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('Signup rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
  const challengeId = await createOtpChallenge(userId, normalizedEmail, 'signup');
  return { challengeId };
}

export async function verifyOtp({ challengeId, code, purpose }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const challengeResult = await client.query(
      `SELECT c.challenge_id, c.user_id, c.otp_hash, c.expires_at, c.attempts, u.email, u.role, u.status
       FROM otp_challenges c JOIN users u ON u.user_id = c.user_id
       WHERE c.challenge_id = $1 AND c.purpose = $2 AND c.consumed_at IS NULL
       FOR UPDATE OF c, u`,
      [challengeId, purpose],
    );
    const challenge = challengeResult.rows[0];
    if (!challenge || challenge.status !== 'active' || new Date(challenge.expires_at) <= new Date() || challenge.attempts >= MAX_OTP_ATTEMPTS) {
      const error = new Error('This code has expired or is no longer valid. Request a new code.');
      error.status = 400;
      throw error;
    }
    const candidateHash = hashOtp(code);
    if (!timingSafeStringEqual(candidateHash, challenge.otp_hash)) {
      await client.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = $1', [challengeId]);
      await client.query('COMMIT');
      const error = new Error('The one-time code is incorrect.');
      error.status = 400;
      throw error;
    }
    await client.query('UPDATE otp_challenges SET consumed_at = now() WHERE challenge_id = $1', [challengeId]);
    if (purpose === 'signup') {
      const verified = await client.query(
        'UPDATE users SET email_verified = true, updated_at = now() WHERE user_id = $1 AND password_hash IS NOT NULL',
        [challenge.user_id],
      );
      if (!verified.rowCount) {
        const error = new Error('Registration could not be completed. Start signup again.');
        error.status = 400;
        throw error;
      }
    }
    await client.query(
      'INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $1)',
      [challenge.user_id, purpose === 'signup' ? 'signup_verified' : 'login_verified', 'user'],
    );
    await client.query('COMMIT');
    return { user_id: challenge.user_id, email: challenge.email, role: challenge.role };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => console.error('OTP verification rollback failed:', rollbackError));
    throw error;
  } finally {
    client.release();
  }
}

export async function requestLogin({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    'SELECT user_id, email, password_hash, role, status, email_verified FROM users WHERE lower(email) = $1',
    [normalizedEmail],
  );
  const user = result.rows[0];
  const validPassword = await bcrypt.compare(password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user || !validPassword || user.status !== 'active' || !user.email_verified) {
    const error = new Error('Invalid email or password, or the account is not verified.');
    error.status = 401;
    throw error;
  }
  const challengeId = await createOtpChallenge(user.user_id, user.email, 'login');
  return { challengeId };
}

export async function findSessionUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, process.env.APP_JWT_SECRET, { issuer: 'shadowbank-api', algorithms: ['HS256'] });
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) return null;
    throw error;
  }
  const result = await pool.query(
    'SELECT user_id, full_name, email, role, status, email_verified FROM users WHERE user_id = $1',
    [payload.sub],
  );
  const user = result.rows[0];
  return user?.status === 'active' && user.email_verified ? user : null;
}
