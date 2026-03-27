import { mnemonicNew, mnemonicValidate, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

const STORAGE_KEY = 'ton_wallet_mnemonic';

export interface WalletData {
  mnemonic: string[];
  address: string;
  publicKey: Buffer;
  secretKey: Buffer;
}

export async function createWallet(): Promise<WalletData> {
  const mnemonic = await mnemonicNew(24);
  return loadWalletFromMnemonic(mnemonic);
}

export async function importWallet(mnemonic: string[]): Promise<WalletData> {
  const valid = await mnemonicValidate(mnemonic);
  if (!valid) throw new Error('Некорректная мнемоническая фраза');
  return loadWalletFromMnemonic(mnemonic);
}

export async function loadWalletFromMnemonic(mnemonic: string[]): Promise<WalletData> {
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  const address = wallet.address.toString({ testOnly: true, bounceable: false });

  return {
    mnemonic,
    address,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
  };
}

export function saveMnemonic(mnemonic: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mnemonic));
}

export function loadMnemonic(): string[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearMnemonic(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getWalletContract(publicKey: Buffer) {
  return WalletContractV4.create({
    workchain: 0,
    publicKey,
  });
}
