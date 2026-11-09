import re
p = 'C:/w/PiperLine/local_reconstruction/app/public/app.js'
s = open(p, encoding='utf-8').read()

# 1) barra inferior esquerda + centro por tipo + dica do rodapé (story)
old_center = '<div class="cv-add"><button class="primary" id="addN" aria-label="Adicionar nó">＋ Adicionar nó</button><button id="lib">Biblioteca de recursos</button><button id="hlp">?</button></div><div class="cv-tools"><button id="fit">Ajustar à tela</button><button id="hideEd">Ocultar conexões</button><button id="shareB">Compartilhar tela</button></div></div>'
assert old_center in s
new_center = '''<div class="cv-add"><button class="primary" id="addN" aria-label="Adicionar nó">＋ Adicionar nó</button>${p.type === 'story' ? '<button id="tut" title="Abrir o tutorial" aria-label="Abrir o tutorial">📖</button><button id="kbd" title="Atalhos" aria-label="Abrir instruções de atalhos">⌨</button><button id="ptr" title="Ponteiro" aria-label="Ferramenta de ponteiro">➤</button>' : '<button id="lib">Biblioteca de recursos</button><button id="hlp">?</button>'}</div>
   <div class="cv-tools cv-bar">${p.type === 'story' ? '<button id="assetm" title="Abrir a biblioteca de ativos">▤ Gerenciamento de ativos</button>' : ''}<button id="zfit" title="Ajustar o zoom à tela" aria-label="Ajustar o zoom à tela">⟲</button><button id="hideEd" title="Ocultar conexões" aria-label="Ocultar conexões">⌇</button><button id="fit" title="Organizar a tela" aria-label="Organizar a tela">▦</button><button id="hidevar" title="Ocultar variações geradas" aria-label="Ocultar variações geradas">⑂</button><button id="minimap" title="Mostrar minimapa" aria-label="Mostrar minimapa">◎</button><button id="snap" title="Alinhar à grade" aria-label="Alinhar à grade">⌖</button><button id="mtrack" class="on" title="Modo trackpad: deslize com dois dedos para mover a tela" aria-label="Modo trackpad">▭</button><button id="mmouse" title="Modo mouse: role para dar zoom na tela" aria-label="Modo mouse">▯</button><button id="zopt" title="Opções de zoom" aria-label="Opções de zoom">100%</button></div>
   ${p.type === 'story' ? '<div class="cv-hint" id="hint"><button id="hintx" aria-label="Expandir o próximo passo">◉</button><span id="hinttx">Confirme personagens e cenas e depois gere o roteiro do storyboard</span><button id="hintgo" aria-label="Ir para a geração do roteiro do storyboard">→</button></div>' : ''}</div>'''
s = s.replace(old_center, new_center, 1)
s = s.replace('<span class="cv-pill">', '<span class="cv-pill">', 1)

# compartilhar tela: ícone no cluster do canto superior direito
old_right = '</span>${credits()}</div>'
assert old_right in s
s = s.replace(old_right, '</span>${credits()}<button id="shareB" class="cv-share" title="Compartilhar tela" aria-label="Compartilhar tela">⤴</button></div>', 1)

# 2) arrastar considera o zoom; encaixe na grade
old_drag = "n.x = ox + ev.clientX - sx; n.y = oy + ev.clientY - sy;"
assert old_drag in s
s = s.replace(old_drag, "n.x = ox + (ev.clientX - sx) / (window.__cvz || 1); n.y = oy + (ev.clientY - sy) / (window.__cvz || 1); if (window.__snap) { n.x = Math.round(n.x / 20) * 20; n.y = Math.round(n.y / 20) * 20; }", 1)

# 3) hideEd: agora ícone (título muda)
old_hide = "$('#hideEd').onclick = (e) => { const s = $('#edges'); s.style.display = s.style.display === 'none' ? '' : 'none'; e.target.textContent = s.style.display === 'none' ? 'Mostrar conexões' : 'Ocultar conexões'; };"
assert old_hide in s
s = s.replace(old_hide, "$('#hideEd').onclick = (e) => { const s = $('#edges'); s.style.display = s.style.display === 'none' ? '' : 'none'; const off = s.style.display === 'none'; e.currentTarget.title = off ? 'Mostrar conexões' : 'Ocultar conexões'; e.currentTarget.classList.toggle('on', off); };", 1)

# 4) lib/hlp só no canvas comum
s = s.replace("$('#hlp').onclick = () =>", "if ($('#hlp')) $('#hlp').onclick = () =>", 1)
old_lib = "$('#lib').onclick = () => pickAsset("
assert old_lib in s
s = s.replace(old_lib, "if ($('#lib')) $('#lib').onclick = () => pickAsset(", 1)

# 5) menu Add node: ordem e descrições observadas
old_add = "$('#addN').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.top - 290, CAT.nodeTypes.map((t) => ({ label: t, fn: () => addNode(t) }))); };"
assert old_add in s
new_add = "$('#addN').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); const ord = ['Personagem', 'Cena', 'Estúdio de direção 3D', 'Texto', 'Imagem', 'Vídeo', 'Áudio']; const types = [...ord.filter((t) => CAT.nodeTypes.includes(t)), ...CAT.nodeTypes.filter((t) => !ord.includes(t))]; menuAt(r.left, r.top - 380, [{ label: 'Adicionar nó', cls: 'muted' }, ...types.map((t) => ({ label: t === 'Estúdio de direção 3D' ? t + ' (Novo)' : t, desc: t === 'Personagem' ? 'Novos personagens da peça, novas imagens de personagens existentes' : '', fn: () => addNode(t) }))]); };"
s = s.replace(old_add, new_add, 1)

# 6) novos controles
marker = "  const share = async () =>"
assert marker in s
ctl = r'''  const CVZ = () => window.__cvz || 1; const applyV = () => { const z = CVZ(), q = window.__cvp || { x: 0, y: 0 }; $('#cvin').style.transformOrigin = '0 0'; $('#cvin').style.transform = `translate(${q.x}px, ${q.y}px) scale(${z})`; $('#zopt').textContent = Math.round(z * 100) + '%'; };
  const setZ = (z) => { window.__cvz = Math.min(4, Math.max(0.1, Math.round(z * 100) / 100)); applyV(); drawMini(); }; window.__cvz = window.__cvz || 1; window.__cvp = { x: 0, y: 0 };
  const fitZ = () => { const nn = CUR.canvas.nodes; if (!nn.length) return setZ(1); const mx = Math.max(...nn.map((n) => (n.x ?? 60) + 300)), my = Math.max(...nn.map((n) => (n.y ?? 90) + 380)); setZ(Math.min(1, $('#cv').clientWidth / mx, $('#cv').clientHeight / my)); };
  const drawMini = () => { const m = $('#cvmini'); if (!m) return; m.innerHTML = CUR.canvas.nodes.map((n) => `<i style="left:${(n.x ?? 60) / 12}px;top:${(n.y ?? 90) / 12}px"></i>`).join(''); };
  $('#zfit').onclick = fitZ; applyV();
  $('#zopt').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); menuAt(r.left, r.top - 230, [{ label: Math.round(CVZ() * 100) + ' %', cls: 'muted' }, { label: 'Diminuir zoom   Ctrl -', fn: () => setZ(CVZ() - 0.1) }, { label: 'Aumentar zoom   Ctrl +', fn: () => setZ(CVZ() + 0.1) }, { label: 'Ajustar à tela   Ctrl 0', fn: fitZ }, { label: 'Zoom em 50%', fn: () => setZ(0.5) }, { label: 'Zoom em 100%', fn: () => setZ(1) }]); };
  $('#minimap').onclick = (e) => { const on = !$('#cvmini'); if (on) { const m = h('<div class="cv-mini" id="cvmini" aria-label="Minimapa"></div>'); $('#cv').appendChild(m); drawMini(); } else $('#cvmini').remove(); e.currentTarget.classList.toggle('on', on); e.currentTarget.title = on ? 'Ocultar minimapa' : 'Mostrar minimapa'; };
  $('#snap').onclick = (e) => { window.__snap = !window.__snap; e.currentTarget.classList.toggle('on', window.__snap); e.currentTarget.title = window.__snap ? 'Desativar alinhamento à grade' : 'Alinhar à grade'; };
  $('#hidevar').onclick = (e) => { const on = !$('#cv').classList.contains('hide-var'); $('#cv').classList.toggle('hide-var', on); e.currentTarget.classList.toggle('on', on); e.currentTarget.title = on ? 'Mostrar variações geradas' : 'Ocultar variações geradas'; };
  const mode = (m) => { window.__cvmode = m; $('#mtrack').classList.toggle('on', m === 'track'); $('#mmouse').classList.toggle('on', m === 'mouse'); }; window.__cvmode = window.__cvmode || 'track'; mode(window.__cvmode); $('#mtrack').onclick = () => mode('track'); $('#mmouse').onclick = () => mode('mouse');
  $('#cv').onwheel = (e) => { if (e.target.closest('textarea,video,audio,.chat')) return; e.preventDefault(); if (window.__cvmode === 'mouse' || e.ctrlKey) setZ(CVZ() * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); else { window.__cvp = { x: window.__cvp.x - e.deltaX, y: window.__cvp.y - e.deltaY }; applyV(); } };
  let KEYS = (e) => { if (!$('#cv')) return document.removeEventListener('keydown', KEYS); if (e.target.closest('textarea,input')) return; if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZ(CVZ() + 0.1); } else if (e.ctrlKey && e.key === '-') { e.preventDefault(); setZ(CVZ() - 0.1); } else if (e.ctrlKey && e.key === '0') { e.preventDefault(); fitZ(); } else if (e.key === 'h' || e.key === 'H') window.__tool = 'hand'; else if (e.key === 'v' || e.key === 'V') window.__tool = 'move'; };
  if (window.__cvkeys) document.removeEventListener('keydown', window.__cvkeys); window.__cvkeys = KEYS; document.addEventListener('keydown', KEYS);
  $('#cv').onmousedown = (e) => { if (window.__tool !== 'hand' || e.target.closest('.node,.cv-bar,.cv-add,.cv-top,.cv-right,.cv-hint')) return; let sx = e.clientX, sy = e.clientY; const o = { ...window.__cvp }; const mv = (ev) => { window.__cvp = { x: o.x + ev.clientX - sx, y: o.y + ev.clientY - sy }; applyV(); }; const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); };
  if ($('#tut')) $('#tut').onclick = () => window.open('https://bytedance.larkoffice.com/docx/PIfod47yZoM6b6xMQpvcDb1vnXe', '_blank', 'noopener');
  if ($('#kbd')) $('#kbd').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); const rows = [['Criar', ''], ['Agrupar', 'Ctrl G'], ['Desagrupar', 'Ctrl Shift G'], ['Gerar', 'Ctrl Enter'], ['Adicionar nó', 'Tab'], ['Duplicar nó', 'Alt + arrastar'], ['Criar cópia', 'Ctrl Alt + arrastar'], ['Zoom', ''], ['Aumentar zoom', 'Ctrl +'], ['Diminuir zoom', 'Ctrl -'], ['Ajustar à tela', 'Ctrl 0'], ['Zoom do trackpad', 'Pinça'], ['Zoom do mouse', 'Ctrl + rolar'], ['Mover', ''], ['Mover a tela', 'Espaço + arrastar'], ['Mover com trackpad', 'Deslizar'], ['Organizar', 'Alt Shift F'], ['Geral', ''], ['Localizar', 'Ctrl F'], ['Desfazer', 'Ctrl Z'], ['Refazer', 'Ctrl Y'], ['Selecionar tudo', 'Ctrl A'], ['Excluir', 'Delete']]; const m = h(`<div class="kbd-pop" style="left:${Math.max(8, r.left - 40)}px;top:${Math.max(8, r.top - 520)}px">${rows.map(([a, b]) => (b ? `<div class="kr"><span>${a}</span><kbd>${b}</kbd></div>` : `<b>${a}</b>`)).join('')}</div>`); document.body.appendChild(m); setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0); };
  if ($('#ptr')) $('#ptr').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); menuAt(r.left, r.top - 90, [{ label: 'Mover   V', fn: () => (window.__tool = 'move') }, { label: 'Ferramenta mão   H', fn: () => (window.__tool = 'hand') }]); };
  if ($('#assetm')) $('#assetm').onclick = () => { const ex = $('#assetpanel'); if (ex) return ex.remove(); const nn = CUR.canvas.nodes.filter((n) => n.assetId); const pn = h(`<div class="asset-panel" id="assetpanel"><b>Ativos de produção</b><div class="row"><span class="pill">Todos os episódios</span><span class="pill">Grupo</span><button id="apc">Recolher</button></div>${nn.length} item(ns)<div>${nn.map((n) => { const a = (window.__assets || []).find((x) => x.id === n.assetId); return a ? `<div class="ap-i">${esc(a.name)} <span class="muted">${a.duration ? '0:' + String(Math.round(a.duration)).padStart(2, '0') : ''}</span></div>` : ''; }).join('')}</div></div>`); $('#cv').appendChild(pn); $('#apc', pn).onclick = () => pn.remove(); };
  if ($('#hintx')) $('#hintx').onclick = () => { const t = $('#hinttx'), g = $('#hintgo'); const on = t.style.display === 'none'; t.style.display = on ? '' : 'none'; g.style.display = on ? '' : 'none'; };
  if ($('#hintgo')) $('#hintgo').onclick = () => toast('Gerar o roteiro do storyboard exige IA de roteiro e vídeo (sem provedor local): nada foi gerado nem debitado.', 6000);
'''
s = s.replace(marker, ctl + marker, 1)

# 7) nó de vídeo: título com ícone e botão de reprodução sobre a prévia
old_vid = "(a.kind === 'video' ? `<video controls src=\"/files/${a.stored}\"></video>`"
assert old_vid in s
s = s.replace(old_vid, "(a.kind === 'video' ? `<div class=\"vnode\"><video controls src=\"/files/${a.stored}\"></video><button class=\"vplay\" data-play aria-label=\"Reproduzir prévia\">▶</button></div>`", 1)
old_lab = "<div class=\"lab\">${esc(n.type === 'Personagem' ? 'Função sem nome' : n.type)}</div>"
assert old_lab in s
s = s.replace(old_lab, "<div class=\"lab\">${n.type === 'Vídeo' && a ? '▣ ' + esc(n.title || a.name) : esc(n.type === 'Personagem' ? 'Função sem nome' : n.type)}</div>", 1)
old_t = "    const t = $('[data-txt]', el); if (t) t.onchange ="
assert old_t in s
s = s.replace(old_t, "    const pl = $('[data-play]', el); if (pl) { const v = $('video', el); pl.onclick = (ev) => { ev.stopPropagation(); v.play(); }; v.onplay = () => (pl.style.display = 'none'); v.onpause = () => (pl.style.display = ''); v.onended = () => (pl.style.display = ''); }\n" + old_t, 1)
open(p, 'w', encoding='utf-8').write(s)

c = open('C:/w/PiperLine/local_reconstruction/app/public/style.css', encoding='utf-8').read()
c += '''
.cv-bar { top:auto !important; bottom:14px; left:14px; gap:4px !important; } .cv-bar button { border:0; background:transparent; min-width:30px; height:30px; border-radius:8px; cursor:pointer; padding:0 6px; } .cv-bar button.on { background:#ececf0; box-shadow:inset 0 0 0 1px #d4d4da; } .cv-share { border:0; background:#fff; width:34px; height:34px; border-radius:50%; cursor:pointer; }
.cv-hint { position:absolute; right:16px; bottom:16px; z-index:4; background:#fff; border-radius:26px; padding:8px 10px 8px 12px; display:flex; gap:10px; align-items:center; box-shadow:0 2px 10px rgba(0,0,0,.1); } .cv-hint button { border:0; border-radius:50%; width:34px; height:34px; cursor:pointer; background:#f1f1f3; }
.cv-mini { position:absolute; right:16px; bottom:70px; width:180px; height:110px; background:#fff; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.15); z-index:4; overflow:hidden; } .cv-mini i { position:absolute; width:14px; height:18px; background:#a78bfa; border-radius:3px; }
.kbd-pop { position:fixed; z-index:70; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,.2); padding:14px; width:280px; max-height:500px; overflow:auto; } .kbd-pop b { display:block; margin:10px 0 4px; } .kbd-pop .kr { display:flex; justify-content:space-between; padding:3px 0; } .kbd-pop kbd { background:#f1f1f3; border-radius:6px; padding:1px 6px; font-size:12px; }
.asset-panel { position:absolute; left:14px; bottom:64px; width:300px; max-height:60%; overflow:auto; background:#fff; border-radius:16px; box-shadow:0 2px 14px rgba(0,0,0,.15); padding:14px; z-index:5; } .ap-i { padding:6px 0; border-top:1px solid #eee; }
.vnode { position:relative; } .vplay { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:52px; height:52px; border-radius:50%; border:0; background:rgba(40,25,20,.75); color:#fff; font-size:20px; cursor:pointer; } .hide-var .node-variant { display:none; }
'''
open('C:/w/PiperLine/local_reconstruction/app/public/style.css', 'w', encoding='utf-8').write(c)
print('ok')
