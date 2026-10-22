import { money, shortDate } from '../../utils/formatters.js';

export default function AccountTable({ customers, onToggleStatus, onDeposit }) {
  if (!customers.length) return <p className="py-8 text-center text-sm text-slate-500">No customer accounts yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead><tr className="border-b border-white/[0.08] text-xs text-slate-500"><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Account</th><th className="px-3 py-3 font-medium">Balance</th><th className="px-3 py-3 font-medium">Opened</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Actions</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-white/[0.02]">
              <td className="px-3 py-3.5"><p className="font-medium">{customer.name}</p><p className="mt-1 text-xs text-slate-500">{customer.email}</p><p className={`mt-1 text-[10px] ${customer.emailVerified ? 'text-emerald-300' : 'text-amber-200'}`}>{customer.emailVerified ? 'Registration complete' : 'Signup pending'}</p></td>
              <td className="px-3 py-3.5 text-xs text-slate-300">•••• {customer.accountNumber.slice(-4)}</td>
              <td className="px-3 py-3.5">{money(customer.balance)}</td>
              <td className="px-3 py-3.5 text-xs text-slate-400">{shortDate(customer.createdAt)}</td>
              <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] ${customer.status === 'Active' ? 'bg-emerald-300/10 text-emerald-300' : 'bg-amber-300/10 text-amber-200'}`}>{customer.status}</span></td>
              <td className="space-x-2 px-3 py-3.5"><button onClick={() => onDeposit(customer)} className="rounded-lg border border-teal-300/25 px-2.5 py-1.5 text-xs text-teal-200 hover:bg-teal-300/10">Deposit</button><button onClick={() => onToggleStatus(customer.id)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]">{customer.status === 'Active' ? 'Pause' : 'Reactivate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
