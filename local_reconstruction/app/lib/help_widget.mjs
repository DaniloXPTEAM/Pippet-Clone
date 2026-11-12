// Widget de ajuda local (#19) — substitui o widget de terceiros observado (kefu-im-i18n.byteintl.com)
// SEM copiar token/segredo de terceiro: tudo roda local. MESMA interface genérica: botão flutuante,
// painel e conversa. Respostas LOCAIS (base própria abaixo); o que não estiver na base responde
// honestamente como UNOBSERVED — nunca se inventa resposta de suporte.
export const WIDGET = Object.freeze({
  buttonLabel: 'Ajuda',
  buttonAria: 'Ajuda',
  panelTitle: 'Como podemos ajudar?',
  inputPlaceholder: 'Escreva sua dúvida…',
  sendLabel: 'Enviar',
  source: 'local',
  thirdParty: null,
  note: 'Widget real é de terceiros (kefu-im-i18n.byteintl.com, observado sem token) — este é 100% local; textos do widget real UNOBSERVED.',
});

// Base local: só fatos já verificados/observados no projeto (fontes entre parênteses).
export const KB = Object.freeze([
  { id: 'creditos-bonus', match: /b(ô|o)nus|cr(é|e)ditos? (de )?(cria(ç|c)(ã|a)o|cadastro)/i, answer: 'Ao criar a conta você recebe 200 créditos de bônus com validade de 2 anos (bônus observado no Pippit).', source: 'observado (FEATURE_INVENTORY)' },
  { id: 'creditos-diarios', match: /cr(é|e)ditos? di(á|a)rios?|daily|todo dia/i, answer: 'Há créditos diários para resgatar no painel de créditos (regra observada; o valor diário real não foi capturado — UNOBSERVED).', source: 'parcialmente observado' },
  { id: 'planos', match: /plano|pre(ç|c)o|assinatura|pagamento|fatura/i, answer: 'Os planos em BRL são Starter (R$ 99/mês ou R$ 1.199/ano) e Pro (R$ 199/mês ou R$ 1.999/ano) com 1.000 créditos/mês (valores observados). Pagamento real ainda não está ligado — só a estrutura local.', source: 'observado + estrutura local' },
  { id: 'publicar', match: /publicar|agendar|redes?|tiktok|instagram|youtube|facebook/i, answer: 'A publicação em redes exige vincular a conta de cada rede (OAuth). A fila e o fluxo existem localmente; credenciais ficam no ambiente e cada rede precisa de app registrado.', source: 'implementação local (rodada 18)' },
  { id: 'loja', match: /loja|marketplace|integra(ç|c)(ã|a)o/i, answer: 'A tela Integrações conecta uma loja via MARKETPLACE_BASE_URL/MARKETPLACE_API_KEY (ambiente) e permite importar produtos e enviar vídeos aos produtos.', source: 'implementação local (rodada 18)' },
  { id: 'avatar', match: /avatar|lip-?sync|boca|falar/i, answer: 'O avatar com lip-sync usa adaptadores configuráveis (Space gratuito ou comando local). A geração exige foto + áudio e o resultado depende do provedor escolhido.', source: 'implementação local' },
  { id: 'conta', match: /entrar|login|senha|conta|e-?mail/i, answer: 'O login local usa e-mail e senha (ou Google quando o Supabase estiver configurado). A senha nunca aparece em claro; use "Recuperar senha" se necessário.', source: 'implementação local' },
  { id: 'ajuda', match: /ajuda|suporte|falar com (algu(é|e)m|atendimento)|humano/i, answer: 'Este é o widget de ajuda LOCAL (sem atendimento de terceiros). Para a documentação observada, abra a Central de Ajuda no menu. Perguntas sem base local respondem como UNOBSERVED.', source: 'local' },
]);

export const FALLBACK = Object.freeze({
  answer: 'Não tenho essa informação na base local — o conteúdo real de suporte não foi capturado (UNOBSERVED). Veja a Central de Ajuda ou reformule a pergunta.',
  source: 'UNOBSERVED', confidence: 'unobserved',
});

export function answer(message = '') {
  const text = String(message || '').trim();
  if (!text) return { ok: false, error: 'escreva uma pergunta' };
  const hit = KB.find((k) => k.match.test(text));
  if (!hit) return { ok: true, reply: FALLBACK.answer, source: FALLBACK.source, confidence: FALLBACK.confidence, kbId: null };
  return { ok: true, reply: hit.answer, source: hit.source, confidence: 'local', kbId: hit.id };
}

export const widgetSummary = () => ({ ...WIDGET, kb: KB.map((k) => ({ id: k.id, source: k.source })), externalCalls: false, thirdPartyToken: null });
