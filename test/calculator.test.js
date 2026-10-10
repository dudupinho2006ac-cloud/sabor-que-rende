import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/calculadora.js';

const calculator = globalThis.CostCalculator;

test('calculadora preserva proporção e conversão de unidades', () => {
  assert.deepEqual(calculator.calculateIngredient(20, 1, 'kg', 200, 'g'), { cost: 4, error: '' });
  assert.deepEqual(calculator.calculateIngredient(8, 1, 'L', 250, 'ml'), { cost: 2, error: '' });
});

test('calculadora preserva custo unitário e margem', () => {
  assert.deepEqual(calculator.calculateSummary(20, 5, 3, 2, 10), { total: 30, costPerUnit: 3, error: '' });
  assert.equal(calculator.priceForMargin(10, 20), 12.5);
  assert.equal(calculator.calculateSale(15, 20, 200).difference, 100);
});

test('calculadora rejeita unidades incompatíveis e rendimento zero', () => {
  assert.ok(calculator.calculateIngredient(10, 1, 'kg', 1, 'L').error);
  assert.ok(calculator.calculateSummary(10, 0, 0, 0, 0).error);
});
