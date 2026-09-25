(function (root) {
  'use strict';

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const unitInfo = {
    g: { family: 'weight', factor: 1 },
    kg: { family: 'weight', factor: 1000 },
    ml: { family: 'volume', factor: 1 },
    L: { family: 'volume', factor: 1000 },
    unit: { family: 'unit', factor: 1 }
  };

  function parseBrazilianNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const clean = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (!clean) return null;
    let normalized = clean;
    const comma = clean.lastIndexOf(',');
    const dot = clean.lastIndexOf('.');
    if (comma >= 0 && dot >= 0) {
      normalized = comma > dot ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '');
    } else if (comma >= 0) {
      normalized = clean.replace(',', '.');
    }
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function convertQuantity(value, fromUnit, toUnit) {
    const from = unitInfo[fromUnit];
    const to = unitInfo[toUnit];
    if (!from || !to || from.family !== to.family) return null;
    return value * from.factor / to.factor;
  }

  function calculateIngredient(price, purchased, purchaseUnit, used, usedUnit) {
    for (const value of [price, purchased, used]) {
      if (!Number.isFinite(value) || value < 0) return { cost: 0, error: 'Use somente valores válidos e não negativos.' };
    }
    if (purchased === 0) return { cost: 0, error: 'A quantidade comprada deve ser maior que zero.' };
    const usedInPurchaseUnit = convertQuantity(used, usedUnit, purchaseUnit);
    if (usedInPurchaseUnit === null) return { cost: 0, error: 'As unidades são incompatíveis. Use peso com peso, volume com volume ou unidade com unidade.' };
    const cost = price * (usedInPurchaseUnit / purchased);
    if (!Number.isFinite(cost)) return { cost: 0, error: 'Não foi possível calcular este ingrediente.' };
    return { cost, error: '' };
  }

  function calculateSummary(ingredientsCost, packaging, energy, other, recipeYield) {
    const values = [ingredientsCost, packaging, energy, other];
    if (values.some(value => !Number.isFinite(value) || value < 0)) return { total: 0, costPerUnit: 0, error: 'Revise os custos informados.' };
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(recipeYield) || recipeYield <= 0) return { total, costPerUnit: 0, error: 'O rendimento deve ser maior que zero.' };
    return { total, costPerUnit: total / recipeYield, error: '' };
  }

  function calculateSale(salePrice, recipeYield, totalCost) {
    if (![salePrice, recipeYield, totalCost].every(Number.isFinite) || salePrice < 0 || recipeYield <= 0 || totalCost < 0) return null;
    const grossRevenue = salePrice * recipeYield;
    const difference = grossRevenue - totalCost;
    const unitDifference = difference / recipeYield;
    const margin = grossRevenue > 0 ? difference / grossRevenue * 100 : null;
    return { grossRevenue, difference, unitDifference, margin };
  }

  function priceForMargin(costPerUnit, margin) {
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0 || !Number.isFinite(margin) || margin < 0 || margin >= 100) return null;
    return costPerUnit / (1 - margin / 100);
  }

  root.CostCalculator = { parseBrazilianNumber, convertQuantity, calculateIngredient, calculateSummary, calculateSale, priceForMargin };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CostCalculator;
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#cost-calculator');
    if (!form) return;
    const list = document.querySelector('#ingredient-list');
    const template = document.querySelector('#ingredient-template');
    const byId = id => document.getElementById(id);

    function createIngredient(values = {}) {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector('.ingredient-row');
      for (const [field, value] of Object.entries(values)) {
        const input = row.querySelector(`[data-field="${field}"]`);
        if (input) input.value = value;
      }
      row.querySelector('.remove-ingredient').addEventListener('click', () => {
        if (list.children.length > 1) {
          row.remove();
          renumberRows();
          updateAll();
        }
      });
      list.appendChild(fragment);
      renumberRows();
      return list.lastElementChild;
    }

    function renumberRows() {
      const rows = [...list.querySelectorAll('.ingredient-row')];
      rows.forEach((row, index) => {
        row.querySelector('.ingredient-number').textContent = `Ingrediente ${index + 1}`;
        row.querySelector('legend').textContent = `Ingrediente ${index + 1}`;
        const button = row.querySelector('.remove-ingredient');
        button.hidden = rows.length === 1;
        button.setAttribute('aria-label', `Remover ingrediente ${index + 1}`);
      });
    }

    function optionalCost(id) {
      const input = byId(id);
      const parsed = parseBrazilianNumber(input.value);
      const hasValue = input.value.trim() !== '';
      const invalid = hasValue && (parsed === null || parsed < 0);
      input.classList.toggle('input-invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
      return parsed === null || invalid ? 0 : parsed;
    }

    function updateAll() {
      let ingredientsTotal = 0;
      let hasIngredientError = false;
      [...list.querySelectorAll('.ingredient-row')].forEach(row => {
        const get = field => row.querySelector(`[data-field="${field}"]`);
        const price = parseBrazilianNumber(get('price').value);
        const purchased = parseBrazilianNumber(get('purchased').value);
        const used = parseBrazilianNumber(get('used').value);
        const valuesBlank = price === null && purchased === null && used === null && !get('name').value.trim();
        let result = { cost: 0, error: '' };
        if (!valuesBlank) {
          if (price === null || purchased === null || used === null) result = { cost: 0, error: 'Preencha preço, quantidade comprada e quantidade utilizada.' };
          else result = calculateIngredient(price, purchased, get('purchase-unit').value, used, get('used-unit').value);
        }
        row.querySelector('.ingredient-error').textContent = result.error;
        row.querySelector('.ingredient-cost').textContent = currency.format(result.cost);
        ['price', 'purchased', 'used'].forEach(field => {
          get(field).classList.toggle('input-invalid', Boolean(result.error));
          get(field).setAttribute('aria-invalid', String(Boolean(result.error)));
        });
        if (result.error) hasIngredientError = true;
        ingredientsTotal += result.cost;
      });

      const packaging = optionalCost('packaging-cost');
      const energy = optionalCost('energy-cost');
      const other = optionalCost('other-cost');
      const yieldValue = parseBrazilianNumber(byId('recipe-yield').value);
      const summary = calculateSummary(ingredientsTotal, packaging, energy, other, yieldValue ?? 0);
      const yieldHasValue = byId('recipe-yield').value.trim() !== '';
      const yieldError = yieldHasValue && yieldValue === null ? 'Informe um número válido.' : yieldValue !== null && yieldValue <= 0 ? 'O rendimento deve ser maior que zero.' : '';
      byId('yield-error').textContent = yieldError;
      byId('recipe-yield').classList.toggle('input-invalid', Boolean(yieldError));
      byId('recipe-yield').setAttribute('aria-invalid', String(Boolean(yieldError)));
      byId('ingredients-total').textContent = currency.format(ingredientsTotal);
      byId('packaging-total').textContent = currency.format(packaging);
      byId('energy-total').textContent = currency.format(energy);
      byId('other-total').textContent = currency.format(other);
      byId('recipe-total').textContent = currency.format(summary.total);
      byId('yield-total').textContent = yieldValue && yieldValue > 0 ? `${new Intl.NumberFormat('pt-BR').format(yieldValue)} unidades` : '—';
      byId('cost-per-unit').textContent = currency.format(summary.costPerUnit);
      const hasAdditionalError = ['packaging-cost', 'energy-cost', 'other-cost'].some(id => byId(id).classList.contains('input-invalid'));
      byId('calculator-status').textContent = hasIngredientError ? 'Revise os ingredientes destacados.' : hasAdditionalError ? 'Revise os custos adicionais destacados: use números não negativos.' : yieldError ? yieldError : yieldValue && yieldValue > 0 ? 'Resultado atualizado automaticamente.' : 'Informe um rendimento maior que zero para calcular o custo por unidade.';

      const salePrice = parseBrazilianNumber(byId('sale-price').value);
      const saleHasValue = byId('sale-price').value.trim() !== '';
      const saleInvalid = saleHasValue && (salePrice === null || salePrice < 0);
      const validSalePrice = saleHasValue && !saleInvalid;
      byId('sale-price').classList.toggle('input-invalid', saleInvalid);
      byId('sale-price').setAttribute('aria-invalid', String(saleInvalid));
      const sale = validSalePrice && yieldValue > 0 ? calculateSale(salePrice, yieldValue, summary.total) : null;
      byId('gross-revenue').textContent = sale ? currency.format(sale.grossRevenue) : currency.format(0);
      byId('estimated-difference').textContent = sale ? currency.format(sale.difference) : currency.format(0);
      byId('unit-difference').textContent = sale ? currency.format(sale.unitDifference) : currency.format(0);
      byId('estimated-margin').textContent = sale && sale.margin !== null ? `${sale.margin.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—';

      const desiredMargin = parseBrazilianNumber(byId('desired-margin').value);
      const marginHasValue = byId('desired-margin').value.trim() !== '';
      const marginInvalid = marginHasValue && (desiredMargin === null || desiredMargin < 0 || desiredMargin >= 100);
      byId('margin-error').textContent = marginInvalid ? 'Informe uma margem entre 0 e menos de 100%.' : '';
      byId('desired-margin').classList.toggle('input-invalid', marginInvalid);
      byId('desired-margin').setAttribute('aria-invalid', String(marginInvalid));
      const marginPrice = desiredMargin !== null && !marginInvalid && yieldValue > 0 ? priceForMargin(summary.costPerUnit, desiredMargin) : null;
      byId('margin-price').textContent = marginPrice === null ? '—' : currency.format(marginPrice);
    }

    function clearCalculator() {
      list.replaceChildren();
      createIngredient();
      ['packaging-cost', 'energy-cost', 'other-cost', 'recipe-yield', 'sale-price', 'desired-margin'].forEach(id => { byId(id).value = ''; });
      updateAll();
      list.querySelector('input').focus();
    }

    byId('add-ingredient').addEventListener('click', () => {
      const row = createIngredient();
      row.querySelector('input').focus();
      updateAll();
    });
    byId('load-example').addEventListener('click', () => {
      list.replaceChildren();
      createIngredient({ name: 'Leite condensado — exemplo hipotético', price: '7,00', purchased: '395', 'purchase-unit': 'g', used: '395', 'used-unit': 'g' });
      createIngredient({ name: 'Chocolate — exemplo hipotético', price: '20,00', purchased: '1000', 'purchase-unit': 'g', used: '200', 'used-unit': 'g' });
      byId('packaging-cost').value = '5,00';
      byId('energy-cost').value = '2,00';
      byId('other-cost').value = '';
      byId('recipe-yield').value = '20';
      byId('sale-price').value = '';
      byId('desired-margin').value = '';
      updateAll();
      byId('calculator-status').textContent = 'Exemplo hipotético carregado. Substitua pelos seus valores reais.';
    });
    byId('clear-calculator').addEventListener('click', clearCalculator);
    form.addEventListener('input', updateAll);
    form.addEventListener('change', updateAll);
    createIngredient();
    updateAll();
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
