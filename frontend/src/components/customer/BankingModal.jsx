import { useBank } from '../../context/useBank.js';
import { fieldClass } from '../../utils/formatters.js';
import Modal from '../ui/Modal.jsx';

export default function BankingModal() {
  const { account, bank, modal, setModal, submitBankingAction, bankingRequestId } = useBank();
  if (modal !== 'banking' || !account) return null;

  return (
    <Modal title="Transfer money" description="Send money to another active customer account." onClose={() => setModal('')}>
      <form className="mt-5 space-y-4" onSubmit={submitBankingAction}>
        <input type="hidden" name="idempotencyKey" value={bankingRequestId} />
        <input type="hidden" name="kind" value="transfer" />
        <label className="block text-sm text-slate-300">Amount (USD)<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0.00" className={fieldClass} /></label>
        <label className="block text-sm text-slate-300">Recipient<select name="recipient" defaultValue="" required className={fieldClass}><option value="">Choose a customer</option>{bank.customers.filter((customer) => customer.id !== account.id && customer.status === 'Active').map((customer) => <option className="bg-[#0b2030]" key={customer.id} value={customer.id}>{customer.name} · {customer.accountNumber.slice(-4)}</option>)}</select></label>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/75">Transfers may be held for additional review.</div>
        <button className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200">Transfer money</button>
      </form>
    </Modal>
  );
}
