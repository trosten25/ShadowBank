import { useContext } from 'react';
import { BankContext } from './bankContext.js';

export function useBank() {
  const context = useContext(BankContext);
  if (!context) throw new Error('useBank must be used inside BankProvider.');
  return context;
}
