// NovAI no navegador (servidor falso em 127.0.0.1): o nó de Vídeo do Canvas aceita 202 e o composer de Vídeo
// abre a tarefa com progresso, fila e, no fim, um <video> do MP4 salvo. Nenhuma chamada real e nenhuma chave real.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';

const KEY = 'chave-novai-ui-de-teste';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippet-novai-ui-'));
process.env.PIPPIT_LLM = 'off';
process.env.PIPPIT_LOCAL_DATA = tmp;
process.env.NOVAI_API_KEY = KEY;
process.env.NOVAI_ALLOW_INSECURE_ASSETS = '1'; // servidor falso: http em loopback
process.env.NOVAI_ASSET_HOSTS = '127.0.0.1';
process.env.NOVAI_POLL_MS = '150';
process.env.NOVAI_TIMEOUT_MS = '20000';

if (!skipUnavailableBrowser('novai_video_ui')) {
  const MP4 = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(8), Buffer.from([0x00, 0x00, 0x00, 0x10]), Buffer.from('mdat'), Buffer.alloc(8)]);
  const calls = [];
  const tasks = new Map();
  const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const fake = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const url = new URL(req.url, 'http://127.0.0.1');
      calls.push({ method: req.method, path: url.pathname });
      const root = `http://127.0.0.1:${fake.address().port}`;
      if (url.pathname === '/media/out.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
      if (req.headers.authorization !== `Bearer ${KEY}`) return json(res, 401, { error: { message: 'invalid api key' } });
      if (url.pathname === '/v1/video/generations' && req.method === 'POST') { const id = `ui-task-${tasks.size + 1}`; tasks.set(id, 0); return json(res, 200, { id, status: 'queued' }); }
      const poll = url.pathname.match(/^\/v1\/video\/generations\/([\w-]+)$/);
      if (poll && req.method === 'GET') {
        const n = (tasks.get(poll[1]) || 0) + 1; tasks.set(poll[1], n);
        if (n < 3) return json(res, 200, { id: poll[1], status: n === 1 ? 'QUEUED' : 'PROCESSING' });
        return json(res, 200, { id: poll[1], status: 'SUCCESS', video_url: `${root}/media/out.mp4` });
      }
      return json(res, 404, { error: { message: 'rota falsa' } });
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  process.env.NOVAI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1`;
  const { server } = await import('../app/server.mjs');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
  const until = async (fn, timeout = 20_000, label = 'condição') => { const end = Date.now() + timeout; while (Date.now() < end) { const value = await fn(); if (value) return value; await new Promise((r) => setTimeout(r, 100)); } throw new Error(`timeout aguardando ${label}`); };
  let browser;
  try {
    assert.equal((await api('/api/free-router/preset/stack', {})).status, 200);
    const project = (await api('/api/projects', { type: 'canvas', title: 'UI NovAI vídeo' })).body;
    const node = (await api(`/api/projects/${project.id}/nodes`, { type: 'Vídeo' })).body;

    browser = await launchChromium();
    const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
    const errors = []; page.on('pageerror', (e) => errors.push(String(e)));

    // 1) Nó de Vídeo: 202 + run em fila; o MP4 chega ao nó.
    await page.goto(`${base}/#/project/${project.id}`);
    await page.locator(`.node[data-id="${node.id}"] .lab`).click();
    await page.locator(`.node[data-id="${node.id}"] #gp`).fill('um trem vermelho atravessando uma ponte de madeira');
    await page.locator(`.node[data-id="${node.id}"] #gg`).click();
    const queued = await until(async () => (await api('/api/local-runs', undefined, 'GET')).body.find((r) => r.task === 'video_generation' && r.sourceNodeId === node.id), 15_000, 'run do nó');
    assert.equal(queued.state === 'queued' || queued.state === 'running', true);
    assert.equal(queued.route?.providerId || 'novai', 'novai');
    const finished = await until(async () => { const r = (await api(`/api/local-runs/${queued.id}`, undefined, 'GET')).body; return ['succeeded', 'failed'].includes(r.state) ? r : null; }, 25_000, 'fim do vídeo do nó');
    assert.equal(finished.state, 'succeeded', finished.error || '');
    assert.equal(finished.asset.kind, 'video');
    const fresh = (await api(`/api/projects/${project.id}`, undefined, 'GET')).body;
    assert.ok(fresh.canvas.nodes.find((n) => n.id === node.id).assetId, 'o nó de Vídeo recebe o MP4');
    const assetFile = (await api('/api/assets', undefined, 'GET')).body.find((a) => a.id === finished.asset.id);
    assert.ok(fs.existsSync(path.join(tmp, 'files', assetFile.stored)), 'o MP4 fica em disco');
    assert.ok(calls.filter((c) => c.path.startsWith('/v1/video/generations')).length >= 3, 'enviou e consultou até concluir');

    // 2) Composer em modo Vídeo: abre a tarefa, mostra o progresso e o <video> no fim (sem 501/PENDING).
    await page.goto(`${base}/#/`);
    await page.locator('#modeB').click();
    // Menu do modo: Agente, Vídeo, Imagem, Áudio (o item de Agente também cita "Vídeo" na descrição -> posição exata).
    await page.locator('.menu a').nth(1).click();
    await page.locator('#prompt').fill('uma cidade futurista vista de cima ao anoitecer');
    await page.locator('#freeSend').click();
    await page.waitForSelector('#runProgress', { timeout: 15_000 });
    assert.match(await page.locator('#runProgress').innerText(), /consultando o provedor|fila|%|andamento/i);
    await page.waitForSelector('video#runAsset', { timeout: 25_000 });
    assert.match(await page.locator('#runState').innerText(), /Concluída/);
    assert.equal(await page.locator('#runProgress').count(), 0, 'terminado: a linha de progresso some');
    assert.match(await page.locator('video#runAsset').getAttribute('src'), /^\/files\/.+\.mp4$/);
    assert.deepEqual(errors, [], 'sem erros de página');
    console.log('novai_video_ui: ok (nó de Vídeo aceita 202 e recebe o MP4; composer de Vídeo mostra progresso/fila e abre a tarefa com o vídeo)');
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
    await new Promise((r) => fake.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
} else {
  console.log('novai_video_ui: skip explícito (Chromium indisponível)');
}
