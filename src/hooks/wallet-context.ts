import { createContext } from 'react';
import type { WalletData } from '../services/wallet';
import type { Transaction } from '../services/tonApi';

export interface WalletContextValue {
  wallet: WalletData | null;
  balance: string;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  generate: () => Promise<string[]>;
  activate: (mnemonic: string[]) => Promise<void>;
  restore: (mnemonic: string[]) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextValue | null>(null);
