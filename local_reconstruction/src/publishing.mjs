// Estrutura de VINCULAÇÃO DE CONTAS, PUBLICAÇÃO e AGENDAMENTO preservada para implementação futura com APIs oficiais e autorizações do usuário.
// NADA aqui conecta contas, faz OAuth, chama redes sociais ou publica: só modelo de dados, validações, rascunhos LOCAIS e o formato observado das chamadas do Pippit.
// Evidências (REA 6.7.0): Publisher /schedule-publish ev_1204271935ec8fc1c0affd7c9900273705272c4f553f8999aea7a51ebf9690ec (list_schedule_task, get_bind_account_list, account/limit, product/list);
// históricas (6.5.0): PIPPIT_SOCIAL_PUBLISHING.md, PIPPIT_NODES_AND_AVATAR_FLOWS.md §9.2–9.3, captures/auth/{social_accounts,schedule_publish,api_social,api_schedule}.

// Códigos de plataforma OBSERVADOS: get_bind_account_list pede [1,301,311,3,101,201,401]; o Publisher só usa {1,301,311}. O MAPA código→plataforma NÃO foi observado (nenhuma conta vinculada para revelar o formato):
// 1/301/311 = TikTok / Página do Facebook / Reels do Instagram é INFERÊNCIA pela ordem do menu "Vincular conta" e das chaves.
export const PLATFORM_CODES = {
  1: { id: 'tiktok', name: 'TikTok', mapa: 'inferido', publisher: true },
  301: { id: 'facebook_page', name: 'Página do Facebook', mapa: 'inferido', publisher: true },
  311: { id: 'instagram_reels', name: 'Reels do Instagram', mapa: 'inferido', publisher: true },
  3: { id: 'desconhecido_3', name: 'desconhecido (código 3)', mapa: 'desconhecido', publisher: false },
  101: { id: 'desconhecido_101', name: 'desconhecido (código 101)', mapa: 'desconhecido', publisher: false },
  201: { id: 'desconhecido_201', name: 'desconhecido (código 201)', mapa: 'desconhecido', publisher: false },
  401: { id: 'desconhecido_401', name: 'desconhecido (código 401)', mapa: 'desconhecido', publisher: false },
};
export const OBSERVED = {
  bindAccountList: { request: { platform_type: [1, 301, 311, 3, 101, 201, 401], tt_creator: true }, response: 'data.platform_user_info{"<codigo>": []} (formato de cada conta NÃO observado)' },
  listScheduleTask: { request: { start_time: 'ms epoch (janela ~90 dias: 2026-08-30..2026-11-28 na captura)', end_time: 'ms epoch', status_list: [1, 2, 3, 4, 6], platform_user_ids: { 1: [], 301: [], 311: [] } }, response: '{ret,errmsg,svr_time,log_id,data:[]} (sem tarefas; formato de uma tarefa NÃO observado)' },
  accountLimit: 'POST /api/account/v1/limit {} (limite 0/3 contas sociais no plano Free)',
  productList: { request: { keyword: '', page: 1, size: 10, sort_field: 2, is_asc: false } },
  endpointsSemEsquema: ['publish/create_schedule_task', 'publish/batchcreate_schedule_task', 'publish/update_schedule_task', 'publish/delete_schedule_task', 'publish/list_task_by_asset', 'publish/recommend_hashtags', 'publish/products', 'publish/product_add_verify', 'publish/product_content_verify'],
  statusList: 'status_list [1,2,3,4,6]: significado dos códigos NÃO observado',
  dialogoProgramar: { campos: ['conta (Selecionar conta)', 'data', 'hora (fuso do sistema)', 'descrição 0/2200'], observado: 'sem conta vinculada o botão Programar fica desabilitado' },
};
export const LIMITS = { caption: 2200, drafts: 200, hashtags: 30 };
// Adaptadores de API OFICIAIS (planejados, NÃO implementados). Texto = conhecimento do analista sobre a documentação pública (revisar na implementação); não é evidência do Pippit.
export const OFFICIAL_ADAPTERS = {
  tiktok: { nome: 'TikTok Content Posting API', codigos: [1], status: 'nao_conectado', autenticacao: 'OAuth 2.0 (Login Kit) com aplicativo registrado', escopos: ['video.publish', 'video.upload'], restricoes: ['publicação pública exige auditoria do aplicativo; sem ela o conteúdo sai privado', 'o usuário autoriza cada conta'], fonte: 'analista, documentação pública (verificar)' },
  facebook_page: { nome: 'Facebook Graph API (Pages)', codigos: [301], status: 'nao_conectado', autenticacao: 'OAuth 2.0 (Facebook Login) com App Review', escopos: ['pages_manage_posts', 'pages_read_engagement'], restricoes: ['permissões avançadas exigem revisão do app', 'agendamento nativo por scheduled_publish_time (verificar janela atual)'], fonte: 'analista, documentação pública (verificar)' },
  instagram_reels: { nome: 'Instagram Graph API (Content Publishing)', codigos: [311], status: 'nao_conectado', autenticacao: 'OAuth 2.0 via Facebook Login; conta profissional ligada a uma Página', escopos: ['instagram_basic', 'instagram_content_publish'], restricoes: ['publicação em duas etapas (criar contêiner de mídia e publicar)', 'agendamento pode exigir fila própria (verificar)'], fonte: 'analista, documentação pública (verificar)' },
  youtube: { nome: 'YouTube Data API v3 (videos.insert)', codigos: [], status: 'nao_conectado', autenticacao: 'OAuth 2.0 (Google) com escopo de upload', escopos: ['https://www.googleapis.com/auth/youtube.upload'], restricoes: ['apps não verificados publicam como privado até auditoria', 'cota por upload (verificar valor atual)'], fonte: 'analista, documentação pública (verificar); YouTube aparece só na tela de Autorização de conta do Pippit, não no Publisher' },
};
export const DRAFT_STATUS = 'rascunho_local';
const isStr = (x) => typeof x === 'string';
// valida e normaliza um rascunho local; devolve { draft } ou { error }
export function normalizeDraft(b, { assets, now = Date.now() } = {}) {
  const asset = (assets || []).find((a) => a.id === String(b.assetId)); if (!asset) return { error: 'ativo inexistente' }; if (asset.kind !== 'video') return { error: 'apenas vídeos podem ser rascunho de publicação' };
  const caption = String(b.caption ?? '').trim(); if (caption.length > LIMITS.caption) return { error: `descrição acima de ${LIMITS.caption} caracteres (${caption.length}/${LIMITS.caption})` };
  const platforms = [...new Set((Array.isArray(b.platforms) ? b.platforms : []).map(Number))]; if (!platforms.length) return { error: 'escolha ao menos uma plataforma' }; const bad = platforms.find((c) => !PLATFORM_CODES[c]?.publisher); if (bad !== undefined) return { error: `plataforma ${bad} não faz parte do Publisher (use ${Object.entries(PLATFORM_CODES).filter(([, v]) => v.publisher).map(([k]) => k).join(', ')})` };
  let scheduledAt = null; if (b.scheduledAt) { const t = Date.parse(b.scheduledAt); if (!Number.isFinite(t)) return { error: 'data/hora inválida' }; if (t <= now) return { error: 'o horário deve ser futuro' }; scheduledAt = new Date(t).toISOString(); }
  const hashtags = (Array.isArray(b.hashtags) ? b.hashtags : String(b.hashtags || '').split(/[\s,]+/)).map((x) => String(x).replace(/^#/, '').trim()).filter(Boolean).slice(0, LIMITS.hashtags);
  return { draft: { assetId: asset.id, caption, platforms, scheduledAt, hashtags, status: DRAFT_STATUS } };
}
// formato observado de list_schedule_task: tarefas dentro da janela, com os status pedidos e as plataformas pedidas. Rascunhos locais têm status 0 (não observado) e só aparecem se status_list incluir 0.
export function listScheduleTask(drafts, req = {}, svrTime = Math.floor(Date.now() / 1000)) {
  const st = Array.isArray(req.status_list) ? req.status_list : [1, 2, 3, 4, 6]; const t0 = Number(req.start_time) || 0, t1 = Number(req.end_time) || Infinity; const pu = req.platform_user_ids && typeof req.platform_user_ids === 'object' ? Object.keys(req.platform_user_ids).map(Number) : null;
  const data = st.includes(0) ? drafts.filter((d) => { const t = d.scheduledAt ? Date.parse(d.scheduledAt) : null; return (t === null || (t >= t0 && t <= t1)) && (!pu || !pu.length || d.platforms.some((p) => pu.includes(p))); }).map((d) => ({ task_id: d.id, status: 0, asset_id: d.assetId, platform_types: d.platforms, scheduled_at: d.scheduledAt, content: d.caption, local_only: true })) : [];
  return { ret: '0', errmsg: '', svr_time: svrTime, data };
}
export function bindAccountList(accounts = {}, req = {}) {
  const types = Array.isArray(req.platform_type) ? req.platform_type : OBSERVED.bindAccountList.request.platform_type; const info = {}; for (const t of types) info[String(t)] = Array.isArray(accounts[String(t)]) ? accounts[String(t)] : [];
  return { ret: '0', errmsg: 'SUCCESS', data: { platform_user_info: info } };
}
export const publishingSummary = () => ({ platformCodes: PLATFORM_CODES, observed: OBSERVED, adapters: OFFICIAL_ADAPTERS, limits: LIMITS, draftStatus: DRAFT_STATUS });
