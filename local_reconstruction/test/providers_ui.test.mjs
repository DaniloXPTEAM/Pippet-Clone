// UI de provedores de mídia (Configurações > Assistente de IA) e de tarefas de geração (Tarefas): configurar sem autorização -> tarefas bloqueadas com o motivo,
// cancelar / tentar de novo, autorizar gasto -> tarefa passa a "Gerando" (provedor de mentira local, nunca um serviço real). Navegador real (Playwright).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('providers_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-pui-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp; process.env.PIPPIT_JOB_POLL_MS = '0'; process.env.PIPPIT_JOB_TICK_MS = '500';
const { server } = await import('../app/server.mjs');
const seen = []; const mock = http.createServer((req, res) => { const ch = []; req.on('data', (d) => ch.push(d)); req.on('end', () => { seen.push(`${req.method} ${req.url}`); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(req.method === 'POST' ? { id: 'video_x' + seen.length, status: 'queued' } : { status: 'in_progress', progress: 30 })); }); });
await new Promise((r) => mock.listen(5243, '127.0.0.1', r)); const PORT = 5197; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
// tarefas vindas do agente (sem provedor): pedido -> tema -> confirmação
const proj = await post('/api/projects', { type: 'canvas' }); const chat = await post(`/api/projects/${proj.id}/chats`); const M = `/api/projects/${proj.id}/chats/${chat.id}/messages`;
let m = await post(M, { text: 'Crie um vídeo de 20 segundos sobre uma maçã vermelha' }); m = await post(M, { answer: m.chat.messages.at(-1).form.options[0] }); m = await post(M, { confirmation: { mode: 'sequencial', creditOk: true } });
const browser = await launchChromium(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
// 1) Tarefas: duas tarefas bloqueadas com o motivo exato
await page.goto(base + '/#/tasks'); await page.waitForSelector('.job-task'); assert.equal(await page.locator('.job-task').count(), 2);
assert.match(await page.locator('.job-task').first().innerText(), /Bloqueada.*sem provedor de video configurado/s); await shot('60_tarefas_bloqueadas');
// 2) cancelar uma tarefa e tentar de novo
const first = page.locator('.job-task').first(); await first.locator('[data-jc]').click(); await page.waitForFunction(() => /Cancelada/.test(document.querySelector('.job-task')?.textContent || '')); await page.locator('.job-task').first().locator('[data-jr]').click();
await page.waitForFunction(() => /Bloqueada/.test(document.querySelector('.job-task')?.textContent || '')); assert.equal(seen.length, 0, 'nenhuma chamada ao provedor antes da autorização');
// 3) configurar o provedor na aba de Configurações (sem marcar autorização): continua bloqueado, motivo muda
await page.goto(base + '/#/settings/llm'); await page.waitForSelector('.prov[data-k="video"]'); const card = page.locator('.prov[data-k="video"]');
assert.match(await card.innerText(), /não configurado/); await card.locator('[data-f=adapter]').selectOption('openai-videos'); await card.locator('[data-f=baseUrl]').fill('http://127.0.0.1:5243/v1'); await card.locator('[data-f=model]').fill('sora-teste'); await card.locator('[data-f=apiKey]').fill('SEGREDO-UI');
await card.locator('[data-psave=video]').click(); await page.waitForSelector('.prov[data-k="video"]:has-text("configurado"):not(:has-text("não configurado"))', { timeout: 8000 });
assert.ok(!(await page.content()).includes('SEGREDO-UI'), 'a chave não volta para a página'); assert.match(await page.locator('.prov[data-k="video"] [data-f=apiKey]').getAttribute('placeholder'), /salva/); assert.equal(seen.length, 0, 'sem autorização, nada é enviado');
await page.goto(base + '/#/tasks'); await page.waitForSelector('.job-task'); assert.match(await page.locator('.job-task').first().innerText(), /autorização de gasto/); await shot('61_tarefas_aguardando_autorizacao');
// 4) autorizar gasto (provedor de mentira local) -> a primeira tarefa é enviada e passa a Gerando; a segunda espera a primeira
await page.goto(base + '/#/settings/llm'); await page.waitForSelector('.prov[data-k="video"]'); await page.locator('.prov[data-k="video"] [data-f=allowSpend]').check(); await page.locator('[data-psave=video]').click(); await page.waitForTimeout(1500);
await page.goto(base + '/#/tasks'); await page.waitForSelector('.job-task:has-text("Gerando")', { timeout: 15000 }); assert.match(await page.locator('.job-task:has-text("Na fila")').innerText(), /Na fila/, 'a 2ª tarefa espera a 1ª'); assert.ok(seen.some((x) => x.startsWith('POST /v1/videos')), 'o provedor local recebeu a submissão'); await shot('62_tarefas_gerando');
// 5) remover o provedor volta ao estado "não configurado"
await page.goto(base + '/#/settings/llm'); await page.waitForSelector('.prov[data-k="video"]'); await page.locator('[data-pdel=video]').click(); await page.waitForSelector('.prov[data-k="video"]:has-text("não configurado")');
assert.deepEqual(errors, [], 'sem erros de página');
console.log('OK providers_ui: tarefas bloqueadas com motivo, cancelar/tentar de novo, configurar provedor sem autorização (nada enviado), autorizar -> Gerando, remover — provedor local de mentira'); await browser.close(); mock.closeAllConnections?.(); mock.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
