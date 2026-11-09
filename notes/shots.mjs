// Screenshots de página inteira + estrutura de UI de páginas PÚBLICAS (navegação normal, sem login).
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const ROOT = 'C:\\w\\PiperLine';
const PROF = 'C:\\tools\\rea-chrome-shot2';
const BASE = 'https://www.pippit.ai/pt-br';
const pages = [
  ['01_landing', ''], ['02_pricing', '/pricing'], ['03_template-studio', '/template-studio'],
  ['04_tools_video-agent', '/tools/video-agent'], ['05_tools_ai-image-generator', '/tools/ai-image-generator'],
  ['06_tools_ai-design-generator', '/tools/ai-design-generator'], ['07_tools_ai-avatar-generator', '/tools/ai-avatar-generator'],
  ['08_tools_ai-talking-photo', '/tools/ai-talking-photo'], ['09_models_ai-models', '/models/ai-models'],
  ['10_models_seedance-2-5', '/models/seedance/2-5'], ['11_create_short-dramas', '/create/short-dramas'],
  ['12_tools_story-studio', '/tools/story-studio'], ['13_resource_help-center', '/resource/help-center'],
  ['14_partners_affiliate', '/partners/Affliate-marketing-program'], ['15_meet-pippit', '/meet-pippit'],
  ['16_tools_ai-video-generator', '/tools/ai-video-generator'],
];
const mobilePages = new Set(['01_landing', '02_pricing', '03_template-studio', '04_tools_video-agent']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROF}`, '--lang=pt-BR', 'about:blank'], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {} await sleep(500); }
  throw new Error('CDP não abriu');
}

class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.p.has(d.id)) { this.p.get(d.id)(d); this.p.delete(d.id); } }; }
  send(method, params = {}) { const id = ++this.id; return new Promise((res) => { this.p.set(id, res); this.ws.send(JSON.stringify({ id, method, params })); }); }
}

const structFn = `(() => {
  const t = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 90);
  const uniq = (a) => [...new Set(a)];
  return JSON.stringify({
    url: location.href, title: document.title, lang: document.documentElement.lang,
    nav: uniq([...document.querySelectorAll('header a, nav a')].map((a) => t(a.innerText) + ' -> ' + (a.getAttribute('href') || ''))).slice(0, 40),
    headings: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ': ' + t(h.innerText)).slice(0, 50),
    buttons: uniq([...document.querySelectorAll('button,[role=button]')].map((b) => t(b.innerText || b.getAttribute('aria-label')))).filter(Boolean).slice(0, 50),
    inputs: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].map((i) => ({ tag: i.tagName, type: i.type || '', ph: t(i.placeholder || i.getAttribute('aria-label') || '') })).slice(0, 20),
    counts: { links: document.querySelectorAll('a[href]').length, images: document.images.length, videos: document.querySelectorAll('video').length, sections: document.querySelectorAll('section').length, forms: document.forms.length },
    footerLinks: uniq([...document.querySelectorAll('footer a')].map((a) => t(a.innerText))).filter(Boolean).slice(0, 40),
  });
})()`;

async function shot(name, url, mobile) {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const c = new Cdp(ws);
  const W = mobile ? 390 : 1440;
  await c.send('Page.enable');
  if (mobile) await c.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36' });
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
  await c.send('Page.navigate', { url });
  await sleep(9000);
  const ev = await c.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression:
    `(async()=>{const h=()=>document.documentElement.scrollHeight;for(let y=0;y<Math.min(h(),16000);y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,220))}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,1200));return h()})()` });
  const H = Math.min(Number(ev.result?.result?.value) || 2000, 14000);
  if (!mobile) {
    const st = await c.send('Runtime.evaluate', { expression: structFn, returnByValue: true });
    fs.mkdirSync(`${ROOT}\\notes\\pages`, { recursive: true });
    fs.writeFileSync(`${ROOT}\\notes\\pages\\${name}.json`, st.result?.result?.value || '{}', 'utf8');
  }
  const img = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  if (img.result?.data) fs.writeFileSync(`${ROOT}\\screenshots\\${name}_${mobile ? 'mobile' : 'desktop'}.png`, Buffer.from(img.result.data, 'base64'));
  await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`);
  ws.close();
  return { name, mobile, H, ok: !!img.result?.data };
}

try {
  await waitPort();
  const out = [];
  for (const [name, path] of pages) {
    const url = BASE + path;
    try { out.push(await shot(name, url, false)); } catch (e) { out.push({ name, err: String(e).slice(0, 80) }); }
    if (mobilePages.has(name)) { try { out.push(await shot(name, url, true)); } catch (e) { out.push({ name, mobile: true, err: String(e).slice(0, 80) }); } }
    console.log(JSON.stringify(out[out.length - 1]));
  }
} finally { chrome.kill(); }
