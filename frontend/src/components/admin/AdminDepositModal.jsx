import { useBank } from '../../context/useBank.js';
import { fieldClass, money } from '../../utils/formatters.js';
import Modal from '../ui/Modal.jsx';

export default function AdminDepositModal() {
  const {
    bank, depositAccountId, bankingRequestId, modal, setModal, submitAdminDeposit,
  } = useBank();
  const customer = bank.customers.find((item) => item.id === depositAccountId);
  if (modal !== 'admin-deposit' || !customer) return null;

  return (
    <Modal
      title="Deposit funds"
      description={`Add funds to ${customer.name}'s account ending in ${customer.accountNumber.slice(-4)}. Current balance: ${money(customer.balance)}.`}
      onClose={() => setModal('')}
    >
      <form className="mt-5 space-y-4" onSubmit={submitAdminDeposit}>
        <input type="hidden" name="idempotencyKey" value={bankingRequestId} />
        <label className="block text-sm text-slate-300">
          Amount (USD)
          <input name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0.00" className={fieldClass} />
        </label>
        <p className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100/75">
          This deposit will be added immediately and recorded in the account transaction history.
        </p>
        <button className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200">
          Deposit funds
        </button>
      </form>
    </Modal>
  );
}
