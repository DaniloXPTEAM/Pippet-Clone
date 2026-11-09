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
// Regras observadas de acesso (plano gratuito: 3 usos de foto em avatar; video em avatar exige assinatura)
export function photoAvatarAccess({ plan, usesLeft }) {
  if (plan !== 'free') return { ok: true };
  return usesLeft > 0 ? { ok: true, usesLeft: usesLeft - 1 } : { ok: false, paywall: true };
}
export function videoAvatarAccess({ plan }) {
  return plan === 'free' ? { ok: false, paywall: 'Assine o Starter agora para uso ilimitado de Vídeo em avatar' } : { ok: true, creditsPerUse: 1999 };
}
