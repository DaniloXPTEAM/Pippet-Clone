// v2: screenshots de página inteira para páginas que rolam dentro de contêineres internos (desktop). Só navegação pública.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334, ROOT = 'C:\\w\\PiperLine', PROF = 'C:\\tools\\rea-chrome-shot3', BASE = 'https://www.pippit.ai/pt-br';
const pages = [
  ['01_landing', ''], ['04_tools_video-agent', '/tools/video-agent'], ['05_tools_ai-image-generator', '/tools/ai-image-generator'],
  ['06_tools_ai-design-generator', '/tools/ai-design-generator'], ['07_tools_ai-avatar-generator', '/tools/ai-avatar-generator'],
  ['08_tools_ai-talking-photo', '/tools/ai-talking-photo'], ['09_models_ai-models', '/models/ai-models'],
  ['10_models_seedance-2-5', '/models/seedance/2-5'], ['11_create_short-dramas', '/create/short-dramas'],
  ['12_tools_story-studio', '/tools/story-studio'], ['13_resource_help-center', '/resource/help-center'],
  ['14_partners_affiliate', '/partners/Affliate-marketing-program'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROF}`, '--lang=pt-BR', 'about:blank'], { stdio: 'ignore' });
async function waitPort() { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {} await sleep(500); } throw new Error('CDP'); }
class Cdp { constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.p.has(d.id)) { this.p.get(d.id)(d); this.p.delete(d.id); } }; }
  send(method, params = {}) { const id = ++this.id; return new Promise((res) => { this.p.set(id, res); this.ws.send(JSON.stringify({ id, method, params })); }); } }

const unlock = `(() => {
  const els = [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowY === 'overlay') && e.scrollHeight > e.clientHeight + 80; });
  els.forEach((e) => { e.style.overflow = 'visible'; e.style.height = 'auto'; e.style.maxHeight = 'none'; });
  for (const el of [document.documentElement, document.body]) { el.style.height = 'auto'; el.style.overflow = 'visible'; el.style.maxHeight = 'none'; }
  return els.length;
})()`;
const scrollAll = `(async()=>{const h=()=>document.documentElement.scrollHeight;for(let y=0;y<Math.min(h(),20000);y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,200))}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,1200));return h()})()`;

async function shot(name, url) {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  const c = new Cdp(ws);
  try {
    await c.send('Page.enable');
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await c.send('Page.navigate', { url }); await sleep(9000);
    const u = await c.send('Runtime.evaluate', { expression: unlock, returnByValue: true });
    await sleep(800);
    const ev = await c.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: scrollAll });
    const H = Math.min(Number(ev.result?.result?.value) || 900, 16000);
    const img = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: H, scale: 1 } });
    if (img.result?.data) fs.writeFileSync(`${ROOT}\\screenshots\\${name}_desktop.png`, Buffer.from(img.result.data, 'base64'));
    return { name, H, contêineres_destravados: u.result?.result?.value, ok: !!img.result?.data };
  } finally { try { await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`); } catch {} try { ws.close(); } catch {} }
}
try {
  await waitPort();
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const TMO = Number(process.env.TMO) || 70000;
  for (const [name, p] of pages) {
    if (only.length && !only.some((o) => name.startsWith(o))) continue;
    try { console.log(JSON.stringify(await withTimeout(shot(name, BASE + p), TMO, name))); }
    catch (e) { console.log(JSON.stringify({ name, erro: String(e.message).slice(0, 60) })); }
  }
} finally { chrome.kill(); }
