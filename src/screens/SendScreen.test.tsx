// @vitest-environment jsdom
import { Address } from '@ton/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletData } from '../services/wallet';
import * as tonApi from '../services/tonApi';
import SendScreen from './SendScreen';

const mockCtx: {
  wallet: WalletData | null;
  balance: string;
  refreshBalance: ReturnType<typeof vi.fn>;
  refreshTransactions: ReturnType<typeof vi.fn>;
} = {
  wallet: null,
  balance: '100',
  refreshBalance: vi.fn(),
  refreshTransactions: vi.fn(),
};

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    wallet: mockCtx.wallet,
    balance: mockCtx.balance,
    refreshBalance: mockCtx.refreshBalance,
    refreshTransactions: mockCtx.refreshTransactions,
  }),
}));

let recipientAddress: string;

beforeAll(() => {
  const fmt = { bounceable: false, testOnly: true } as const;
  const own = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000001'
  ).toString(fmt);
  const rec = Address.parse(
    '0:0000000000000000000000000000000000000000000000000000000000000002'
  ).toString(fmt);
  mockCtx.wallet = {
    address: own,
    mnemonic: [],
    publicKey: Buffer.alloc(32),
    secretKey: Buffer.alloc(64),
  };
  recipientAddress = rec;
});

beforeEach(() => {
  mockCtx.refreshBalance.mockResolvedValue(undefined);
  mockCtx.refreshTransactions.mockResolvedValue(undefined);
  vi.spyOn(tonApi, 'sendTon').mockResolvedValue(undefined);
});

function renderSend() {
  return render(
    <MemoryRouter>
      <SendScreen />
    </MemoryRouter>
  );
}

describe('SendScreen', () => {
  it('показывает ошибку валидации при пустых полях', async () => {
    renderSend();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Продолжить/i }));
    expect(screen.getByText(/Введите адрес получателя/i)).toBeInTheDocument();
  });

  it('показывает ошибку при неверном адресе', async () => {
    renderSend();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/UQ/i), 'not-valid-ton');
    await user.type(screen.getByPlaceholderText('0.00'), '1');
    await user.click(screen.getByRole('button', { name: /Продолжить/i }));
    expect(screen.getByText(/Некорректный адрес/i)).toBeInTheDocument();
  });

  it('переходит к подтверждению и отправляет при моке sendTon', async () => {
    renderSend();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/UQ/i), recipientAddress);
    await user.type(screen.getByPlaceholderText('0.00'), '0.01');
    await user.click(screen.getByRole('button', { name: /Продолжить/i }));

    expect(await screen.findByRole('heading', { name: /Подтверждение/i })).toBeInTheDocument();

    const ack = screen.queryByRole('checkbox');
    if (ack) await user.click(ack);

    await user.click(screen.getByRole('button', { name: /Подтвердить отправку/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Отправлено/i })).toBeInTheDocument();
    });
    expect(tonApi.sendTon).toHaveBeenCalled();
  });
});
