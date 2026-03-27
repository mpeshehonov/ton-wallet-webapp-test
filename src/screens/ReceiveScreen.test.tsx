// @vitest-environment jsdom
import { Address } from '@ton/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { WalletData } from '../services/wallet';
import { addressWithSoftBreaks } from '../utils/formatAddress';
import ReceiveScreen from './ReceiveScreen';

const addr = Address.parse(
  '0:0000000000000000000000000000000000000000000000000000000000000001'
).toString({ bounceable: false, testOnly: true });

const mockWallet: WalletData = {
  address: addr,
  mnemonic: [],
  publicKey: Buffer.alloc(32, 1),
  secretKey: Buffer.alloc(64, 2),
};

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ wallet: mockWallet }),
}));

describe('ReceiveScreen', () => {
  it('показывает адрес (с мягкими переносами), QR и копирование', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText, readText: vi.fn().mockResolvedValue('') },
      configurable: true,
    });
    render(
      <MemoryRouter>
        <ReceiveScreen />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Получить TON/i })).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeTruthy();
    expect(screen.getByTitle(addr)).toBeInTheDocument();
    expect(screen.getByText(addressWithSoftBreaks(addr))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Скопировать адрес/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(addr));
    expect(await screen.findByRole('button', { name: /Скопировано/i })).toBeInTheDocument();
  });
});
