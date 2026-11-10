import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launchChromium, skipUnavailableBrowser } from './support/browser.mjs';
import { startUiFixture } from './support/ui-fixture.mjs';

if (skipUnavailableBrowser('avatar_gallery_ui')) process.exit(0);
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = await startUiFixture('piperline-avatar-gallery-'); let browser;
try {
  const media = await import('../app/lib/media.mjs');
  browser = await launchChromium(); const page = await browser.newPage({ viewport: { width: 1568, height: 900 } }); const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${fixture.base}/#/avatars`); await page.locator('#photo-avatars').waitFor();
  assert.equal(await page.locator('#video-avatars > *').count(), 6, 'vídeo: criar + duas amostras + três espaços vazios');
  assert.equal(await page.locator('#photo-avatars > *').count(), 6, 'foto vazia: criar + duas amostras + três espaços vazios');
  assert.deepEqual(await page.locator('#video-avatars [data-avatar-sample]').evaluateAll((els) => els.map((el) => el.dataset.avatarSample)), ['Emily-Fashion-Bedroom-Sitting', 'Kavi-Marketing']);
  assert.deepEqual(await page.locator('#photo-avatars [data-avatar-sample]').evaluateAll((els) => els.map((el) => el.dataset.avatarSample)), ['Malcolm', 'Helena']);
  for (const img of await page.locator('.avatar-sample img').all()) {
    const dimensions = await img.evaluate((el) => ({ width: el.naturalWidth, height: el.naturalHeight }));
    assert.ok(dimensions.width > 0 && dimensions.height > 0, 'miniatura local carregada');
    assert.ok(Math.abs(dimensions.width / dimensions.height - 128 / 228) < 0.01, 'miniatura mantém a proporção vertical observada');
    assert.ok(await img.getAttribute('alt'));
  }
  const tile = await page.locator('#video-avatars .avatar-sample').first().boundingBox();
  assert.equal(Math.round(tile.width), 128); assert.equal(Math.round(tile.height), 228);
  const titleX = (await page.locator('.avatar-page h1').boundingBox()).x;
  assert.ok(titleX > 540 && titleX < 610, `página alinhada como na referência (x=${titleX})`);

  // Seed one locally owned photo avatar so the screenshot reflects the captured account state.
  const input = path.join(here, '../app/public/assets/avatar-samples/crys.png');
  const png = path.join(os.tmpdir(), `avatar-gallery-${Date.now()}.png`);
  const render = spawnSync(media.FFMPEG, ['-y', '-v', 'error', '-i', input, '-vf', 'scale=320:498', '-frames:v', '1', png]);
  assert.equal(render.status, 0, 'fixture de avatar gerada por FFmpeg local');
  const created = await fetch(`${fixture.base}/api/avatars/photo`, { method: 'POST', headers: { 'x-consent': 'true', 'x-avatar-name': 'Crys', 'x-avatar-voice': 'Voz local', 'content-type': 'image/png' }, body: fs.readFileSync(png) });
  assert.equal(created.status, 200); fs.rmSync(png, { force: true });
  await page.reload(); await page.locator('#photo-avatars [data-avatar-more]').waitFor();
  assert.equal(await page.locator('#photo-avatars > *').count(), 6, 'com avatar próprio, reduz um espaço vazio');
  assert.equal(await page.locator('#photo-avatars [data-avatar-more]').count(), 1);
  assert.equal(await page.locator('#photo-avatars .av-empty').count(), 2);
  await page.screenshot({ path: path.join(here, 'ui-shots/95_avatar_gallery.png') });
  assert.deepEqual(errors, []);
  console.log('avatar_gallery_ui.test.mjs: ok (layout comparado, amostras e avatar próprio; assets somente locais)');
} finally { await browser?.close(); await fixture.close(); }
