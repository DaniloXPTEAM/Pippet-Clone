import assert from 'node:assert/strict';
import * as S from '../src/studio3d.mjs';

const s = S.newScene();
assert.equal(s.ratio, '21:9'); assert.equal(s.fps, 30); assert.equal(s.background.color, '#060608'); assert.deepEqual(S.validate(s), []);
// categorias observadas
assert.deepEqual(S.CATEGORIES.map((c) => c.short), ['Cena', 'Meus', 'Perso', 'Objet', 'Câme', 'Ações', 'Movi', 'Imag']);
const ia = S.CATEGORIES.find((c) => c.id === 'imagem_ia'); assert.equal(ia.premium, true); assert.equal(ia.observed, false);
assert.equal(S.CATEGORIES.find((c) => c.id === 'cameras').items.length, 15);
// personagem + acao criam no quadro 0
const c = S.addCharacter(s, 'Soco'); assert.equal(c.name, 'Personagem 1'); assert.equal(c.action.frame, 0);
// camera da visualizacao atual e movimento
const cam = S.addCamera(s, 'Visualização atual'); assert.equal(s.activeCamera, cam.id); assert.equal(cam.keys[0].az, s.view.az);
const mv = S.addCameraMove(s, 'Panorâmica para a direita'); assert.equal(mv.keys.length, 2); assert.equal(mv.keys[1].az - mv.keys[0].az, 40);
assert.throws(() => S.addCamera(s, 'Inexistente')); assert.throws(() => S.addCameraMove(s, 'x'));
// quadros-chave e interpolacao a 30 fps
const o = S.addObject(s, 'objeto', 'cubo'); S.setFrame(s, 0); S.addKeyframe(s, o.id); o.pos = [4, 0, 0]; S.setFrame(s, 30); S.addKeyframe(s, o.id);
assert.equal(S.poseAt(o, 15).pos[0], 2); assert.equal(S.poseAt(o, 99).pos[0], 4);
assert.equal(S.deleteKeyframe(s, o.id), 1); assert.equal(o.keys.length, 1);
assert.equal(S.setFrame(s, 9999), s.duration);
// projecao: ponto na origem fica proximo ao centro horizontal
const [px] = S.project([0, 0, 0], s.view, 900, 460); assert.ok(Math.abs(px - 450) < 1);
console.log('OK studio3d: categorias, camera/movimentos, quadros-chave, interpolacao, Imagem de IA marcada como nao observada');
