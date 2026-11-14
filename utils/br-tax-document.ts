export function isValidBrTaxDocument(value: string): boolean {
  const doc = value.replace(/\D/g, "");
  if (!doc) return true;
  if (/^(\d)\1+$/.test(doc)) return false;

  const calculate = (base: string, weights: number[]) =>
    weights.reduce((sum, weight, index) => sum + Number(base[index]) * weight, 0) % 11;

  if (doc.length === 11) {
    const first = calculate(doc.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(doc.slice(0, 9) + firstDigit, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return doc.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }

  if (doc.length === 14) {
    const first = calculate(doc.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const firstDigit = first < 2 ? 0 : 11 - first;
    const second = calculate(doc.slice(0, 12) + firstDigit, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return doc.endsWith(`${firstDigit}${second < 2 ? 0 : 11 - second}`);
  }

  return false;
}
