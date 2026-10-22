import { ArrowDownLeft, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { money, shortDate } from '../../utils/formatters.js';

export default function TransactionList({ transactions, account, customers }) {
  if (!transactions.length) return <p className="py-6 text-center text-sm text-slate-500">No transactions to show.</p>;
  const counterpartName = (transaction) => {
    if (transaction.kind === 'deposit') return 'Cash deposit';
    if (transaction.kind === 'withdrawal') return 'Cash withdrawal';
    const id = transaction.senderId === account.id ? transaction.receiverId : transaction.senderId;
    return customers.find((customer) => customer.id === id)?.name ?? 'Unknown account';
  };

  return (
    <div className="divide-y divide-white/[0.05]">
      {transactions.map((transaction) => {
        const incoming = transaction.receiverId === account.id;
        const isHeld = transaction.status === 'Review';
        return (
          <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-1">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isHeld ? 'bg-amber-300/10 text-amber-300' : incoming ? 'bg-teal-300/10 text-teal-300' : 'bg-rose-300/10 text-rose-300'}`}>
                {isHeld ? <ShieldAlert size={18} /> : incoming ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize">{counterpartName(transaction)}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{transaction.id} · {shortDate(transaction.createdAt)}{transaction.riskReason ? ` · ${transaction.riskReason}` : ''}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm font-semibold ${incoming ? 'text-teal-300' : 'text-slate-200'}`}>{incoming ? '+' : '−'}{money(transaction.amount)}</p>
              <span className={`mt-1 inline-block text-[10px] ${isHeld ? 'text-amber-300' : transaction.status === 'Declined' ? 'text-rose-300' : 'text-emerald-300'}`}>{transaction.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
