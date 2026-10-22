import nodemailer from 'nodemailer';

let transport;

function getTransport() {
  if (!process.env.SMTP_URL || !process.env.EMAIL_FROM) {
    throw new Error('SMTP_URL and EMAIL_FROM must be configured to send account emails.');
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL, {
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transport;
}

export async function sendOtpEmail(email, code, purpose) {
  const subject = purpose === 'signup' ? 'Verify your ShadowBank account' : 'Your ShadowBank sign-in code';
  const instruction = purpose === 'signup'
    ? 'Use this one-time code to verify your email and finish creating your account.'
    : 'Use this one-time code to finish signing in.';
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    text: `${instruction}\n\nCode: ${code}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`,
  });
}

export async function sendOnboardingEmail(email, name, accountNumber) {
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your ShadowBank account is ready to register',
    text: `Hello ${name},\n\nYour account has been created. Account number: ${accountNumber}\n\nVisit ${process.env.FRONTEND_ORIGIN}/signup to register using this email address and account number. You will verify your email with a one-time code and create your password.`,
  });
}
