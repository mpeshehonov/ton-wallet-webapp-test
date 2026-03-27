import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks';

type Step = 'choose' | 'create_show' | 'import';

export default function WelcomeScreen() {
  const { generate, activate, restore } = useWallet();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [importWords, setImportWords] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const words = await generate();
      setMnemonic(words);
      setStep('create_show');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMnemonic = async () => {
    setLoading(true);
    try {
      await activate(mnemonic);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setError('');
    const words = importWords
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    if (words.length !== 24) {
      setError('Мнемоническая фраза должна содержать 24 слова');
      return;
    }
    setLoading(true);
    try {
      await restore(words);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'create_show') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-center">
            Сохраните мнемоническую фразу
          </h1>

          <div className="rounded-xl p-4 space-y-1 app-surface-border">
            <div className="rounded-lg p-4 text-sm font-medium mb-3 app-callout-danger">
              Запишите эти 24 слова и храните их в безопасном месте. Без них вы
              потеряете доступ к кошельку.
            </div>
            <div className="grid grid-cols-3 gap-2">
              {mnemonic.map((word, i) => (
                <div key={i} className="text-sm py-1.5 px-2 rounded app-mnemonic-cell">
                  <span className="app-text-muted">{i + 1}.</span>{' '}
                  {word}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer app-text-muted">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="rounded"
            />
            Я сохранил(а) мнемоническую фразу
          </label>

          <button
            onClick={handleConfirmMnemonic}
            disabled={!saved || loading}
            className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Активация...' : 'Продолжить'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <h1 className="text-2xl font-bold text-center">Импорт кошелька</h1>
          <p className="text-center text-sm app-text-muted">
            Введите 24 слова мнемонической фразы через пробел
          </p>

          <textarea
            value={importWords}
            onChange={(e) => setImportWords(e.target.value)}
            rows={5}
            className="app-input w-full rounded-xl p-4 text-sm outline-none resize-none"
            placeholder="word1 word2 word3 ..."
          />

          {error && (
            <p className="text-sm text-center app-text-danger">{error}</p>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Загрузка...' : 'Импортировать'}
          </button>
          <button
            onClick={() => {
              setStep('choose');
              setError('');
            }}
            className="app-btn-ghost w-full py-3 rounded-xl font-semibold transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-5xl mb-2">💎</div>
        <h1 className="text-3xl font-bold">TON Wallet</h1>
        <p className="app-text-muted">
          Self-custodial кошелёк для TON testnet
        </p>

        <div className="space-y-3 pt-4">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? 'Создание...' : 'Создать кошелёк'}
          </button>
          <button
            onClick={() => setStep('import')}
            className="app-btn-outline w-full py-3 rounded-xl font-semibold transition-colors"
          >
            Импортировать кошелёк
          </button>
        </div>

        {error && (
          <p className="text-sm app-text-danger">{error}</p>
        )}
      </div>
    </div>
  );
}
