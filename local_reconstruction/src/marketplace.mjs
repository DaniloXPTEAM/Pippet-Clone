// Marketplace/loja (#14) — adaptador plugável de integração: conexão, importação de produto e envio de vídeo.
// Regras: credencial SÓ por variável de ambiente (MARKETPLACE_API_KEY; nomes no .env.example); a API nunca
// devolve a chave; contrato de endpoints documentado e testado contra servidor falso (não verificado contra
// loja real nesta rodada — marcado UNOBSERVED onde o conteúdo real falta).
// Contrato do adaptador `generic-rest` (o usuário pluga a base da loja em MARKETPLACE_BASE_URL):
//   GET  {base}/shop/verify              Authorization: Bearer <key>   → { ok, shop:{id,name} }
//   GET  {base}/shop/products           Authorization: Bearer <key>   → { products:[{id,title,price}] }
//   GET  {base}/shop/products/:id       Authorization: Bearer <key>   → { id,title,price,description,image }
//   POST {base}/shop/products/:id/video Authorization: Bearer <key>   multipart (caption + video) → { ok, remoteId }
export const MARKETPLACE_ENV = Object.freeze({ base: 'MARKETPLACE_BASE_URL', key: 'MARKETPLACE_API_KEY' });

export const ADAPTERS = Object.freeze({
  'generic-rest': Object.freeze({
    id: 'generic-rest', label: 'Loja REST genérica (contrato documentado)', freeExecution: true,
    paths: Object.freeze({ verify: '/shop/verify', products: '/shop/products', product: '/shop/products/{id}', video: '/shop/products/{id}/video' }),
  }),
});
export const adapterFor = (id) => ADAPTERS[id] || ADAPTERS['generic-rest'];

export function config(env = process.env) {
  const baseUrl = (env[MARKETPLACE_ENV.base] || '').replace(/\/+$/, '');
  const apiKey = env[MARKETPLACE_ENV.key] || '';
  return { baseUrl, apiKey, configured: !!(baseUrl && apiKey), problem: !baseUrl ? `defina ${MARKETPLACE_ENV.base} no ambiente` : !apiKey ? `defina ${MARKETPLACE_ENV.key} no ambiente` : null };
}

async function call(cfg, method, pathname, { body, headers = {}, fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(cfg.baseUrl + pathname, { method, headers: { authorization: `Bearer ${cfg.apiKey}`, accept: 'application/json', ...headers }, body, signal: ac.signal });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : (data?.error || `a loja recusou (HTTP ${res.status})`) };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: `falha de rede com a loja: ${String(e.message || e).slice(0, 160)}` };
  } finally { clearTimeout(t); }
}

export async function connect({ env = process.env, fetchImpl = fetch } = {}) {
  const cfg = config(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `credencial ausente: ${cfg.problem}` };
  const r = await call(cfg, 'GET', adapterFor().paths.verify, { fetchImpl });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, shop: { id: r.data?.shop?.id || null, name: r.data?.shop?.name || null } };
}

export async function listProducts({ env = process.env, fetchImpl = fetch } = {}) {
  const cfg = config(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `credencial ausente: ${cfg.problem}` };
  const r = await call(cfg, 'GET', adapterFor().paths.products, { fetchImpl });
  if (!r.ok) return { ok: false, error: r.error };
  const products = (Array.isArray(r.data?.products) ? r.data.products : []).map((p) => normalizeProduct(p));
  return { ok: true, products };
}

// Campos que a loja não devolve ficam UNOBSERVED — nunca inventados.
export function normalizeProduct(p = {}) {
  return {
    id: p.id != null ? String(p.id) : null,
    title: p.title != null ? String(p.title) : 'UNOBSERVED',
    price: p.price != null ? p.price : 'UNOBSERVED',
    description: p.description != null ? String(p.description) : 'UNOBSERVED',
    image: p.image != null ? String(p.image) : 'UNOBSERVED',
  };
}

export async function importProduct({ productId, env = process.env, fetchImpl = fetch } = {}) {
  const cfg = config(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `credencial ausente: ${cfg.problem}` };
  const id = encodeURIComponent(String(productId || ''));
  if (!id) return { ok: false, error: 'productId ausente' };
  const r = await call(cfg, 'GET', adapterFor().paths.product.replace('{id}', id), { fetchImpl });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, product: normalizeProduct(r.data) };
}

export async function sendVideo({ productId, caption = '', videoBytes, videoUrl, env = process.env, fetchImpl = fetch, timeoutMs = 60_000 } = {}) {
  const cfg = config(env);
  if (!cfg.configured) return { ok: false, blocked: true, error: `credencial ausente: ${cfg.problem}` };
  const id = encodeURIComponent(String(productId || ''));
  if (!id) return { ok: false, error: 'productId ausente' };
  if (!videoBytes?.length && !videoUrl) return { ok: false, error: 'envie o vídeo (bytes) ou a URL do vídeo' };
  const fd = new FormData();
  fd.append('caption', String(caption || ''));
  if (videoBytes?.length) fd.append('video', new Blob([videoBytes], { type: 'video/mp4' }), 'video.mp4');
  if (videoUrl) fd.append('video_url', String(videoUrl));
  const r = await call(cfg, 'POST', adapterFor().paths.video.replace('{id}', id), { body: fd, fetchImpl, timeoutMs });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, remoteId: r.data?.remoteId || null };
}

export const contractSummary = () => ({
  adapter: adapterFor().id, label: adapterFor().label, paths: { ...adapterFor().paths }, env: { ...MARKETPLACE_ENV },
  note: 'Contrato documentado e testado contra servidor falso; não verificado contra loja real nesta rodada (UNOBSERVED).',
});
