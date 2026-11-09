// UI de skills como pacotes: formulário completo, editor do pacote (SKILL.md protegido, só Markdown novo), importar ZIP e baixar ZIP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Dannilo/AppData/Local/npm-cache/_npx/9b9809298fe40d2c/node_modules/rea-agents/package.json');
const { chromium } = require('playwright-core');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sui-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const SP = await import('../src/skillpkg.mjs');
const PORT = 5219; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const SHOTS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'ui-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
const api = async (p) => (await fetch(base + p)).json();
await page.goto(base + '/#/skills'); await page.waitForSelector('#mk');
// formulário completo: validação (limites) e salvar
await page.click('#mk'); await page.getByText('Criar manualmente', { exact: true }).click(); await page.waitForSelector('#sks');
await page.fill('#skn', 'n'.repeat(21)); await page.fill('#skd', 'descrição'); await page.fill('#ski', '## O que faz\nGera anúncios.'); await page.click('#sks'); await page.waitForFunction(() => document.querySelector('#skerr')?.textContent);
assert.equal(await page.locator('#skerr').innerText(), 'The skill name cannot exceed 20 characters.');
await page.fill('#skn', 'Anúncio curto'); await page.fill('#skg', 'descreva o produto'); await page.locator('[data-tag="Marketing Publicidade"]').check(); await shot('50_skill_form'); await page.click('#sks'); await page.waitForSelector('.skill-card:has-text("Anúncio curto")');
// editor do pacote
page.on('dialog', async (d) => { await d.accept(d.message().startsWith('Nome do arquivo') ? 'refs/guia.md' : 'refs/guia2.md'); });
await page.locator('.skill-card', { hasText: 'Anúncio curto' }).locator('[data-d]').click(); await page.click('#spk'); await page.waitForSelector('#pkt');
assert.match(await page.inputValue('#pkt'), /Gera anúncios/); await page.click('#pkd'); await page.waitForFunction(() => /SKILL\.md cannot be renamed or deleted/.test(document.querySelector('#pkerr')?.textContent || '')); await page.click('#pkr'); assert.match(await page.locator('#pkerr').innerText(), /SKILL\.md cannot be renamed/);
await page.click('#pka'); await page.waitForFunction(() => document.querySelector('#pkh')?.textContent === 'refs/guia.md'); await page.fill('#pkt', '# Guia de estilo'); await shot('51_skill_package');
await page.click('#pks'); await page.waitForSelector('.skill-card'); const sks = (await api('/api/skills/state')).custom; assert.equal(sks.length, 1); const full = await api('/api/skills/custom/' + sks[0].id); assert.equal(full.contents['refs/guia.md'], '# Guia de estilo'); assert.deepEqual(full.tags, ['Marketing Publicidade']); assert.equal(full.guideWords, 'descreva o produto');
// baixar ZIP (link) e importar ZIP pelo menu
await page.locator('.skill-card', { hasText: 'Anúncio curto' }).locator('[data-d]').click(); const href = await page.locator('a[href$="/zip"]').getAttribute('href'); assert.match(href, /\/api\/skills\/custom\/custom-\d+\/zip$/); await page.evaluate(() => document.querySelectorAll('.modal-bg').forEach((m) => m.remove()));
const zip = path.join(tmp, 'importar.zip'); fs.writeFileSync(zip, SP.zipWrite({ 'SKILL.md': SP.buildSkillMd({ name: 'De ZIP', description: 'importada', body: 'corpo' }) }));
await page.click('#mk'); const fc = page.waitForEvent('filechooser'); await page.getByText('Enviar skill', { exact: false }).click(); (await fc).setFiles(zip); await page.waitForSelector('.skill-card:has-text("de-zip")'); assert.equal((await api('/api/skills/state')).custom.length, 2);
assert.deepEqual(errors, []); await browser.close(); server.close(); console.log('OK skills_ui: formulário com limites, editor do pacote (SKILL.md protegido), ZIP'); process.exit(0);
