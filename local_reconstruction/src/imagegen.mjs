// Geração de imagem por API compatível com OpenAI (POST {baseUrl}/images/generations). Provedor e chave são do USUÁRIO (nada embutido);
// serve para OpenAI, Azure/OpenRouter-compatíveis, Stable Diffusion WebUI com a API OpenAI ligada, etc. NÃO são os modelos do Pippit (GPT Image 2.5, Seedream…).
export const SIZES = { '1:1': '1024x1024', '9:16': '1024x1792', '16:9': '1792x1024', '3:4': '1024x1365', '4:3': '1365x1024', '21:9': '1792x768' };
export async function generateImage({ baseUrl, model, apiKey = '', prompt, ratio = '9:16', size, fetchImpl = globalThis.fetch, timeoutMs = 180000 }) {
  if (!baseUrl || !model) throw new Error('provedor de imagem não configurado'); if (String(prompt || '').trim().length < 3) throw new Error('prompt vazio');
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/images/generations`, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) }, body: JSON.stringify({ model, prompt: String(prompt).slice(0, 4000), n: 1, size: size || SIZES[ratio] || SIZES['9:16'], response_format: 'b64_json' }) });
    const body = await r.json().catch(() => null); if (!r.ok) throw new Error(`imagem HTTP ${r.status}: ${body?.error?.message || body?.error || 'erro'}`);
    const item = body?.data?.[0]; if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
    if (item?.url) { const g = await fetchImpl(item.url, { signal: ac.signal }); if (!g.ok) throw new Error(`download da imagem HTTP ${g.status}`); return Buffer.from(await g.arrayBuffer()); }
    throw new Error('resposta sem imagem');
  } catch (e) { throw e.name === 'AbortError' ? new Error(`geração de imagem excedeu ${Math.round(timeoutMs / 1000)} s`) : e; } finally { clearTimeout(timer); }
}
