import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../utils/api.js';
import { fieldClass } from '../utils/formatters.js';

export default function AuthPage({ initialMode = 'login', initialNotice = '', adminMode = false }) {
  const [mode, setMode] = useState(initialMode);
  const [challenge, setChallenge] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialNotice);
  const [message, setMessage] = useState('');

  async function submitCredentials(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const credentials = {
        email: String(form.get('email')).trim().toLowerCase(),
        password: String(form.get('password')),
      };
      const result = mode === 'signup'
        ? await api('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            ...credentials,
            accountNumber: String(form.get('accountNumber')).trim(),
          }),
        })
        : await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      setPendingEmail(credentials.email);
      setChallenge(result.challengeId);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await api(`/auth/${mode}/verify`, {
        method: 'POST',
        body: JSON.stringify({ challengeId: challenge, code: String(form.get('code')).trim() }),
      });
      if (mode === 'signup') {
        setMode('login');
        setChallenge(null);
        setMessage('Email verified. Sign in with your email and password to receive a sign-in code.');
        return;
      }
      window.location.assign(result.user.role === 'admin' ? '/admin' : '/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061522] px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b2030] p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-cyan-600 text-[#061522]"><ShieldCheck size={25} /></span>
          <span className="text-xl font-bold">Shadow<span className="text-teal-300">Bank</span></span>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
          {adminMode ? 'Administrator portal' : 'Customer portal'}
        </p>
        <h1 className="text-2xl font-semibold">
          {challenge
            ? 'Verify your sign-in code'
            : mode === 'signup'
              ? 'Create your account'
              : adminMode ? 'Administrator sign in' : 'Customer sign in'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {challenge
            ? `Enter the six-digit code sent to ${pendingEmail}.`
            : mode === 'signup'
              ? 'Use the email address and account number provided when your account was opened.'
              : adminMode
                ? 'Sign in with your administrator email and password. A one-time code will be sent to your email.'
                : 'Enter your credentials. We will send a one-time sign-in code to your email.'}
        </p>

        {message && <p role="status" className="mt-5 rounded-xl border border-teal-300/20 bg-teal-300/[0.06] px-3 py-2.5 text-sm text-teal-100">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2.5 text-sm text-rose-100">{error}</p>}

        {challenge ? (
          <form className="mt-6 space-y-4" onSubmit={verifyCode}>
            <label className="block text-sm text-slate-300">One-time code
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" required className={`${fieldClass} tracking-[0.35em]`} placeholder="000000" />
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200 disabled:opacity-60">{busy ? 'Verifying…' : 'Verify code'}</button>
            <button type="button" onClick={() => { setChallenge(null); setMessage(''); setError(''); }} className="w-full py-2 text-sm text-slate-400 hover:text-white">Back</button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submitCredentials}>
            {mode === 'signup' && (
              <label className="block text-sm text-slate-300">Account number
                <input name="accountNumber" inputMode="numeric" autoComplete="off" required className={fieldClass} placeholder="Enter the account number emailed to you" />
              </label>
            )}
            <label className="block text-sm text-slate-300">Email address
              <input name="email" type="email" autoComplete="email" maxLength="254" required className={fieldClass} placeholder="you@example.com" />
            </label>
            <label className="block text-sm text-slate-300">Password
              <input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} maxLength="72" required className={fieldClass} />
              {mode === 'signup' && <span className="mt-1 block text-xs text-slate-500">Use at least 12 characters. Maximum 72 UTF-8 bytes.</span>}
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200 disabled:opacity-60">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account and send code' : 'Continue'}</button>
          </form>
        )}

        {!challenge && !adminMode && (
          <p className="mt-6 text-center text-sm text-slate-400">
            {mode === 'signup' ? 'Already registered?' : 'Have an account invitation?'}{' '}
            <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setMessage(''); }} className="font-medium text-teal-300 hover:text-teal-200">
              {mode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        )}
      </section>
    </main>
  );
}
