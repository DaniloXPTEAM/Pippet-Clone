// Pacote de skill (SKILL.md em ZIP): regras e mensagens observadas nos bundles, SKILL.md, caminhos, ZIP escrito/lido (compatível com o zipfile do Python).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { LIMITS, slugify, validateMeta, checkMedia, checkCases, validatePath, isScript, buildSkillMd, parseSkillMd, validatePackage, canModify, canCreateText, zipWrite, zipRead, crc32 } from '../src/skillpkg.mjs';

assert.equal(slugify('Anúncios de Pomar!'), 'anuncios-de-pomar'); assert.equal(slugify('!!!'), ''); assert.equal(slugify('故事 Skill'), '故事-skill');
const ok = { name: 'Meu anúncio', description: 'Vídeos curtos de frutas' };
assert.equal(validateMeta(ok), null);
assert.equal(validateMeta({ name: '', description: 'x' }), 'Enter a skill name and description before saving.'); assert.equal(validateMeta({ name: 'a', description: ' ' }), 'Enter a skill name and description before saving.');
assert.equal(validateMeta({ ...ok, name: 'a'.repeat(21) }), 'The skill name cannot exceed 20 characters.'); assert.equal(validateMeta({ ...ok, name: 'a'.repeat(20) }), null);
assert.equal(validateMeta({ ...ok, name: 'nome <script>' }), 'The Skill name contains unsupported characters. Change it and try again.'); assert.equal(validateMeta({ ...ok, name: '___' }), 'The Skill name must contain Chinese characters, English letters, or numbers.');
assert.equal(validateMeta({ ...ok, description: 'd'.repeat(51) }), 'The description cannot exceed 50 characters.'); assert.equal(validateMeta({ ...ok, guideWords: 'g'.repeat(51) }), 'Guide words cannot exceed 50 characters.'); assert.equal(validateMeta({ ...ok, materialGuide: 'm'.repeat(13) }), 'Material guide words cannot exceed 12 characters.');
assert.equal(validateMeta({ ...ok, allowPublic: true }), 'Upload a skill cover before making your skill public.'); assert.equal(validateMeta({ ...ok, allowPublic: true, cover: 'c' }), 'Choose a category before making your skill public.'); assert.equal(validateMeta({ ...ok, allowPublic: true, cover: 'c', tags: ['Marketing'] }), 'Choose an output type before making your skill public.'); assert.equal(validateMeta({ ...ok, allowPublic: true, cover: 'c', tags: ['Marketing'], outputGenre: 'video' }), null);
assert.equal(checkMedia({ kind: 'image', size: 11 * 1048576, name: 'a.png' }), 'Images must be 10 MB or smaller.'); assert.equal(checkMedia({ kind: 'video', size: 51 * 1048576, name: 'a.mp4' }), 'Videos must be 50 MB or smaller.'); assert.equal(checkMedia({ kind: 'video', size: 1, name: 'a.mpeg' }), 'MPG and MPEG videos are not supported yet.'); assert.equal(checkMedia({ kind: 'video', size: 1, name: 'a.mp4' }), null);
assert.equal(checkCases(6), null); assert.equal(checkCases(7), 'You can upload up to 6 showcase items.');
assert.equal(validatePath('refs/a.md'), null); for (const bad of ['', '/a.md', 'a\\b.md', '../a.md', 'a//b.md', 'a/./b.md']) assert.equal(validatePath(bad), 'Use a unique, valid file path.', bad); assert.equal(validatePath('a.md', ['a.md']), 'Use a unique, valid file path.');
assert.ok(isScript('run.sh') && isScript('x.PY') && isScript('a/b.exe') && !isScript('notes.md')); assert.equal(canModify('SKILL.md'), false); assert.equal(canModify('refs/a.md'), true); assert.equal(canCreateText('a.md'), true); assert.equal(canCreateText('a.txt'), false);
// SKILL.md
const md = buildSkillMd({ name: 'Meu anúncio', description: 'Vídeos curtos', body: '## O que faz\nGera vídeos.' }); assert.match(md, /^---\nname: meu-anuncio\ndescription: Vídeos curtos\n---\n\n## O que faz/); assert.deepEqual(parseSkillMd(md), { name: 'meu-anuncio', description: 'Vídeos curtos', body: '## O que faz\nGera vídeos.' }); assert.equal(parseSkillMd('só texto').body, 'só texto');
// pacote
assert.deepEqual(validatePackage({ 'SKILL.md': md, 'refs/guia.md': '# x' }), []); assert.deepEqual(validatePackage({ 'refs/guia.md': 'x' }), ['The Skill package must include SKILL.md.']);
assert.ok(validatePackage({ 'SKILL.md': md, 'run.sh': 'echo' }).some((e) => /cannot contain scripts or executable files. Remove run\.sh/.test(e))); assert.ok(validatePackage({ 'SKILL.md': md, '../x.md': 'x' }).some((e) => /valid file path/.test(e)));
// ZIP: ida e volta (texto + binário + pasta)
const bin = Buffer.from([0, 1, 2, 3, 255, 254, 0, 9]); const files = { 'SKILL.md': md, 'refs/guia.md': '# Guia\n' + 'linha repetida\n'.repeat(200), 'assets/ico.png': { b64: bin.toString('base64') } };
const z = zipWrite(files); const back = zipRead(z); assert.deepEqual(back.errors, []); assert.deepEqual(back.files, files); assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
assert.ok(z.length < Buffer.byteLength(files['refs/guia.md']), 'deflate reduz o arquivo repetitivo');
assert.deepEqual(zipRead(Buffer.from('nao é zip')).errors, ['The file is not a valid ZIP package.']); assert.match(zipRead(Buffer.alloc(6 * 1048576)).errors[0], /larger than 5 MB/);
// compatibilidade com o zipfile do Python: nosso ZIP abre lá e um ZIP do Python (com pasta raiz) abre aqui
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pippit-zip-')); fs.writeFileSync(path.join(tmp, 'a.zip'), z);
const py = spawnSync('python', ['-c', `import zipfile,sys;z=zipfile.ZipFile(r'${path.join(tmp, 'a.zip')}');assert z.testzip() is None;print(sorted(z.namelist()))\nz2=zipfile.ZipFile(r'${path.join(tmp, 'b.zip')}','w',zipfile.ZIP_DEFLATED);z2.writestr('minha-skill/SKILL.md','---\\nname: x\\ndescription: y\\n---\\n\\ncorpo');z2.writestr('minha-skill/refs/a.md','a');z2.writestr('__MACOSX/lixo','z');z2.close()`], { encoding: 'utf8' });
if (py.status === 0) { assert.match(py.stdout, /SKILL\.md.*assets\/ico\.png|assets\/ico\.png.*SKILL\.md|refs\/guia\.md/); const r = zipRead(fs.readFileSync(path.join(tmp, 'b.zip'))); assert.deepEqual(r.errors, []); assert.deepEqual(Object.keys(r.files).sort(), ['SKILL.md', 'refs/a.md']); assert.equal(parseSkillMd(r.files['SKILL.md']).body, 'corpo'); } else console.log('python indisponível: compatibilidade ZIP ignorada');
console.log('OK skillpkg: regras/mensagens observadas, SKILL.md, caminhos, ZIP ida e volta e compatível com Python'); void LIMITS;
