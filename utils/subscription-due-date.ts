/** Calendar-only calculation; provider compatibility must be validated separately. */
export function monthlyDueDate(originalDate: string, monthOffset: number): string {
  const match = typeof originalDate === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(originalDate);
  if (!match || !Number.isInteger(monthOffset) || monthOffset < 0 || monthOffset > 12000) throw new RangeError('Data de vencimento inválida');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new RangeError('Data de vencimento inválida');
  const targetMonth = (year * 12) + month - 1 + monthOffset;
  const targetYear = Math.floor(targetMonth / 12);
  const targetMonthNumber = (targetMonth % 12) + 1;
  if (targetYear > 9999) throw new RangeError('Data de vencimento inválida');
  const targetDay = Math.min(day, new Date(Date.UTC(targetYear, targetMonthNumber, 0)).getUTCDate());
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonthNumber).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}
