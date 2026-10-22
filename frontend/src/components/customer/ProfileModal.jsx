import { useBank } from '../../context/useBank.js';
import { fieldClass } from '../../utils/formatters.js';
import Modal from '../ui/Modal.jsx';

export default function ProfileModal() {
  const { account, modal, setModal, updateProfile } = useBank();
  if (modal !== 'profile' || !account) return null;

  return (
    <Modal title="Update profile" description="Update your account profile." onClose={() => setModal('')}>
      <form className="mt-5 space-y-4" onSubmit={updateProfile}>
        <label className="block text-sm text-slate-300">Full name<input name="name" required maxLength="100" defaultValue={account.name} className={fieldClass} /></label>
        <button className="w-full rounded-xl bg-teal-300 py-3 text-sm font-semibold text-[#05212a] hover:bg-teal-200">Save profile</button>
      </form>
    </Modal>
  );
}
