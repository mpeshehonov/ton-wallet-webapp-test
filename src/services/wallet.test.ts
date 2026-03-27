import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearMnemonic,
  createWallet,
  getWalletContract,
  importWallet,
  loadMnemonic,
  loadWalletFromMnemonic,
  saveMnemonic,
} from './wallet';

const STORAGE_KEY = 'ton_wallet_mnemonic';

describe('wallet storage', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('saveMnemonic / loadMnemonic — roundtrip', () => {
    const words = Array.from({ length: 24 }, (_, i) => `w${i}`);
    saveMnemonic(words);
    expect(loadMnemonic()).toEqual(words);
  });

  it('loadMnemonic возвращает null при пустом хранилище', () => {
    expect(loadMnemonic()).toBeNull();
  });

  it('loadMnemonic возвращает null при битом JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(loadMnemonic()).toBeNull();
  });

  it('clearMnemonic удаляет ключ', () => {
    saveMnemonic(['a', 'b']);
    clearMnemonic();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('createWallet / importWallet / loadWalletFromMnemonic', () => {
  it('createWallet возвращает 24 слова и валидный адрес', async () => {
    const w = await createWallet();
    expect(w.mnemonic).toHaveLength(24);
    expect(w.address).toMatch(/^0Q/);
    expect(w.publicKey.length).toBeGreaterThan(0);
    expect(w.secretKey.length).toBeGreaterThan(0);
  });

  it('importWallet восстанавливает тот же адрес после createWallet', async () => {
    const created = await createWallet();
    const imported = await importWallet(created.mnemonic);
    expect(imported.address).toBe(created.address);
    expect(imported.publicKey.equals(created.publicKey)).toBe(true);
  });

  it('importWallet бросает на невалидной мнемонике', async () => {
    const bad = Array.from({ length: 24 }, () => 'invalidword');
    await expect(importWallet(bad)).rejects.toThrow(/Некорректн/);
  });

  it('getWalletContract создаёт контракт с тем же адресом', async () => {
    const w = await createWallet();
    const contract = getWalletContract(w.publicKey);
    const addr = contract.address.toString({ testOnly: true, bounceable: false });
    expect(addr).toBe(w.address);
  });
});

describe('loadWalletFromMnemonic', () => {
  it('детерминированно для фиксированной валидной фразы', async () => {
    const w1 = await createWallet();
    const a = await loadWalletFromMnemonic(w1.mnemonic);
    const b = await loadWalletFromMnemonic(w1.mnemonic);
    expect(a.address).toBe(b.address);
  });
});
