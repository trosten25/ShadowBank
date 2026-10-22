import { useEffect } from 'react';
import { BankProvider } from './context/BankContext.jsx';
import { useBank } from './context/useBank.js';
import Layout from './components/ui/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return (
    <BankProvider>
      <Application />
    </BankProvider>
  );
}

function Application() {
  const { user, authLoading, notice } = useBank();
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const requestedAdmin = path === '/admin';
  const authRoute = path === '/login' || path === '/signup';

  useEffect(() => {
    if (!user || authLoading) return;
    if (user.role === 'admin' && !requestedAdmin) window.location.replace('/admin');
  }, [authLoading, requestedAdmin, user]);

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#061522] text-sm text-slate-300">Loading your secure session…</main>;
  }
  if (!user || authRoute) {
    return (
      <AuthPage
        initialMode={path === '/signup' ? 'signup' : 'login'}
        initialNotice={!user ? notice : ''}
        adminMode={requestedAdmin}
      />
    );
  }
  if (requestedAdmin && user.role !== 'admin') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#061522] px-5 text-center text-white">
        <div><h1 className="text-2xl font-semibold">Administrator access required</h1><p className="mt-2 text-slate-400">Your account does not have administrator privileges.</p><a href="/" className="mt-5 inline-block text-teal-300 hover:text-teal-200">Return to your account</a></div>
      </main>
    );
  }
  return <Layout />;
}
