// Estudio de Direcao 3D (Scene3D Editor): catalogo e modelo de cena conforme captures/auth/cdp/director3d*.
// Modelos 3D e animacoes reais do Pippit sao conteudo do servico e NAO sao reproduzidos: so nomes observados, com formas primitivas locais.
// Aba "Imagem de IA" (premium): NAO OBSERVADA (nao lida); fica explicitamente marcada.
export const FPS = 30;
export const RATIOS = ['21:9', '16:9', '9:16', '1:1', '4:3'];
export const CATEGORIES = [
  { id: 'cena', label: 'Cena', short: 'Cena' },
  { id: 'meus', label: 'Meus', short: 'Meus' },
  { id: 'personagens', label: 'Personagens', short: 'Perso', groups: { Único: ['Personagem 1'], Multidão: ['Multidão (grupo)'] } },
  { id: 'objetos', label: 'Objetos', short: 'Objet', groups: {
    'Formas básicas': ['cubo', 'cone', 'cilindro', 'cápsula', 'esfera'],
    Animais: ['gato tigrado', 'papagaio verde'],
    Adereços: [], Cenas: [], Instrumentos: [], Decoração: [], 'Comida e bebidas': [], 'Esportes e fitness': [], Móveis: [], Cozinha: [], Arquitetura: [], Ferramentas: [], 'Itens do dia a dia': [], 'Armazenamento e escritório': [], Acessórios: [], Eletrônicos: [] } },
  { id: 'cameras', label: 'Câmeras', short: 'Câme', items: ['Visualização atual', 'Plano médio frontal', 'Close frontal', 'Plano aberto frontal', 'Rastreamento lateral', 'Close lateral', 'Traseira média', 'Vista superior ampla', '45° de cima', 'Contra-plongée', 'Contra-plongée aberto', 'Sobre o ombro esquerdo', 'Sobre o ombro direito', 'Vista aérea', 'Ângulo holandês'] },
  { id: 'acoes', label: 'Ações', short: 'Ações', groups: { Combate: ['Chute voador', 'Soco', 'Atirando flecha'], Desempenho: ['Dança boba'], 'Vida cotidiana': [], Movimento: [] } },
  { id: 'movimentos', label: 'Movimentos de câmera', short: 'Movi', groups: { 'Controles básicos': ['Plano estático', 'Inclinar para cima', 'Inclinar para baixo', 'Panorâmica para a esquerda', 'Panorâmica para a direita'], 'Rastreamento de personagem': [], 'Espaço aéreo': [] } },
  { id: 'imagem_ia', label: 'Imagem de IA', short: 'Imag', premium: true, observed: false },
];
// Posicoes de camera (azimute graus, elevacao graus, distancia) para os presets observados; valores sao APROXIMACOES locais (os reais nao foram lidos).
export const CAMERA_PRESETS = { 'Plano médio frontal': [0, 10, 6], 'Close frontal': [0, 8, 3], 'Plano aberto frontal': [0, 12, 12], 'Rastreamento lateral': [90, 10, 7], 'Close lateral': [90, 8, 3.5], 'Traseira média': [180, 10, 6], 'Vista superior ampla': [0, 85, 14], '45° de cima': [0, 45, 8], 'Contra-plongée': [0, -20, 6], 'Contra-plongée aberto': [0, -25, 11], 'Sobre o ombro esquerdo': [160, 12, 4], 'Sobre o ombro direito': [200, 12, 4], 'Vista aérea': [0, 70, 18], 'Ângulo holandês': [20, 15, 6] };
export const CAMERA_MOVES = { 'Plano estático': { d: [0, 0, 0] }, 'Inclinar para cima': { d: [0, 25, 0] }, 'Inclinar para baixo': { d: [0, -25, 0] }, 'Panorâmica para a esquerda': { d: [-40, 0, 0] }, 'Panorâmica para a direita': { d: [40, 0, 0] } };

export function newScene() {
  return { ratio: '21:9', fps: FPS, frame: 0, duration: 90, background: { mode: 'Cor', color: '#060608' }, transform: { scale: 100, pos: [0, 0, 0], rot: [0, 0, 0] }, display: { labels: true, snapToFloor: true, floor: true, opacity: 100, height: 0 }, view: { az: 20, el: 25, dist: 9 }, objects: [], cameras: [], activeCamera: null, nextId: 1 };
}
const id = (s, p) => `${p}${s.nextId++}`;
export function addObject(s, kind, name, extra = {}) {
  const o = { id: id(s, 'o'), kind, name, pos: [0, 0, 0], rot: [0, 0, 0], scale: 1, action: null, keys: [], ...extra }; s.objects.push(o); return o;
}
export function addCharacter(s, action = null) { const n = s.objects.filter((o) => o.kind === 'personagem').length + 1; const c = addObject(s, 'personagem', `Personagem ${n}`); if (action) setAction(s, c.id, action, 0); return c; }
export function setAction(s, objId, action, frame = 0) { const o = s.objects.find((x) => x.id === objId); if (!o) throw new Error('objeto inexistente'); o.action = { name: action, frame: clampFrame(s, frame) }; return o; }
export function addCamera(s, preset = 'Visualização atual', frame = 0) {
  const base = preset === 'Visualização atual' ? [s.view.az, s.view.el, s.view.dist] : CAMERA_PRESETS[preset]; if (!base) throw new Error('câmera desconhecida: ' + preset);
  const c = { id: id(s, 'c'), name: `Câmera ${s.cameras.length + 1}`, preset, keys: [{ frame: clampFrame(s, frame), az: base[0], el: base[1], dist: base[2] }] }; s.cameras.push(c); s.activeCamera = c.id; return c;
}
export function addCameraMove(s, move, frame = 0) {
  const m = CAMERA_MOVES[move]; if (!m) throw new Error('movimento desconhecido: ' + move); const c = addCamera(s, 'Visualização atual', frame); const k0 = c.keys[0];
  c.keys.push({ frame: clampFrame(s, frame + FPS * 2), az: k0.az + m.d[0], el: k0.el + m.d[1], dist: k0.dist + m.d[2] }); c.move = move; return c;
}
export const clampFrame = (s, f) => Math.max(0, Math.min(s.duration, Math.round(f)));
export function setFrame(s, f) { s.frame = clampFrame(s, f); return s.frame; }
export function addKeyframe(s, objId) { const o = s.objects.find((x) => x.id === objId); if (!o) throw new Error('objeto inexistente'); o.keys = o.keys.filter((k) => k.frame !== s.frame); o.keys.push({ frame: s.frame, pos: [...o.pos], rot: [...o.rot], scale: o.scale }); o.keys.sort((a, b) => a.frame - b.frame); return o.keys.length; }
export function deleteKeyframe(s, objId) { const o = s.objects.find((x) => x.id === objId); if (!o) throw new Error('objeto inexistente'); const n = o.keys.length; o.keys = o.keys.filter((k) => k.frame !== s.frame); return n - o.keys.length; }
const lerp = (a, b, t) => a + (b - a) * t;
export function poseAt(o, frame) { // interpolacao linear entre quadros-chave
  const ks = o.keys; if (!ks.length) return { pos: o.pos, rot: o.rot, scale: o.scale }; if (frame <= ks[0].frame) return ks[0]; const last = ks[ks.length - 1]; if (frame >= last.frame) return last;
  const i = ks.findIndex((k) => k.frame > frame); const a = ks[i - 1], b = ks[i]; const t = (frame - a.frame) / (b.frame - a.frame);
  return { pos: a.pos.map((v, j) => lerp(v, b.pos[j], t)), rot: a.rot.map((v, j) => lerp(v, b.rot[j], t)), scale: lerp(a.scale, b.scale, t) };
}
export function cameraAt(c, frame) { const ks = c.keys; if (frame <= ks[0].frame) return ks[0]; const l = ks[ks.length - 1]; if (frame >= l.frame) return l; const i = ks.findIndex((k) => k.frame > frame); const a = ks[i - 1], b = ks[i]; const t = (frame - a.frame) / (b.frame - a.frame); return { az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t), dist: lerp(a.dist, b.dist, t) }; }
export function removeObject(s, objId) { s.objects = s.objects.filter((o) => o.id !== objId); s.cameras = s.cameras.filter((c) => c.id !== objId); if (s.activeCamera === objId) s.activeCamera = s.cameras[0]?.id || null; }
export function project(p, cam, w, h) { // projecao em perspectiva simples: camera orbita a origem
  const az = (cam.az * Math.PI) / 180, el = (cam.el * Math.PI) / 180; const [x, y, z] = p;
  const x1 = x * Math.cos(az) - z * Math.sin(az), z1 = x * Math.sin(az) + z * Math.cos(az);
  const y2 = y * Math.cos(el) - z1 * Math.sin(el), z2 = y * Math.sin(el) + z1 * Math.cos(el); const d = cam.dist + z2; const f = (h * 0.9) / Math.max(0.5, d);
  return [w / 2 + x1 * f, h * 0.62 - y2 * f, f];
}
export function validate(s) { const errs = []; if (!RATIOS.includes(s.ratio)) errs.push('proporção inválida'); if (s.fps !== FPS) errs.push('fps deve ser 30'); return errs; }
