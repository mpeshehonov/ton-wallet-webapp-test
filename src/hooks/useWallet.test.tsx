// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Address } from '@ton/core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toNano, type TonClient } from '@ton/ton';
import type { WalletData } from '../services/wallet';
import {
  createWallet,
  importWallet,
  loadMnemonic,
  loadWalletFromMnemonic,
  saveMnemonic,
} from '../services/wallet';
import {
  injectTonClientForTests,
  resetTonClientToDefault,
} from '../services/tonApi';
import { WalletProvider, useWallet } from './index';

const STORAGE_KEY = 'ton_wallet_mnemonic';

const validMnemonic = JSON.parse(
  readFileSync(join(process.cwd(), 'src/test/fixtures/valid-mnemonic.json'), 'utf8')
) as string[];

const testnetAddr = Address.parse(
  '0:0000000000000000000000000000000000000000000000000000000000000001'
).toString({ bounceable: false, testOnly: true });

function walletPayload(m: string[]): WalletData {
  return {
    mnemonic: m,
    address: testnetAddr,
    publicKey: Buffer.alloc(32, 1),
    secretKey: Buffer.alloc(64, 2),
  };
}

vi.mock('../services/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/wallet')>();
  return {
    ...actual,
    createWallet: vi.fn(async () =>
      walletPayload(Array.from({ length: 24 }, (_, i) => `gen${i}`))
    ),
    loadWalletFromMnemonic: vi.fn(async (m: string[]) => walletPayload(m)),
    importWallet: vi.fn(async (m: string[]) => walletPayload(m)),
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}

afterEach(() => {
  resetTonClientToDefault();
});

describe('useWallet + WalletProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    const mock: Pick<TonClient, 'getBalance' | 'getTransactions'> = {
      getBalance: vi.fn().mockResolvedValue(toNano('42')),
      getTransactions: vi.fn().mockResolvedValue([
        {
          inMessage: null,
          outMessages: { values: () => [] },
          totalFees: { coins: 0n },
          hash: () => Buffer.from('01', 'hex'),
          lt: 1n,
          now: 100,
        },
      ]),
    };
    injectTonClientForTests(mock as unknown as TonClient);
  });

  it('без мнемоники: loading → false, кошелёк null', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.wallet).toBeNull();
    expect(loadMnemonic()).toBeNull();
  });

  it('подхватывает сохранённую мнемонику и подтягивает баланс', async () => {
    saveMnemonic(validMnemonic);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.wallet).not.toBeNull());
    await waitFor(() => expect(result.current.balance).toBe('42'));
    expect(result.current.transactions.length).toBeGreaterThanOrEqual(1);
  });

  it('logout очищает хранилище и сбрасывает состояние', async () => {
    saveMnemonic(validMnemonic);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.wallet).not.toBeNull());
    act(() => {
      result.current.logout();
    });
    expect(result.current.wallet).toBeNull();
    expect(result.current.balance).toBe('0');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('generate не активирует кошелёк; activate сохраняет и открывает', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let words: string[] = [];
    await act(async () => {
      words = await result.current.generate();
    });
    expect(words[0]).toBe('gen0');
    expect(words).toHaveLength(24);
    expect(result.current.wallet).toBeNull();

    await act(async () => {
      await result.current.activate(words);
    });
    expect(result.current.wallet).not.toBeNull();
    expect(loadMnemonic()).toEqual(words);
    await waitFor(() => expect(result.current.balance).toBe('42'));
  });

  it('restore импортирует фразу', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.restore(validMnemonic);
    });
    expect(result.current.wallet?.mnemonic).toEqual(validMnemonic);
  });

  it('refreshBalance обновляет баланс', async () => {
    saveMnemonic(validMnemonic);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.balance).toBe('42'));

    const restorePrev = injectTonClientForTests({
      getBalance: vi.fn().mockResolvedValue(toNano('99')),
      getTransactions: vi.fn().mockResolvedValue([]),
    } as unknown as TonClient);

    await act(async () => {
      await result.current.refreshBalance();
    });
    expect(result.current.balance).toBe('99');
    restorePrev();
  });

  it('generate: ошибка попадает в error', async () => {
    vi.mocked(createWallet).mockRejectedValueOnce(new Error('boom-gen'));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      try {
        await result.current.generate();
      } catch {
        /* ожидаем проброс */
      }
    });
    expect(result.current.error).toBe('boom-gen');
  });

  it('activate: ошибка попадает в error', async () => {
    vi.mocked(loadWalletFromMnemonic).mockRejectedValueOnce(new Error('boom-act'));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      try {
        await result.current.activate(['x']);
      } catch {
        /* ожидаем проброс */
      }
    });
    expect(result.current.error).toBe('boom-act');
  });

  it('restore: ошибка попадает в error', async () => {
    vi.mocked(importWallet).mockRejectedValueOnce(new Error('boom-rest'));
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      try {
        await result.current.restore(validMnemonic);
      } catch {
        /* ожидаем проброс */
      }
    });
    expect(result.current.error).toBe('boom-rest');
  });

  it('refreshBalance: при ошибке сети баланс не меняется, лог в console.error', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveMnemonic(validMnemonic);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.balance).toBe('42'));

    injectTonClientForTests({
      getBalance: vi.fn().mockRejectedValue(new Error('net-down')),
      getTransactions: vi.fn().mockResolvedValue([]),
    } as unknown as TonClient);

    await act(async () => {
      await result.current.refreshBalance();
    });
    expect(result.current.balance).toBe('42');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('refreshTransactions: при ошибке список не затирается некорректно', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveMnemonic(validMnemonic);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.transactions.length).toBeGreaterThan(0));
    const prevLen = result.current.transactions.length;

    injectTonClientForTests({
      getBalance: vi.fn().mockResolvedValue(toNano('42')),
      getTransactions: vi.fn().mockRejectedValue(new Error('tx-fail')),
    } as unknown as TonClient);

    await act(async () => {
      await result.current.refreshTransactions();
    });
    expect(result.current.transactions.length).toBe(prevLen);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
