import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';

const { ADMIN_INITIAL_EMAIL: email, ADMIN_INITIAL_NAME: name, ADMIN_INITIAL_PASSWORD: password } = process.env;
if (!email || !name || !password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('Set ADMIN_INITIAL_EMAIL, ADMIN_INITIAL_NAME, and ADMIN_INITIAL_PASSWORD (12-72 UTF-8 bytes) in the environment.');
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, email_verified)
     VALUES ($1, lower($2), $3, 'admin', true)`,
    [name.trim(), email.trim(), passwordHash],
  );
  console.log(`Administrator ${email} created. Remove ADMIN_INITIAL_PASSWORD from the environment now.`);
} finally {
  await pool.end();
}
