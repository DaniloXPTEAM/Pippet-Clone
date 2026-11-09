// Contrato da Foto falante de IA (/ai-talking-photo) recuperado do chunk Omni (693197, baixado com autorizacao em 27/10/2026;
// scripts/downloaded_omni/, REA ev_29c9e7c5…) e de async__450621 (servico ai-talking-photo-data-service, modulo 466973). Funcoes puras; nada e enviado ao Pippit.
import { scriptInfo } from './avatar_contract.mjs';
export { scriptInfo };

// Fases da pagina (Omni modulo 412720): 0 inicial/foto trocada · 1 foto enviada (cancelar verificacao) · 2 verificando ("Recognizing characters…", botao Next em loading)
// · 3 foto ja verificada (voltou da locucao; Next -> 5) · 4 falhou a verificacao (Next desabilitado) · 5 verificada = tela "Add Voiceover" · 6 exportacao iniciada ("Generating video")
export const PHASE = { INITIAL: 0, PHOTO_UPLOADED: 1, VERIFYING: 2, VERIFIED_BACK: 3, FAILED: 4, VOICEOVER: 5, EXPORTED: 6 };
// Titulos das 3 etapas (cc4b_aitalkingphoto_title_*): Upload Photo · Add Voiceover · Export
export const STEPS = ['uploadphoto', 'addvoiceover', 'export'];
// Foto: formatos png/jpeg/jpg e lado > 256 px (texto "Format: jpg/png · Size: >256*256"); falhas -> toast "Image too tall/wide. Upload a new one."
export const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg'];
// Audio: <30 s; audio mp3/wma/flac ou video mp4/avi/mov/wmv/mkv (o audio do video e extraido); texto "Audio (mp3/wma/flac) or video (mp4/avi/mov/wmv/mkv), <30s"
export const AUDIO_EXT = ['.mp3', '.wma', '.flac']; export const VIDEO_EXT = ['.mp4', '.avi', '.mov', '.wmv', '.mkv']; export const MAX_AUDIO_SECONDS = 30;
export function checkAudioUpload({ name, durationSeconds }) {
  const ext = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  const isVideo = VIDEO_EXT.includes(ext);
  if (!AUDIO_EXT.includes(ext) && !isVideo) return { ok: false, reason: 'format' };
  if (!(durationSeconds < MAX_AUDIO_SECONDS)) return { ok: false, reason: 'duration' };
  return { ok: true, isVideo };
}
// Codigos de erro do servidor tratados pela pagina: 2420 = texto reprovado (toast "text error"); 2422 = musica com direitos autorais no audio enviado
export const ERROR = { TEXT: 2420, COPYRIGHT: 2422 };
// POST /api/biz/v1/digital_human/ai_talking_photo/pre_process_image — verificacao da foto + voz recomendada (resposta: recommendVoice{id, commonInfo.title, timbreInfo.previewUrl})
export const preProcessImageBody = ({ imageUri, imageVimoId, isSample = false }) => ({ imageUri: isSample ? undefined : imageUri, imageVimoId: isSample ? String(imageVimoId) : undefined, needReviewImage: !isSample, needRecommendVoice: true });
// POST …/pre_process_audio — (a) checagem do texto do TTS, (b) audio enviado (resposta: copyrightMusicHit, musicHit)
export const preProcessTextBody = (script) => ({ needCheckText: true, ttsText: [script] });
export const preProcessUploadedAudioBody = (uploadedAudioVid) => ({ uploadedAudioVid, needCheckCopyright: true });
// Beneficio de credito do botao Export: {resourceType:"aigc", resourceId:"cc_biz_talking_photo", benefitType:"cc_biz_talking_photo"} com highPrecisionAmount = duracao do audio.
// Texto da dica: "Os creditos necessarios dependem do tamanho do roteiro ou do audio enviado". Valor por segundo: DESCONHECIDO.
export const CREDIT_BENEFIT = { resourceType: 'aigc', resourceId: 'cc_biz_talking_photo', benefitType: 'cc_biz_talking_photo' };
export const creditBenefitTuple = (durationSeconds) => ({ itemList: [{ ...CREDIT_BENEFIT, highPrecisionAmount: durationSeconds }] });
// Parametros de exportacao (botao Export da etapa 2). Audio: segment_duration em MICROSSEGUNDOS (round(1e6*segundos)); no TTS, em ms do ultimo trecho * 1e3.
export function audioExportParams({ tab, material, ttsEndTimeSeconds, segmentId }) {
  if (tab === 'voiceover') {
    const segment_duration = Math.round(1e6 * material.duration);
    if (material.isSample) return { audio_url: material.preview, segment_duration, segment_id: segmentId };
    if (material.uri) return { audio_vid: material.vid, audio_uri: material.uri, segment_duration, segment_id: segmentId };
    return { uploaded_audio_vid: material.vid, segment_duration, segment_id: segmentId };
  }
  if (tab === 'tts') return { segment_duration: Math.round(1e3 * ttsEndTimeSeconds), segment_id: segmentId };
  return undefined;
}
export function exportParams({ audio, image, maskUris = [], gesturePrompt = '', tab, script }) {
  return { ...audio, image_uri: image.isSample ? undefined : image.uri, image_vimo_id: image.isSample ? image.vid : undefined, need_render: true, need_matting: false, mask_uri_list: maskUris, prompt: gesturePrompt, tts_script: tab === 'tts' ? script : undefined };
}
// Exportar so habilita com: audio enviado com sucesso e SEM musica com direitos (aba voiceover), ou roteiro salvo com resultado de TTS (aba tts)
export function canExport({ tab, material, scriptSaving, hasTtsResult }) {
  return (tab === 'voiceover' && material?.status === 'uploadSuccess' && !material.copyrightMusicHit) || (tab === 'tts' && !scriptSaving && !!hasTtsResult);
}
// Se o audio enviado tem musica (musicHit), o Pippit pede confirmacao de direitos antes de exportar
export const needsMusicRightsConfirmation = ({ tab, material }) => tab !== 'tts' && !!material?.musicHit;

// ---- Rastreamento SDK -> endpoint (27/10/2026; PIPPIT_TALKING_PHOTO.md §Rastreamento) ----
// TTS (async__973395 @131561): POST {web_domain}/api/biz/v1/videogen/text_to_speech; o cliente baixa cada data.ttsResults[].url (mp3)
export const TTS_PATH = '/api/biz/v1/videogen/text_to_speech';
export const ttsRequestBody = ({ scripts, speakerId, source }) => ({ scriptList: Array.isArray(scripts) ? scripts : [scripts], timbreInfoList: [{ id: speakerId, source }] });
export const parseTtsResponse = (res) => ({ list: res.data.ttsResults.map((e) => ({ ...e, normalizedVolume: e.normalizedVolume ? Number(e.normalizedVolume) : undefined })), logId: res.logId });
// Checagem de beneficio (async__450621 @574031): POST /commerce/v3/benefits/batch_check_withhold_deduct. Itens ganham highPrecisionAmount/amount = 1 por padrao; acao padrao AUTHENTICATE (a pagina usa DEDUCT apos o uso).
export const BENEFIT_CHECK_PATH = '/commerce/v3/benefits/batch_check_withhold_deduct';
export function benefitCheckBody({ itemList, actionType = 'AUTHENTICATE' }) { return { itemList: itemList.map((e) => ({ ...e, highPrecisionAmount: e.highPrecisionAmount ?? 1, amount: e.amount ?? 1 })), actionType }; }
// Interpretacao (getLimitationV3/handleIntercepts): status null = erro ("Something went wrong. Try again."); regiao sem assinatura = nao passa e nao pergunta;
// falha com paywallType != "single_credits" = exige assinatura (VIP); "single_credits" ou credits>0 = exige creditos; senao passa. successValue e o valor do enum de sucesso (desconhecido numericamente).
export function interpretBenefitCheck(r, successValue) {
  if (r.reason === 'region_unsupported') return { pass: false, type: 'region' };
  if (r.status === null) return { pass: false, type: 'error' };
  const ok = r.status === successValue; if (ok) return { pass: true };
  return r.paywallType && r.paywallType !== 'single_credits' ? { pass: false, type: 'vip', benefitTypeArr: r.benefitTypeArr } : { pass: false, type: 'credits', needCredits: r.credits };
}
export const creditsFromItems = (itemList = []) => itemList.reduce((s, e) => s + (e.creditsAmount ?? 0), 0);
// Exportacao Omni (async__907969 mod 91321 + async__450621): o provedor monta o smart_task_create_req; smart_tool_type 20007, platform 4, app_id 573081 (Pippit).
// O envio e feito por POST /api/biz/v1/omni/create_task_web (+ submit_id, cabecalho x-commerce-v2: 1); acompanhamento: POST /lv/v1/render_task/batch_get {task_ids}; cancelar: /lv/v1/render_task/cancel.
export const OMNI = { smartToolType: 20007, platform: 4, appId: 573081, createPath: '/api/biz/v1/omni/create_task_web', pollPath: '/lv/v1/render_task/batch_get', cancelPath: '/lv/v1/render_task/cancel', headers: { 'x-commerce-v2': '1' } };
export const ttsInfoFromAudioFile = (f) => ({ md5: f.md5, asset_id: f.assetId, format: 'mp3', source_start_time: String(f.sourceStartTime), source_duration: String(f.sourceDuration) });
export function omniTaskCreateReq({ params, ttsInfos, uid, workspaceId, region }) {
  const p = { ...params }; if (ttsInfos) p.tts_infos = ttsInfos;
  return { uid, platform: OMNI.platform, asset_id: '', workspace_id: workspaceId || '', smart_tool_type: OMNI.smartToolType, req_json: '', is_from_editor: false, params: JSON.stringify(p), region, app_id: OMNI.appId };
}
export const omniCreateTaskBody = (req, submitId) => ({ ...req, submit_id: submitId });
// Falha de criacao: task_id "0" ou miss_materials = erro 10007 (p9._createExportTaskServer)
export const omniCreateFailed = (value) => 'task_id' in value && (value.task_id === '0' || value.miss_materials === true);

// Pedido padrao de exportacao (async__450621, classe do corpo `m` @~1188400; envio por POST {dominio}/lv/v1/render_task/create + submit_id, cabecalho x-commerce-v2: 1).
// Para Foto falante e Avatar Video o provedor Omni entra como `smart_task_create_req`. `createExportTaskOmni` (omni/create_task_web) existe mas NENHUM chunk local o chama (estatico).
// `type` = exportTaskType ?? 53: a pagina Omni (Foto falante) NAO passa exportTaskType => 53; o drawer do Avatar passa 0.
export const RENDER_TASK = { createPath: '/lv/v1/render_task/create', sdkVersion: '16.1.0', defaultType: 53 };
export function renderTaskCreateBody(p) {
  return { draft_id: p.draftId, add_ccbiz_watermark: p.watermark ?? false, app_id: OMNI.appId, app_version: p.appVersion, width: p.width, height: p.height, region: p.region, custom_info: p.customInfo, extra: p.extra, sdk_version: RENDER_TASK.sdkVersion, definition: p.definition, format: p.format, fps: p.fps, quality: p.quality, from_workspace_id: p.workspaceId, to_workspace_id: p.workspaceId, duration: p.durationSeconds, force_export: false, is_unify_task: false, video_id: p.videoId, video_name: p.videoName, package_id: p.packageId, ccbiz_extra: p.ccbizExtra, type: p.exportTaskType ?? RENDER_TASK.defaultType, ...(p.smartTaskCreateReq ? { smart_task_create_req: p.smartTaskCreateReq } : {}) };
}
