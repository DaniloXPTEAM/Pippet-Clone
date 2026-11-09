// Composição do workflow do agente depois que TODAS as tarefas de vídeo terminaram: narração (provedor de áudio configurado ou voz local SAPI),
// legendas a partir das falas do storyboard, projeto no editor (clipes + áudio + legendas) e exportação do vídeo final. Só usa resultados REAIS das tarefas.
import path from 'node:path';
import * as media from './media.mjs';

const r2 = (x) => Math.round(x * 100) / 100;
// ctx: { db, assetPath(id), addAsset(name,file,kind,cat), saveBuffer(name, bytes, kind, cat)->asset, synth(text, voice)->Promise<{asset}|null>, newEditor(title, timeline)->project, mediaDir, addNode, linkId }
export async function composeWorkflow(ctx, { project, st, jobs }) {
  const segs = st.plan.segs; const story = st.story; const req = st.request; const clips = [], audio = [], captions = [], notes = []; let offset = 0;
  for (const [i, s] of segs.entries()) {
    const job = jobs[i]; const file = ctx.assetPath(job.assetId); const info = media.probe(file); const dur = r2(info.duration);
    clips.push({ assetId: job.assetId, in: 0, out: dur });
    const fala = (story?.segmentos?.[i]?.fala || '').trim();
    if (fala) {
      let a = null; try { a = await ctx.synth(fala, story?.voz); } catch (e) { notes.push(`narração do segmento ${s.id} falhou: ${String(e.message || e).slice(0, 120)}`); }
      if (a) { audio.push({ assetId: a.asset.id, start: r2(offset), volume: 1 }); notes.push(`narração do segmento ${s.id}: ${a.label}`); } else if (!notes.some((n) => /sem narração/.test(n))) notes.push('sem narração: nenhum provedor de áudio configurado e a voz local não está disponível');
      captions.push({ text: fala, start: r2(offset), end: r2(offset + dur) });
    }
    offset += dur;
  }
  const timeline = { ratio: req.ratio, clips, texts: [], captions, audio, background: { type: 'black' } };
  const editor = ctx.newEditor(String(st.theme || 'Projeto').slice(0, 60), timeline);
  const out = path.join(ctx.mediaDir, `${project.id}_final_${Date.now()}.mp4`); const info = media.exportTimeline(timeline, ctx.assetPath, out);
  const asset = ctx.addAsset('final.mp4', out, 'video', 'works'); const node = ctx.addNode(project, 'Vídeo', 'final.mp4', { assetId: asset.id }); if (st.docs?.storyboard) ctx.linkId(project, st.docs.storyboard, node.id);
  return { editor, asset, node, info, notes, clips: clips.length, narrations: audio.length, captions: captions.length };
}
