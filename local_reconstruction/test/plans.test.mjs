import assert from 'node:assert/strict'; import { PLANS } from '../src/plans.mjs';
for (const p of PLANS.filter((x) => x.creditsPerBRL)) assert.ok(Math.abs(p.monthlyCredits / p.priceBRL - p.creditsPerBRL) < 0.2, p.id);
for (const p of PLANS.filter((x) => x.annual)) assert.ok(Math.abs(p.monthlyCredits / (p.annual.priceBRL / 12) - p.annual.creditsPerBRL) < 0.05, 'anual ' + p.id);
console.log('OK plans: creditos/preco batem com "R$1 = N creditos" exibido nos 3 planos pagos');
