// Compara a reconstrucao com o evento capturado pelo REA (captures/scenario_video-agent_bodies.json).
import fs from 'node:fs'; import assert from 'node:assert/strict';
import { buildPageViewUrl, reportPageView } from '../src/pageview.mjs';
const cap = JSON.parse(fs.readFileSync(new URL('../../captures/scenario_video-agent_bodies.json', import.meta.url), 'utf8')).normalized_result;
const ev = cap.events.items.find((e) => e.kind === 'request' && e.url?.url.includes('event/report'));
const orig = new URL(ev.url.url);
const webId = orig.searchParams.get('web_id');
const mine = new URL(buildPageViewUrl({
  reportHost: 'https://edit-api-sg.capcut.com', webId, isFirstVisitPage: '0', isSessionStartPage: true,
  referrer: orig.searchParams.get('referrer'), userAgent: 'x',
  channel: { session_start_url: 'https://www.pippit.ai/pt-br/tools/video-agent', channel_from: 'ut', channel_level1: 'Direct', channel_level2: 'enter_url', channel_level3: '', channel_level4: '', branch: 'master' },
}));
assert.equal(mine.origin + mine.pathname, orig.origin + orig.pathname);
assert.deepEqual([...mine.searchParams.keys()], [...orig.searchParams.keys()], 'mesma ordem e nomes de parametros');
for (const [k, v] of orig.searchParams) assert.equal(mine.searchParams.get(k), v, k);
const land = new URL(buildPageViewUrl({ reportHost: 'https://h', webId: 'x', userAgent: 'UA', variant: 'landing', channel: {} }));
assert.equal(land.searchParams.get('user_agent'), 'UA');
assert.equal(buildPageViewUrl({ reportHost: '', webId: 'x' }), null);
assert.equal(buildPageViewUrl({ reportHost: 'https://h', webId: '' }), null);
let calls = []; await reportPageView({ reportHost: 'https://h', webId: 'x' }, { fetchImpl: async (...a) => calls.push(a), isSpider: true }); assert.equal(calls.length, 0);
await reportPageView({ reportHost: 'https://h', webId: 'x' }, { fetchImpl: async () => { throw new Error('rede'); } }); // erro engolido
await reportPageView({ reportHost: 'https://h', webId: 'x' }, { fetchImpl: async (...a) => calls.push(a) });
assert.deepEqual(calls[0][1], { referrerPolicy: 'unsafe-url', credentials: 'include' });
console.log('OK: URL, ordem de parametros, regras de nao-envio, transporte e erro engolido batem com a captura/codigo.');
