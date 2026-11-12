// UI das skills oficiais (navegador real): detalhes com guia/ferramentas/entradas/etapas vindos do servidor (REA 6.7.0), guia e pedido pré-preenchido no compositor da Home,
// formulário "Entradas que faltam" no chat e "Continuar assim mesmo". Nada é gerado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
if (skipUnavailableBrowser('skills_official_ui')) process.exit(0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sou-')); process.env.PIPPIT_LLM = 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const PORT = 5206; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
import { shotsDir } from './support/shots.mjs'; const SHOTS = shotsDir(); // rodada 10: capturas fora da árvore versionada
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());
const browser = await launchChromium(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });

// detalhes de uma skill oficial
await page.goto(base + '/#/skills'); await page.waitForSelector('.skill-card'); const card = page.locator('.skill-card', { hasText: 'Anúncios de drama' }); await card.locator('[data-d]').click(); await page.waitForSelector('#sguide');
assert.match(await page.locator('#sguide').innerText(), /Guia de uso[\s\S]*Miss any, and it'll ask before building[\s\S]*Pick a genre/); assert.match(await page.locator('#stools').innerText(), /render_video[\s\S]*sandbox_generate_video/); assert.match(await page.locator('#sparams').innerText(), /● Nome do produto e pontos fortes[\s\S]*● Gênero do drama[\s\S]*○ Referência de pessoa/); assert.match(await page.locator('#sstages').innerText(), /1\. Conferir entradas/); assert.match(await page.locator('.modal').innerText(), /Categoria: Marketing Publicidade[\s\S]*Seedance_2\.5, gpt_image_2/); await shot('90_skill_oficial_detalhes');
// usar agora: guia no compositor; skill de template pré-preenche o pedido
await page.locator('#suse').click(); await page.waitForSelector('#skillchip'); assert.match(await page.locator('#skillchip').innerText(), /Anúncios de drama/); assert.equal(await page.inputValue('#prompt'), '', 'o guia é PLACEHOLDER, não texto digitado');
const dramaGuide = (await (await fetch(base + '/api/catalog')).json()).skills.find((s) => s.id === 'anuncios-de-drama').guideWords; assert.equal(await page.getAttribute('#prompt', 'placeholder'), dramaGuide, 'placeholder = guide_words exato do servidor'); assert.match(await page.locator('#uptile').innerText(), /Please upload the product image\./); assert.equal(await page.locator('#skillrm').count(), 1); await shot('90b_skill_use_composer');
await page.goto(base + '/#/skills'); await page.waitForSelector('.skill-card'); await page.locator('.skill-card', { hasText: 'Geração em lote' }).locator('[data-d]').click(); await page.waitForSelector('#sguide'); assert.match(await page.locator('#sguide').innerText(), /Pedido pré-preenchido[\s\S]*Please generate 3 different ad scripts/); await page.locator('#suse').click(); await page.waitForSelector('#skillchip');
assert.match(await page.getAttribute('#prompt', 'placeholder'), /^Please generate 3 different ad scripts and video variations for my product\./); assert.equal(await page.inputValue('#prompt'), ''); assert.equal(await page.locator('#uptile').count(), 0, 'sem material_guide_words não há bloco de upload'); await shot('91_skill_prefill');
await page.click('#skillrm'); await page.waitForFunction(() => !document.querySelector('#skillchip')); assert.equal(await page.getAttribute('#prompt', 'placeholder'), 'Descreva suas ideias e crie com o Pippit.', 'Remover habilidade volta ao padrão');
assert.equal((await page.locator('.skill[data-s=video-de-avatar] .muted').innerText()).trim(), '↗'); assert.equal((await page.locator('.skill[data-s=anuncios-de-drama] .muted').innerText()).trim(), '↵'); await page.locator('.skill[data-s=video-de-avatar]').click(); await page.waitForSelector('#avdrawer .avd'); await page.click('#avclose'); await page.locator('.skill[data-s=foto-falante-de-ia]').click(); await page.waitForFunction(() => location.hash.startsWith('#/ai-talking-photo')); await page.goto(base + '/#/home');
// formulário de entradas faltantes no chat
const proj = await post('/api/projects', { type: 'canvas' }); const chat = await post(`/api/projects/${proj.id}/chats`); await post(`/api/projects/${proj.id}/chats/${chat.id}/messages`, { text: 'Quero um anúncio', skillId: 'anuncios-de-drama' });
await page.goto(base + '/#/project/' + proj.id); await page.waitForSelector('#siform'); assert.equal(await page.locator('#siform li').count(), 4); assert.match(await page.locator('#siform').innerText(), /Nome do produto e pontos fortes[\s\S]*Imagem do produto \(anexo\)[\s\S]*Gênero do drama[\s\S]*Proporção do vídeo/); await shot('92_entradas_faltando');
await page.click('[data-f=siskip]'); await page.waitForSelector('.msg.agent .form input[name=q]', { timeout: 15000 }); assert.ok(await page.getByText('A lição da amizade').first().isVisible());
assert.deepEqual(errors, [], 'sem erros de página');
console.log('OK skills_official_ui: detalhes (guia/ferramentas/entradas/etapas), guia e pré-preenchimento no compositor, formulário de entradas faltantes e continuar assim mesmo'); await browser.close(); server.closeAllConnections?.(); server.close(); setTimeout(() => process.exit(0), 200);
