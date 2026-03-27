import { describe, expect, it } from 'vitest';
import { addressWithSoftBreaks } from './formatAddress';

describe('addressWithSoftBreaks', () => {
  it('не меняет короткие строки', () => {
    expect(addressWithSoftBreaks('abc')).toBe('abc');
  });

  it('вставляет U+200B между группами', () => {
    const raw = 'ABCDEFGHIJKL';
    const out = addressWithSoftBreaks(raw, 4);
    expect(out).toBe(`ABCD${'\u200B'}EFGH${'\u200B'}IJKL`);
    expect(out.replaceAll('\u200B', '')).toBe(raw);
  });
});
