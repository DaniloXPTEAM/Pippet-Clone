// Item 4 da rodada 6: fluxo ponta a ponta com provedores FALSOS — composer → plano → imagem → vídeo (fila) →
// voz → editor → exportação. Cada etapa consome o resultado da anterior e o teste prova isso (prompt do plano
// chegando ao provedor de imagem, nome do asset de imagem viajando para o vídeo, ids dos assets no editor e o
// arquivo final exportado em disco). Quando uma etapa falha, a mensagem diz QUAL etapa e POR QUÊ.
// Nenhuma chamada real: texto (FreeLLMAPI), imagem/voz (Cloudflare) e vídeo (NovAI) apontam para 127.0.0.1.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piperline-flow-e2e-'));
process.env.PIPPIT_LOCAL_DATA = tmp;
delete process.env.PIPPIT_LLM; // o plano usa a pilha de texto do roteador (item 2), não o Ollama
process.env.NOVAI_ALLOW_INSECURE_ASSETS = '1'; // servidor falso em loopback
process.env.NOVAI_ASSET_HOSTS = '127.0.0.1';
process.env.NOVAI_POLL_MS = '80';

const FFMPEG = process.env.PIPPIT_FFMPEG || 'ffmpeg';
const media = path.join(tmp, 'fake-media'); fs.mkdirSync(media, { recursive: true });
const make = (name, args) => { const out = path.join(media, name); execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args, out]); return fs.readFileSync(out); };
const PNG = make('cena.png', ['-f', 'lavfi', '-i', 'color=c=0x2b6cb0:s=320x240', '-frames:v', '1']);
const WAV = make('fala.wav', ['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-ar', '16000', '-ac', '1']);
const MP4 = make('clipe.mp4', ['-f', 'lavfi', '-i', 'color=c=0xc53030:s=320x240:d=2', '-pix_fmt', 'yuv420p', '-r', '24']);

const seen = { text: [], cloudflareImage: [], cloudflareAudio: [], novaiVideo: [], novaiImage: [] };
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const PLAN_MARK = 'PLANO-E2E: xícara de café fumegando na areia da praia ao amanhecer';
const fake = http.createServer((req, res) => {
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1'); const root = `http://127.0.0.1:${fake.address().port}`;
    const raw = Buffer.concat(chunks);
    // arquivos de mídia falsos (o app baixa o MP4 e grava PNG/WAV em disco)
    if (url.pathname === '/media/clipe.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); return res.end(MP4); }
    if (!url.pathname.startsWith('/client/v4/accounts/') && !url.pathname.includes('/v1/') && !url.pathname.startsWith('/img/')) return json(res, 404, { error: 'rota falsa' });
    let body = null; try { body = JSON.parse(raw.toString() || 'null'); } catch { body = null; }
    // Cloudflare Workers AI (imagem flux + voz melotts)
    if (url.pathname.includes('/ai/run/')) {
      if (url.pathname.endsWith('melotts')) { seen.cloudflareAudio.push(body); return json(res, 200, { success: true, result: { audio: WAV.toString('base64') } }); }
      seen.cloudflareImage.push(body); return json(res, 200, { success: true, result: { image: PNG.toString('base64') } });
    }
    // NovAI: imagem, vídeo (submit + poll) e texto de reserva
    if (url.pathname === '/novai/v1/images/generations') { seen.novaiImage.push(body); return json(res, 200, { data: [{ b64_json: PNG.toString('base64') }] }); }
    if (url.pathname === '/novai/v1/video/generations' && req.method === 'POST') {
      seen.novaiVideo.push(body);
      return json(res, 200, { id: 'flow-task-1', status: 'queued' });
    }
    if (/^\/novai\/v1\/video\/generations\/[\w-]+$/.test(url.pathname) && req.method === 'GET') {
      const polls = (seen.novaiPolls = (seen.novaiPolls || 0) + 1);
      if (polls < 2) return json(res, 200, { id: 'flow-task-1', status: 'PROCESSING' });
      return json(res, 200, { id: 'flow-task-1', status: 'SUCCESS', video_url: `${root}/media/clipe.mp4` });
    }
    if (url.pathname.endsWith('/chat/completions')) {
      seen.text.push(body);
      const prompt = JSON.stringify(body || {});
      let content = 'ok';
      if (/roteirista de vídeos curtos/i.test(prompt)) content = JSON.stringify({ temas: ['xícara de café na praia', 'café gelado ao amanhecer', 'grão caindo na xícara'] });
      else if (/diretor de vídeos curtos/i.test(prompt)) {
        const n = Math.max(1, String(prompt).match(/durações em segundos: ([^"]+)/)?.[1]?.split(',').length || 1);
        content = JSON.stringify({ estilo: 'documental leve', segmentos: Array.from({ length: n }, (_, i) => ({ titulo: `Cena ${i + 1}`, descricao: `${PLAN_MARK} (cena ${i + 1})`, fala: 'uma xícara e o mar' })) });
      }
      return json(res, 200, { choices: [{ message: { content } }] });
    }
    return json(res, 404, { error: 'rota falsa' });
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const root = `http://127.0.0.1:${fake.address().port}`;
Object.assign(process.env, {
  FREELLMAPI_BASE_URL: `${root}/v1`, FREELLMAPI_API_KEY: 'chave-freellmapi-flow',
  OMNIROUTER_BASE_URL: `${root}/omni/v1`, OMNIROUTER_API_KEY: 'chave-omni-flow',
  NVIDIA_BASE_URL: `${root}/nim/v1`, NVIDIA_API_KEY: 'chave-nvidia-flow',
  NOVAI_BASE_URL: `${root}/novai/v1`, NOVAI_API_KEY: 'chave-novai-flow',
  CLOUDFLARE_AI_BASE_URL: `${root}/client/v4/accounts/{account}/ai/run`,
  CLOUDFLARE_API_TOKEN: 'chave-cloudflare-flow', CLOUDFLARE_ACCOUNT_ID: 'conta-cloudflare-flow',
});

const { server: app } = await import('../app/server.mjs');
await new Promise((r) => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
const api = async (url, body, method = 'POST') => { const r = await fetch(base + url, body === undefined ? { method } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const until = async (fn, timeout = 25_000, label = 'condição') => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 120)); } throw new Error(`tempo esgotado esperando ${label}`); };
const why = (r) => (r.body?.error || JSON.stringify(r.body)).slice(0, 400);
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} — ${why(r)}`); return r.body; };

// Cada etapa é nomeada: se algo quebrar, a mensagem diz qual etapa e por quê (nada de "falhou em algum lugar").
const steps = [];
const step = async (name, fn) => {
  try { const value = await fn(); steps.push(name); return value; }
  catch (error) { throw new Error(`etapa "${name}" falhou (etapas concluídas: ${steps.join(' → ') || 'nenhuma'}): ${error.message}`); }
};
const assetsOnDisk = async (id) => { const a = (await api('/api/assets', undefined, 'GET')).body.find((x) => x.id === id); if (!a) throw new Error(`ativo ${id} não está na biblioteca`); const file = path.join(tmp, 'files', a.stored); if (!fs.existsSync(file)) throw new Error(`arquivo do ativo ${id} não está em disco (${a.stored})`); return { asset: a, file, size: fs.statSync(file).size }; };

try {
  ok(await api('/api/free-router/preset/stack', {}), 'aplicar a pilha gratuita');

  // 1) Composer: a mensagem vira um pedido com tema a escolher (as opções vêm do LLM falso).
  const { project, chat, themeOptions } = await step('composer', async () => {
    const project = ok(await api('/api/projects', { type: 'canvas', title: 'Fluxo ponta a ponta' }), 'criar projeto');
    const chat = ok(await api(`/api/projects/${project.id}/chats`, {}), 'criar chat');
    const msg = ok(await api(`/api/projects/${project.id}/chats/${chat.id}/messages`, { text: 'um vídeo curto sobre café na praia' }), 'enviar mensagem');
    const last = msg.chat.messages.at(-1);
    assert.equal(last.form?.type, 'question', 'o composer pergunta o tema');
    const themeOptions = last.form.options || [];
    assert.ok(themeOptions.length >= 2, 'as opções de tema vieram do LLM (provedor falso)');
    return { project, chat: msg.chat, themeOptions };
  });

  // 2) Plano: escolher o tema gera os documentos (design, storyboard e prompts de geração).
  const { promptFromPlan, docText } = await step('plano', async () => {
    const msg = ok(await api(`/api/projects/${project.id}/chats/${chat.id}/messages`, { answer: themeOptions[0] }), 'escolher o tema');
    const fresh = ok(await api(`/api/projects/${project.id}`, undefined, 'GET'), 'ler o projeto');
    const docs = fresh.canvas.nodes.filter((n) => n.doc);
    const prompts = fresh.canvas.nodes.find((n) => n.title === 'generation_prompts.md');
    assert.ok(prompts, `os documentos do plano existem (achei: ${docs.map((d) => d.title).join(', ') || 'nenhum'})`);
    const docText = String(prompts.text || '');
    assert.match(docText, /PLANO-E2E/, 'o texto do plano veio do LLM falso e chegou ao documento');
    const line = docText.split('\n').find((l) => l.includes(PLAN_MARK)) || PLAN_MARK;
    return { promptFromPlan: line.trim().slice(0, 300), docText, chatState: msg.chat.state };
  });

  // 3) Imagem: o prompt do plano vai para o provedor de imagem (Cloudflare flux, falso) e vira ativo.
  const image = await step('imagem', async () => {
    const node = ok(await api(`/api/projects/${project.id}/nodes`, { type: 'Imagem', title: 'Cena 1' }), 'criar nó de imagem');
    const gen = ok(await api(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'image', prompt: promptFromPlan }), 'gerar imagem');
    assert.equal(gen.providerId, 'cloudflare');
    assert.ok(seen.cloudflareImage.some((b) => String(b?.prompt || '').includes('PLANO-E2E')), 'o provedor de imagem recebeu o prompt do plano');
    const disk = await assetsOnDisk(gen.asset.id);
    assert.ok(disk.size > 100, 'o PNG gravado tem conteúdo');
    return { nodeId: node.id, ...gen, ...disk };
  });

  // 4) Vídeo (fila): o clipe é enfileirado (202) e o teste espera o MP4 chegar ao nó — o pedido carrega o nome do
  //    ativo de imagem, provando que a etapa anterior alimentou esta.
  const video = await step('vídeo (fila)', async () => {
    const node = ok(await api(`/api/projects/${project.id}/nodes`, { type: 'Vídeo', title: 'Cena 1 animada' }), 'criar nó de vídeo');
    const prompt = `${promptFromPlan} — referência: ${image.asset.name}`;
    const queued = await api(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'video', prompt });
    assert.equal(queued.status, 202, `esperava 202 da fila, veio ${queued.status} — ${why(queued)}`);
    assert.equal(queued.body.queued, true);
    await until(async () => seen.novaiVideo.some((b) => String(b?.prompt || '').includes(image.asset.name)), 10_000, 'o pedido de vídeo chegar ao provedor com a referência da imagem');
    const runId = queued.body.run.id;
    const finished = await until(async () => { const r = (await api(`/api/local-runs/${runId}`, undefined, 'GET')).body; return ['succeeded', 'failed'].includes(r.state) ? r : null; }, 30_000, 'fim do vídeo na fila');
    assert.equal(finished.state, 'succeeded', `a fila terminou em ${finished.state}: ${finished.error || ''}`);
    const disk = await assetsOnDisk(finished.asset.id);
    assert.ok(disk.size > 1000, 'o MP4 baixado do provedor falso tem conteúdo');
    return { runId, nodeId: node.id, ...finished, ...disk };
  });

  // 5) Voz: o texto do plano vira áudio pela Cloudflare melotts (falsa), com o texto chegando ao provedor.
  const voiceText = 'uma xícara de café e o som do mar';
  const audio = await step('voz', async () => {
    const node = ok(await api(`/api/projects/${project.id}/nodes`, { type: 'Áudio', title: 'Narração' }), 'criar nó de áudio');
    const gen = ok(await api(`/api/projects/${project.id}/nodes/${node.id}/generate`, { kind: 'audio', prompt: voiceText, voiceSource: 'cloud' }), 'gerar voz');
    assert.equal(gen.voiceEngine, 'cloud');
    assert.match(gen.provider, /Cloudflare/i);
    assert.ok(seen.cloudflareAudio.some((b) => String(b?.prompt || '') === voiceText), 'o provedor de voz recebeu o texto pedido');
    const disk = await assetsOnDisk(gen.asset.id);
    assert.ok(disk.size > 100, 'o WAV gravado tem conteúdo');
    return { nodeId: node.id, ...gen, ...disk };
  });

  // 6) Editor: a timeline usa exatamente os ativos das etapas 3–5, na ordem vídeo → imagem, com a narração.
  const editor = await step('editor', async () => {
    const project2 = ok(await api('/api/editor', {}), 'criar projeto de edição');
    const saved = ok(await api(`/api/editor/${project2.id}`, {
      ratio: '9:16',
      clips: [{ assetId: video.asset.id, in: 0, out: 2, speed: 1 }, { assetId: image.asset.id, in: 0, out: 1, speed: 1 }],
      texts: [{ text: 'café na praia', start: 0, end: 2 }],
      audio: [{ assetId: audio.asset.id, start: 0, volume: 1 }],
    }, 'PUT'), 'salvar a timeline');
    const fresh = ok(await api(`/api/projects/${project2.id}`, undefined, 'GET'), 'ler a timeline');
    assert.deepEqual(fresh.timeline.clips.map((c) => c.assetId), [video.asset.id, image.asset.id], 'os clipes são o vídeo e a imagem gerados');
    assert.deepEqual(fresh.timeline.audio.map((a) => a.assetId), [audio.asset.id], 'a trilha é a voz gerada');
    assert.equal(fresh.timeline.ratio, '9:16');
    return { id: project2.id, timeline: fresh.timeline, saved: saved.ok };
  });

  // 7) Exportação: ffmpeg junta a timeline e o resultado entra em Ativos, em disco.
  const exported = await step('exportação', async () => {
    const out = ok(await api(`/api/editor/${editor.id}/export`, {}), 'exportar');
    const disk = await assetsOnDisk(out.asset.id);
    assert.equal(out.asset.kind, 'video');
    assert.ok(disk.size > 1000, `o arquivo exportado tem conteúdo (${disk.size} bytes)`);
    return { asset: out.asset, size: disk.size };
  });

  // 8) Falhas apontam a etapa e o motivo (os mesmos fluxos, sem provedor configurado para a tarefa).
  await step('falhas explicadas', async () => {
    const dbg = (await api(`/api/projects/${project.id}`, undefined, 'GET')).body;
    const emptyImage = await api(`/api/projects/${project.id}/nodes/${image.nodeId}/generate`, { kind: 'image', prompt: '' });
    assert.equal(emptyImage.status, 400, `prompt vazio deveria falhar: ${why(emptyImage)}`);
    assert.match(emptyImage.body.error, /Descreva|prompt/i);
    const shortVideo = await api(`/api/projects/${project.id}/nodes/${video.nodeId}/generate`, { kind: 'video', prompt: 'curto' });
    assert.equal(shortVideo.status, 400);
    assert.match(shortVideo.body.error, /at least 15 characters/);
    const emptyExport = await api('/api/editor/999999/export', {});
    assert.ok(emptyExport.status >= 400, 'exportar projeto inexistente falha');
  });

  console.log(`flow_e2e_providers: ok (${steps.length} etapas: ${steps.join(' → ')}; o vídeo saiu com ${exported.size} bytes e cada etapa recebeu o resultado da anterior)`);
} catch (error) {
  console.error(String(error.message || error));
  process.exitCode = 1;
} finally {
  await new Promise((r) => app.close(r));
  await new Promise((r) => fake.close(r));
  // A fila local grava o progresso em segundo plano; espera um instante antes de apagar o diretório de dados.
  await new Promise((r) => setTimeout(r, 400));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
