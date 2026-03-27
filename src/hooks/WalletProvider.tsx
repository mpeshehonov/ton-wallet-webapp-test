import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type WalletData,
  createWallet,
  importWallet,
  saveMnemonic,
  loadMnemonic,
  clearMnemonic,
  loadWalletFromMnemonic,
} from '../services/wallet';
import { clearClipboardTracking } from '../utils/spoofing';
import {
  getBalance,
  getTransactions,
  type Transaction,
} from '../services/tonApi';
import { WalletContext } from './wallet-context';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [balance, setBalance] = useState('0');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadMnemonic();
    if (saved) {
      loadWalletFromMnemonic(saved)
        .then(setWallet)
        .catch(() => clearMnemonic())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const b = await getBalance(wallet.address);
      setBalance(b);
    } catch (err) {
      console.error('Balance fetch failed:', err);
    }
  }, [wallet]);

  const refreshTransactions = useCallback(async () => {
    if (!wallet) return;
    try {
      const txs = await getTransactions(wallet.address, 30);
      setTransactions(txs);
    } catch (err) {
      console.error('Transactions fetch failed:', err);
    }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) return;
    refreshBalance();
    refreshTransactions();
    const interval = setInterval(() => {
      refreshBalance();
      refreshTransactions();
    }, 15000);
    return () => clearInterval(interval);
  }, [wallet, refreshBalance, refreshTransactions]);

  const generate = useCallback(async () => {
    setError(null);
    try {
      const data = await createWallet();
      return data.mnemonic;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  const activate = useCallback(async (mnemonic: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadWalletFromMnemonic(mnemonic);
      saveMnemonic(data.mnemonic);
      setWallet(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restore = useCallback(async (mnemonic: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await importWallet(mnemonic);
      saveMnemonic(data.mnemonic);
      setWallet(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearMnemonic();
    clearClipboardTracking();
    setWallet(null);
    setBalance('0');
    setTransactions([]);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        balance,
        transactions,
        loading,
        error,
        generate,
        activate,
        restore,
        logout,
        refreshBalance,
        refreshTransactions,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
