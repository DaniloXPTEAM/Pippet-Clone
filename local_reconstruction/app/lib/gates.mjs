// Portas de idade, aviso US, instalador PWA e painel dev (#27) — TUDO ativado por configuração (ambiente).
//   PIPIT_AGE_GATE=on     → porta de idade (18+) na entrada
//   PIPIT_US_NOTICE=on    → aviso de disponibilidade nos EUA (texto real UNOBSERVED)
//   PIPIT_PWA=on          → instalador (manifest + service worker + botão instalar)
//   PIPIT_DEV_PANEL=on    → painel de desenvolvedor (/api/dev-panel)
// Desligado por padrão: nada muda na interface sem configuração. Textos das telas originais = UNOBSERVED.
const on = (v) => String(v || '').toLowerCase() === 'on' || String(v || '') === '1' || String(v || '').toLowerCase() === 'true';

export function gates(env = process.env) {
  return {
    ageGate: { enabled: on(env.PIPIT_AGE_GATE), minAge: 18, title: 'Confirme sua idade', label: 'Data de nascimento', text: 'UNOBSERVED (texto da tela real não capturado)' },
    usNotice: { enabled: on(env.PIPIT_US_NOTICE), text: 'UNOBSERVED (aviso real não capturado)', where: 'topo da interface' },
    pwa: { enabled: on(env.PIPIT_PWA), manifest: '/manifest.webmanifest', sw: '/sw.js', installLabel: 'Instalar app' },
    devPanel: { enabled: on(env.PIPIT_DEV_PANEL), route: '/api/dev-panel' },
  };
}

// Idade a partir da data de nascimento (AAAA-MM-DD). Porta: só passa com >= minAge.
export function verifyAge(birthDate, { minAge = 18, now = new Date() } = {}) {
  const m = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { allowed: false, reason: 'data de nascimento inválida (use AAAA-MM-DD)' };
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!(d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]))) return { allowed: false, reason: 'data de nascimento inválida' };
  let age = now.getFullYear() - d.getFullYear();
  const before = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (before) age -= 1;
  if (age < 0 || age > 130) return { allowed: false, reason: 'data de nascimento fora do intervalo aceito' };
  return age >= minAge ? { allowed: true, age } : { allowed: false, age, reason: `entrada restrita a maiores de ${minAge} anos` };
}

// Manifest PWA (identidade local; nome/ícones do app real UNOBSERVED).
export const MANIFEST = Object.freeze({
  name: 'Pippit (reconstrução local)',
  short_name: 'Pippit',
  description: 'Reconstrução local — instala como aplicativo',
  start_url: '/#/home',
  scope: '/',
  display: 'standalone',
  background_color: '#eeeeee',
  theme_color: '#7c4dff',
  lang: 'pt-BR',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
});

// Service worker: casca estática em cache (cache-first) com atualização em segundo plano.
export const SERVICE_WORKER = `// Service worker local (PWA) — gerado por app/lib/gates.mjs
const CACHE = 'piperline-shell-v1';
const SHELL = ['/', '/index.html', '/app.js', '/style.css'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => caches.match('/index.html'))));
});
`;
