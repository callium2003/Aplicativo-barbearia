import { test } from 'node:test';
import * as assert from 'node:assert';
import { normalizeCommissionRate } from '../utils/commission';

test('normalizeCommissionRate normalizes and validates commission correctly', () => {
  // Accepted
  assert.strictEqual(normalizeCommissionRate('25'), '25');
  assert.strictEqual(normalizeCommissionRate('25.5'), '25.5');
  assert.strictEqual(normalizeCommissionRate('25.50'), '25.50');
  assert.strictEqual(normalizeCommissionRate('25,50'), '25.50');
  assert.strictEqual(normalizeCommissionRate('25,5'), '25.5');
  assert.strictEqual(normalizeCommissionRate('0'), '0');
  assert.strictEqual(normalizeCommissionRate('100'), '100');
  assert.strictEqual(normalizeCommissionRate('100.00'), '100.00');

  // Rejected
  assert.deepStrictEqual(normalizeCommissionRate(''), { error: 'O campo de comissão não pode estar vazio.' });
  assert.deepStrictEqual(normalizeCommissionRate(' '), { error: 'O campo de comissão não pode estar vazio.' });
  assert.deepStrictEqual(normalizeCommissionRate('-1'), { error: 'Formato inválido. Use apenas números e um separador decimal.' });
  assert.deepStrictEqual(normalizeCommissionRate('12.500'), { error: 'O percentual de comissão deve ter no máximo duas casas decimais.' });
  assert.deepStrictEqual(normalizeCommissionRate('12,500'), { error: 'O percentual de comissão deve ter no máximo duas casas decimais.' });
  assert.deepStrictEqual(normalizeCommissionRate('100.01'), { error: 'O percentual de comissão deve estar entre 0% e 100%.' });
  assert.deepStrictEqual(normalizeCommissionRate('abc'), { error: 'Formato inválido. Use apenas números e um separador decimal.' });
  assert.deepStrictEqual(normalizeCommissionRate('12.5.0'), { error: 'Formato inválido. Use apenas números e um separador decimal.' });
  assert.deepStrictEqual(normalizeCommissionRate('12,5,0'), { error: 'Formato inválido. Use apenas números e um separador decimal.' });
});
