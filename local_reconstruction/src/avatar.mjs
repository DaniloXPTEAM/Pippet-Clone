// Assistente de criacao de avatar de foto observado (3 etapas) e regras de plano. Etapas 2-3 nao foram vistas por completo.
export const PHOTO_STEPS = ['Carregar', 'Verificar', 'Enviar'];
export const PHOTO_RULES = { formats: ['image/jpeg', 'image/png'], minSidePx: 256, consentRequired: true,
  rejectedExamples: ['perfil', 'óculos escuros', 'mais de uma pessoa'] };
export function validatePhoto({ mime, width, height }) {
  const errors = [];
  if (!PHOTO_RULES.formats.includes(mime)) errors.push('formato: JPG/PNG');
  if (!(width > PHOTO_RULES.minSidePx && height > PHOTO_RULES.minSidePx)) errors.push('tamanho: >256*256');
  return { ok: errors.length === 0, errors };
}
// "Avançar" so habilita com foto valida e consentimento marcado
export const canAdvance = ({ photo, consent }) => !!photo && validatePhoto(photo).ok && consent === true;
// r20 (decisão do usuário — produto gratuito e sem bloqueio): limites por plano/uso NÃO bloqueiam nem
// debitam. As regras observadas (3 usos de foto no plano free; vídeo de avatar exigindo assinatura no
// original) ficam como informação em AVATAR_RULES; as funções mantêm o formato do contrato sem negar acesso.
export function photoAvatarAccess({ plan, usesLeft }) {
  return { ok: true, usesLeft }; // sem consumo: nada é debitado nem bloqueado
}
export function videoAvatarAccess({ plan }) {
  return { ok: true, creditsPerUse: 1999 }; // custo observado = informação; nunca bloqueia por plano
}
