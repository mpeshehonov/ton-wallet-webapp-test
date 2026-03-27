// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WelcomeScreen from './WelcomeScreen';

const mockGenerate = vi.fn();
const mockActivate = vi.fn();
const mockRestore = vi.fn();

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({
    generate: mockGenerate,
    activate: mockActivate,
    restore: mockRestore,
    wallet: null,
    balance: '0',
    transactions: [],
    loading: false,
    error: null,
    logout: vi.fn(),
    refreshBalance: vi.fn(),
    refreshTransactions: vi.fn(),
  }),
}));

const sampleMnemonic = Array.from({ length: 24 }, (_, i) => `word${i}`);

describe('WelcomeScreen', () => {
  it('показывает выбор создания или импорта', () => {
    render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /TON Wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Создать кошелёк/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Импортировать/i })).toBeInTheDocument();
  });

  it('после создания показывает мнемонику и требует подтверждения', async () => {
    mockGenerate.mockResolvedValueOnce(sampleMnemonic);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Создать кошелёк/i }));
    expect(await screen.findByRole('heading', { name: /Сохраните мнемоническую фразу/i })).toBeInTheDocument();
    expect(screen.getByText('word0')).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: /Продолжить/i });
    expect(continueBtn).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(continueBtn).not.toBeDisabled();
  });

  it('переходит к форме импорта', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <WelcomeScreen />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Импортировать/i }));
    expect(screen.getByRole('heading', { name: /Импорт кошелька/i })).toBeInTheDocument();
  });
});
