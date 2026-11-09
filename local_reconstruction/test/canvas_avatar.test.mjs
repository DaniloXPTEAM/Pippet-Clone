import assert from 'node:assert/strict';
import { Canvas, NODE_TYPES, GENERATION_PANELS, videoCredits } from '../src/canvas.mjs';
import { validatePhoto, canAdvance, photoAvatarAccess, videoAvatarAccess, PHOTO_STEPS } from '../src/avatar.mjs';
const c = new Canvas(1206033530372);
const p = c.addNode('Personagem'), v = c.addNode('Vídeo');
assert.equal(p.title, 'Função sem nome'); assert.ok(p.tools.every((t) => !t.enabled));
c.attachMedia(v); assert.ok(v.tools.every((t) => t.enabled)); c.link(p, v);
assert.equal(c.toJSON().file_name, 'canvas.json'); assert.equal(NODE_TYPES.length, 7);
assert.equal(videoCredits(10), GENERATION_PANELS.Vídeo.creditsFor.credits); // 370 observado
assert.throws(() => c.addNode('Inexistente'));
assert.deepEqual(PHOTO_STEPS, ['Carregar', 'Verificar', 'Enviar']);
assert.equal(validatePhoto({ mime: 'image/png', width: 512, height: 512 }).ok, true);
assert.equal(validatePhoto({ mime: 'image/gif', width: 200, height: 512 }).ok, false);
assert.equal(canAdvance({ photo: { mime: 'image/jpeg', width: 400, height: 400 }, consent: false }), false);
assert.equal(canAdvance({ photo: { mime: 'image/jpeg', width: 400, height: 400 }, consent: true }), true);
assert.deepEqual(photoAvatarAccess({ plan: 'free', usesLeft: 3 }), { ok: true, usesLeft: 2 }); // 3 -> 2 observado
assert.equal(photoAvatarAccess({ plan: 'free', usesLeft: 0 }).paywall, true);
assert.equal(videoAvatarAccess({ plan: 'free' }).ok, false); assert.equal(videoAvatarAccess({ plan: 'starter' }).creditsPerUse, 1999);
console.log('OK canvas/avatar: nós, ferramentas desabilitadas, custo 370, assistente de foto, consentimento, 3->2 usos, paywall do vídeo em avatar');
