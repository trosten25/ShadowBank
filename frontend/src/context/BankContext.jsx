import { useCallback, useEffect, useMemo, useState } from 'react';
import { BankContext } from './bankContext.js';
import { ApiError, api } from '../utils/api.js';

const emptyBank = { customers: [], transactions: [], auditLogs: [] };

export function BankProvider({ children }) {
  const [bank, setBank] = useState(emptyBank);
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notice, setNoticeValue] = useState('');
  const [noticeType, setNoticeType] = useState('success');
  const [tab, setTab] = useState(() => window.location.pathname.replace(/\/+$/, '') === '/admin' ? 'Admin overview' : 'Overview');
  const [modal, setModalState] = useState('');
  const [createdAccount, setCreatedAccount] = useState(null);
  const [bankingRequestId, setBankingRequestId] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [query, setQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('All');

  const setNotice = useCallback((message, type = 'success') => {
    setNoticeValue(message);
    setNoticeType(type);
  }, []);

  const loadBank = useCallback(async (authenticatedUser) => {
    const path = authenticatedUser.role === 'admin' ? '/admin/dashboard' : '/customer/overview';
    const result = await api(path);
    setBank({ customers: result.customers, transactions: result.transactions, auditLogs: result.auditLogs ?? [] });
    setAccount(authenticatedUser.role === 'customer' ? result.account : null);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const result = await api('/auth/me');
        if (!active) return;
        setUser(result.user);
        const path = result.user.role === 'admin' ? '/admin/dashboard' : '/customer/overview';
        const bankData = await api(path);
        if (!active) return;
        setBank({ customers: bankData.customers, transactions: bankData.transactions, auditLogs: bankData.auditLogs ?? [] });
        setAccount(result.user.role === 'customer' ? bankData.account : null);
      } catch (error) {
        if (!active) return;
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('Could not initialize the signed-in workspace:', error);
          setNotice(error.message, 'error');
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    }
    initialize();
    return () => { active = false; };
  }, [setNotice]);

  const setModal = useCallback((value, selectedAccountId = '') => {
    if (value === 'onboard') setCreatedAccount(null);
    if (value === 'banking') setBankingRequestId(crypto.randomUUID());
    if (value === 'admin-deposit') {
      setDepositAccountId(selectedAccountId);
      setBankingRequestId(crypto.randomUUID());
    }
    setModalState(value);
  }, []);

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return bank.transactions.filter((transaction) =>
      transaction.senderId === account.id || transaction.receiverId === account.id,
    );
  }, [account, bank.transactions]);
  const reviewItems = useMemo(
    () => bank.transactions.filter((transaction) => transaction.status === 'Review'),
    [bank.transactions],
  );
  const visibleTransactions = accountTransactions.filter((transaction) => {
    const text = `${transaction.id} ${transaction.kind} ${transaction.status} ${transaction.riskReason}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (transactionFilter === 'All' || transaction.status === transactionFilter);
  });

  async function submitBankingAction(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          kind: String(form.get('kind')),
          amount: Number(form.get('amount')),
          recipientId: String(form.get('recipient') ?? ''),
          idempotencyKey: String(form.get('idempotencyKey')),
        }),
      });
      await loadBank(user);
      setNotice(result.message);
      setModalState('');
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function submitAdminDeposit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api(`/admin/accounts/${encodeURIComponent(depositAccountId)}/deposit`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.get('amount')),
          idempotencyKey: String(form.get('idempotencyKey')),
        }),
      });
      await loadBank(user);
      setNotice(result.message);
      setModalState('');
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name')).trim(),
          email: String(form.get('email')).trim().toLowerCase(),
        }),
      });
      setCreatedAccount(result);
      await loadBank(user);
      setNotice(result.message);
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function resendOnboardingEmail() {
    if (!createdAccount?.account?.id) return;
    try {
      const result = await api(`/admin/accounts/${encodeURIComponent(createdAccount.account.id)}/resend-onboarding`, {
        method: 'POST',
      });
      setCreatedAccount({ ...createdAccount, emailSent: true, message: result.message });
      setNotice(result.message);
    } catch (error) {
      setCreatedAccount({ ...createdAccount, deliveryError: error.message });
      setNotice(error.message, 'error');
    }
  }

  async function updateProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: String(form.get('name')).trim() }),
      });
      await loadBank(user);
      setNotice('Profile updated.');
      setModalState('');
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function reviewTransaction(transactionId, approve) {
    try {
      const result = await api(`/admin/transactions/${encodeURIComponent(transactionId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      });
      await loadBank(user);
      setNotice(result.message);
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function toggleAccountStatus(accountId) {
    const customer = bank.customers.find((item) => item.id === accountId);
    if (!customer) return;
    const status = customer.status === 'Active' ? 'paused' : 'active';
    try {
      const result = await api(`/admin/accounts/${encodeURIComponent(accountId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadBank(user);
      setNotice(result.message);
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setBank(emptyBank);
      setAccount(null);
      window.location.assign('/login');
    } catch (error) {
      setNotice(error.message, 'error');
    }
  }

  const value = {
    bank, account, user, authLoading, notice, noticeType, setNotice,
    tab, setTab, modal, setModal, createdAccount, depositAccountId, query, setQuery,
    transactionFilter, setTransactionFilter, reviewItems, accountTransactions,
    visibleTransactions, bankingRequestId, submitBankingAction, submitAdminDeposit, createAccount, updateProfile,
    reviewTransaction, toggleAccountStatus, resendOnboardingEmail, logout,
  };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}
