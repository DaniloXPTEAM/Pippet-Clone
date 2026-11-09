// Skills como pacotes SKILL.md (API): criação manual com as validações observadas, edição de arquivos do pacote, ZIP (download/importação) e regras de mídia/publicação.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-sk-')); process.env.PIPPIT_LLM ??= 'off'; process.env.PIPPIT_LOCAL_DATA = tmp;
const { server } = await import('../app/server.mjs'); const SP = await import('../src/skillpkg.mjs');
const PORT = 5218; await new Promise((r) => server.listen(PORT, '127.0.0.1', r)); const base = `http://127.0.0.1:${PORT}`;
const j = async (p, o = {}) => { const r = await fetch(base + p, o); return { status: r.status, body: await r.json() }; };
const send = (m, p, b) => j(p, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const post = (p, b) => send('POST', p, b); const put = (p, b) => send('PUT', p, b);
const up = async (buf, name, type) => (await j('/api/assets', { method: 'POST', headers: { 'x-file-name': name, 'content-type': type }, body: buf })).body;

// validações (mensagens do original)
const msg = async (b) => (await post('/api/skills/custom', b)).body.error;
assert.equal(await msg({ name: '', description: 'x', content: 'c' }), 'Enter a skill name and description before saving.'); assert.equal(await msg({ name: 'a'.repeat(21), description: 'x', content: 'c' }), 'The skill name cannot exceed 20 characters.');
assert.equal(await msg({ name: 'ok', description: 'd'.repeat(51), content: 'c' }), 'The description cannot exceed 50 characters.'); assert.equal(await msg({ name: 'ok', description: 'd', materialGuide: 'm'.repeat(13), content: 'c' }), 'Material guide words cannot exceed 12 characters.');
assert.match(await msg({ name: 'ok', description: 'd' }), /instruções/); assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', allowPublic: true }), 'Upload a skill cover before making your skill public.');
assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', outputGenre: 'x' }), 'tipo de saída inválido');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'); const cover = await up(png, 'capa.png', 'image/png'); assert.equal(cover.kind, 'image');
assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', allowPublic: true, cover: cover.id }), 'Choose a category before making your skill public.'); assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', allowPublic: true, cover: cover.id, tags: ['Drama curto'] }), 'Choose an output type before making your skill public.');
const big = await up(Buffer.alloc(11 * 1048576, 1), 'enorme.png', 'image/png'); assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', cover: big.id }), 'Images must be 10 MB or smaller.');
assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', cases: Array(7).fill(cover.id) }), 'You can upload up to 6 showcase items.');
assert.equal(await msg({ name: 'ok', description: 'd', content: 'c', files: { 'run.sh': 'echo' } }), 'Skill packages cannot contain scripts or executable files. Remove run.sh before saving.');

// criação válida (pública) e leitura
const sk = (await post('/api/skills/custom', { name: 'Anúncio curto', description: 'Vídeos de 15 s em 9:16', content: '## O que faz\nGera anúncios.', guideWords: 'descreva o produto', materialGuide: 'foto', tags: ['Marketing Publicidade'], outputGenre: 'video', defaultVideoModel: 'Dreamina Seedance 2.5', allowPublic: true, cover: cover.id, files: { 'refs/guia.md': '# Guia' } })).body;
assert.match(sk.id, /^custom-/); assert.deepEqual(sk.files.sort(), ['SKILL.md', 'refs/guia.md']); assert.equal(sk.instructions, '## O que faz\nGera anúncios.'); assert.equal(sk.allowPublic, true); assert.equal(sk.tag, 'Minhas skills');
const full = (await j('/api/skills/custom/' + sk.id)).body; assert.match(full.contents['SKILL.md'], /^---\nname: anuncio-curto\ndescription: Vídeos de 15 s em 9:16\n---\n\n## O que faz/); assert.equal(full.contents['refs/guia.md'], '# Guia');
assert.equal((await j('/api/skills/custom/nao-existe')).status, 404);

// edição do pacote: SKILL.md protegido, só Markdown novo, sem scripts, caminhos válidos
assert.equal((await put('/api/skills/custom/' + sk.id, { files: { 'refs/guia.md': 'x' } })).body.error, 'SKILL.md cannot be renamed or deleted.');
assert.match((await put('/api/skills/custom/' + sk.id, { files: { 'SKILL.md': full.contents['SKILL.md'], 'x.sh': 'a' } })).body.error, /scripts or executable/); assert.equal((await put('/api/skills/custom/' + sk.id, { files: { 'SKILL.md': full.contents['SKILL.md'], 'notas.txt': 'a' } })).body.error, 'Only Markdown files can be created here.');
assert.equal((await put('/api/skills/custom/' + sk.id, { files: { 'SKILL.md': full.contents['SKILL.md'], '../fora.md': 'a' } })).status, 400);
let ed = (await put('/api/skills/custom/' + sk.id, { files: { 'SKILL.md': full.contents['SKILL.md'].replace('Gera anúncios.', 'Gera anúncios curtos.'), 'refs/novo.md': '# Novo' } })).body; assert.deepEqual(ed.files.sort(), ['SKILL.md', 'refs/novo.md']); assert.match(ed.instructions, /anúncios curtos/);
ed = (await put('/api/skills/custom/' + sk.id, { name: 'Anúncio longo', description: 'Nova descrição', content: '## Novo corpo' })).body; assert.equal(ed.name, 'Anúncio longo'); assert.equal(ed.instructions, '## Novo corpo'); assert.match((await j('/api/skills/custom/' + sk.id)).body.contents['SKILL.md'], /name: anuncio-longo\ndescription: Nova descrição/);
assert.equal((await put('/api/skills/custom/' + sk.id, { name: 'n'.repeat(21) })).body.error, 'The skill name cannot exceed 20 characters.');

// ZIP: download e importação
const z = Buffer.from(await (await fetch(`${base}/api/skills/custom/${sk.id}/zip`)).arrayBuffer()); const rz = SP.zipRead(z); assert.deepEqual(rz.errors, []); assert.ok('SKILL.md' in rz.files);
const imp = (zip, name = 'skill.zip') => j('/api/skills/import', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name) }, body: zip });
const good = (await imp(SP.zipWrite({ 'SKILL.md': SP.buildSkillMd({ name: 'Importada', description: 'vinda de ZIP', body: 'corpo' }), 'refs/a.md': 'a' }))).body; assert.equal(good.name, 'importada'); assert.deepEqual(good.files.sort(), ['SKILL.md', 'refs/a.md']); assert.equal(good.instructions, 'corpo');
assert.equal((await imp(Buffer.from('nao e zip'))).body.error, 'The file is not a valid ZIP package.'); assert.equal((await imp(SP.zipWrite({ 'refs/a.md': 'a' }))).body.error, 'The Skill package must include SKILL.md.');
assert.match((await imp(SP.zipWrite({ 'SKILL.md': SP.buildSkillMd({ name: 'x', description: 'd', body: 'b' }), 'a.py': 'print(1)' }))).body.error, /scripts or executable files\. Remove a\.py/);
assert.equal((await imp(SP.zipWrite({ 'SKILL.md': '---\nname: x\ndescription: ' + 'd'.repeat(51) + '\n---\nb' }))).body.error, 'The description cannot exceed 50 characters.');
// estado, favoritos e exclusão
let st = (await j('/api/skills/state')).body; assert.equal(st.custom.length, 2); assert.equal(st.limits.name, 20); await post('/api/skills/favorite', { id: sk.id, on: true });
st = (await j('/api/skills/custom/' + sk.id, { method: 'DELETE' })).body; assert.equal(st.custom.length, 1); assert.ok(!st.favorites.includes(sk.id));
console.log('OK skills: pacote SKILL.md (validações observadas, edição protegida, ZIP download/import, mídia/publicação)'); server.close(); process.exit(0);
