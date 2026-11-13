// Teste de interface (navegador real via playwright-core + Chrome): abre a aplicacao local e exercita fluxos reais. Prints em pasta temporária (test/support/shots.mjs), nunca em arquivo versionado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { spawnSync } from 'node:child_process';
if (skipUnavailableBrowser('ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-ui-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const media = await import('../app/lib/media.mjs');
const PORT = 5194; await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
import { shotsDir } from './support/shots.mjs'; const SHOTS = shotsDir(); // rodada 10: capturas fora da árvore versionada
const mk = (args, out) => { const r = spawnSync(media.FFMPEG, ['-y', ...args, out], { encoding: 'utf8' }); assert.equal(r.status, 0); return out; };
const face = mk(['-f', 'lavfi', '-i', 'testsrc=size=512x512:rate=1', '-frames:v', '1'], path.join(tmp, 'face.png'));
const clip = mk(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=6', '-pix_fmt', 'yuv420p', '-c:v', 'libx264'], path.join(tmp, 'clip.mp4'));
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
const go = async (h) => { await page.goto(`http://127.0.0.1:${PORT}/#${h}`); await page.waitForTimeout(700); };
await fetch(`http://127.0.0.1:${PORT}/api/daily-claim`, { method: 'POST' });
await page.goto(`http://127.0.0.1:${PORT}/`); await page.waitForSelector('#side .nav'); await page.waitForTimeout(500);
// navegacao lateral e home
for (const t of ['Criativo', 'Estúdio de marketing', 'Estúdio de histórias', 'Ativos', 'Habilidades', 'Criação inteligente', 'Mais']) assert.ok(await page.getByText(t, { exact: false }).first().isVisible(), t);
await shot('01_home'); assert.ok((await page.locator('.top-credits').innerText()).includes('280'));
// plano gratuito -> modal de planos (mensal/anual) com precos observados
await page.locator('#credits').click(); await page.getByText('Ver planos').click(); await page.waitForSelector('.plans');
assert.ok(await page.getByText('No momento gratuito — em breve').first().isVisible()); assert.ok(await page.getByText('Plano atual — acesso a tudo').isVisible()); assert.equal(await page.locator('.modal').getByText(/R\$/).count(), 0, 'sem valores em R$ na tela de planos (r20)'); await shot('02_planos_gratuito'); await page.keyboard.press('Escape'); await page.locator('.modal-bg .x').click();
// agente: pedido curto -> pergunta -> confirmacao -> sem provedor falha explicita
await go('/home'); await page.locator('#prompt').fill('Gere um vídeo viral de animação 3d para crianças com a personagem Gabi. Duração: 20 s'); await page.locator('#send').click();
await page.waitForSelector('.msg.agent .form'); assert.ok(await page.getByText('Escolha uma opção').isVisible()); await shot('03_agente_pergunta');
await page.locator('input[name=q]').nth(2).check(); await page.getByText('Responder').click(); await page.waitForSelector('text=Confirmar produção do vídeo'); await shot('04_agente_confirmacao');
await page.locator('[data-f=confirm]').click(); await page.waitForSelector('text=Quer'.replace('Quer', 'Custo estimado'), { timeout: 8000 }); await page.locator('[data-f=credit]').click(); await page.waitForSelector('.step.warning'); assert.ok(await page.getByText('Aguardando provedor de vídeo').first().isVisible()); assert.ok(await page.getByText('sem provedor de video configurado').first().isVisible()); await shot('05_agente_bloqueado');
const nodes = await page.locator('.node').count(); assert.ok(nodes >= 2, 'creative_design.md e storyboard.md no canvas');
// canvas: adicionar nos, geracao bloqueada com custo, ferramentas desabilitadas
await page.locator('#addN').click(); await page.locator('.menu a', { hasText: 'Vídeo' }).click(); await page.waitForTimeout(600);
await shot('05b_antes_no'); console.log('nos:', JSON.stringify(await page.locator('.node').evaluateAll((els) => els.map((e) => [e.innerText.slice(0, 20).split(String.fromCharCode(10)).join(' '), Math.round(e.getBoundingClientRect().x), Math.round(e.getBoundingClientRect().y)]))));
const vnode = page.locator('.node', { hasText: 'Vídeo' }).last(); await vnode.click({ position: { x: 20, y: 30 } }); await page.waitForSelector('.gen'); assert.ok(await page.locator('.node-bar button[disabled]').count() >= 5);
await page.locator('#gg').click(); await page.waitForTimeout(600); assert.ok((await page.locator('#toast').innerText()).includes('custaria 370 créditos')); await shot('06_no_video_bloqueado');
// estudio 3D: abrir, criar personagem por acao, camera, aba Imagem de IA nao observada, persistir ao sair
await page.locator('#addN').click(); await page.locator('.menu a', { hasText: 'Estúdio de direção 3D' }).click(); await page.waitForSelector('[data-3d]'); await page.locator('[data-3d]').click(); await page.waitForSelector('#s3c');
await page.locator('[data-c=acoes]').click(); await page.locator('.it', { hasText: 'Soco' }).click(); await page.waitForSelector('.tree a'); assert.ok(await page.getByText('Personagem 1').first().isVisible());
await page.locator('[data-c=cameras]').click(); await page.locator('.it', { hasText: 'Plano médio frontal' }).click(); await page.locator('[data-c=imagem_ia]').click(); assert.ok(await page.getByText('NÃO OBSERVADA').isVisible()); await shot('06b_estudio3d');
await page.locator('[data-exit]').click(); await page.waitForTimeout(500); await page.reload(); await page.waitForSelector('[data-3d]'); await page.locator('[data-3d]').click(); await page.waitForSelector('.tree a'); assert.ok(await page.getByText('Personagem 1').first().isVisible(), 'cena 3D persistida'); await page.locator('[data-exit]').click();
// avatar: assistente de 3 etapas com arquivo real e consentimento; r20: sem limite de usos (produto gratuito)
await go('/avatars'); assert.ok(await page.getByText('Ilimitado').isVisible()); await page.locator('#pa').click(); await page.waitForSelector('.drop');
assert.equal(await page.locator('.avatar-tip').count(), 4, 'dicas visuais: rosto frontal, perfil, óculos e múltiplas pessoas'); assert.equal(await page.locator('#cs').isChecked(), false); assert.ok(await page.locator('#nx').isDisabled()); await shot('07_avatar_upload_empty'); const fc = page.waitForEvent('filechooser'); await page.locator('#dz').click(); (await fc).setFiles(face); await page.waitForSelector('#rot'); await shot('07a_avatar_recortar'); await page.locator('#ok').click(); await page.waitForTimeout(600); assert.ok(await page.locator('#nx').isDisabled(), 'sem consentimento');
await page.locator('#cs').check(); await page.waitForTimeout(300); assert.ok(await page.locator('#nx').isEnabled()); await shot('07_avatar_etapa1'); await page.locator('#nx').click(); await page.waitForSelector('text=Foto válida'); await shot('08_avatar_etapa2'); await page.locator('#nx').click(); await page.waitForSelector('text=Nomeie o avatar'); assert.match(await page.locator('#nm').inputValue(), /^My Avatar \d+$/); await shot('08b_avatar_enviar'); await page.locator('#nm').fill('Crys'); await page.locator('#sd').click(); await page.waitForSelector('text=Ilimitado'); // r20: sem limite de usos assert.ok(await page.getByText('Crys').first().isVisible()); await shot('09_avatar_criado');
await page.locator('#va').click(); await page.waitForSelector('text=exige o serviço de geração'); assert.ok(await page.getByText('Entendi').isVisible()); assert.equal(await page.getByText('Assine o Starter agora').count(), 0, 'sem CTA de assinatura (r20)'); await page.locator('.modal-bg .x').click();
// editor: carregar, montar timeline com corte, exportar de verdade
await go('/editor'); await page.waitForSelector('#up'); const fc2 = page.waitForEvent('filechooser'); await page.locator('#up').click(); (await fc2).setFiles(clip); await page.waitForSelector('.mediaitem:has-text("clip.mp4")'); await page.locator('.mediaitem', { hasText: 'clip.mp4' }).first().click(); await page.waitForSelector('.clip'); await page.waitForSelector('#rpempty'); await page.locator('#tl .clip').first().click(); await page.waitForSelector('[data-in="0"]'); // painel direito: sem seleção mostra o estado vazio observado; com clipe selecionado abre a aba Básico
await page.locator('[data-in="0"]').fill('1'); await page.locator('[data-in="0"]').dispatchEvent('change'); await page.waitForTimeout(500); await page.locator('[data-out="0"]').fill('4'); await page.locator('[data-out="0"]').dispatchEvent('change'); await page.waitForTimeout(700);
// painel direito: áudio do clipe e plano de fundo persistem na timeline salva
await page.locator('[data-rt="Áudio"]').click(); await page.locator('[data-cp="volumeDb"]').fill('-6'); await page.locator('[data-cp="volumeDb"]').dispatchEvent('change'); await page.locator('[data-cp="mute"]').check(); await page.waitForTimeout(700); await page.locator('[data-rt="Plano de fundo"]').click(); await page.selectOption('#ebg', 'blur'); await page.waitForTimeout(700);
const saved = (await (await fetch(`http://127.0.0.1:${PORT}/api/projects`)).json()); const edId = page.url().split('/').pop(); const tlSaved = (await (await fetch(`http://127.0.0.1:${PORT}/api/projects/${edId}`)).json()).timeline; assert.equal(tlSaved.clips[0].volumeDb, -6); assert.equal(tlSaved.clips[0].mute, true); assert.equal(tlSaved.background.type, 'blur'); assert.ok(saved.length > 0);
await page.locator('[data-rt="Áudio"]').click(); await page.locator('[data-cp="mute"]').uncheck(); await page.waitForTimeout(400);
await page.locator('#exp').click(); await page.waitForSelector('#exname');
assert.equal(await page.locator('#exwm option').count(), 2); assert.equal(await page.locator('#exwm').inputValue(), 'with');
assert.deepEqual(await page.locator('#exres_ option').evaluateAll((els) => els.map((e) => e.value)), ['360p', '480p', '720p', '1080p', '2k', '4k']); assert.equal(await page.locator('#exres_').inputValue(), '720p');
assert.deepEqual(await page.locator('#exq option').evaluateAll((els) => els.map((e) => e.value)), ['better', 'recommended', 'faster']); assert.equal(await page.locator('#exq').inputValue(), 'recommended');
assert.deepEqual(await page.locator('#exfps option').evaluateAll((els) => els.map((e) => e.value)), ['24', '25', '30', '50', '60']); assert.equal(await page.locator('#exfps').inputValue(), '30');
assert.deepEqual(await page.locator('#exfmt option').evaluateAll((els) => els.map((e) => e.value)), ['mp4', 'mov']); assert.equal(await page.locator('#exfmt').inputValue(), 'mp4'); assert.equal(await page.locator('#exname').getAttribute('maxlength'), '100'); await shot('97_export_settings');
await page.fill('#exname', ''); await page.locator('#exdl').click(); assert.equal(await page.locator('#exnamerr').isVisible(), true); await page.fill('#exname', 'meu-corte'); await page.locator('#exdl').click(); await page.waitForSelector('text=Exportado:', { timeout: 60000 }); const txt = await page.locator('#exres').innerText(); assert.match(txt, /Exportado: 3\.\d s, 1280×720/); await shot('10_editor_exportado');
// configuracoes, redes sociais bloqueadas, tarefas concluidas
await go('/settings/points_prompt_settings'); assert.ok(await page.getByText('Sempre ignorar confirmação').isVisible()); await go('/settings/account_authorization'); assert.ok(await page.getByText('TikTok (0 conta vinculada)').isVisible()); await shot('11_contas');
await go('/analytics'); await page.locator('#vc').click(); await page.locator('.menu a', { hasText: 'TikTok' }).click(); await page.waitForTimeout(400); assert.ok((await page.locator('#toast').innerText()).includes('OAuth'));
await go('/tasks'); assert.ok(await page.getByText('Exportado').first().isVisible());
await page.locator('[data-pub]').first().click(); await page.waitForSelector('text=Programar publicação'); assert.ok(await page.locator('#prog').isDisabled()); await page.locator('#selc').click(); assert.ok(await page.getByText('Adicione um canal').isVisible()); await shot('11b_programar_publicacao'); await page.locator('[data-c=TikTok]').click(); await page.waitForTimeout(400); assert.ok((await page.locator('#toast').innerText()).includes('OAuth')); await page.locator('.modal-bg .x').click();
// historico: menu "..." com Compartilhar / Renomear / Excluir
await go('/home'); await page.locator('.hist-i').first().hover(); await page.locator('.hist-i .more').first().click(); assert.ok(await page.locator('.menu').getByText('Compartilhar').isVisible() && await page.locator('.menu').getByText('Excluir').isVisible()); assert.equal(await page.locator('.menu-icon svg').count(), 3, 'menu tem ícones de compartilhar, renomear e excluir'); const menuRect = await page.locator('.menu').boundingBox(), moreRect = await page.locator('.hist-i .more').first().boundingBox(), sideRect = await page.locator('#side').boundingBox(); assert.ok(menuRect.x < moreRect.x, 'menu abre para dentro da barra lateral, à esquerda do botão'); assert.ok(menuRect.x + menuRect.width <= sideRect.x + sideRect.width, 'menu não invade o conteúdo principal'); assert.ok(menuRect.y < moreRect.y, 'menu aparece acima do item de histórico, como na referência'); await shot('12_historico_menu');
assert.deepEqual(errors, [], 'erros de JS: ' + errors.join(' | '));
console.log('OK ui: navegacao, planos (mensal/anual), agente (pergunta/confirmacao/bloqueio), canvas/nos, avatar (3 etapas com arquivo real), editor (corte + exportacao real), configuracoes, social bloqueado, menu do historico');
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
