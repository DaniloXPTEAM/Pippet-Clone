// Voz padrão da instalação: a voz sintética LOCAL do Windows (SAPI).
// O provedor de voz do usuário (nuvem/local configurado) é uma OPÇÃO explícita: só entra quando pedido,
// ou quando não existe SAPI nesta máquina — nunca por cima de uma voz local disponível.
// Nada aqui chama rede nem processo: é a regra pura, testável em qualquer sistema operacional.
export const VOICE_ENGINES = Object.freeze(['sapi', 'cloud']);
export const VOICE_PENDING = Object.freeze({
  sapi: 'voz local do Windows (SAPI, não-IA) — padrão',
  cloud: 'provedor de voz do usuário — opção',
  none: 'nenhuma voz disponível: sem SAPI nesta máquina e sem provedor de voz configurado',
});
// `requested`: 'auto' (padrão), 'sapi' ou 'cloud'.
// Devolve 'sapi' | 'cloud' | null.
export function resolveVoiceEngine({ requested = 'auto', sapiAvailable = false, cloudConfigured = false } = {}) {
  const ask = String(requested || 'auto').trim().toLowerCase();
  if (ask === 'cloud') return cloudConfigured ? 'cloud' : null;
  if (ask === 'sapi') return sapiAvailable ? 'sapi' : null;
  if (sapiAvailable) return 'sapi';
  if (cloudConfigured) return 'cloud';
  return null;
}
// Estado exposto à UI/servidor: qual voz vale por padrão e quais são opção.
export function voiceStatus({ sapiAvailable = false, cloudConfigured = false, cloudLabel = null } = {}) {
  const defaultEngine = resolveVoiceEngine({ sapiAvailable, cloudConfigured });
  return {
    sapiAvailable: !!sapiAvailable,
    defaultEngine,
    engines: [
      { id: 'sapi', label: VOICE_PENDING.sapi, available: !!sapiAvailable, default: defaultEngine === 'sapi' },
      { id: 'cloud', label: cloudLabel ? `${VOICE_PENDING.cloud} (${cloudLabel})` : VOICE_PENDING.cloud, available: !!cloudConfigured, default: defaultEngine === 'cloud' },
    ],
    reason: defaultEngine ? `${defaultEngine === 'sapi' ? 'SAPI' : 'provedor do usuário'} é o padrão desta instalação.` : VOICE_PENDING.none,
  };
}
