// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { WalletData } from '../services/wallet';
import DashboardScreen from './DashboardScreen';

const mockWallet: WalletData = {
  address: '0QTEST0000000000000000000000000000000000000000',
  mnemonic: [],
  publicKey: Buffer.alloc(32, 1),
  secretKey: Buffer.alloc(64, 2),
};

const mockTx = {
  hash: 'abc',
  lt: '1',
  timestamp: Math.floor(Date.now() / 1000),
  from: '0QFROM00000000000000000000000000000000000000000',
  to: '0QTO0000000000000000000000000000000000000000000',
  amount: '1.5',
  fee: '0.01',
  comment: 'hello',
  isOutgoing: false,
};

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    wallet: mockWallet,
    balance: '10.25',
    transactions: [mockTx],
    logout: vi.fn(),
    refreshBalance: vi.fn().mockResolvedValue(undefined),
    refreshTransactions: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('DashboardScreen', () => {
  it('показывает баланс и кнопки Получить / Отправить', () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    );
    expect(screen.getByText(/10\.25/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Получить/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Отправить/i })).toBeInTheDocument();
  });

  it('фильтрует транзакции по поиску', async () => {
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    );
    const user = userEvent.setup();
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
    const search = screen.getByPlaceholderText(/Поиск по адресу/i);
    await user.type(search, 'zzznomatch');
    expect(screen.queryByText(/1\.5/)).not.toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'hello');
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
  });
});
