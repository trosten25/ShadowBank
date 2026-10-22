import {
  FileText, Fingerprint, History, LayoutDashboard, LogOut, Menu, ShieldAlert,
  ShieldCheck, WalletCards, UsersRound, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBank } from '../../context/useBank.js';
import AdminPortal from '../../pages/AdminPortal.jsx';
import CustomerPortal from '../../pages/CustomerPortal.jsx';
import BankingModal from '../customer/BankingModal.jsx';
import ProfileModal from '../customer/ProfileModal.jsx';
import OnboardModal from '../admin/OnboardModal.jsx';
import AdminDepositModal from '../admin/AdminDepositModal.jsx';
import { pageButton } from '../../utils/formatters.js';

const customerNav = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Transactions', icon: History },
  { label: 'Security', icon: ShieldCheck },
];
const adminNav = [
  { label: 'Admin overview', icon: LayoutDashboard },
  { label: 'Accounts', icon: UsersRound },
  { label: 'Threat review', icon: ShieldAlert },
  { label: 'Audit log', icon: FileText },
];

export default function Layout() {
  const {
    notice, noticeType, setNotice, tab, setTab, logout,
  } = useBank();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const workspace = window.location.pathname.replace(/\/+$/, '') === '/admin' ? 'admin' : 'customer';
  const navItems = workspace === 'admin' ? adminNav : customerNav;

  useEffect(() => {
    document.title = workspace === 'admin' ? 'ShadowBank | Administration' : 'ShadowBank | Personal Banking';
  }, [workspace]);

  return (
    <div className="min-h-screen bg-[#061522] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-340px] h-[560px] w-[850px] -translate-x-1/2 rounded-[50%] border border-cyan-300/10 shadow-[0_0_100px_20px_rgba(14,165,233,0.08)]" />
        <div className="absolute left-1/2 top-[-265px] h-[440px] w-[680px] -translate-x-1/2 rounded-[50%] border border-cyan-300/15" />
      </div>

      <header className="relative z-20 border-b border-white/[0.06] bg-[#061522]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <a href={workspace === 'admin' ? '/admin' : '/'} onClick={() => setTab(workspace === 'admin' ? 'Admin overview' : 'Overview')} className="flex shrink-0 items-center gap-2.5" aria-label="ShadowBank home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-cyan-600 text-[#061522]"><ShieldCheck size={22} /></span>
            <span className="text-lg font-bold tracking-tight">Shadow<span className="text-teal-300">Bank</span></span>
          </a>

          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 md:flex">
            {navItems.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => setTab(label)} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs transition ${tab === label ? 'bg-teal-300 font-semibold text-[#06202a]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={logout} aria-label="Sign out" className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></button>
            <button className="rounded-lg p-2 text-slate-300 md:hidden" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="mx-5 mb-4 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#0b2030] p-2 md:hidden">
            {navItems.map(({ label, icon: Icon }) => <button key={label} className={`${pageButton} flex items-center gap-3 text-left`} onClick={() => { setTab(label); setMobileMenuOpen(false); }}><Icon size={17} />{label}</button>)}
          </nav>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-8 lg:px-10">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">{workspace === 'admin' ? <><Fingerprint size={14} /> Security operations</> : <><WalletCards size={14} /> Personal banking</>}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{tab}</h1>
            <p className="mt-1 text-sm text-slate-400">{workspace === 'admin' ? 'Manage customer accounts, transaction reviews, and activity.' : 'Manage your account and recent activity.'}</p>
          </div>
        </div>

        {notice && <div role={noticeType === 'error' ? 'alert' : 'status'} className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${noticeType === 'error' ? 'border-rose-300/25 bg-rose-300/[0.06] text-rose-100' : 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100'}`}><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')} className="shrink-0 text-current/70 hover:text-white"><X size={17} /></button></div>}

        {workspace === 'customer' ? <CustomerPortal /> : <AdminPortal />}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-xs text-slate-500">
          <span>© 2026 ShadowBank</span>
        </footer>
      </main>

      <BankingModal />
      <ProfileModal />
      <OnboardModal />
      <AdminDepositModal />
    </div>
  );
}
