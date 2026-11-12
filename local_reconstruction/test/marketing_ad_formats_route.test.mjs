// Linha 88 do inventário — Marketing: Expand/Select dos formatos de anúncio.
// O que existe (Expand/Collapse, chip removível tratado como skill) e o que NUNCA foi capturado (descrições reais).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-ad-formats-'));
process.env.PIPPIT_LOCAL_DATA = dataDir; process.env.PIPPIT_LLM = 'off';
const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;

try {
  const res = await fetch(`${base}/api/marketing/ad-formats`); const b = await res.json();
  assert.equal(res.status, 200);
  assert.equal(b.search, 'Search ad format');
  assert.deepEqual(b.categories, ['Trending Ads', 'UGC Ads', 'Product Demos', 'Visual Effects']);
  assert.equal(b.items.length, 8, 'os 8 nomes preservados');
  assert.deepEqual(b.items.map((i) => i.name), ['Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal', 'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop']);
  // Nada é inventado: descrição e categoria por cartão seguem UNOBSERVED.
  assert.ok(b.items.every((i) => i.description === null && i.descriptionState === 'UNOBSERVED'));
  assert.ok(b.items.every((i) => i.category === null && i.categoryState === 'UNOBSERVED'));
  assert.deepEqual(b.counts, { formats: 8, descriptions: 0, categories: 0 });
  // A única frase vista na captura aparece, mas SEM dono.
  assert.equal(b.capturedDescription.text, 'Hook viewers with a surprise product drop.');
  assert.equal(b.capturedDescription.attributedTo, null);
  assert.match(b.capturedDescription.state, /UNOBSERVED/);
  assert.match(b.capturedDescription.note, /não é atribuída/);
  // Comportamento Expand/Select observado.
  assert.deepEqual(b.expand, { buttonLabel: 'Expand', expandedLabel: 'Collapse', showsDescription: true, descriptionSource: 'cartão do serviço' });
  assert.deepEqual(b.select, { createsChip: 'Ad formats：<nome>', closesDialog: true, removableChip: true, treatedAsSkill: true });
  assert.equal(b.externalCalls, 0);
  assert.match(b.note, /UNOBSERVED/);
  assert.ok(!JSON.stringify(b).toLowerCase().includes('apikey'), 'nenhuma credencial na resposta');
  console.log('OK marketing_ad_formats: 8 nomes, Expand/Select observados, descrições e categorias por cartão UNOBSERVED, exemplo capturado sem atribuição');
} finally { await new Promise((r) => app.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); }
