import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks';
import { sendTon, isValidAddress } from '../services/tonApi';
import {
  checkAddressSpoofing,
  saveKnownAddress,
  type SpoofingWarning,
} from '../utils/spoofing';

type SendState = 'form' | 'confirm' | 'sending' | 'success' | 'error';

export default function SendScreen() {
  const { wallet, balance, refreshBalance, refreshTransactions } = useWallet();
  const navigate = useNavigate();

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<SendState>('form');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<SpoofingWarning[]>([]);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);

  const validate = useCallback((): string | null => {
    if (!to.trim()) return 'Введите адрес получателя';
    if (!isValidAddress(to.trim())) return 'Некорректный адрес TON';
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0)
      return 'Введите корректную сумму';
    if (Number(amount) > Number(balance))
      return 'Недостаточно средств';
    return null;
  }, [to, amount, balance]);

  const handlePrepare = () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const spoofWarnings = checkAddressSpoofing(to.trim(), wallet!.address);
    setWarnings(spoofWarnings);
    setWarningsAcknowledged(false);
    setState('confirm');
  };

  const handleSend = async () => {
    if (!wallet) return;
    setState('sending');
    setError('');

    try {
      await sendTon({
        secretKey: wallet.secretKey,
        publicKey: wallet.publicKey,
        to: to.trim(),
        amount: amount.trim(),
        comment: comment.trim() || undefined,
      });

      saveKnownAddress(to.trim());
      setState('success');

      setTimeout(async () => {
        await refreshBalance();
        await refreshTransactions();
      }, 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
      setState('error');
    }
  };

  if (!wallet) return null;

  if (state === 'success') {
    return (
      <div className="min-h-screen max-w-lg mx-auto p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">✓</div>
          <h2 className="text-2xl font-bold">Отправлено</h2>
          <p className="text-sm app-text-muted">
            {amount} TON отправлено. Транзакция может подтвердиться в течение минуты.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen max-w-lg mx-auto p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">✗</div>
          <h2 className="text-2xl font-bold">Ошибка</h2>
          <p className="text-sm app-text-danger">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => setState('form')}
              className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
            >
              Попробовать снова
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="app-btn-ghost w-full py-3 rounded-xl font-semibold transition-colors"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'confirm' || state === 'sending') {
    const hasHighWarnings = warnings.some((w) => w.severity === 'high');
    const canSend =
      state !== 'sending' &&
      (warnings.length === 0 || warningsAcknowledged);

    return (
      <div className="min-h-screen max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setState('form')}
            disabled={state === 'sending'}
            className="text-lg app-btn-ghost"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">Подтверждение</h1>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-3">
            {warnings.map((w, i) => (
              <div
                key={i}
                className={`app-alert ${w.severity === 'high' ? 'app-alert--high' : 'app-alert--medium'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">
                    {w.severity === 'high' ? '🚨' : '⚠️'}
                  </span>
                  <div>
                    <p
                      className={`font-semibold text-sm ${w.severity === 'high' ? 'app-alert-title--high' : 'app-alert-title--medium'}`}
                    >
                      {w.severity === 'high' ? 'Высокий риск' : 'Внимание'}
                    </p>
                    <p className="text-sm mt-1">{w.message}</p>
                    {w.similarTo && (
                      <p className="text-xs mt-1 font-mono app-text-muted">
                        Похож на: {w.similarTo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!warningsAcknowledged && (
              <label className="app-check-row flex items-start gap-2 cursor-pointer p-3 rounded-xl">
                <input
                  type="checkbox"
                  checked={warningsAcknowledged}
                  onChange={(e) => setWarningsAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  {hasHighWarnings
                    ? 'Я понимаю риски и подтверждаю отправку'
                    : 'Я проверил(а) адрес и подтверждаю отправку'}
                </span>
              </label>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="app-surface-border rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="app-text-muted">Получатель</span>
            <span className="font-mono text-xs max-w-[200px] truncate">{to}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="app-text-muted">Сумма</span>
            <span className="font-semibold">{amount} TON</span>
          </div>
          {comment && (
            <div className="flex justify-between text-sm">
              <span className="app-text-muted">Комментарий</span>
              <span>{comment}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
          >
            {state === 'sending' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Отправка...
              </span>
            ) : (
              'Подтвердить отправку'
            )}
          </button>
          <button
            onClick={() => setState('form')}
            disabled={state === 'sending'}
            className="app-btn-ghost w-full py-3 rounded-xl font-semibold transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-lg app-btn-ghost"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Отправить TON</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="app-label block text-sm font-medium mb-1.5">
            Адрес получателя
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="app-input w-full px-4 py-3 rounded-xl text-sm outline-none"
            placeholder="UQ... или 0:..."
          />
        </div>

        <div>
          <label className="app-label block text-sm font-medium mb-1.5">
            Сумма (TON)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="app-input w-full px-4 py-3 rounded-xl text-sm outline-none"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <button
              onClick={() => setAmount(balance)}
              className="app-max-pill absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1 rounded"
            >
              MAX
            </button>
          </div>
          <p className="text-xs mt-1 app-text-muted">
            Баланс: {parseFloat(balance).toFixed(4)} TON
          </p>
        </div>

        <div>
          <label className="app-label block text-sm font-medium mb-1.5">
            Комментарий (необязательно)
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="app-input w-full px-4 py-3 rounded-xl text-sm outline-none"
            placeholder="Комментарий к переводу"
          />
        </div>

        {error && (
          <p className="text-sm app-text-danger">{error}</p>
        )}

        <button
          onClick={handlePrepare}
          className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
