const ZWSP = '\u200B';

/**
 * Вставляет невидимые точки переноса между группами символов, чтобы длинный
 * user-friendly адрес не рвался `break-all` посередине «слова» одним символом на новой строке.
 * Для копирования используйте исходную строку без этого форматирования.
 */
export function addressWithSoftBreaks(address: string, groupLen = 6): string {
  if (address.length <= groupLen) return address;
  const parts: string[] = [];
  for (let i = 0; i < address.length; i += groupLen) {
    parts.push(address.slice(i, i + groupLen));
  }
  return parts.join(ZWSP);
}
