import { useBank } from '../../context/useBank.js';
import { fieldClass } from '../../utils/formatters.js';
import Modal from '../ui/Modal.jsx';

export default function OnboardModal() {
  const { modal, setModal, createAccount, createdAccount, resendOnboardingEmail } = useBank();
  if (modal !== 'onboard') return null;

  return (
    <Modal title="Onboard a customer" description="Create a customer account." onClose={() => setModal('')}>
      {createdAccount ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-6 text-slate-300">{createdAccount.message}</p>
          <label className="block text-sm text-slate-300">Generated account number
            <input readOnly value={createdAccount.accountNumber} className={`${fieldClass} font-mono tracking-widest`} onFocus={(event) => event.target.select()} />
          </label>
          <p role={createdAccount.emailSent ? 'status' : 'alert'} className={`text-xs ${createdAccount.emailSent ? 'text-teal-200' : 'text-rose-200'}`}>
            {createdAccount.emailSent ? 'The customer can use this number with their email to sign up.' : createdAccount.deliveryError || 'The customer email was not delivered. Do not close this dialog until you have securely provided the account number.'}
          </p>
          {!createdAccount.emailSent && <button onClick={resendOnboardingEmail} className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-200 hover:bg-white/[0.06]">Retry email delivery</button>}
          <button onClick={() => setModal('')} className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200">Done</button>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={createAccount}>
          <label className="block text-sm text-slate-300">Full name<input name="name" autoComplete="name" required maxLength="100" placeholder="Customer name" className={fieldClass} /></label>
          <label className="block text-sm text-slate-300">Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="name@example.com" className={fieldClass} /></label>
          <p className="text-xs leading-5 text-slate-500">An account number will be generated and sent to the customer by email.</p>
          <button className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200">Create account</button>
        </form>
      )}
    </Modal>
  );
}
