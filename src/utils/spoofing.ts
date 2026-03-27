const KNOWN_ADDRESSES_KEY = 'ton_wallet_known_addresses';

export interface KnownAddress {
  address: string;
  label?: string;
  lastUsed: number;
}

export function getKnownAddresses(): KnownAddress[] {
  try {
    const raw = localStorage.getItem(KNOWN_ADDRESSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveKnownAddress(address: string, label?: string): void {
  const addresses = getKnownAddresses();
  const existing = addresses.find((a) => a.address === address);
  if (existing) {
    existing.lastUsed = Date.now();
    if (label) existing.label = label;
  } else {
    addresses.push({ address, label, lastUsed: Date.now() });
  }
  localStorage.setItem(KNOWN_ADDRESSES_KEY, JSON.stringify(addresses));
}

export interface SpoofingWarning {
  type: 'new_address' | 'similar_address' | 'clipboard_mismatch';
  severity: 'medium' | 'high';
  message: string;
  similarTo?: string;
  differences?: Array<{ position: number; expected: string; actual: string }>;
}

export function checkAddressSpoofing(
  targetAddress: string,
  ownAddress: string
): SpoofingWarning[] {
  const warnings: SpoofingWarning[] = [];

  if (targetAddress === ownAddress) {
    warnings.push({
      type: 'similar_address',
      severity: 'high',
      message: 'Вы пытаетесь отправить средства на свой собственный адрес.',
    });
    return warnings;
  }

  const known = getKnownAddresses();
  const isKnown = known.some((a) => a.address === targetAddress);

  if (!isKnown) {
    warnings.push({
      type: 'new_address',
      severity: 'medium',
      message:
        'Этот адрес не найден в вашей истории. Убедитесь, что адрес верный.',
    });
  }

  const similarAddresses = findSimilarAddresses(targetAddress, known, ownAddress);
  for (const similar of similarAddresses) {
    warnings.push({
      type: 'similar_address',
      severity: 'high',
      message: `Адрес подозрительно похож на известный: ${truncateAddress(similar.address)}. Возможна подмена адреса!`,
      similarTo: similar.address,
      differences: similar.differences,
    });
  }

  return warnings;
}

function findSimilarAddresses(
  target: string,
  known: KnownAddress[],
  ownAddress: string
): Array<{ address: string; differences: SpoofingWarning['differences'] }> {
  const results: Array<{
    address: string;
    differences: SpoofingWarning['differences'];
  }> = [];

  const allAddresses = [...known.map((k) => k.address), ownAddress];

  for (const addr of allAddresses) {
    if (addr === target) continue;

    const prefixLen = 6;
    const suffixLen = 6;
    const targetPrefix = target.slice(0, prefixLen);
    const targetSuffix = target.slice(-suffixLen);
    const addrPrefix = addr.slice(0, prefixLen);
    const addrSuffix = addr.slice(-suffixLen);

    const prefixMatch = targetPrefix === addrPrefix;
    const suffixMatch = targetSuffix === addrSuffix;

    if ((prefixMatch || suffixMatch) && target !== addr) {
      const differences: SpoofingWarning['differences'] = [];
      const minLen = Math.min(target.length, addr.length);
      for (let i = 0; i < minLen; i++) {
        if (target[i] !== addr[i]) {
          differences.push({
            position: i,
            expected: addr[i],
            actual: target[i],
          });
        }
      }

      if (differences.length > 0 && differences.length < target.length * 0.3) {
        results.push({ address: addr, differences });
      }
    }
  }

  return results;
}

export function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

let lastCopiedAddress: string | null = null;

/** Сбрасывает «последний скопированный адрес» (например при выходе из кошелька). */
export function clearClipboardTracking(): void {
  lastCopiedAddress = null;
}

export function setLastCopiedAddress(address: string): void {
  lastCopiedAddress = address;
}

export function checkClipboardMismatch(pastedAddress: string): SpoofingWarning | null {
  if (lastCopiedAddress && pastedAddress !== lastCopiedAddress) {
    return {
      type: 'clipboard_mismatch',
      severity: 'high',
      message:
        'Вставленный адрес отличается от ранее скопированного. Возможно, вредоносное ПО подменило содержимое буфера обмена.',
    };
  }
  return null;
}
