// UI do Estudio de Direcao 3D local (tela cheia). Layout conforme captures/auth/cdp/director3d*; modelos/animacoes reais do Pippit nao reproduzidos.
import * as S3 from '/src/studio3d.mjs';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function openStudio(node, save, toast) {
  const scene = node.scene && node.scene.fps ? node.scene : S3.newScene(); let cat = 'cena', q = '', sel = null, playing = null;
  const root = document.createElement('div'); root.id = 'studio3d'; root.className = 'studio3d'; document.body.appendChild(root);
  const persist = () => save(scene);
  const items = (c) => { const out = []; if (c.items) c.items.forEach((n) => out.push({ g: '', n })); if (c.groups) for (const [g, ns] of Object.entries(c.groups)) { if (!ns.length) out.push({ g, n: null }); ns.forEach((n) => out.push({ g, n })); } return out.filter((i) => !q || (i.n || i.g).toLowerCase().includes(q.toLowerCase())); };
  const panel = () => {
    const c = S3.CATEGORIES.find((x) => x.id === cat);
    if (cat === 'cena') return `<div class="muted">Cena 3D</div><div class="tree">${scene.objects.map((o) => `<a data-sel="${o.id}" class="${sel === o.id ? 'on' : ''}">${esc(o.name)}</a>`).join('') || '<span class="muted">Cena vazia</span>'}${scene.cameras.map((k) => `<a data-sel="${k.id}" class="${sel === k.id ? 'on' : ''}">🎥 ${esc(k.name)}</a>`).join('')}</div>`;
    if (cat === 'meus') return '<div class="muted">Meus: Personagens, Objetos e Ações do usuário (vazio).</div>';
    if (c.premium) return '<div class="blocked">Imagem de IA (recurso premium): aba NÃO OBSERVADA — conteúdo não lido e não reconstruído.</div>';
    const hint = cat === 'acoes' ? '<div class="muted">Clicar cria um personagem no quadro 0 com a ação (animação real indisponível: pose local apenas).</div>' : cat === 'movimentos' ? '<div class="muted">Clicar adiciona uma câmera da visualização atual no quadro 0.</div>' : '';
    let last = null; return hint + items(c).map((i) => { const head = i.g !== last ? (last = i.g, i.g ? `<h5>${esc(i.g)}</h5>` : '') : ''; return head + (i.n ? `<button class="it" data-cat="${cat}" data-n="${esc(i.n)}">${esc(i.n)}</button>` : '<div class="muted" style="font-size:11px">(itens não lidos)</div>'); }).join('');
  };
  const right = () => {
    const o = scene.objects.find((x) => x.id === sel); const act = scene.cameras.find((k) => k.id === scene.activeCamera);
    const pv = act ? `${esc(act.name)} (${esc(act.preset)})` : 'Nenhuma câmera ativa';
    const obj = o ? `<h4>${esc(o.name)}</h4>Posição X/Y/Z <input data-p="0" value="${o.pos[0]}" size=3><input data-p="1" value="${o.pos[1]}" size=3><input data-p="2" value="${o.pos[2]}" size=3><br>Rotação Y <input data-r="1" value="${o.rot[1]}" size=4><br>Escala <input data-sc value="${o.scale}" size=4>${o.action ? `<p>Ação: ${esc(o.action.name)}</p>` : ''}<button data-key>Quadro-chave</button> <button data-del>Excluir</button>` : '';
    return `<h4>Prévia da câmera</h4><div class="camprev">${pv}</div>${obj || `<h4>Cena 3D</h4><b>Plano de fundo</b> <select data-bgm><option ${scene.background.mode === 'Textura' ? 'selected' : ''}>Textura</option><option ${scene.background.mode === 'Cor' ? 'selected' : ''}>Cor</option></select> <input type="color" data-bg value="${scene.background.color}"><br><b>Transformação da cena</b><br>Escala ${scene.transform.scale}% · Posição ${scene.transform.pos.join('/')} · Rotação ${scene.transform.rot.join('/')}<br><b>Exibição</b><br><label><input type="checkbox" data-d="labels" ${scene.display.labels ? 'checked' : ''}> Rótulos dos personagens</label><br><label><input type="checkbox" data-d="snapToFloor" ${scene.display.snapToFloor ? 'checked' : ''}> Ajustar ao chão</label><br><label><input type="checkbox" data-d="floor" ${scene.display.floor ? 'checked' : ''}> Chão</label><br>Opacidade ${scene.display.opacity}% · Altura ${scene.display.height}`}`;
  };
  const render = () => {
    root.innerHTML = `<div class="s3-top"><b>3D Director Studio</b><select data-ratio>${S3.RATIOS.map((r) => `<option ${r === scene.ratio ? 'selected' : ''}>${r}</option>`).join('')}</select><span style="flex:1"></span><button data-exit class="primary">Sair</button></div>
    <div class="s3-main"><div class="s3-left"><div class="s3-cats">${S3.CATEGORIES.map((c) => `<button data-c="${c.id}" class="${cat === c.id ? 'on' : ''}" title="${esc(c.label)}">${esc(c.short)}${c.premium ? ' ★' : ''}</button>`).join('')}</div><input placeholder="Buscar" data-q value="${esc(q)}"><div class="s3-list">${panel()}</div></div>
    <div class="s3-view"><canvas id="s3c" width="900" height="460"></canvas><div class="muted s3-hint">Girar: botão esquerdo · Mover: botão do meio · Zoom: Ctrl+roda · <a data-reset>Redefinir visualização</a></div></div><div class="s3-right">${right()}</div></div>
    <div class="s3-tl"><span>${S3.FPS} fps</span> <button data-prev>◀</button> <input type="range" data-fr min="0" max="${scene.duration}" value="${scene.frame}" style="flex:1"> <button data-next>▶</button> <button data-play>${playing ? '⏸' : '▶ Reproduzir'}</button> <span>quadro ${scene.frame}</span> <button data-kdel>Excluir quadro-chave</button></div>`;
    bind(); draw();
  };
  const draw = () => {
    const cv = root.querySelector('#s3c'); if (!cv) return; const g = cv.getContext('2d'); const W = cv.width, H = cv.height; g.fillStyle = scene.background.mode === 'Cor' ? scene.background.color : '#1a1a22'; g.fillRect(0, 0, W, H);
    const act = scene.cameras.find((k) => k.id === scene.activeCamera); const cam = scene.view; const P = (p) => S3.project(p, cam, W, H);
    if (scene.display.floor) { g.strokeStyle = '#333'; for (let i = -6; i <= 6; i++) { let a = P([i, 0, -6]), b = P([i, 0, 6]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); a = P([-6, 0, i]); b = P([6, 0, i]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
    [['#e33', [1, 0, 0]], ['#3c3', [0, 1, 0]], ['#38f', [0, 0, 1]]].forEach(([c, v]) => { const a = P([0, 0, 0]), b = P(v); g.strokeStyle = c; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    scene.objects.forEach((o) => { const ps = S3.poseAt(o, scene.frame); const [x, y, z] = ps.pos; const base = P([x, y, z]); const s = base[2] * ps.scale; g.strokeStyle = sel === o.id ? '#ff0' : '#ddd'; g.fillStyle = '#9a8cff';
      if (o.kind === 'personagem') { const hd = P([x, y + 1.7, z]); g.beginPath(); g.arc(hd[0], hd[1], 0.18 * s, 0, 7); g.stroke(); const sh = P([x, y + 1.4, z]), hp = P([x, y + 0.8, z]); g.beginPath(); g.moveTo(hd[0], hd[1] + 0.18 * s); g.lineTo(hp[0], hp[1]); g.moveTo(sh[0] - 0.5 * s, sh[1]); g.lineTo(sh[0] + 0.5 * s, sh[1]); g.moveTo(hp[0], hp[1]); g.lineTo(base[0] - 0.25 * s, base[1]); g.moveTo(hp[0], hp[1]); g.lineTo(base[0] + 0.25 * s, base[1]); g.stroke(); if (scene.display.labels) { g.fillStyle = '#fff'; g.fillText(o.name + (o.action ? ' · ' + o.action.name : ''), hd[0] - 30, hd[1] - 0.3 * s); } }
      else { g.beginPath(); if (/esfera|cápsula/.test(o.name)) g.arc(base[0], base[1] - 0.5 * s, 0.5 * s, 0, 7); else if (/cone/.test(o.name)) { g.moveTo(base[0] - 0.5 * s, base[1]); g.lineTo(base[0] + 0.5 * s, base[1]); g.lineTo(base[0], base[1] - s); g.closePath(); } else g.rect(base[0] - 0.5 * s, base[1] - s, s, s); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; g.stroke(); } });
    const pv = root.querySelector('.camprev'); if (act && pv) { const c = S3.cameraAt(act, scene.frame); pv.dataset.az = c.az.toFixed(0); }
  };
  const bind = () => {
    root.querySelector('[data-exit]').onclick = async () => { clearInterval(playing); await persist(); root.remove(); };
    root.querySelector('[data-ratio]').onchange = (e) => { scene.ratio = e.target.value; persist(); };
    root.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { cat = b.dataset.c; render(); }));
    root.querySelector('[data-q]').oninput = (e) => { q = e.target.value; const l = root.querySelector('.s3-list'); l.innerHTML = panel(); bindList(); };
    bindList();
    const fr = root.querySelector('[data-fr]'); fr.oninput = () => { S3.setFrame(scene, Number(fr.value)); render(); };
    root.querySelector('[data-prev]').onclick = () => { S3.setFrame(scene, scene.frame - 1); render(); }; root.querySelector('[data-next]').onclick = () => { S3.setFrame(scene, scene.frame + 1); render(); };
    root.querySelector('[data-play]').onclick = () => { if (playing) { clearInterval(playing); playing = null; render(); return; } playing = setInterval(() => { if (scene.frame >= scene.duration) { clearInterval(playing); playing = null; render(); return; } S3.setFrame(scene, scene.frame + 1); fr.value = scene.frame; draw(); }, 1000 / S3.FPS); render(); };
    root.querySelector('[data-kdel]').onclick = () => { if (!sel) return toast('Selecione um objeto na árvore da cena.'); const n = S3.deleteKeyframe(scene, sel); toast(n ? 'Quadro-chave excluído.' : 'Sem quadro-chave neste quadro.'); persist(); render(); };
    root.querySelector('[data-reset]').onclick = () => { Object.assign(scene.view, { az: 20, el: 25, dist: 9 }); render(); };
    const cv = root.querySelector('#s3c'); cv.onmousedown = (e) => { const sx = e.clientX, sy = e.clientY, a0 = scene.view.az, e0 = scene.view.el; const mv = (ev) => { scene.view.az = a0 + (ev.clientX - sx) * 0.4; scene.view.el = Math.max(-80, Math.min(89, e0 + (ev.clientY - sy) * 0.4)); draw(); }; const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); };
    cv.onwheel = (e) => { if (e.ctrlKey) { e.preventDefault(); scene.view.dist = Math.max(2, Math.min(40, scene.view.dist + e.deltaY * 0.01)); draw(); } };
    const bg = root.querySelector('[data-bg]'); if (bg) { bg.oninput = () => { scene.background.color = bg.value; draw(); }; root.querySelector('[data-bgm]').onchange = (e) => { scene.background.mode = e.target.value; persist(); draw(); }; }
    root.querySelectorAll('[data-d]').forEach((c) => (c.onchange = () => { scene.display[c.dataset.d] = c.checked; persist(); draw(); }));
    const o = scene.objects.find((x) => x.id === sel); if (o) {
      root.querySelectorAll('[data-p]').forEach((i) => (i.onchange = () => { o.pos[Number(i.dataset.p)] = Number(i.value) || 0; persist(); draw(); }));
      root.querySelector('[data-r]').onchange = (e) => { o.rot[1] = Number(e.target.value) || 0; persist(); }; root.querySelector('[data-sc]').onchange = (e) => { o.scale = Math.max(0.1, Number(e.target.value) || 1); persist(); draw(); };
      root.querySelector('[data-key]').onclick = () => { toast(`Quadro-chave no quadro ${scene.frame} (${S3.addKeyframe(scene, o.id)} no total).`); persist(); };
      root.querySelector('[data-del]').onclick = () => { S3.removeObject(scene, o.id); sel = null; persist(); render(); };
    }
  };
  const bindList = () => {
    root.querySelectorAll('[data-sel]').forEach((a) => (a.onclick = () => { sel = a.dataset.sel; render(); }));
    root.querySelectorAll('.it').forEach((b) => (b.onclick = () => {
      const k = b.dataset.cat, n = b.dataset.n;
      if (k === 'personagens') sel = S3.addCharacter(scene).id; else if (k === 'acoes') sel = S3.addCharacter(scene, n).id;
      else if (k === 'objetos') sel = S3.addObject(scene, 'objeto', n).id; else if (k === 'cameras') S3.addCamera(scene, n, scene.frame); else if (k === 'movimentos') S3.addCameraMove(scene, n, 0);
      persist(); cat = 'cena'; render();
    }));
  };
  render();
}
