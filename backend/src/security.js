import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

function requiredSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function encryptionKey() {
  const key = Buffer.from(requiredSecret('ACCOUNT_ENCRYPTION_KEY'), 'base64');
  if (key.length !== 32) throw new Error('ACCOUNT_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

export function generateAccountNumber() {
  let value = String(randomInt(1, 10));
  for (let index = 1; index < 16; index += 1) value += String(randomInt(0, 10));
  return value;
}

export function accountNumberHash(accountNumber) {
  return createHmac('sha256', requiredSecret('ACCOUNT_NUMBER_HMAC_KEY'))
    .update(accountNumber.replace(/\D/g, ''))
    .digest('hex');
}

export function encryptAccountNumber(accountNumber) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(accountNumber, 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptAccountNumber({ ciphertext, iv, authTag }) {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function generateOtp() {
  return String(randomInt(100_000, 1_000_000));
}

export function hashOtp(otp) {
  return createHmac('sha256', requiredSecret('APP_JWT_SECRET')).update(otp).digest('hex');
}

export function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
