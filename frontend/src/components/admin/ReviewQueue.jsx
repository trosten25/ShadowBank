import { Check, ShieldAlert, X } from 'lucide-react';
import { money, shortDate } from '../../utils/formatters.js';

export default function ReviewQueue({ transactions, customers, onReview }) {
  if (!transactions.length) return <p className="py-7 text-center text-sm text-slate-500">No transactions awaiting review.</p>;

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const sender = customers.find((customer) => customer.id === transaction.senderId);
        const recipient = customers.find((customer) => customer.id === transaction.receiverId);
        return (
          <article key={transaction.id} className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span className="rounded-lg bg-amber-300/10 p-2 text-amber-300"><ShieldAlert size={17} /></span><div><p className="text-sm font-medium">{sender?.name ?? 'External'} <span className="text-slate-500">→</span> {recipient?.name ?? 'External'}</p><p className="mt-1 text-xs text-slate-500">{transaction.id} · {shortDate(transaction.createdAt)}</p><p className="mt-2 text-xs text-amber-100/80">{transaction.riskReason || 'Flagged for review'}</p></div></div>
              <div className="text-right"><p className="text-sm font-semibold">{money(transaction.amount)}</p><span className="text-[10px] text-amber-300">Held · no balance change</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => onReview(transaction.id, true)} className="flex items-center gap-1.5 rounded-lg bg-teal-300 px-3 py-2 text-xs font-semibold text-[#05212a] hover:bg-teal-200"><Check size={14} /> Approve</button>
              <button onClick={() => onReview(transaction.id, false)} className="flex items-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-300/[0.06] px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-300/10"><X size={14} /> Decline</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
