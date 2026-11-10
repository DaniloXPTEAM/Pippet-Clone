// UI das integrações de IA com um LLM de mentira: aba de configuração (status/teste), Criar skill com IA, Refinar prompt, Criação Inteligente (ideias → Home) e o chat do agente com temas do LLM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('llm_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-lui-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs');
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-chat' }] })); }
    const user = JSON.parse(b).messages.at(-1).content; let out = 'pronto';
    if (/Proponha 3 temas/.test(user)) out = { temas: ['Tema do LLM 1', 'Tema do LLM 2', 'Tema do LLM 3'] };
    else if (/Crie uma skill/.test(user)) out = { nome: 'Skill do LLM', descricao: 'feita por IA', instrucoes: 'Passo 1\nPasso 2' };
    else if (/prompt refinado/.test(user)) out = { prompt: 'Uma maçã vermelha girando sobre uma mesa branca, câmera lenta.' };
    else if (/ideias novas/.test(user)) out = { ideias: [{ titulo: 'Ideia A', prompt: 'Um gato dormindo ao sol numa janela de manhã' }] };
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: typeof out === 'string' ? out : JSON.stringify(out) } }] }));
  });
});
await new Promise((r) => mock.listen(5216, '127.0.0.1', r));
const PORT = 5217; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
await page.goto(base + '/#/settings/llm'); await page.waitForSelector('#llurl'); await page.waitForSelector('#llwh');
assert.match(await page.locator('#llwh').getAttribute('placeholder'), /baixe você mesmo; nada é baixado automaticamente/);
const whisperStatus = await page.locator('#llwh').locator('xpath=..').innerText(); assert.match(whisperStatus, /filtro whisper do ffmpeg disponível|este ffmpeg não tem o filtro whisper/);
assert.match(await page.locator('#llmst').innerText(), /Indisponível/);
await page.fill('#llurl', 'http://127.0.0.1:5216/v1'); await page.fill('#llmod', 'mock-chat'); await page.click('#llsave'); await page.waitForSelector('#llmst:has-text("Ativo")'); assert.match(await page.locator('#llmst').innerText(), /mock-chat/);
await page.click('#lltest'); await page.waitForFunction(() => /OK em/.test(document.querySelector('#llres')?.textContent || '')); await shot('40_llm_settings');
// skills com IA
await page.goto(base + '/#/skills'); await page.waitForSelector('#mk'); await page.click('#mk'); await page.getByText('Criar com IA', { exact: true }).click(); await page.fill('#skb', 'skill para anúncios de frutas em planos fechados'); await page.click('#skgo');
await page.waitForSelector('.skill-card:has-text("Skill do LLM")'); assert.equal(await page.locator('button[data-top="Minhas skills"].on').count(), 1);
// refinar prompt no Gerador
await page.goto(base + '/#/gen'); await page.waitForSelector('#grf'); await page.fill('#gp', 'maçã girando'); await page.click('#grf'); await page.waitForFunction(() => /maçã vermelha girando/.test(document.querySelector('#gp').value)); await shot('41_refine');
// Criação Inteligente
await post('/api/smart-creation', { authorize: true }); await page.goto(base + '/#/smart'); await page.waitForSelector('#sgo'); await page.click('#sgo'); await page.waitForSelector('.idea:has-text("Ideia A")'); await page.click('[data-idea]'); await page.waitForSelector('#prompt');
assert.equal(await page.inputValue('#prompt'), 'Um gato dormindo ao sol numa janela de manhã'); await shot('42_smart_idea');
// agente: temas do LLM no chat
await page.fill('#prompt', 'Crie um vídeo de 20 segundos sobre um gato'); await page.dispatchEvent('#prompt', 'input'); await page.click('#send'); await page.waitForSelector('text=Tema do LLM 1', { timeout: 30000 }); assert.match(await page.locator('body').innerText(), /LLM mock-chat/); await shot('43_agent_llm_themes');
assert.deepEqual(errors, []); await browser.close(); mock.close(); server.close(); console.log('OK llm_ui: configuração do LLM, skill com IA, refinar prompt, Criação Inteligente, agente com temas do LLM'); process.exit(0);
