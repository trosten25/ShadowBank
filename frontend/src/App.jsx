
import { useState } from 'react';
import {
  ShieldCheck, ArrowUpRight, ArrowDownLeft, ArrowRight,
  LockKeyhole, Activity, Bell, CreditCard, LayoutDashboard,
  History, ShieldAlert, Menu, X
} from 'lucide-react';

const transactions = [
  { id: '2147089', name: 'Online transfer', date: 'Oct 19, 2026', amount: '-$1,250.00', status: 'Completed', type: 'out' },
  { id: '2157069', name: 'Salary payment', date: 'Oct 18, 2026', amount: '+$3,400.00', status: 'Completed', type: 'in' },
  { id: '2229089', name: 'Unknown recipient', date: 'Oct 18, 2026', amount: '+$3,400.00', status: 'Suspicious', type: 'alert' },
  { id: '2237089', name: 'Online transfer', date: 'Oct 17, 2026', amount: '+$840.00', status: 'Completed', type: 'in' },
];

function App() {
  const [tab, setTab] = useState('Overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Transactions', icon: History },
    { label: 'Security', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#061522] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-330px] h-[570px] w-[850px] -translate-x-1/2 rounded-[50%] border border-cyan-300/10 shadow-[0_0_100px_20px_rgba(14,165,233,0.08)]" />
        <div className="absolute left-1/2 top-[-270px] h-[460px] w-[680px] -translate-x-1/2 rounded-[50%] border border-cyan-300/20 shadow-[0_0_90px_rgba(34,211,238,0.12)]" />
        <div className="absolute left-1/2 top-[-180px] h-[340px] w-[500px] -translate-x-1/2 rounded-[50%] bg-blue-500/10 blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
        <button onClick={() => setTab('Overview')} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-cyan-600 text-[#061522]">
            <ShieldCheck size={23} />
          </span>
          <span className="text-xl font-bold tracking-tight">Shadow<span className="text-teal-300">Bank</span></span>
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1.5 md:flex">
          {navItems.map(({ label }) => (
            <button key={label} onClick={() => setTab(label)}
              className={`rounded-full px-5 py-2 text-sm transition ${
                tab === label
                  ? 'bg-teal-300 font-semibold text-[#06202a]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Systems secure
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800 font-semibold">U</div>
        </div>

        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {menuOpen && (
        <nav className="relative z-20 mx-5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0b2030] p-3 md:hidden">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setTab(label); setMenuOpen(false); }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-white/10">
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      )}

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-16 lg:px-10">
        <section className="relative pb-12 pt-12 text-center md:pt-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-4 py-2 text-xs font-medium tracking-wide text-teal-200">
            <ShieldCheck size={15} />
            YOUR MONEY. YOUR SECURITY.
            <span className="h-1 w-1 rounded-full bg-teal-300" />
            AI-POWERED
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl md:text-7xl">
            Banking that feels
            <br />
            <span className="bg-gradient-to-r from-teal-200 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              secure and effortless.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
            Welcome to ShadowBank. Manage your money, track every transaction,
            and stay one step ahead of threats with intelligent security monitoring.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 rounded-full bg-teal-300 px-6 py-3.5 text-sm font-bold text-[#05212a] shadow-[0_0_35px_rgba(45,212,191,0.16)] transition hover:-translate-y-0.5 hover:bg-teal-200">
              Open dashboard <ArrowRight size={17} />
            </button>
            <button onClick={() => setTab('Security')}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/10">
              <LockKeyhole size={16} /> Explore security
            </button>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-slate-500">
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-teal-300" /> AI threat monitoring</span>
            <span className="flex items-center gap-2"><LockKeyhole size={15} className="text-teal-300" /> Encrypted account data</span>
            <span className="flex items-center gap-2"><Activity size={15} className="text-teal-300" /> Real-time activity</span>
          </div>
        </section>

        <section id="dashboard" className="scroll-mt-8 rounded-[28px] border border-white/10 bg-gradient-to-b from-[#102638] to-[#091a28] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.25)] sm:p-7 lg:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-300">Personal banking</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{tab === 'Overview' ? 'Your financial overview' : tab}</h2>
              <p className="mt-1 text-sm text-slate-400">Good to see you again. Here's your account at a glance.</p>
            </div>
            <button onClick={() => setTransferOpen(true)}
              className="flex items-center gap-2 rounded-full bg-teal-300 px-5 py-3 text-sm font-bold text-[#05212a] transition hover:bg-teal-200">
              Transfer money <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-[#12435a] via-[#102c43] to-[#0b1b2b] p-6 lg:col-span-2">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-300">Total available balance</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">$24,102.50</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-teal-200"><LockKeyhole size={14} /> Protected account</p>
                </div>
                <CreditCard className="text-teal-200/70" size={30} />
              </div>
              <div className="relative mt-9 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Account number</p>
                  <p className="mt-1 text-sm tracking-[0.18em]">•••• •••• •••• 8842</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Account status</p>
                  <p className="mt-1 text-sm font-medium text-emerald-300">Verified & secure</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1d2b] p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300/10 text-teal-300"><Activity size={21} /></div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 text-[11px] text-emerald-300">Monitoring</span>
              </div>
              <p className="mt-5 text-sm text-slate-400">AI threat engine</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold">14%</span>
                <span className="pb-1 text-xs text-slate-500">risk score</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-700/70">
                <div className="h-full w-[14%] rounded-full bg-gradient-to-r from-teal-300 to-cyan-400" />
              </div>
              <div className="mt-5 space-y-3 text-xs text-slate-400">
                <div className="flex justify-between"><span>Last scan</span><span className="text-slate-200">2 mins ago</span></div>
                <div className="flex justify-between"><span>Flagged activity</span><span className="text-amber-300">1 alert</span></div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b1d2b] p-5 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Recent transactions</h3>
                  <p className="mt-1 text-xs text-slate-500">Your latest account activity</p>
                </div>
                <button onClick={() => setTab('Transactions')} className="text-xs text-teal-300 hover:text-teal-200">View all →</button>
              </div>
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.035]">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        tx.type === 'out' ? 'bg-rose-400/10 text-rose-300' :
                        tx.type === 'alert' ? 'bg-amber-300/10 text-amber-300' :
                        'bg-teal-300/10 text-teal-300'
                      }`}>
                        {tx.type === 'out' ? <ArrowUpRight size={18} /> : tx.type === 'alert' ? <ShieldAlert size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.name}</p>
                        <p className="mt-1 text-xs text-slate-500">TXN-{tx.id} · {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === 'out' ? 'text-rose-300' : 'text-teal-300'}`}>{tx.amount}</p>
                      <span className={`mt-1 inline-block text-[10px] ${tx.status === 'Suspicious' ? 'text-amber-300' : 'text-emerald-300'}`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1d2b] p-5">
              <div className="flex items-center gap-2">
                <Bell className="text-teal-300" size={19} />
                <h3 className="font-semibold">Security centre</h3>
              </div>
              <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 shrink-0 text-amber-300" size={19} />
                  <div>
                    <p className="text-sm font-medium text-amber-100">Suspicious transaction</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">An activity has been flagged for review by the AI threat engine.</p>
                  </div>
                </div>
                {alertVisible ? (
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setTab('Security')} className="flex-1 rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-[#1a2630] hover:bg-amber-200">Review alert</button>
                    <button onClick={() => setAlertVisible(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Dismiss</button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">Alert hidden from this view.</p>
                )}
              </div>
              <div className="mt-4 space-y-3 rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Encryption</span><span className="text-emerald-300">Enabled</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Login protection</span><span className="text-emerald-300">Active</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Threat monitoring</span><span className="text-teal-300">Online</span></div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 py-7 text-xs text-slate-500">
          <span>© 2026 ShadowBank · Banking reimagined.</span>
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-teal-300" /> Designed with security in mind</span>
        </footer>
      </main>

      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setTransferOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b2030] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Initiate transfer</h2>
              <button onClick={() => setTransferOpen(false)} aria-label="Close transfer dialog" className="rounded-full p-2 text-slate-400 hover:bg-white/10"><X size={20} /></button>
            </div>
            <p className="mt-2 text-sm text-slate-400">Demo interface — no real money will be transferred.</p>
            <label className="mt-6 block text-sm text-slate-300">Transfer amount (USD)</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#061522] px-4 py-3 text-white outline-none focus:border-teal-300/60" />
            <button onClick={() => { window.alert(Number(amount) > 0 ? `Demo transfer request for $${Number(amount).toFixed(2)}. No funds were moved.` : 'Enter a valid amount first.'); if (Number(amount) > 0) { setAmount(''); setTransferOpen(false); } }}
              className="mt-4 w-full rounded-xl bg-teal-300 py-3 font-semibold text-[#05212a] hover:bg-teal-200">
              Continue demo transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
