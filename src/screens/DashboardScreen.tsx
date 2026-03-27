import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks';
import { truncateAddress } from '../utils/spoofing';

export default function DashboardScreen() {
  const { wallet, balance, transactions, logout, refreshBalance, refreshTransactions } =
    useWallet();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredTxs = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.from.toLowerCase().includes(q) ||
        tx.to.toLowerCase().includes(q) ||
        tx.amount.includes(q) ||
        tx.comment.toLowerCase().includes(q) ||
        new Date(tx.timestamp * 1000).toLocaleString().includes(q)
    );
  }, [transactions, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), refreshTransactions()]);
    setRefreshing(false);
  };

  const copyAddress = async () => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!wallet) return null;

  return (
    <div className="min-h-screen max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">TON Wallet</h1>
        <button
          onClick={logout}
          className="app-btn-header text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Выйти
        </button>
      </div>

      {/* Balance Card */}
      <div className="app-surface-border rounded-2xl p-6 text-center space-y-3">
        <button
          onClick={copyAddress}
          className="app-chip-muted text-sm px-3 py-1 rounded-full transition-colors inline-flex items-center gap-1"
        >
          {truncateAddress(wallet.address)}
          <span className="text-xs">{copied ? '✓' : '📋'}</span>
        </button>
        <div className="text-4xl font-bold">
          {parseFloat(balance).toFixed(4)}{' '}
          <span className="text-lg app-text-muted">TON</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs transition-colors app-text-muted"
        >
          {refreshing ? 'Обновление...' : '↻ Обновить'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/receive')}
          className="app-btn-primary py-3 rounded-xl font-semibold transition-colors"
        >
          Получить
        </button>
        <button
          onClick={() => navigate('/send')}
          className="app-btn-primary py-3 rounded-xl font-semibold transition-colors"
        >
          Отправить
        </button>
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Транзакции</h2>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по адресу, сумме, комментарию..."
          className="app-input w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        />

        {filteredTxs.length === 0 ? (
          <p className="text-center py-8 text-sm app-text-muted">
            {transactions.length === 0
              ? 'Нет транзакций'
              : 'Ничего не найдено'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredTxs.map((tx) => (
              <div
                key={tx.hash}
                className="app-surface-border rounded-xl p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${tx.isOutgoing ? 'app-text-danger' : 'app-text-success'}`}
                  >
                    {tx.isOutgoing ? '↑ Отправлено' : '↓ Получено'}
                  </span>
                  <span className="text-xs app-text-muted">
                    {new Date(tx.timestamp * 1000).toLocaleString('ru-RU')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs app-text-muted">
                    {tx.isOutgoing
                      ? `→ ${truncateAddress(tx.to)}`
                      : `← ${truncateAddress(tx.from)}`}
                  </span>
                  <span className="font-semibold">
                    {tx.isOutgoing ? '-' : '+'}
                    {parseFloat(tx.amount).toFixed(4)} TON
                  </span>
                </div>
                {tx.comment && (
                  <p className="text-xs pt-1 app-text-muted">
                    💬 {tx.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
