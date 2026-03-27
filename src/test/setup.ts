import '@testing-library/jest-dom/vitest';
import { Buffer } from 'node:buffer';

globalThis.Buffer = Buffer;
(globalThis as unknown as { global: typeof globalThis }).global = globalThis;

if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  const memoryStorage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
  globalThis.localStorage = memoryStorage;
}

if (typeof navigator !== 'undefined') {
  const clip = {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  };
  try {
    Object.defineProperty(navigator, 'clipboard', {
      value: clip,
      configurable: true,
    });
  } catch {
    // уже определён (jsdom)
  }
}
