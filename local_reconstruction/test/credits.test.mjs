// Reproduz sequencias observadas no historico de creditos da conta (valores copiados de captures/auth/credit_details_accessibility.txt).
import assert from 'node:assert/strict'; import { CreditLedger } from '../src/credits.mjs';
// 2026-10-07: +80 as 12:27:08, "Video de marketing" -36 as 12:32:20, "Expired 23:59:59 -44"
let l = new CreditLedger();
l.grant('Creditos gratuitos', 80, '2026-10-07T12:27:08', '2026-10-07T23:59:59');
assert.equal(l.debit('Video de marketing', 36, '2026-10-07T12:32:20').ok, true);
assert.equal(l.balance('2026-10-08T00:00:00'), 0);
assert.deepEqual(l.entries.map((e) => [e.label, e.delta]), [['Creditos gratuitos', 80], ['Video de marketing', -36], ['Expired', -44]]);
// 2026-03-09: +120 as 11:38:58, "Video de marketing" -120 as 19:50:56 -> sem linha Expired
l = new CreditLedger(); l.grant('Creditos gratuitos', 120, '2026-03-09T11:38:58', '2026-03-09T23:59:59');
assert.equal(l.debit('Video de marketing', 120, '2026-03-09T19:50:56').ok, true); l.balance('2026-03-10T01:00:00');
assert.deepEqual(l.entries.map((e) => e.label), ['Creditos gratuitos', 'Video de marketing']);
// lote diario sem uso expira inteiro; debito sem saldo e recusado
l = new CreditLedger(); l.grant('Creditos gratuitos', 80, '2026-10-16T08:13:35', '2026-10-16T23:59:59'); l.balance('2026-10-17T00:00:00');
assert.deepEqual(l.entries.at(-1), { at: new Date('2026-10-16T23:59:59'), label: 'Expired', delta: -80, pouch: 'gift' });
assert.deepEqual(l.debit('x', 1, '2026-10-17T01:00:00'), { ok: false, reason: 'insufficient_credits' });
console.log('OK credits: 3 sequencias observadas reproduzidas');
