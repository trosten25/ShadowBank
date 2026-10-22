import {
  CircleCheck, CircleDollarSign, Clock3, FileText, Plus, ShieldAlert,
  Sparkles, UsersRound,
} from 'lucide-react';
import { useBank } from '../context/useBank.js';
import { money, shortDate } from '../utils/formatters.js';
import AccountTable from '../components/admin/AccountTable.jsx';
import ReviewQueue from '../components/admin/ReviewQueue.jsx';
import Metric from '../components/ui/Metric.jsx';
import Panel from '../components/ui/Panel.jsx';

export default function AdminPortal() {
  const { bank, reviewItems, tab, setTab, setModal, reviewTransaction, toggleAccountStatus } = useBank();
  const depositForAccount = (customer) => setModal('admin-deposit', customer.id);
  const customers = bank.customers;
  const completedVolume = bank.transactions.filter((item) => item.status === 'Completed').reduce((sum, item) => sum + item.amount, 0);
  const unresolvedCount = reviewItems.length;
  const auditItems = bank.auditLogs;

  return (
    <>
      {tab === 'Admin overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Customer accounts" value={customers.length} icon={UsersRound} detail="Accounts on file" />
            <Metric label="Held for review" value={unresolvedCount} icon={ShieldAlert} detail={unresolvedCount ? 'Action required' : 'No pending cases'} tone={unresolvedCount ? 'amber' : 'green'} />
            <Metric label="Completed activity" value={bank.transactions.filter((item) => item.status === 'Completed').length} icon={CircleCheck} detail="All transaction types" tone="green" />
            <Metric label="Transaction volume" value={money(completedVolume)} icon={CircleDollarSign} detail="Gross completed activity" tone="blue" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Transactions requiring review</h2><p className="mt-1 text-xs text-slate-500">Held transactions have not changed account balances.</p></div><button onClick={() => setTab('Threat review')} className="text-xs text-teal-300 hover:text-teal-200">Open queue →</button></div>
              <ReviewQueue transactions={reviewItems.slice(0, 4)} customers={customers} onReview={reviewTransaction} />
            </Panel>
            <Panel>
              <div className="flex items-center gap-2"><Sparkles size={18} className="text-teal-300" /><h2 className="font-semibold">Transaction review summary</h2></div>
              <p className="mt-1 text-[11px] text-slate-500">Current review activity</p>
              <p className="mt-4 text-sm leading-6 text-slate-300">{unresolvedCount ? `${unresolvedCount} transaction${unresolvedCount === 1 ? '' : 's'} currently held for review. Verify the sender, recipient, and review reason before choosing an outcome.` : 'No held transactions. Flagged transfers will appear here for review.'}</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs text-slate-400"><Clock3 size={15} className="text-teal-300" />{bank.transactions.length} activity records available</div>
              <button onClick={() => setTab('Audit log')} className="mt-4 flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200"><FileText size={14} /> Browse audit log</button>
            </Panel>
          </div>
          <Panel className="mt-4">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Recently onboarded</h2><p className="mt-1 text-xs text-slate-500">Recently created customer accounts.</p></div><button onClick={() => setModal('onboard')} className="flex items-center gap-2 rounded-xl bg-teal-300 px-3.5 py-2.5 text-xs font-semibold text-[#05212a] hover:bg-teal-200"><Plus size={15} /> Onboard account</button></div>
            <AccountTable customers={customers.slice(0, 5)} onToggleStatus={toggleAccountStatus} onDeposit={depositForAccount} />
          </Panel>
        </>
      )}

      {tab === 'Accounts' && (
        <Panel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Customer accounts</h2><p className="mt-1 text-xs text-slate-500">Onboard customers and manage account status.</p></div><button onClick={() => setModal('onboard')} className="flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 text-sm font-semibold text-[#05212a] hover:bg-teal-200"><Plus size={16} /> Onboard account</button></div>
          <AccountTable customers={customers} onToggleStatus={toggleAccountStatus} onDeposit={depositForAccount} />
        </Panel>
      )}

      {tab === 'Threat review' && (
        <Panel>
          <div className="mb-5"><h2 className="font-semibold">Threat review queue</h2><p className="mt-1 text-xs text-slate-500">Approve a held transaction to apply its balance changes, or decline it with no balance movement.</p></div>
          <ReviewQueue transactions={reviewItems} customers={customers} onReview={reviewTransaction} />
          {!reviewItems.length && <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-5 text-center text-sm text-emerald-200">The review queue is clear.</div>}
        </Panel>
      )}

      {tab === 'Audit log' && (
        <Panel>
          <div className="mb-5"><h2 className="font-semibold">Audit log</h2><p className="mt-1 text-xs text-slate-500">Transaction history and review outcomes.</p></div>
          {auditItems.length ? <div className="divide-y divide-white/[0.05]">{auditItems.map((item) => (
            <div key={item.audit_id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1">
              <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-slate-700/60 p-2 text-slate-300"><FileText size={16} /></span><div>
                <p className="text-sm font-medium">{item.action.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-xs text-slate-500">{item.actor_email ?? 'System'} · {item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ''}</p>
              </div></div>
              <time className="text-xs text-slate-400">{shortDate(item.created_at)}</time>
            </div>
          ))}</div> : <p className="py-8 text-center text-sm text-slate-500">No audit records yet.</p>}
        </Panel>
      )}
    </>
  );
}
