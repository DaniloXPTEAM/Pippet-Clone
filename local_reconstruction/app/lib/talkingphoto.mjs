// Foto falante com lip-sync por PROVEDOR EXTERNO do usuário: orçamento (quote), validação e consentimento por tarefa.
// Contrato INTERNO do PiperLine (ver LIPSYNC_PROVIDERS.md); não é o protocolo privado do Pippit. Nada aqui faz chamada de rede.
// Regra de ouro: sem consentimento explícito, ligado ao orçamento exato mostrado ao usuário, NADA é enviado ao provedor.
import crypto from 'node:crypto';
import { adapterFor, resolveProviders, isConfigured } from '../../src/providers.mjs';

export const KIND = 'talkingphoto';
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const host = (u) => { try { return new URL(u).host; } catch { return ''; } };
// Hosts exibidos no orçamento: quando o adaptador não usa baseUrl (Space do Hugging Face), mostra o Space.
const providerHost = (cfg) => {
  if (!cfg) return '';
  if (cfg.adapter === 'local-command') return 'execução local (sem rede)';
  const h = host(cfg.baseUrl);
  if (cfg.adapter === 'huggingface-space') return cfg.space ? `${cfg.space}${h ? ` (${h})` : ''}` : h;
  return h;
};
const r2 = (n) => Math.round(n * 100) / 100;

// Entradas da tarefa (persistidas no job): { imageAssetId, audioAssetId, text, voice, gesture, params }
// info = { image:{sha,size,width,height}, audio:{sha,size}, audioSeconds }  (calculado uma vez na criação da tarefa; os bytes são conferidos pelo hash antes do envio)
export function validateInputs(inputs, info, limits) {
  const errs = [];
  if (!(info.image?.size > 0)) errs.push('imagem de entrada ausente'); else if (info.image.width && info.image.height && (info.image.width <= 256 || info.image.height <= 256)) errs.push('a imagem deve ser maior que 256×256');
  if (!(info.audio?.size > 0)) errs.push('áudio de entrada ausente (envie um clipe ou use o roteiro com a voz local)'); else if (!(info.audioSeconds > 0)) errs.push('não foi possível medir a duração do áudio');
  else if (limits?.maxAudioSeconds && info.audioSeconds > limits.maxAudioSeconds) errs.push(`áudio com ${r2(info.audioSeconds)} s excede o limite configurado de ${limits.maxAudioSeconds} s`);
  if (inputs.gesture && String(inputs.gesture).length > 500) errs.push('instrução de gesto acima de 500 caracteres');
  return errs;
}

// Orçamento que o usuário vê ANTES de autorizar. O digest amarra o consentimento a provedor+modelo+duração+custo+entradas exatas.
export function buildQuote(settings, inputs, info) {
  const cfg = resolveProviders(settings)[KIND]; const adapter = cfg ? adapterFor(KIND, cfg.adapter) : null;
  if (!cfg || !adapter || !isConfigured(cfg, KIND)) return { ok: false, reason: 'sem provedor de foto falante configurado (Configurações > Assistente de IA > Provedores)' };
  const limits = adapter.limits?.(cfg) || {}; const seconds = r2(info.audioSeconds || 0);
  const errors = validateInputs(inputs, info, limits); if (errors.length) return { ok: false, reason: errors.join('; '), errors };
  const cost = adapter.estimate?.(cfg, { seconds }) || { known: false, amount: null, currency: null, basis: 'o adaptador não estima custo' };
  const desc = adapter.describe?.(cfg, { image: true, audio: true, text: inputs.text, voice: inputs.voice, gesture: inputs.gesture, params: inputs.params }) || { accepted: [], ignored: [] };
  const max = cfg.maxCostPerTask === '' || cfg.maxCostPerTask == null ? null : Number(cfg.maxCostPerTask);
  const overLimit = cost.known && max !== null && Number.isFinite(max) && cost.amount > max;
  const warnings = [];
  if (!cost.known) warnings.push('Custo DESCONHECIDO: o provedor pode cobrar por esta geração. Só prossiga se aceitar um custo que o PiperLine não consegue estimar.');
  if (adapter?.freeExecution) warnings.push('Execução gratuita: nada é cobrado pelo PiperLine. ' + (adapter.local ? 'O comando roda na sua máquina (o custo é o uso dela).' : 'O Space pode ter fila e limite de uso.'));
  if (desc.ignored.length) warnings.push(`Este provedor/configuração NÃO recebe: ${desc.ignored.join(', ')} (campos sem mapeamento em "inputMap"/"paramMap"); eles não influenciam o resultado.`);
  warnings.push('A sincronização labial depende do modelo do provedor e não é verificada localmente; o resultado pode não ter lip-sync correto.');
  warnings.push('A foto e o áudio serão enviados ao provedor e podem ser retidos conforme os termos dele.');
  const core = { adapter: cfg.adapter, model: cfg.model, host: providerHost(cfg), seconds, cost, accepted: desc.accepted, ignored: desc.ignored, image: info.image.sha, audio: info.audio.sha, text: inputs.text || '', voice: inputs.voice || '', gesture: inputs.gesture || '', params: inputs.params || {} };
  const digest = sha256(Buffer.from(JSON.stringify(core)));
  return { ok: true, digest, provider: { adapter: cfg.adapter, label: adapter.label, model: cfg.model, host: core.host }, seconds, cost, maxCostPerTask: max, overLimit, limits, accepted: desc.accepted, ignored: desc.ignored, warnings, needsConsent: true, needsUnknownCostAck: !cost.known, inputs: { image: core.image, audio: core.audio } };
}

// Por que a tarefa NÃO pode ser enviada agora (ou null). `quote` = orçamento recalculado com a configuração ATUAL.
export function consentProblem(job, quote, cfg) {
  if (!quote?.ok) return `orçamento indisponível: ${quote?.reason || 'entradas inválidas'}`;
  if (quote.overLimit) return `custo estimado ${quote.cost.amount} ${quote.cost.currency} acima do limite por tarefa (${quote.maxCostPerTask} ${quote.cost.currency})`;
  const a = job.authorization; if (!a || a.confirm !== true) return 'aguardando seu consentimento para esta tarefa (revise o orçamento e autorize)';
  if (a.quoteDigest !== quote.digest) return 'o consentimento não vale mais: provedor, modelo, duração, custo ou entradas mudaram desde o orçamento mostrado';
  if (!quote.cost.known && a.acknowledgeUnknownCost !== true) return 'custo desconhecido: exige confirmação explícita de que você aceita uma cobrança que não foi estimada';
  // Adaptadores de execução gratuita (Space do HF, executor local) não cobram: pedir "autorizo chamadas pagas" seria falso.
  // O consentimento POR TAREFA continua obrigatório acima (confirm + digest do orçamento).
  const adapter = cfg?.adapter ? adapterFor(KIND, cfg.adapter) : null;
  if (adapter?.freeExecution !== true && cfg?.allowSpend !== true) return 'aguardando autorização de gasto do provedor ("Autorizo chamadas pagas" nas configurações do provedor)';
  return null;
}
