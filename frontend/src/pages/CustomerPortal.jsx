import {
  Activity, ArrowLeftRight, BadgeCheck, Bell, CreditCard, LockKeyhole,
  Plus, Search, ShieldAlert, UsersRound,
} from 'lucide-react';
import { useBank } from '../context/useBank.js';
import { money, fieldClass, shortDate } from '../utils/formatters.js';
import TransactionList from '../components/customer/TransactionList.jsx';
import Metric from '../components/ui/Metric.jsx';
import Panel from '../components/ui/Panel.jsx';

export default function CustomerPortal() {
  const {
    account, bank, tab, setTab, setModal, accountTransactions,
    visibleTransactions, query, setQuery, transactionFilter, setTransactionFilter,
  } = useBank();
  if (!account) return <Panel>Your account is not available. Please contact support.</Panel>;

  return (
    <>
      {tab === 'Overview' && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="relative overflow-hidden bg-gradient-to-br from-[#12435a] via-[#102c43] to-[#0b1b2b] lg:col-span-2">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-300">Available balance</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{money(account.balance)}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-teal-200"><LockKeyhole size={14} /> Account · {account.status}</p>
                </div>
                <CreditCard className="text-teal-200/70" size={28} />
              </div>
              <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
                <div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Account number</p><p className="mt-1 text-sm tracking-[0.14em]">•••• •••• {account.accountNumber.slice(-4)}</p></div>
                <button className="text-xs text-teal-200 hover:text-teal-100" onClick={() => setModal('profile')}>Edit profile</button>
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300/10 text-teal-300"><Activity size={20} /></span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 text-[11px] text-emerald-300">Activity monitor</span>
              </div>
              <p className="mt-5 text-sm text-slate-400">Account activity</p>
              <div className="mt-2 flex items-end gap-2"><span className="text-4xl font-semibold">{accountTransactions.length}</span><span className="pb-1 text-xs text-slate-500">transactions</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-700/70"><div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-cyan-400" style={{ width: `${Math.min(accountTransactions.length * 10, 100)}%` }} /></div>
              <div className="mt-5 space-y-3 text-xs text-slate-400">
                <div className="flex justify-between"><span>Activity checked</span><span className="text-slate-200">{accountTransactions.length} transactions</span></div>
                <div className="flex justify-between"><span>Held for review</span><span className="text-amber-300">{accountTransactions.filter((item) => item.status === 'Review').length}</span></div>
              </div>
            </Panel>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setModal('banking')} className="flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-3 text-sm font-semibold text-[#05212a] transition hover:bg-teal-200"><ArrowLeftRight size={17} /> Transfer money</button>
            <button onClick={() => setModal('profile')} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 hover:bg-white/10"><UsersRound size={16} /> Update profile</button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><h2 className="font-semibold">Recent transactions</h2><p className="mt-1 text-xs text-slate-500">Latest activity for {account.name}</p></div>
                <button onClick={() => setTab('Transactions')} className="text-xs text-teal-300 hover:text-teal-200">View all →</button>
              </div>
              <TransactionList transactions={accountTransactions.slice(0, 5)} account={account} customers={bank.customers} />
            </Panel>
            <Panel>
              <div className="flex items-center gap-2"><Bell size={18} className="text-teal-300" /><h2 className="font-semibold">Security centre</h2></div>
              {accountTransactions.some((item) => item.status === 'Review') ? (
                <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4">
                  <div className="flex items-start gap-3"><ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-300" /><div><p className="text-sm font-medium text-amber-100">Transaction held</p><p className="mt-1 text-xs leading-5 text-slate-400">A transaction is waiting for review.</p></div></div>
                </div>
              ) : <p className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-200">No transactions are waiting for review.</p>}
            </Panel>
          </div>
        </>
      )}

      {tab === 'Transactions' && (
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">Transaction history</h2><p className="mt-1 text-xs text-slate-500">Filter and search your account activity.</p></div>
            <button onClick={() => setModal('banking')} className="flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-[#05212a] hover:bg-teal-200"><Plus size={16} /> Transfer money</button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" aria-label="Search transactions" className={`${fieldClass} mt-0 pl-9`} /></label>
            <select aria-label="Filter transactions" value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value)} className="rounded-xl border border-white/10 bg-[#061522] px-3 text-sm text-white outline-none focus:border-teal-300/60">
              {['All', 'Completed', 'Review', 'Declined'].map((status) => <option className="bg-[#0b2030]" key={status}>{status}</option>)}
            </select>
          </div>
          <TransactionList transactions={visibleTransactions} account={account} customers={bank.customers} />
          {visibleTransactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No matching transactions.</p>}
        </Panel>
      )}

      {tab === 'Security' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Account transactions" value={accountTransactions.length} icon={Activity} detail="Account activity" />
            <Metric label="Held transactions" value={accountTransactions.filter((item) => item.status === 'Review').length} icon={ShieldAlert} tone="amber" detail="Requires administrator review" />
            <Metric label="Account status" value={account.status} icon={BadgeCheck} tone={account.status === 'Active' ? 'green' : 'amber'} detail={`Opened ${shortDate(account.createdAt)}`} />
          </div>
          <Panel className="mt-4">
            <h2 className="font-semibold">Security activity</h2>
            <p className="mt-1 text-xs text-slate-500">Review outcomes for your account activity.</p>
            <div className="mt-4"><TransactionList transactions={accountTransactions.filter((item) => item.status === 'Review' || item.status === 'Declined')} account={account} customers={bank.customers} /></div>
            {!accountTransactions.some((item) => item.status === 'Review' || item.status === 'Declined') && <p className="py-8 text-center text-sm text-slate-500">No flagged activity for this account.</p>}
          </Panel>
        </>
      )}
    </>
  );
}
