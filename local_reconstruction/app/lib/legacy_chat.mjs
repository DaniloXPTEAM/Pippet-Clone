// Chat legado (#3) SOMENTE LEITURA — leitor do formato conhecido do agent-chat (mensagens com
// id/role/content/timestamp). Nenhuma tela ou conteúdo real do chat legado foi capturado: o leitor
// interpreta o formato e marca UNOBSERVED em tudo que faltar — nunca se inventa conteúdo.
export const LEGACY_FORMAT = Object.freeze({
  name: 'agent-chat',
  version: 'UNOBSERVED (versão do formato não capturada)',
  containers: ['array de mensagens', '{ messages: [...] }', 'JSONL (uma mensagem por linha)'],
  fields: Object.freeze({ id: 'id|string', role: 'role|user|assistant|system|tool', content: 'content|string', timestamp: 'created_at|createdAt|timestamp|ts (ISO ou epoch)' }),
  readOnly: true,
});

const pickTime = (m) => m.created_at ?? m.createdAt ?? m.timestamp ?? m.ts ?? null;
const normTime = (v) => {
  if (v == null) return null;
  if (typeof v === 'number') return new Date(v > 1e12 ? v : v * 1000).toISOString();
  const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// Interpreta UMA mensagem do formato legado. Campos ausentes = UNOBSERVED; nunca inventados.
export function normalizeMessage(m = {}, index = 0) {
  const warnings = [];
  const role = m.role != null ? String(m.role) : null;
  if (!role) warnings.push(`mensagem ${index}: role ausente (UNOBSERVED)`);
  const content = m.content != null ? String(m.content) : (m.text != null ? String(m.text) : null);
  if (content == null) warnings.push(`mensagem ${index}: conteúdo ausente (UNOBSERVED)`);
  const at = normTime(pickTime(m));
  if (at == null) warnings.push(`mensagem ${index}: data ausente/ilegível (UNOBSERVED)`);
  return {
    id: m.id != null ? String(m.id) : `m${index + 1}`,
    role: role || 'UNOBSERVED',
    content: content == null ? 'UNOBSERVED' : content,
    at,
    warnings,
    observed: content == null || !role || at == null ? 'UNOBSERVED (parcial)' : 'formato interpretado (conteúdo não verificado contra o original)',
  };
}

export function parseConversation(raw) {
  if (raw == null || String(raw).trim() === '') return { ok: false, error: 'vazio: cole ou envie o conteúdo do chat legado' };
  let items = null; const warnings = [];
  if (Array.isArray(raw)) items = raw;
  else if (typeof raw === 'object' && Array.isArray(raw.messages)) { items = raw.messages; if (raw.id || raw.title) warnings.push('cabeçalho da conversa presente (campos extras preservados como UNOBSERVED)'); }
  else if (typeof raw === 'string') {
    const text = raw.trim();
    try { const j = JSON.parse(text); return parseConversation(j); } catch {}
    items = text.split('\n').filter((l) => l.trim()).map((l, i) => { try { return JSON.parse(l); } catch { warnings.push(`linha ${i + 1}: não é JSON — UNOBSERVED`); return { content: l }; } });
  }
  if (!Array.isArray(items) || !items.length) return { ok: false, error: 'formato não reconhecido (esperado: array, { messages: [] } ou JSONL)' };
  const messages = items.map((m, i) => normalizeMessage(m, i));
  for (const msg of messages) warnings.push(...(msg.warnings || []));
  return { ok: true, messages, warnings };
}

export const chatSummary = () => ({ ...LEGACY_FORMAT, note: 'Somente leitura: o leitor não altera nada e não há conteúdo real capturado — todo conteúdo é UNOBSERVED até existir uma conversa real.' });
