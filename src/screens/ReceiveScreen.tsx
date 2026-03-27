import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../hooks';
import { addressWithSoftBreaks } from '../utils/formatAddress';

export default function ReceiveScreen() {
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!wallet) return null;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-lg app-btn-ghost"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Получить TON</h1>
      </div>

      <div className="app-surface-border rounded-2xl p-6 text-center space-y-5">
        <p className="text-sm app-text-muted">
          Отправьте TON на этот адрес (testnet)
        </p>

        <div className="flex justify-center">
          <div className="bg-white rounded-xl p-4 inline-block">
            <QRCodeSVG value={wallet.address} size={180} />
          </div>
        </div>

        <div
          className="app-address-display rounded-xl p-4 w-full min-w-0 text-sm font-mono text-center leading-relaxed"
          title={wallet.address}
        >
          {addressWithSoftBreaks(wallet.address)}
        </div>

        <button
          onClick={copyAddress}
          className="app-btn-primary w-full py-3 rounded-xl font-semibold transition-colors"
        >
          {copied ? 'Скопировано ✓' : 'Скопировать адрес'}
        </button>
      </div>
    </div>
  );
}
