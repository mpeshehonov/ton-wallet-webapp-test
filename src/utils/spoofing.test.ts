import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkAddressSpoofing,
  checkClipboardMismatch,
  clearClipboardTracking,
  getKnownAddresses,
  saveKnownAddress,
  setLastCopiedAddress,
  truncateAddress,
} from './spoofing';

const KNOWN_KEY = 'ton_wallet_known_addresses';

describe('truncateAddress', () => {
  it('возвращает короткие строки как есть', () => {
    expect(truncateAddress('short')).toBe('short');
    expect(truncateAddress('0123456789abcdef')).toBe('0123456789abcdef');
  });

  it('сокращает длинные адреса', () => {
    const long = '0QABCDEFGH1234567890abcdefghijklmnop';
    expect(truncateAddress(long)).toBe('0QABCDEF...ijklmnop');
  });
});

describe('saveKnownAddress / getKnownAddresses', () => {
  beforeEach(() => {
    localStorage.removeItem(KNOWN_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(KNOWN_KEY);
  });

  it('сохраняет и возвращает адрес', () => {
    saveKnownAddress('addr1', 'label');
    const list = getKnownAddresses();
    expect(list).toHaveLength(1);
    expect(list[0].address).toBe('addr1');
    expect(list[0].label).toBe('label');
  });

  it('обновляет lastUsed при повторном сохранении', () => {
    vi.useFakeTimers();
    saveKnownAddress('same');
    const t1 = getKnownAddresses()[0].lastUsed;
    vi.advanceTimersByTime(5000);
    saveKnownAddress('same');
    const t2 = getKnownAddresses()[0].lastUsed;
    expect(t2).toBeGreaterThan(t1);
    vi.useRealTimers();
  });
});

describe('checkAddressSpoofing', () => {
  const own = '0QOWNADDR00000000000000000000000000000000000000';

  beforeEach(() => {
    localStorage.removeItem(KNOWN_KEY);
    clearClipboardTracking();
  });

  afterEach(() => {
    localStorage.removeItem(KNOWN_KEY);
  });

  it('блокирует отправку на свой адрес', () => {
    const w = checkAddressSpoofing(own, own);
    expect(w).toHaveLength(1);
    expect(w[0].severity).toBe('high');
    expect(w[0].type).toBe('similar_address');
  });

  it('предупреждает о новом адресе', () => {
    const w = checkAddressSpoofing('0QNEWADDR00000000000000000000000000000000000000', own);
    expect(w.some((x) => x.type === 'new_address')).toBe(true);
  });

  it('не помечает как новый уже известный адрес', () => {
    const addr = '0QKNOWN000000000000000000000000000000000000000';
    saveKnownAddress(addr);
    const w = checkAddressSpoofing(addr, own);
    expect(w.some((x) => x.type === 'new_address')).toBe(false);
  });

  it('детектирует адрес, похожий на известный (совпадают префикс и суффикс)', () => {
    const prefix = '0Qabcd';
    const suffix = 'xyz123';
    const known = `${prefix}${'m'.repeat(40)}${suffix}`;
    const target = `${prefix}${'n'}${'m'.repeat(39)}${suffix}`;
    saveKnownAddress(known);
    const w = checkAddressSpoofing(target, own);
    const similar = w.filter((x) => x.type === 'similar_address' && x.similarTo === known);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].severity).toBe('high');
  });
});

describe('clipboard mismatch', () => {
  beforeEach(() => {
    clearClipboardTracking();
  });

  it('null если не было копирования', () => {
    expect(checkClipboardMismatch('anything')).toBeNull();
  });

  it('null если адрес совпадает с последним скопированным', () => {
    setLastCopiedAddress('same');
    expect(checkClipboardMismatch('same')).toBeNull();
  });

  it('предупреждение при расхождении с последним скопированным', () => {
    setLastCopiedAddress('addrA');
    const w = checkClipboardMismatch('addrB');
    expect(w).not.toBeNull();
    expect(w!.type).toBe('clipboard_mismatch');
    expect(w!.severity).toBe('high');
  });
});
