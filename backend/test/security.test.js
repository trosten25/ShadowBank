import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ACCOUNT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.ACCOUNT_NUMBER_HMAC_KEY = 'unit-test-hmac-secret-at-least-32-bytes';
process.env.APP_JWT_SECRET = 'unit-test-jwt-secret-at-least-32-bytes';

const { accountNumberHash, decryptAccountNumber, encryptAccountNumber, generateAccountNumber, generateOtp, hashOtp } = await import('../src/security.js');

test('generates a 16-digit account number', () => {
  const number = generateAccountNumber();
  assert.match(number, /^[1-9]\d{15}$/);
});

test('encrypts account numbers and detects modified ciphertext', () => {
  const accountNumber = '1234567890123456';
  const encrypted = encryptAccountNumber(accountNumber);
  assert.notEqual(encrypted.ciphertext.toString('utf8'), accountNumber);
  assert.equal(decryptAccountNumber(encrypted), accountNumber);
  const corrupted = { ...encrypted, ciphertext: Buffer.from(encrypted.ciphertext) };
  corrupted.ciphertext[0] ^= 1;
  assert.throws(() => decryptAccountNumber(corrupted));
});

test('creates stable keyed account lookup hashes', () => {
  assert.equal(accountNumberHash('1234 5678-9012 3456'), accountNumberHash('1234567890123456'));
  assert.notEqual(accountNumberHash('1234567890123456'), accountNumberHash('1234567890123457'));
});

test('creates six-digit OTP codes and keyed OTP hashes', () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
  assert.equal(hashOtp(otp), hashOtp(otp));
  assert.notEqual(hashOtp(otp), hashOtp(generateOtp()));
});
