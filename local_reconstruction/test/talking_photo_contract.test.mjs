// Foto falante (contrato Omni, PIPPIT_AVATAR_CHUNKS.md): funcoes puras + rota local /api/talking-photo/audio e render com audio enviado + gesto. Nada sai da maquina.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const C = await import('../app/lib/talking_photo_contract.mjs');
// fases e etapas
assert.deepEqual(C.PHASE, { INITIAL: 0, PHOTO_UPLOADED: 1, VERIFYING: 2, VERIFIED_BACK: 3, FAILED: 4, VOICEOVER: 5, EXPORTED: 6 }); assert.deepEqual(C.STEPS, ['uploadphoto', 'addvoiceover', 'export']);
// audio: formatos e limite de 30 s (estrito)
assert.deepEqual(C.checkAudioUpload({ name: 'a.MP3', durationSeconds: 29.9 }), { ok: true, isVideo: false }); assert.deepEqual(C.checkAudioUpload({ name: 'v.mkv', durationSeconds: 5 }), { ok: true, isVideo: true });
assert.deepEqual(C.checkAudioUpload({ name: 'a.wav', durationSeconds: 5 }), { ok: false, reason: 'format' }); assert.deepEqual(C.checkAudioUpload({ name: 'a.flac', durationSeconds: 30 }), { ok: false, reason: 'duration' });
// corpos de pre_process
assert.deepEqual(C.preProcessImageBody({ imageUri: 'u', isSample: false }), { imageUri: 'u', imageVimoId: undefined, needReviewImage: true, needRecommendVoice: true }); assert.deepEqual(C.preProcessImageBody({ imageVimoId: 7, isSample: true }), { imageUri: undefined, imageVimoId: '7', needReviewImage: false, needRecommendVoice: true });
assert.deepEqual(C.preProcessTextBody('oi'), { needCheckText: true, ttsText: ['oi'] }); assert.deepEqual(C.preProcessUploadedAudioBody('vid1'), { uploadedAudioVid: 'vid1', needCheckCopyright: true });
assert.deepEqual(C.creditBenefitTuple(12.5), { itemList: [{ resourceType: 'aigc', resourceId: 'cc_biz_talking_photo', benefitType: 'cc_biz_talking_photo', highPrecisionAmount: 12.5 }] });
// parametros de exportacao
assert.deepEqual(C.audioExportParams({ tab: 'voiceover', material: { duration: 2.5, vid: 'v', uri: 'u' }, segmentId: 's' }), { audio_vid: 'v', audio_uri: 'u', segment_duration: 2500000, segment_id: 's' });
assert.deepEqual(C.audioExportParams({ tab: 'voiceover', material: { duration: 1, vid: 'v' } }), { uploaded_audio_vid: 'v', segment_duration: 1000000, segment_id: undefined }); assert.deepEqual(C.audioExportParams({ tab: 'voiceover', material: { duration: 1, isSample: true, preview: 'p' } }), { audio_url: 'p', segment_duration: 1000000, segment_id: undefined });
assert.deepEqual(C.audioExportParams({ tab: 'tts', ttsEndTimeSeconds: 3.2 }), { segment_duration: 3200, segment_id: undefined });
const ep = C.exportParams({ audio: { segment_duration: 1 }, image: { uri: 'img' }, maskUris: ['m1'], gesturePrompt: 'g', tab: 'tts', script: 'oi' }); assert.deepEqual(ep, { segment_duration: 1, image_uri: 'img', image_vimo_id: undefined, need_render: true, need_matting: false, mask_uri_list: ['m1'], prompt: 'g', tts_script: 'oi' });
assert.equal(C.exportParams({ audio: {}, image: { isSample: true, vid: 9 }, tab: 'voiceover', script: 'x' }).tts_script, undefined);
// habilitar Exportar e confirmacao de direitos de musica
assert.equal(C.canExport({ tab: 'tts', scriptSaving: false, hasTtsResult: true }), true); assert.equal(C.canExport({ tab: 'tts', scriptSaving: true, hasTtsResult: true }), false);
assert.equal(C.canExport({ tab: 'voiceover', material: { status: 'uploadSuccess', copyrightMusicHit: true } }), false); assert.equal(C.canExport({ tab: 'voiceover', material: { status: 'uploadSuccess' } }), true);
assert.equal(C.needsMusicRightsConfirmation({ tab: 'voiceover', material: { musicHit: true } }), true); assert.equal(C.needsMusicRightsConfirmation({ tab: 'tts', material: { musicHit: true } }), false);
// rastreamento SDK -> endpoint
assert.deepEqual(C.ttsRequestBody({ scripts: 'oi', speakerId: 'v1', source: 2 }), { scriptList: ['oi'], timbreInfoList: [{ id: 'v1', source: 2 }] }); assert.equal(C.TTS_PATH, '/api/biz/v1/videogen/text_to_speech');
assert.deepEqual(C.parseTtsResponse({ logId: 'L', data: { ttsResults: [{ url: 'u', normalizedVolume: '0.5' }, { url: 'v' }] } }), { list: [{ url: 'u', normalizedVolume: 0.5 }, { url: 'v', normalizedVolume: undefined }], logId: 'L' });
assert.deepEqual(C.benefitCheckBody({ itemList: [{ ...C.CREDIT_BENEFIT, highPrecisionAmount: 12 }, { resourceType: 'a', resourceId: 'b', benefitType: 'c' }] }), { itemList: [{ ...C.CREDIT_BENEFIT, highPrecisionAmount: 12, amount: 1 }, { resourceType: 'a', resourceId: 'b', benefitType: 'c', highPrecisionAmount: 1, amount: 1 }], actionType: 'AUTHENTICATE' });
assert.deepEqual(C.interpretBenefitCheck({ status: 0 }, 0), { pass: true }); assert.deepEqual(C.interpretBenefitCheck({ status: null }, 0), { pass: false, type: 'error' }); assert.deepEqual(C.interpretBenefitCheck({ status: 1, reason: 'region_unsupported' }, 0), { pass: false, type: 'region' });
assert.deepEqual(C.interpretBenefitCheck({ status: 1, paywallType: 'subscription', benefitTypeArr: ['k'] }, 0), { pass: false, type: 'vip', benefitTypeArr: ['k'] }); assert.deepEqual(C.interpretBenefitCheck({ status: 1, paywallType: 'single_credits', credits: 7 }, 0), { pass: false, type: 'credits', needCredits: 7 }); assert.equal(C.creditsFromItems([{ creditsAmount: 3 }, {}, { creditsAmount: 4 }]), 7);
const req = C.omniTaskCreateReq({ params: { need_render: true }, ttsInfos: [C.ttsInfoFromAudioFile({ md5: 'm', assetId: 'a', sourceStartTime: 0n, sourceDuration: 2500000n })], uid: 'u', workspaceId: 'w', region: 'BR' });
assert.deepEqual({ ...req, params: JSON.parse(req.params) }, { uid: 'u', platform: 4, asset_id: '', workspace_id: 'w', smart_tool_type: 20007, req_json: '', is_from_editor: false, params: { need_render: true, tts_infos: [{ md5: 'm', asset_id: 'a', format: 'mp3', source_start_time: '0', source_duration: '2500000' }] }, region: 'BR', app_id: 573081 });
assert.equal(C.omniCreateTaskBody(req, 's').submit_id, 's'); assert.equal(C.omniCreateFailed({ task_id: '0' }), true); assert.equal(C.omniCreateFailed({ task_id: '9', miss_materials: true }), true); assert.equal(C.omniCreateFailed({ task_id: '9' }), false); assert.equal(C.OMNI.createPath, '/api/biz/v1/omni/create_task_web');
const rb = C.renderTaskCreateBody({ draftId: 'd', workspaceId: 'w', durationSeconds: 4, smartTaskCreateReq: req }); assert.equal(rb.type, 53, 'sem exportTaskType => 53'); assert.equal(rb.app_id, 573081); assert.equal(rb.sdk_version, '16.1.0'); assert.equal(rb.force_export, false); assert.equal(rb.from_workspace_id, 'w'); assert.deepEqual(rb.smart_task_create_req, req); assert.equal(C.renderTaskCreateBody({ exportTaskType: 0 }).type, 0, 'tipo 0 do drawer do Avatar é preservado'); assert.equal('smart_task_create_req' in C.renderTaskCreateBody({}), false); assert.equal(C.RENDER_TASK.createPath, '/lv/v1/render_task/create');
// servidor local
const media = await import('../app/lib/media.mjs');
if (!media.available()) { console.log('ffmpeg indisponivel: rotas nao testadas'); console.log('talking_photo_contract OK (so funcoes puras)'); process.exit(0); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-tp-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5251; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const ff = (args) => { const r = spawnSync(media.FFMPEG, ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
const short = path.join(tmp, 's.mp3'), long = path.join(tmp, 'l.mp3'), vid = path.join(tmp, 'v.mp4'), png = path.join(tmp, 'p.png'), wav = path.join(tmp, 'w.wav');
ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', short]); ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=31', long]); ff(['-f', 'lavfi', '-i', 'color=c=red:s=320x240:d=2', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=2', '-shortest', '-pix_fmt', 'yuv420p', vid]); ff(['-f', 'lavfi', '-i', 'color=c=blue:s=400x400', '-frames:v', '1', png]); ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', wav]);
const up = (p, name) => fetch(base + '/api/talking-photo/audio', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name), 'content-type': 'application/octet-stream' }, body: fs.readFileSync(p) });
let r = await up(wav, 'a.wav'); assert.equal(r.status, 400); assert.match((await r.json()).error, /mp3\/wma\/flac/);
r = await up(long, 'l.mp3'); assert.equal(r.status, 400); assert.match((await r.json()).error, /menos de 30 s/);
r = await up(short, 's.mp3'); assert.equal(r.status, 200); const sj = await r.json(); assert.ok(sj.duration > 1.5 && sj.duration < 2.6); assert.equal(sj.isFromVideo, false); assert.equal(sj.asset.kind, 'audio');
r = await up(vid, 'v.mp4'); assert.equal(r.status, 200); const vj = await r.json(); assert.equal(vj.isFromVideo, true); assert.match(vj.asset.name, /\.mp3$/);
const ph = await fetch(base + '/api/talking-photo/photo', { method: 'POST', headers: { 'x-file-name': 'p.png', 'content-type': 'image/png' }, body: fs.readFileSync(png) }); assert.equal(ph.status, 200); const photo = (await ph.json()).asset;
const post = async (u, b) => { const x = await fetch(base + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: x.status, body: await x.json() }; };
assert.equal((await post('/api/talking-photo/render', { assetId: photo.id, audioAssetId: 'nao-existe' })).status, 400);
const bal0 = (await (await fetch(base + '/api/state')).json()).balance;
const out = await post('/api/talking-photo/render', { assetId: photo.id, audioAssetId: sj.asset.id, gesture: 'Levante a mão' }); assert.equal(out.status, 200, JSON.stringify(out.body)); assert.equal(out.body.creditsCharged, 0); assert.equal(out.body.gestureApplied, false); assert.equal(out.body.wire.prompt, 'Levante a mão'); assert.equal(out.body.wire.need_render, true); assert.equal(out.body.wire.tts_script, undefined); assert.ok(out.body.wire.segment_duration > 1.5e6); assert.match(out.body.label, /áudio enviado/); assert.match(out.body.label, /gesto/);
assert.equal((await (await fetch(base + '/api/state')).json()).balance, bal0, 'nenhum credito debitado');
server.closeAllConnections?.(); fs.rmSync(tmp, { recursive: true, force: true }); console.log('talking_photo_contract OK'); setTimeout(() => process.exit(0), 200);
