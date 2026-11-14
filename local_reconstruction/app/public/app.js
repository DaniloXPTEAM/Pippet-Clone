// Frontend da reconstrução local do Pippit (SPA sem dependências). Estrutura e rótulos conforme PIPPIT_SITEMAP_AND_BUTTONS.md.
import { openStudio } from '/studio3d-ui.js';
import { IC } from '/icons.js';
const $ = (s, r = document) => r.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = async (p, o = {}) => { const r = await fetch(p, o); let b = null; try { b = await r.json(); } catch {}
  if (r.status === 401 && b?.authRequired && !String(p).startsWith('/api/auth/') && location.hash !== '#/login') location.hash = '/login';
  return { status: r.status, ok: r.ok, body: b }; };
const post = (p, b) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const patch = (p, b) => api(p, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const put = (p, b) => api(p, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
let ST = null, CAT = null, PROJECTS = [], LANGS = [];
const toast = (m, ms = 3500) => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), ms); };
function modal(html, cls = '') { const bg = h(`<div class="modal-bg"><div class="modal ${cls}"><button class="x" aria-label="Fechar">×</button>${html}</div></div>`); $('#overlay').appendChild(bg); const close = () => bg.remove(); $('.x', bg).onclick = close; bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); }); bg.close = close; return bg; }
function menuAt(x, y, items) { document.querySelectorAll('.menu').forEach((m) => m.remove()); const m = h(`<div class="menu" style="left:${x}px;top:${y}px">${items.map((i, k) => (i === '-' ? '<hr>' : `<a data-k="${k}" class="${i.cls || ''}">${i.icon ? `<span class="menu-icon" aria-hidden="true">${i.icon}</span>` : ''}<span class="menu-label">${i.desc ? `<b>${esc(i.label)}</b><small class="muted" style="display:block">${esc(i.desc)}</small>` : esc(i.label)}</span></a>`)).join('')}</div>`); document.body.appendChild(m); m.querySelectorAll('a').forEach((a) => (a.onclick = (e) => { e.stopPropagation(); m.remove(); items[a.dataset.k].fn?.(); })); setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0); return m; }
const fileInput = (accept, cb) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || '*/*'; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); };
async function uploadAsset(f, cat = 'upload') { const r = await api('/api/assets', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(f.name), 'x-cat': cat, 'content-type': f.type || 'application/octet-stream' }, body: f }); return r.body; }
async function refresh() { const [s, c, p, o] = await Promise.all([api('/api/state'), api('/api/catalog'), api('/api/projects'), api('/api/settings-options')]);
  ST = s.ok ? s.body : null; CAT = c.ok ? c.body : CAT; PROJECTS = Array.isArray(p.body) ? p.body : []; LANGS = o.ok ? o.body.languages : LANGS; }
async function track(path) { try { const r = await api('/api/track-url?path=' + encodeURIComponent(path)); await fetch(r.body.url); } catch {} }

// ---------- sidebar / chrome
function renderSide(route) {
  // Layout medido na Home do original em 13/11/2026 (capturas_pippit_2026-11-13/home_top.txt): barra de 274px,
  // itens de 40px com ícone de 18px, raio 16px, vão de 6px; grupo "Mais" recolhível; histórico; conta no rodapé.
  const ico = (k) => `<i class="ic">${IC[k]}</i>`;
  const nav = (href, label, icon, cls = '') => `<a href="#${href}" class="${cls} ${route.startsWith(href) ? 'on' : ''}">${icon ? ico(icon) : ''}<span class="lb">${label}</span></a>`;
  const maisOpen = route.match(/^\/(gen|avatars|analytics|schedule|integrations|legacy-chat|world)/) || window.__maisOpen;
  $('#side').innerHTML = `<div class="side-head"><a class="logo" href="#/home" aria-label="Início">CineForma</a><button class="side-toggle" id="sideToggle" aria-label="Ocultar barra lateral" title="Ocultar barra lateral">${IC.sidebarToggle}</button></div>
  <div class="side-scroll"><div class="nav">
    ${nav('/home', 'Criativo', 'creative')}${nav('/marketing', 'Estúdio de marketing', 'marketing')}${nav('/story', 'Estúdio de histórias', 'story')}<a id="navTela">${ico('canvas')}<span class="lb">Tela</span><span class="new">NEW</span></a><hr>
    ${nav('/assets', 'Ativos', 'assets')}${nav('/skills', 'Habilidades', 'skills')}${nav('/smart', 'Criação inteligente', 'smart')}${window.__devPanelEnabled ? nav('/dev', 'Painel dev', 'more') : ''}
    <a id="navMais" class="${maisOpen ? 'open' : ''}">${ico('more')}<span class="lb">Mais</span><i class="chev">${IC.chevron}</i></a>
    ${maisOpen ? `${nav('/gen', 'Gerador de vídeos', '', 'sub')}${nav('/avatars', 'Avatares e vozes', '', 'sub')}${nav('/analytics', 'Análise', '', 'sub')}${nav('/schedule', 'Publicador', '', 'sub')}${nav('/integrations', 'Integrações', '', 'sub')}${nav('/legacy-chat', 'Chat legado', '', 'sub')}${nav('/world', 'World Simulador', '', 'sub')}` : ''}
  </div><hr class="side-sep"><div class="hist-h">Histórico</div>
  ${PROJECTS.map((p) => `<div class="hist-i ${route.includes(p.id) ? 'on' : ''}" data-id="${p.id}"><div class="thumb"></div><div class="t"><b>${esc(p.title)}</b><small>${esc(p.subtitle || p.type)}</small></div><button class="more" aria-label="Mais">…</button></div>`).join('')}</div>
  <div class="account" id="acc"><div class="avatar"></div><b class="uname">${esc(ST?.user?.name || 'local')}</b><span class="bell" id="helpBtn" aria-label="Ajuda" title="Central de ajuda">${IC.help}</span><span class="bell" id="bell" aria-label="Notificações" title="Notificações">${IC.bell}${NOTE_UNREAD ? '<i class="dot"></i>' : ''}</span></div>`;
  $('#sideToggle').onclick = () => { document.body.classList.add('side-hidden'); let b = $('#sideOpen'); if (!b) { b = document.createElement('button'); b.id = 'sideOpen'; b.className = 'side-toggle'; b.setAttribute('aria-label', 'Mostrar barra lateral'); b.title = 'Mostrar barra lateral'; b.innerHTML = IC.sidebarToggle; b.onclick = () => document.body.classList.remove('side-hidden'); document.body.appendChild(b); } };
  $('#navTela').onclick = async () => { const p = (await post('/api/projects', { type: 'canvas' })).body; await refresh(); location.hash = '/project/' + p.id; };
  $('#navMais').onclick = () => { window.__maisOpen = !window.__maisOpen; renderSide(route); };
  $('#bell').onclick = (e) => { e.stopPropagation(); openNotifications(); };
  $('#helpBtn').onclick = (e) => { e.stopPropagation(); location.hash = '/help'; };
  document.querySelectorAll('.hist-i').forEach((el) => {
    el.onclick = () => (location.hash = PROJECTS.find((p) => p.id === el.dataset.id)?.href || '/project/' + el.dataset.id);
    $('.more', el).onclick = (e) => { e.stopPropagation(); const id = el.dataset.id; const r = e.currentTarget.getBoundingClientRect(); menuAt(r.right - 188, r.top - 130, [
      { label: 'Compartilhar', icon: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7M10 14 21 3M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>', fn: async () => { const s = (await post(`/api/projects/${id}/share`)).body; try { await navigator.clipboard.writeText(s.link); } catch {} toast(s.message); } },
      { label: 'Renomear', icon: '<svg viewBox="0 0 24 24"><path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4 4 16.5ZM14.8 5.7l3.5 3.5"/></svg>', fn: async () => { const t = prompt('Novo nome'); if (t) { await patch('/api/projects/' + id, { title: t }); await refresh(); route_(); } } },
      { label: 'Excluir', cls: 'danger', icon: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>', fn: async () => { if (confirm('Excluir este projeto?')) { await api('/api/projects/' + id, { method: 'DELETE' }); await refresh(); location.hash = '/home'; route_(); } } }]); };
  });
  $('#acc').onclick = (e) => { if (e.target.closest('.bell')) return; e.stopPropagation(); accountMenu(e.currentTarget); };
}
// ---------- menu da conta (medido no original em 13/11/2026: capturas_pippit_2026-11-13/pt_conta_*.txt)
// Painel de 276px (raio 24, itens de 48px com raio 16) acima da linha da conta; cada item com seta abre um
// SUBMENU ao lado ao passar o mouse; itens com seta diagonal são links diretos.
const ACC_GO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l6-6M6 5h5v5"/></svg>';
const ACC_CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';
const ACC_OUT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 2.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10.5 5l3 3-3 3M13.5 8h-7"/></svg>';
function closeAccountMenu() { document.querySelectorAll('.acc-pop,.acc-sub,.note-pop').forEach((x) => x.remove()); }
function accountMenu(anchor) {
  if ($('.acc-pop')) return closeAccountMenu();
  closeAccountMenu(); document.querySelectorAll('.menu').forEach((m) => m.remove());
  const go = (hash) => () => { closeAccountMenu(); location.hash = hash; };
  const unob = (what) => () => { closeAccountMenu(); toast(what + ': destino ainda não disponível nesta instalação.'); };
  const lang = (ST?.settings?.language || 'pt').slice(0, 2).toUpperCase();
  const SUBS = {
    conta: [{ label: 'Informações da conta', fn: go('/settings/personal_information'), go: 1 }, { label: 'Autorização de conta', fn: go('/settings/account_authorization'), go: 1 }],
    config: [{ label: 'Idioma', tag: lang, fn: go('/settings/language'), small: 1 }, { label: 'Aparência', tag: document.body.classList.contains('dark') ? 'Modo escuro' : 'Modo claro', fn: go('/settings/language'), small: 1 },
      { label: 'Planos e preços', fn: () => { closeAccountMenu(); plansModal(); }, go: 1 }, { label: "Salvar sem marca d'água", fn: go('/settings/watermark'), go: 1 },
      { label: 'Estratégia de confirmação de uso de créditos', fn: go('/settings/points_prompt_settings'), go: 1 }, { label: 'Login e gerenciamento', fn: go('/settings/sign_management'), go: 1 }],
    mais: [{ label: 'CLI', fn: unob('CLI') }, { label: 'Lista de desejos de recursos', fn: unob('Lista de desejos'), go: 1 }, { label: 'Atendimento ao cliente', fn: () => { closeAccountMenu(); location.hash = '/help'; }, go: 1 }],
    termos: ['Termos de Serviço', 'Política de Privacidade', 'Política de Cookies', 'Contrato de Licenciamento', 'Termos de Serviço do Criador', 'Diretrizes da Comunidade'].map((t) => ({ label: t, fn: unob(t), go: 1 })),
  };
  const ITEMS = [{ k: 'tarefas', label: 'Tarefas concluídas' }, { k: 'conta', label: 'Gerenciamento da conta' }, { k: 'config', label: 'Configurações', tag: lang }, { k: 'mais', label: 'Mais' }, { k: 'termos', label: 'Termos e Políticas' }];
  const row = (i, cls = '') => `<a class="acc-i ${cls} ${i.small ? 'small' : ''}" data-k="${i.k || ''}"><span class="lb">${esc(i.label)}</span>${i.tag ? `<span class="tag">${esc(i.tag)}</span>` : ''}<i class="ar">${i.go ? ACC_GO : ACC_CHEV}</i></a>`;
  const p = h(`<div class="acc-pop" role="menu"><div class="acc-head"><div class="avatar"></div><div class="who"><b>${esc(ST?.user?.name || 'local')}</b><small>${esc(ST?.user?.email || 'conta local')}</small></div></div>
    <div class="acc-list">${ITEMS.map((i) => row(i)).join('')}</div><a class="acc-i sair danger" data-k="sair"><span class="lb">Sair</span><i class="ar">${ACC_OUT}</i></a></div>`);
  document.body.appendChild(p);
  const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, r.left + 12) + 'px'; p.style.bottom = (innerHeight - r.top + 4) + 'px';
  const openSub = async (el) => {
    document.querySelectorAll('.acc-sub').forEach((x) => x.remove()); p.querySelectorAll('.acc-i.on').forEach((x) => x.classList.remove('on')); el.classList.add('on');
    const k = el.dataset.k; let sub;
    if (k === 'tarefas') {
      sub = h('<div class="acc-sub tasks"><h3>Tarefas concluídas</h3><div class="tk-list"><p class="muted">carregando…</p></div><p class="tk-foot">Apenas os 10 downloads mais recentes são mostrados aqui. Veja todos em <a id="tkAll">Recursos</a></p></div>');
      document.body.appendChild(sub); $('#tkAll', sub).onclick = go('/tasks');
      let as = []; try { as = (await api('/api/assets?cat=works&kind=video')).body || []; } catch {}
      if (!sub.isConnected) return;
      $('.tk-list', sub).innerHTML = as.slice(0, 10).map((a) => `<div class="tk"><div class="thumb"></div><div class="tx"><b>${esc(a.name || a.title || 'vídeo')}</b><small>${a.createdAt || a.at ? new Date(a.createdAt || a.at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : ''}</small><span class="st">Exportado</span></div>${a.url ? `<a class="dl" href="${esc(a.url)}" download>Baixar</a>` : ''}</div>`).join('') || '<p class="muted" style="padding:8px 12px">Nenhuma tarefa concluída ainda.</p>';
    } else {
      sub = h(`<div class="acc-sub"><div class="acc-list">${SUBS[k].map((i, n) => row({ ...i, k: String(n) })).join('')}</div></div>`); document.body.appendChild(sub);
      sub.querySelectorAll('.acc-i').forEach((a) => (a.onclick = (e) => { e.stopPropagation(); SUBS[k][+a.dataset.k].fn(); }));
    }
    const pr = p.getBoundingClientRect(), er = el.getBoundingClientRect(); sub.style.left = (pr.right - 9) + 'px';
    const hh = sub.offsetHeight; sub.style.top = Math.max(8, Math.min(er.top - 9, innerHeight - hh - 12)) + 'px';
    sub.addEventListener('click', (e) => e.stopPropagation());
  };
  p.querySelectorAll('.acc-list .acc-i').forEach((a) => { a.onmouseenter = () => openSub(a); a.onclick = (e) => { e.stopPropagation(); openSub(a); }; });
  $('.sair', p).onmouseenter = () => { document.querySelectorAll('.acc-sub').forEach((x) => x.remove()); p.querySelectorAll('.acc-i.on').forEach((x) => x.classList.remove('on')); };
  $('.sair', p).onclick = (e) => { e.stopPropagation(); closeAccountMenu(); signOut(); };
  p.addEventListener('click', (e) => e.stopPropagation());
  setTimeout(() => { const off = (e) => { if (e.type === 'keydown' && e.key !== 'Escape') return; closeAccountMenu(); document.removeEventListener('click', off); document.removeEventListener('keydown', off); }; document.addEventListener('click', off); document.addEventListener('keydown', off); }, 0);
}
function credits() { return `<div class="titlebar-tools"><button id="agentConnect" aria-label="Agent connection" title="Agent connection">Agent connect</button><button id="exportTasks" aria-label="Export tasks" title="Export tasks">Export tasks</button><div class="top-credits" id="credits"><i class="ic">${IC.credit}</i><b>${ST.balance}</b><span class="div"></span><span class="lbl">Gratuito</span></div></div>`; }
function bindCredits() {
  const c = $('#credits'); if (c) c.onclick = creditsModal;
  // Painéis da barra de título: arquitetura estática observada (AgentConnect right/ordem 101/Custom;
  // ExportTask ordem 4). Conteúdo, condição de render e ações: UNOBSERVED (nada é presumido).
  const agent = $('#agentConnect'); if (agent) agent.onclick = () => modal('<h2>Agent connection</h2><p class="muted">TitleBarAgentConnect — posição <b>right</b>, ordem <b>101</b>, tipo <b>Custom</b> (evidência estática: bundles).</p><div class="blocked"><b>UNOBSERVED</b>: conteúdo, condição de render, estado de conexão e ações do painel não foram capturados. Nenhuma conexão ou chamada de rede será iniciada por este placeholder.</div>');
  const tasks = $('#exportTasks'); if (tasks) tasks.onclick = () => modal('<h2>Export tasks</h2><p class="muted">TitleBarExportTask — ordem <b>4</b> (evidência estática: bundles).</p><div class="blocked"><b>UNOBSERVED</b>: conteúdo, estados e ações do painel de tarefas de exportação não foram observados nesta instalação. Nenhuma tarefa é presumida.</div>');
}
async function creditsModal() {
  const l = (await api('/api/ledger')).body; const m = modal(`<h2>Detalhes</h2><p>Detalhes de uso — saldo <b>${l.balance}</b></p><div class="row" id="pouches" style="gap:14px;margin:6px 0">${[['vip', 'Assinatura (vip)'], ['gift', 'Gratuitos e bônus (gift)'], ['purchase', 'Comprados (purchase)']].map(([k, t]) => `<div class="card" data-pouch="${k}"><small class="muted">${t}</small><br><b>${l.balances?.[k + '_credit'] ?? 0}</b></div>`).join('')}</div><p class="muted">Bolsas conforme benefits/user_credit. Assinatura e compra: estrutura presente no código, desligada (produto gratuito — r20); a ordem de consumo entre bolsas não foi observada (usa o lote que vence primeiro).</p><div class="row"><button id="dly">Receber créditos diários</button><button id="plansB">Ver planos</button></div>
    <table><tr><th>Quando</th><th>Origem</th><th>Bolsa</th><th>Δ</th></tr>${l.entries.slice(0, 40).map((e) => `<tr><td>${new Date(e.at).toLocaleString('pt-BR')}</td><td>${esc(e.label)}</td><td>${esc(e.pouch || Object.entries(e.pouches || {}).map(([k, v]) => `${k} ${v}`).join(' + ') || '')}</td><td>${e.delta > 0 ? '+' : ''}${e.delta}</td></tr>`).join('')}</table>`);
  $('#dly', m).onclick = async () => { const r = (await post('/api/daily-claim')).body; toast(r.claimed ? '+80 créditos gratuitos (expiram às 23:59:59)' : 'Os créditos de hoje já foram recebidos.'); await refresh(); m.close(); route_(); };
  $('#plansB', m).onclick = () => { m.close(); plansModal(); };
}
async function plansModal(modelName) {
  // r20 (decisão do usuário — produto gratuito): a tela de planos NÃO mostra valores em R$ nem pede
  // assinatura. Cada plano traz "No momento gratuito — em breve" e botão desabilitado; o plano atual
  // dá acesso a tudo. Preços observados no original ficam só nos documentos de evidência
  // (mesa_de_operacao/entrega_19/ADENDO_R19.md), marcados como não reproduzidos por decisão do usuário.
  const P = CAT.plans;
  const m = modal(`<h2>Planos</h2>
   <div class="plans">${P.map((p) => { const cur = ST.user.plan === p.id;
     return `<div class="plan ${p.id === 'plus' ? 'hot' : ''}"><h3>${esc(p.name)}</h3>
     <div class="price">${cur ? 'Plano atual — acesso a tudo' : 'No momento gratuito — em breve'}</div>
     <ul>${p.dailyCredits ? '<li>Créditos diários gratuitos (80/dia)</li>' : ''}${p.noWatermark ? '<li>Remover marca d’água · Amplificar até 4K</li>' : ''}${p.gptImage25 ? '<li>GPT Image 2.5</li>' : ''}</ul>
     <button disabled data-plan="${p.id}">${cur ? 'Plano atual' : 'No momento gratuito — em breve'}</button></div>`; }).join('')}</div>
   <div class="blocked">Produto gratuito e sem bloqueio (decisão do usuário — r20): nenhum recurso é cobrado ou limitado por plano. Estrutura de pagamento presente no código, desligada. Valores observados no original ficam só nos documentos de evidência (ADENDO_R19.md), não reproduzidos por decisão do usuário.</div>`);
}
$('#promoBtn').onclick = async () => { const P = (await api('/api/promotions')).body; modal(`<h2>Ofertas observadas</h2><p class="muted">Valores de capturas da home em datas diferentes. Não é cotação atual: nada é cobrado nesta instalação.</p><ul>${(P.snapshots || []).map((x) => `<li>${esc(x.date)} — ${esc(String(x.text).replace(/R\$\s?[\d.,]+/g, '[valor omitido]'))}</li>`).join('')}</ul><p class="muted">Valores observados: só nos documentos de evidência (ADENDO_R19.md) — não reproduzidos por decisão do usuário (r20).</p><div class="blocked"><b>UNOBSERVED</b>: ${(P.unobserved || []).map((x) => esc(x)).join(' · ')}</div><button class="primary" id="promoPlans">Ver planos locais</button>`).querySelector('#promoPlans').onclick = plansModal; }; $('#promoX').onclick = () => $('#promo').remove();

// ---------- paginas
const SKILL_MODELS = (s) => (s.models ? s.models.map((m) => `<span class="pill" style="padding:2px 8px;font-size:11px">${esc(m)}</span>`).join(' ') : '');
const HOME_BADGE = { 'anuncios-de-drama': 'SD 2.5', 'video-de-marketing': 'GPT Image 2' };
// Skills recomendadas da Home: miniatura (assets/skills), modelos e descrição do cartão de hover (observados no original em 13/11/2026; texto traduzido).
const HOME_SKILL = {
  'anuncios-de-drama': { img: 'drama-ads', models: ['Dreamina Seedance 2.5', 'GPT Image 2'], desc: 'Coloca o seu produto dentro de um minidrama de alta tensão, para o público ficar pela história e sair querendo o produto.' },
  'video-de-marketing': { img: 'marketing-video', models: ['GPT Image 2'], desc: 'O motor central de vídeo de marketing: transforma as informações do produto e um briefing de Gancho/Estilo/Formato em um vídeo pronto para anúncio, do roteiro e storyboard ao corte final.' },
  'gerador-de-vlog': { img: 'vlog-generator', desc: 'Transforme fotos, clipes e áudio em um vlog com história: gancho de verdade, ritmo natural e um final que satisfaz, não apenas uma sequência de slides.' },
  'video-de-avatar': { img: 'avatar-video', out: true, desc: 'Crie qualquer vídeo de marketing com os avatares da nossa biblioteca.' },
  'replicacao-viral': { img: 'viral-replication', desc: 'Envie um vídeo de referência: a skill faz a engenharia reversa do gancho e monta um vídeo novo, no mesmo estilo ou remixado, com o seu pedido e os seus materiais.' },
  'foto-falante-de-ia': { img: 'ai-talking-photo', out: true, desc: 'Faça uma foto falar com naturalidade a partir de um roteiro ou de um áudio.' },
};
const HOME = { tab: 'Criativo', mode: 'Agente', skill: null, model: 'auto', ratio: 'Inteligente', res: '720p', attachments: [], canvas: true };
const modelCustom = () => !!HOME.model && HOME.model !== 'auto';
const modelPerSec = () => (CAT.videoModels.find((x) => x.id === HOME.model) || {}).perSecond;
const modelChip = () => (HOME.mode === 'Vídeo' && HOME.model === 'auto-route' ? 'Auto Route · 9:16 · 4s · 768P · ✦ 12 (72) ▾' : modelCustom() ? 'Modelos personalizados | Preferência ▾' : 'Modelo | Preferência ▾');
// World Simulador (recurso novo, pedido do usuário em 13/11/2026; não vem do Pippit): história interativa com
// narrador, escolhas, imagem por cena e voz. A página vive em /world-simulador.html e é mostrada aqui dentro.
function pageWorld() { $('#main').innerHTML = `${credits()}<div class="world-page"><iframe src="/world-simulador.html" title="World Simulador"></iframe></div>`; bindCredits(); }
function homeHero() { return `<div class="hero"><i class="mark">${IC.creative}</i><h1>Com CineForma</h1><div class="seg" aria-label="Tipo de agente">${['Criativo', 'Marketing', 'Histórias'].map((t) => `<button class="${HOME.tab === t ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div><span class="tagline">Agent, transforme ideias em vídeos</span></div>`; }
// No original as três abas ficam na MESMA página: só o palco central muda (medido em 13/11/2026).
function bindHero() { document.querySelectorAll('.hero .seg button').forEach((b) => (b.onclick = () => { if (HOME.tab === b.dataset.t) return; HOME.tab = b.dataset.t; if ((location.hash.replace(/^#/, '') || '/home').startsWith('/home')) pageHome(); else location.hash = '/home'; })); }
function pageHome() {
  // diagnóstico de roteamento (rodada 9): conta quantas vezes a Home foi desenhada. Serve ao teste
  // que prova que a carga desenha a Home UMA vez e que uma rajada de hash não a redesenha em loop.
  document.body.dataset.homeRenders = String((Number(document.body.dataset.homeRenders) || 0) + 1);
  if (HOME.tab === 'Marketing') { pageMarketing(true); bindHero(); return; }
  if (HOME.tab === 'Histórias') { pageStory(true); bindHero(); return; }
  $('#main').innerHTML = `${credits()}<div class="page home">${homeHero()}
  <div class="composer">${HOME.skill?.guideWords || HOME.skill ? `<div class="row" id="skillchipbar"><span class="pill skill-chip" id="skillchip">${esc(HOME.skill.name)} <button id="skillrm" aria-label="Remover habilidade" title="Remover habilidade">×</button></span></div>` : ''}${HOME.skill?.materialGuide ? `<div class="upload-tile" id="uptile" title="Enviar material de referência"><div class="plus">＋</div><small>${esc(HOME.skill.materialGuide)}</small></div>` : ''}<textarea id="prompt" placeholder="${HOME.skill?.guideWords ? esc(HOME.skill.guideWords).split(String.fromCharCode(10)).join('&#10;') : 'Descreva suas ideias e o CineForma cria com você.'}">${esc(HOME.text || '')}</textarea>${HOME.mode === 'Áudio' ? '<p id="audioModeNote" class="muted">Modo Áudio (observado 13/11): Seed Audio 1.0 e Standard voice generation (planos pagos, diamante) · Sample rate 8/16/24/32/44.1 (padrão)/48 kHz · 17 créditos por geração (34 riscado). Corpo da geração e SSE ao vivo: UNOBSERVED.</p>' : ''}<div id="atts" class="row muted">${HOME.attachments.map((a) => '📎 ' + esc(a.name)).join(' · ')}</div>
   <div class="crow"><div class="cgroup"><button class="cicon" id="plus" aria-label="Adicionar material" title="Adicionar material">${IC.plus}</button><button class="cicon" id="at" aria-label="Mencionar ativo" title="Mencionar ativo">${IC.at}</button><button class="pill" id="modeB" aria-label="Modo de criação"><span class="tx">${HOME.mode} <span class="car">▾</span></span></button></div><span class="sp"></span><div class="cgroup"><button class="pill" id="skillB"><i class="ic">${IC.skills}</i><span class="tx">${HOME.skill ? esc(HOME.skill.name) : 'Habilidades'} <span class="car">▾</span></span></button><button class="pill" id="modelB" title="${modelCustom() ? '' : 'Vídeo: Correspondência inteligente · Inteligente · 720p · Duração inteligente&#10;Imagem: Correspondência inteligente · Inteligente · 2K'}">Modelo | Preferência ▾</button></div><span class="sp"></span><label class="canvas-sw">Tela <input type="checkbox" id="canvasT" ${HOME.canvas ? 'checked' : ''}></label>${HOME.mode === 'Agente' && modelCustom() && modelPerSec() ? `<span class="muted" id="costhint" title="Para os modelos Dreamina Seedance 2.0 e posteriores, os créditos são cobrados com base na duração dos vídeos de entrada e de saída">✦ ${modelPerSec()} /s ⓘ</span>` : ''}<button class="pill" id="freeSend" title="Executar texto com um modelo gratuito configurado">Executar grátis</button><button class="primary" id="send" aria-label="Submit">${IC.send}</button></div></div>
  <div class="home-col"><div class="sk-head"><h2>Skills recomendadas</h2><a href="#/skills">Todos</a></div>
  <div class="sk-grid">${Object.keys(HOME_SKILL).map((id) => CAT.skills.find((s) => s.id === id)).filter(Boolean).map((s) => `<div class="skill" data-s="${s.id}"><img class="sk-ic" src="/assets/skills/${HOME_SKILL[s.id].img}.webp" alt=""><span class="sk-meta"><span class="sk-name">${esc(s.name)}</span>${HOME_BADGE[s.id] ? `<span class="sk-badge">${HOME_BADGE[s.id]}</span>` : ''}</span><i class="sk-go muted" title="${HOME_SKILL[s.id].out ? 'abre outro fluxo' : 'usa no compositor'}">${HOME_SKILL[s.id].out ? '↗' + IC.arrowOut : '↵' + IC.enter}</i></div>`).join('')}</div></div>
  <div class="fw-wrap"><h2 class="fw-head">Featured works</h2><div class="fw-grid" id="fwfeed"><div class="muted">carregando…</div></div></div></div>`;
  // Cartão de descrição ao passar o mouse numa skill (medido no original: 280px, raio 20, capa 264x149, sombra suave)
  document.querySelectorAll('.sk-grid .skill').forEach((el) => {
    el.onmouseenter = (e) => { const d = HOME_SKILL[el.dataset.s]; if (!d) return; let c = $('#skTip'); if (!c) { c = document.createElement('div'); c.id = 'skTip'; c.className = 'sk-tip'; document.body.appendChild(c); }
      c.innerHTML = `<img src="/assets/skills/${d.img}.webp" alt=""><div class="tx">${(d.models || []).map((m) => `<span class="md">${esc(m)}</span>`).join('')}<p>${esc(d.desc)}</p><span class="chip">Vídeo</span></div>`;
      c.hidden = false; const r = el.getBoundingClientRect(); const h = c.offsetHeight; c.style.left = Math.max(8, Math.min(innerWidth - 288, e.clientX - 140)) + 'px'; c.style.top = Math.max(8, r.top + 20 - h) + 'px'; };
    el.onmouseleave = () => $('#skTip')?.remove(); // removido do DOM (não só oculto) para não sobrar texto invisível na página
  });
  const syncSend = () => $('#send')?.classList.toggle('ready', !!(HOME.text || '').trim()); syncSend(); $('#prompt').addEventListener('input', syncSend);
  bindCredits(); const P = $('#prompt'); P.oninput = () => (HOME.text = P.value);
  $('#modelB').innerHTML = `<i class="ic">${IC.model}</i><span class="tx">` + esc(modelChip()).replace(' | ', ' <span class="div">|</span> ').replace(/ ▾$/, ' <span class="car">▾</span>') + '</span>';
  bindHero();
  $('#plus').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, [{ label: 'Carregar mídia ou arquivo', fn: () => fileInput('image/*,video/*,audio/*', async (f) => { const a = await uploadAsset(f); HOME.attachments.push(a); pageHome(); }) }, { label: 'Escolher a partir dos Ativos', fn: () => pickAsset((a) => { HOME.attachments.push(a); pageHome(); }) }, { label: 'Adicionar link', fn: () => toast('Importar por link: não implementado.') }, { label: 'Carregar a partir do Dropbox', fn: () => toast('Dropbox exige OAuth: bloqueado.') }, { label: 'Carregar a partir do telefone', fn: () => toast('Upload por telefone (QR): não implementado.') }, '-', { label: 'Vídeo de referência', fn: () => fileInput('video/*', async (f) => { const a = await uploadAsset(f); HOME.attachments.push(a); pageHome(); }) }]); };
  $('#at').onclick = () => pickAsset((a) => { HOME.text = (HOME.text || '') + ' @' + a.name; HOME.attachments.push(a); pageHome(); });
  $('#modeB').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, [{ m: 'Agente', desc: 'Long-form video — Describe your idea. Agent refines it and chooses the right models.' }, { m: 'Vídeo', desc: 'Choose a video model and generate directly.' }, { m: 'Imagem', desc: 'Choose an image model and generate directly.' }, { m: 'Áudio', desc: 'Choose an audio model and generate directly.' }].map((x) => ({ label: x.m, desc: x.desc, fn: () => { HOME.mode = x.m; pageHome(); } }))); };
  // Ao escolher uma skill (capturas REA/CDP 22/10/2026 do botão Use): chip com "Remover habilidade", o guide_words EXATO como placeholder do campo e, se houver, o bloco de upload com material_guide_words
  $('#skillrm') && ($('#skillrm').onclick = () => { HOME.skill = null; pageHome(); }); $('#uptile') && ($('#uptile').onclick = () => $('#plus').click());
  if (HOME.mode === 'Áudio' && $('#skillB')) $('#skillB').remove(); // observado 13/11: Skills não aparece no modo Áudio
  if ($('#skillB')) $('#skillB').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, CAT.skills.map((s) => ({ label: s.name, fn: () => { HOME.skill = s; pageHome(); } }))); };
  $('#modelB').onclick = () => HOME.mode === 'Áudio' ? audioPrefs() : modelPrefs(); $('#canvasT').onchange = (e) => (HOME.canvas = e.target.checked);
  if ($('#audioModeNote')) api('/api/composer/audio-mode').then((r) => { const el = $('#audioModeNote'); if (!el || !r.body?.local) return; const b = r.body.local.voice || {}; el.textContent = `Modo Áudio (observado 13/11): Seed Audio 1.0 e Standard voice generation · 44.1 kHz padrão · 17 créditos (34 riscado). Geração local: ${b.defaultEngine === 'cloud' ? 'o provedor do usuário (sem SAPI nesta máquina)' : 'a voz do Windows (SAPI)'} — não-IA, sem créditos. Corpo da geração e SSE ao vivo: UNOBSERVED.`; });
  document.querySelectorAll('.skill').forEach((el) => (el.onclick = () => { if (el.dataset.s === 'video-de-avatar') { avatarDrawer(); return; } if (el.dataset.s === 'foto-falante-de-ia') { location.hash = '/ai-talking-photo'; return; } HOME.skill = CAT.skills.find((s) => s.id === el.dataset.s); pageHome(); }));
  // === Adendo r19 (13/11/2026): feed "Featured works" + detalhe /home?work_id=N ===
  async function loadFeatured() {
    const feed = $('#fwfeed'); if (!feed) return;
    const r = await api('/api/home/featured-works'); const works = r.body?.works || [];
    feed.innerHTML = works.map((w, i) => `<div class="fw" data-w="${w.id}"><div class="fw-thumb"><img src="/assets/featured/fw${[1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12][i % 11]}.webp" alt="" loading="lazy"></div><div class="fw-tx"><div class="fw-title">${esc(w.title)}</div><div class="fw-author"><span class="fw-av">${esc(String(w.author || '?').slice(0, 1))}</span><span>${esc(w.author)}</span></div></div></div>`).join('') || '<div class="muted">sem itens</div>';
    feed.querySelectorAll('[data-w]').forEach((el) => (el.onclick = () => openWork(Number(el.dataset.w))));
  }
  async function openWork(id, fromUrl) {
    const r = await api('/api/biz/v1/home/recommend_video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ work_id: id }) }); const d = r.body?.data || {};
    if (!fromUrl) history.pushState({}, '', `/home?work_id=${id}`);
    const m = modal(`<h2>Featured works</h2>
      <div class="row"><button class="pill" id="wclose">Close</button><button class="pill" id="wshare">Share</button></div>
      <p><b id="wtitle">${esc(d.title || '')}</b></p>
      <p class="muted">Author</p><p id="wauthor">${esc(d.author || '')}</p>
      <p class="muted">Work intro</p><p id="wintro">${esc(d.work_intro || '')}</p>`, 'sm');
    $('#wclose', m).onclick = () => { m.remove(); history.pushState({}, '', '/home'); };
    $('#wshare', m).onclick = () => toast('Share: link do trabalho copiado (compartilhamento real usa os canais conectados).');
  }
  loadFeatured().then(() => { const wid = Number(new URLSearchParams(location.search).get('work_id')); if (wid) openWork(wid, true); });
  $('#freeSend').onclick = () => startFreeRun();
  async function startFreeRun(forced) {
    const text = (HOME.text || '').trim(); if (!text) return toast('Descreva sua ideia primeiro.');
    const mode = forced || ({ Imagem: 'image', Vídeo: 'video', 'Áudio': 'audio' }[HOME.mode] || 'text');
    // Vídeo: o servidor decide (NovAI em fila, ou 501 PENDING quando não há provedor de vídeo configurado).
    const b = $('#freeSend'); b.disabled = true; const previous = b.textContent; b.textContent = 'Enviando…';
    let r;
    try { r = await post('/api/local-runs', { prompt: text, mode }); }
    catch (e) { b.disabled = false; b.textContent = previous; return toast('Não foi possível iniciar a tarefa: ' + String(e.message || e).slice(0, 120)); }
    if (!r.ok || !r.body?.run?.id) { b.disabled = false; b.textContent = previous; return toast(r.body?.error || 'Não foi possível iniciar a tarefa.'); }
    HOME.text = ''; HOME.attachments = [];
    const alvo = `/tasks/run/${r.body.run.id}`;
    // se o hash já é essa rota, atribuir de novo não dispara hashchange: desenha na mão
    if (location.hash === `#${alvo}`) route_(); else location.hash = alvo;
  }
  $('#send').onclick = async () => {
    const text = (HOME.text || '').trim(); if (!text) return toast('Descreva sua ideia primeiro.');
    if (HOME.mode === 'Vídeo' && HOME.model === 'auto-route') return directVideo(text);
    // Imagem em "Correspondência inteligente" (auto) vai pelo adaptador do roteador gratuito (Omni), não pelo agente de texto.
    if (HOME.mode === 'Imagem' && HOME.model === 'auto') return startFreeRun('image');
    // Modo Áudio (r20 — produto gratuito, sem bloqueio): enviar GERA com o provedor gratuito por padrão.
    // O POST /api/biz/v2/videogen/check permanece como espelho do fluxo observado, mas nada bloqueia
    // (paywall observado no original, não reproduzido por decisão do usuário). Sem provedor configurado
    // o envio mostra o MOTIVO — nunca a tela de planos.
    if (HOME.mode === 'Áudio') {
      await api('/api/biz/v2/videogen/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ generate_source: 1 }) });
      const cfg = (await api('/api/composer/audio-mode')).body?.freeLocalProvider;
      if (cfg?.enabled) return startFreeRun('audio');
      return toast(cfg?.reason || 'Geração de áudio indisponível: provedor gratuito não configurado.', 6000);
    }
    // r20 (sem bloqueio por plano ou por modelo): o envio com modelo nomeado nunca abre a tela de planos.
    // Sem provedor local de IA para o modelo, o MOTIVO é mostrado (paywall observado não é reproduzido).
    if ((HOME.mode === 'Vídeo' || HOME.mode === 'Imagem') && HOME.model !== 'auto') {
      const list = HOME.mode === 'Vídeo' ? CAT.videoModels : CAT.imageModels; const mod = list.find((x) => x.id === HOME.model);
      if (mod) return toast(`Geração direta com ${mod.name} indisponível localmente: sem provedor de IA configurado para este modelo.`, 6000);
    }
    const p = (await post('/api/projects', { type: HOME.canvas ? 'canvas' : 'chat', title: text.slice(0, 40) })).body; const c = (await post(`/api/projects/${p.id}/chats`)).body;
    toast('Planejando… (com um LLM local pode levar de 1 a 2 minutos)');
    await post(`/api/projects/${p.id}/chats/${c.id}/messages`, { text, skillId: HOME.skill?.id, attachments: HOME.attachments.map((a) => a.id), modelId: HOME.model === 'auto' ? 'seedance-2.5' : HOME.model });
    HOME.text = ''; HOME.attachments = []; await refresh(); location.hash = '/project/' + p.id;
  };
}
async function audioPrefs() {
  // Adendo r19 (13/11/2026): modelos do modo Audio, sample rate e custo observados no Pippit real.
  const m = modal(`<h2>Modelos de áudio</h2><div id="ap"></div><p class="muted" id="audioCostNote">Custo por geração: <b>✦ 17</b> <s>34</s> · corpo da requisição e SSE ao vivo: <b>UNOBSERVED</b></p>`, 'sm');
  const draw = () => {
    $('#ap', m).innerHTML = `${CAT.audioModels.map((x) => `<div class="card" style="margin:6px 0;cursor:pointer;${HOME.audioModel === x.id ? 'outline:2px solid #111' : ''}" data-id="${x.id}"><b>💎 ${esc(x.name)}</b><div class="muted">${esc(x.description || '')}</div></div>`).join('')}
    <p><b>Sample rate</b> <select id="sr">${(CAT.audioModels[0]?.sampleRates || [44100]).map((hz) => `<option value="${hz}" ${hz === (HOME.sampleRate || 44100) ? 'selected' : ''}>${hz / 1000} kHz${hz === 44100 ? ' (padrão)' : ''}</option>`).join('')}</select></p>`;
    $('#ap', m).querySelectorAll('[data-id]').forEach((e) => (e.onclick = () => { HOME.audioModel = e.dataset.id; draw(); }));
    $('#sr', m).onchange = (e) => { HOME.sampleRate = Number(e.target.value); };
  };
  draw();
}
async function modelPrefs() {
  const m = modal(`<h2>Modelos</h2><div class="tabs"><button class="on" data-k="v">Vídeo</button><button data-k="i">Imagem</button></div><div id="mp"></div><p class="muted" id="costnote">Custo por geração: UNOBSERVED · preferências: rótulo observado, opções não capturadas</p>`, 'sm'); const draw = (k) => {
    const list = k === 'v' ? CAT.videoModels : CAT.imageModels; $('#mp', m).innerHTML = `${list.map((x) => `<div class="card" style="margin:6px 0;cursor:pointer;${HOME.model === x.id ? 'outline:2px solid #111' : ''}" data-id="${x.id}"><b>${esc(x.name)}</b><div class="muted">${esc(x.note || '')}${x.perSecond ? ` · ${x.perSecond} créditos/s` : ''}${x.perImage ? ` · ${x.perImage} créditos/imagem` : ''}</div></div>`).join('')}
    <p><b>Proporção</b> ${(k === 'v' ? CAT.videoRatios : CAT.imageRatios).map((r) => `<button data-r="${r}" class="${HOME.ratio === r ? 'primary' : ''}">${r}</button>`).join(' ')}</p><p><b>Resolução</b> ${(k === 'v' ? CAT.videoRes : CAT.imageRes).map((r) => `<button data-res="${r}" class="${HOME.res === r ? 'primary' : ''}">${r}</button>`).join(' ')}</p><p class="muted">Duração inteligente ou personalizada (campo no painel do nó).</p>`;
    $('#mp', m).querySelectorAll('[data-id]').forEach((e) => (e.onclick = () => { HOME.model = e.dataset.id; draw(k); const b = $('#modelB'); if (b) { b.textContent = modelChip(); b.title = modelCustom() ? '' : b.title; } const old = $('#costhint'); if (old) old.remove(); const snd = $('#send'); if (b && snd && HOME.mode === 'Agente' && modelCustom() && modelPerSec()) snd.insertAdjacentHTML('beforebegin', `<span class="muted" id="costhint" title="Para os modelos Dreamina Seedance 2.0 e posteriores, os créditos são cobrados com base na duração dos vídeos de entrada e de saída">✦ ${modelPerSec()} /s ⓘ</span>`); })); $('#mp', m).querySelectorAll('[data-r]').forEach((e) => (e.onclick = () => { HOME.ratio = e.dataset.r; draw(k); })); $('#mp', m).querySelectorAll('[data-res]').forEach((e) => (e.onclick = () => { HOME.res = e.dataset.res; draw(k); })); };
  draw('v'); m.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { m.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); draw(b.dataset.k); }));
  // linha 81: o que os controles do composer NÃO mostram fica explícito na própria tela.
  try { const c = (await api('/api/composer/controls')).body; const n = $('#costnote', m); if (n && c && c.cost) n.textContent = `Custo por geração: ${c.cost.observed ? 'observado' : 'UNOBSERVED'} · ${c.controls.filter((x) => !x.optionsObserved).length}/${c.controls.length} controles sem opções internas capturadas`; } catch {}
}
async function pickAsset(cb, kind) { const as = (await api('/api/assets' + (kind ? '?kind=' + kind : ''))).body; const m = modal(`<h2>Escolher a partir dos Ativos</h2>${as.length ? as.map((a) => `<div class="mediaitem" data-id="${a.id}">${a.kind === 'image' ? `<img src="/files/${a.stored}" width="40">` : '🎞'} ${esc(a.name)} <span class="muted">${a.duration ? a.duration.toFixed(1) + ' s' : a.kind}</span></div>`).join('') : '<p class="muted">Nenhum ativo ainda. Use Carregar.</p>'}`, 'sm'); m.querySelectorAll('.mediaitem').forEach((e) => (e.onclick = () => { m.close(); cb(as.find((a) => a.id === e.dataset.id)); })); }

// --- Projeto (canvas + chat do agente)
let CUR = null, SEL = null, CHATID = null, LINKFROM = null;
// Último título que o próprio cliente salvou por projeto. Um re-render atrasado (SSE/refresh) pode trazer
// o título antigo do servidor; esta memória impede que o input volte ao valor velho e o reenvie.
const SAVED_TITLES = new Map();
// Estado de edição do título por projeto. Fica fora do closure do <input> porque um re-render pode trocar o
// elemento entre a digitação e o `change` — foi assim que a edição virava um timeout de 60 s (1 em 4).
const TITLE_EDIT = new Map();
async function pageProject(id) {
  const p = (await api('/api/projects/' + id)).body; if (!p || !p.id) { $('#main').innerHTML = '<div class="page">Projeto inexistente.</div>'; return; } if (SAVED_TITLES.has(String(p.id))) p.title = SAVED_TITLES.get(String(p.id)); CUR = p; if (!p.chats.length) p.chats.push((await post(`/api/projects/${id}/chats`)).body); CHATID ||= p.chats[p.chats.length - 1].id;
  const chat = p.chats.find((c) => c.id === CHATID) || p.chats[p.chats.length - 1]; CHATID = chat.id;
  // Re-render assíncrono (geração, chat, refresh) enquanto o título está sendo editado trocava o <input>
  // e o texto digitado era perdido — o `change` chegava num elemento novo, sem o evento `input`.
  // Nesse caso preservamos a página: só os nós/arestas são redesenhados.
  const titleEditing = TITLE_EDIT.get(String(id))?.typed === true || (typeof document !== 'undefined' && document.activeElement?.id === 'ttl');
  if (titleEditing && CUR && String(CUR.id) === String(id) && $('#cv')) { CUR = p; drawNodes(); drawEdges(); return; }
  $('#main').innerHTML = `<div class="ws"><div class="cv" id="cv"><div class="cv-top"><a href="#/home" id="returnPrevious" title="Return to previous page" aria-label="Return to previous page">←</a><input id="ttl" value="${esc(TITLE_EDIT.get(String(p.id))?.typed ? TITLE_EDIT.get(String(p.id)).value : p.title)}" aria-label="Editar título do projeto"><span class="ok" id="saveState">Saved</span>${p.type === 'story' ? '<span class="muted">Contém conteúdo gerado por IA</span>' : ''}</div><div class="cv-right"><span class="cv-pill"><span>▯ ${esc(p.ratio)} ▾</span><button id="stylelib" title="Biblioteca de estilos">▣ ${p.style ? esc(p.style) : 'Biblioteca de estilos'}</button></span>${credits()}<button id="shareB" class="cv-share" title="Compartilhar tela" aria-label="Compartilhar tela">⤴</button><button id="chatReopen" class="chat-reopen" title="Abrir painel do agente" aria-label="Abrir painel do agente">✦</button></div>
   ${p.canvas.nodes.length ? '' : `<div class="palette" id="pal"><div class="muted" style="width:100%;text-align:center">Escolha um tipo de ativo para criar</div>${CAT.nodeTypes.map((t) => `<button data-t="${t}">${t}</button>`).join('')}</div>`}
   <div class="cv-in" id="cvin"><svg class="edges" id="edges"></svg></div><div class="cv-add"><button class="primary" id="addN" aria-label="Adicionar nó">＋ Adicionar nó</button>${p.type === 'story' ? '<button id="tut" title="Abrir o tutorial" aria-label="Abrir o tutorial">📖</button><button id="kbd" title="Atalhos" aria-label="Abrir instruções de atalhos">⌨</button><button id="ptr" title="Ponteiro" aria-label="Ferramenta de ponteiro">➤</button>' : '<button id="lib">Biblioteca de recursos</button><button id="hlp">?</button>'}</div>
   <div class="cv-tools cv-bar">${p.type === 'story' ? '<button id="assetm" title="Abrir a biblioteca de ativos">▤ Gerenciamento de ativos</button>' : ''}<button id="zfit" title="Ajustar o zoom à tela" aria-label="Ajustar o zoom à tela">⟲</button><button id="hideEd" title="Ocultar conexões" aria-label="Ocultar conexões">⌇</button><button id="fit" title="Organizar a tela" aria-label="Organizar a tela">▦</button><button id="hidevar" title="Ocultar variações geradas" aria-label="Ocultar variações geradas">⑂</button><button id="minimap" title="Mostrar minimapa" aria-label="Mostrar minimapa">◎</button><button id="snap" title="Alinhar à grade" aria-label="Alinhar à grade">⌖</button><button id="mtrack" class="on" title="Modo trackpad: deslize com dois dedos para mover a tela" aria-label="Modo trackpad">▭</button><button id="mmouse" title="Modo mouse: role para dar zoom na tela" aria-label="Modo mouse">▯</button><button id="zopt" title="Opções de zoom" aria-label="Opções de zoom">100%</button></div><p class="muted" id="cvToolbarNote">Barra do canvas: verificando estado observado…</p>
   ${p.type === 'story' ? '<div class="cv-hint" id="hint"><button id="hintx" aria-label="Expandir o próximo passo">◉</button><span id="hinttx">Confirme personagens e cenas e depois gere o roteiro do storyboard</span><button id="hintgo" aria-label="Ir para a geração do roteiro do storyboard">→</button></div>' : ''}</div>
   <div class="chat"><div class="h" title="${esc(chat.title)}"><button id="newChat" class="pill" title="Novo chat">＋ Novo chat</button><span style="flex:1"></span><button id="chatHistory" class="chat-tool" title="Histórico de chats" aria-label="Histórico de chats" aria-pressed="false">◷</button><button id="chatLeft" class="chat-tool" title="Mostrar no lado esquerdo" aria-label="Mostrar no lado esquerdo" aria-pressed="false">◧</button><button id="shareC" class="chat-tool" title="Compartilhar" aria-label="Compartilhar">↗</button><button id="chatClose" class="chat-tool" title="Fechar painel" aria-label="Fechar painel">×</button></div><div class="msgs" id="msgs"></div><div class="in"><textarea id="cin" placeholder="Digite para criar um vídeo/imagem. Use @ para mencionar a sua mídia ou avatares."></textarea><div class="row"><button class="pill" id="cplus" title="Adicionar mídia">＋</button><button class="pill" id="cat" title="Mencionar">@</button><span class="sp"></span><button class="primary" id="csend">↑</button></div></div></div></div>`;
  bindCredits(); drawNodes(); drawEdges(); drawChat(chat);  // linha 90: o que a barra do canvas NÃO reproduz (ícones, dimensões, contratos) fica dito na tela.
  (async () => { try { const b = (await api('/api/canvas/toolbar')).body; const n = $('#cvToolbarNote'); if (n) n.innerHTML = `${b.observedActions.length} ações observadas na captura; ${b.localTools.length} ferramentas locais. Ícones: ${b.icons}; dimensões: ${b.dimensions}; contratos: ${b.contracts}.`; } catch { const n = $('#cvToolbarNote'); if (n) n.textContent = 'Barra do canvas: estado local indisponível.'; } })();

  const cv = $('#cv'); $('#returnPrevious').onclick = (e) => { e.preventDefault(); if (history.length > 1) history.back(); else location.hash = '/home'; }; { // Título do projeto: o input guarda em `data-saved` o valor que o servidor já tem. Qualquer `change` com esse
  // mesmo texto — re-render devolvendo valor antigo, replay do browser, foco perdido — não gera PATCH nenhum.
  // Assim o título salvo nunca é reenviado/regredido, sem depender de janela de tempo.
  const ttl = $('#ttl'); const key = String(id);
  const state = TITLE_EDIT.get(key) || (TITLE_EDIT.set(key, { typed: false, sending: false, value: '' }), TITLE_EDIT.get(key));
  ttl.dataset.saved = SAVED_TITLES.get(key) || CUR.title || ''; if (!state.typed) ttl.value = ttl.dataset.saved;
  // Só uma digitação real autoriza gravar. Valor injetado por re-render (SSE/refresh atrasado) ou replay do
  // browser chega ao `change` sem nenhum evento `input`: nesse caso o texto é descartado, sem PATCH.
  // O estado é do projeto, não do elemento: se um re-render trocar o <input> entre digitar e sair do campo,
  // a edição continua valendo (antes esse caso ficava 60 s sem evento e o texto era perdido).
  ttl.addEventListener('input', () => { state.typed = true; state.value = ttl.value; });
  ttl.onchange = async () => {
    const t = (ttl.value || '').trim();
    if (!state.typed) { ttl.value = ttl.dataset.saved; return; }
    if (!t) { ttl.value = ttl.dataset.saved; state.typed = false; return; }
    if (state.sending) return;                       // um PATCH por vez
    if (t === ttl.dataset.saved) { state.typed = false; return; }  // valor já salvo: nada a enviar (nunca repete valor antigo)
    state.sending = true; ttl.dataset.pending = '1';
    try {
      const r = await patch('/api/projects/' + id, { title: t });
      const ok = !!(r && r.ok !== false);
      if (ok) { CUR.title = t; SAVED_TITLES.set(key, t); }
      // Um re-render pode ter trocado o <input> enquanto o PATCH estava no ar: marcamos o valor salvo no
      // elemento que está na tela agora, não só no que recebeu o evento.
      const live = $('#ttl'); if (live) { live.dataset.saved = ok ? t : (SAVED_TITLES.get(key) || CUR.title || ''); if (ok && document.activeElement !== live) live.value = t; }
      document.dispatchEvent(new CustomEvent('pippit:title-saved', { detail: { title: ok ? t : (SAVED_TITLES.get(key) || CUR.title || ''), ok } }));
    } finally { state.sending = false; state.typed = false; state.value = ''; delete ttl.dataset.pending; }
  };
  if (typeof window !== 'undefined') window.__ttlHandlerVersion = 'typed-per-project'; } 
  document.querySelectorAll('#pal [data-t]').forEach((b) => (b.onclick = () => addNode(b.dataset.t)));
  $('#addN').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); const ord = ['Personagem', 'Cena', 'Estúdio de direção 3D', 'Texto', 'Imagem', 'Vídeo', 'Áudio']; const types = [...ord.filter((t) => CAT.nodeTypes.includes(t)), ...CAT.nodeTypes.filter((t) => !ord.includes(t))]; menuAt(r.left, r.top - 380, [{ label: 'Adicionar nó', cls: 'muted' }, ...types.map((t) => ({ label: t === 'Estúdio de direção 3D' ? t + ' (Novo)' : t, desc: t === 'Personagem' ? 'Novos personagens da peça, novas imagens de personagens existentes' : '', fn: () => addNode(t) }))]); };
  if ($('#lib')) $('#lib').onclick = () => pickAsset(async (a) => { const n = await addNode(a.kind === 'video' ? 'Vídeo' : a.kind === 'audio' ? 'Áudio' : 'Imagem', a.name); await patch(`/api/projects/${id}/nodes/${n.id}`, { assetId: a.id }); pageProject(id); });
  if ($('#hlp')) $('#hlp').onclick = () => toast('Tipos de nó: Personagem, Cena, Estúdio de direção 3D, Vídeo, Imagem, Texto, Áudio. Arraste os nós; use ⛓ no nó para conectar.');
  $('#fit').onclick = () => { const w = $('#cv').clientWidth; const before = CUR.canvas.nodes.map((n) => ({ id: n.id, x: n.x ?? 60, y: n.y ?? 90 })); CUR.canvas.nodes.forEach((n, i) => { n.x = 40 + (i % Math.max(1, Math.floor(w / 290))) * 285; n.y = 90 + Math.floor(i / Math.max(1, Math.floor(w / 290))) * 360; patch(`/api/projects/${id}/nodes/${n.id}`, { x: n.x, y: n.y }); }); const H = (window.__cvh ||= { u: [], r: [] }); H.u.push(before.map((b) => { const n = CUR.canvas.nodes.find((x) => x.id === b.id); return { id: b.id, from: { x: b.x, y: b.y }, to: { x: n.x, y: n.y } }; })); H.r = []; drawNodes(); drawEdges(); };
  $('#hideEd').onclick = (e) => { const s = $('#edges'); s.style.display = s.style.display === 'none' ? '' : 'none'; const off = s.style.display === 'none'; e.currentTarget.title = off ? 'Mostrar conexões' : 'Ocultar conexões'; e.currentTarget.classList.toggle('on', off); };
  $('#stylelib').onclick = async (e) => { const ex = $('#stylepanel'); if (ex) return ex.remove(); const SL = (await api('/api/style-library')).body; const st = { cat: 'All', q: '', search: false }; const pn = h('<div class="style-panel" id="stylepanel"></div>'); $('#cv').appendChild(pn);
    const draw = () => { const names = (st.cat === 'All' ? SL.todos : SL.categorias[st.cat]).filter((n) => n.toLowerCase().includes(st.q.toLowerCase())); pn.innerHTML = `<div class="sp-h"><b>Biblioteca de estilos</b><div class="muted" style="font-size:12px">A escolha fica salva no projeto; o efeito dela na geração do Pippit não foi observado e não é aplicado aqui.</div></div><div class="sp-tabs">${['All', 'Live-action', '2D', '3D'].map((c) => `<button class="${st.cat === c ? 'on' : ''}" data-c="${c}">${c === 'All' ? 'Todos' : c === 'Live-action' ? 'Live-action (filmagem real)' : c}</button>`).join('')}<span style="flex:1"></span><button id="spsearch" aria-label="Pesquisar">🔍</button></div>${st.search ? `<input id="spq" placeholder="Pesquisar estilos" value="${esc(st.q)}">` : ''}<div class="sp-grid"><div class="sp-card ${!CUR.style ? 'on' : ''}" data-s="">⌀<span>Nenhum</span></div><div class="sp-card off" data-custom="1">＋<span>Personalizar</span></div>${names.map((n) => `<div class="sp-card ${CUR.style === n ? 'on' : ''}" data-s="${esc(n)}"><span>${esc(n)}</span></div>`).join('')}</div>`;
      pn.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { st.cat = b.dataset.c; draw(); })); $('#spsearch', pn).onclick = () => { st.search = !st.search; draw(); const q = $('#spq', pn); if (q) q.focus(); }; const q = $('#spq', pn); if (q) q.oninput = (ev) => { st.q = ev.target.value; const pos = ev.target.selectionStart; draw(); const nq = $('#spq', pn); nq.focus(); nq.setSelectionRange(pos, pos); };
      pn.querySelectorAll('[data-s]').forEach((c) => (c.onclick = async () => { const r = await patch(`/api/projects/${CUR.id}`, { style: c.dataset.s || null }); if (r) { CUR.style = c.dataset.s || null; $('#stylelib').textContent = '▣ ' + (CUR.style || 'Biblioteca de estilos'); draw(); } })); pn.querySelector('[data-custom]').onclick = () => toast('Personalizar estilo: fluxo não observado no Pippit.'); };
    draw(); setTimeout(() => document.addEventListener('mousedown', function f(ev) { if (!$('#stylepanel')) return document.removeEventListener('mousedown', f); if (!ev.target.closest('#stylepanel,#stylelib')) { $('#stylepanel')?.remove(); document.removeEventListener('mousedown', f); } }), 0); };
  const CVZ = () => window.__cvz || 1; const applyV = () => { const z = CVZ(), q = window.__cvp || { x: 0, y: 0 }; $('#cvin').style.transformOrigin = '0 0'; $('#cvin').style.transform = `translate(${q.x}px, ${q.y}px) scale(${z})`; $('#zopt').textContent = Math.round(z * 100) + '%'; };
  const setZ = (z) => { window.__cvz = Math.min(4, Math.max(0.1, Math.round(z * 100) / 100)); applyV(); drawMini(); }; window.__cvz = window.__cvz || 1; window.__cvp = { x: 0, y: 0 }; if (window.__cvhId !== id) { window.__cvh = { u: [], r: [] }; window.__cvhId = id; }
  const fitZ = () => { const nn = CUR.canvas.nodes; if (!nn.length) return setZ(1); const mx = Math.max(...nn.map((n) => (n.x ?? 60) + 300)), my = Math.max(...nn.map((n) => (n.y ?? 90) + 380)); setZ(Math.min(1, $('#cv').clientWidth / mx, $('#cv').clientHeight / my)); };
  const drawMini = () => { const m = $('#cvmini'); if (!m) return; m.innerHTML = CUR.canvas.nodes.map((n) => `<i style="left:${(n.x ?? 60) / 12}px;top:${(n.y ?? 90) / 12}px"></i>`).join(''); };
  $('#zfit').onclick = fitZ; applyV();
  $('#zopt').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); menuAt(r.left, r.top - 230, [{ label: Math.round(CVZ() * 100) + ' %', cls: 'muted' }, { label: 'Diminuir zoom   Ctrl -', fn: () => setZ(CVZ() - 0.1) }, { label: 'Aumentar zoom   Ctrl +', fn: () => setZ(CVZ() + 0.1) }, { label: 'Ajustar à tela   Ctrl 0', fn: fitZ }, { label: 'Zoom em 50%', fn: () => setZ(0.5) }, { label: 'Zoom em 100%', fn: () => setZ(1) }]); };
  $('#minimap').onclick = (e) => { const on = !$('#cvmini'); if (on) { const m = h('<div class="cv-mini" id="cvmini" aria-label="Minimapa"></div>'); $('#cv').appendChild(m); drawMini(); } else $('#cvmini').remove(); e.currentTarget.classList.toggle('on', on); e.currentTarget.title = on ? 'Ocultar minimapa' : 'Mostrar minimapa'; };
  $('#snap').onclick = (e) => { window.__snap = !window.__snap; e.currentTarget.classList.toggle('on', window.__snap); e.currentTarget.title = window.__snap ? 'Desativar alinhamento à grade' : 'Alinhar à grade'; };
  $('#hidevar').onclick = (e) => { const on = !$('#cv').classList.contains('hide-var'); $('#cv').classList.toggle('hide-var', on); e.currentTarget.classList.toggle('on', on); e.currentTarget.title = on ? 'Mostrar variações geradas' : 'Ocultar variações geradas'; };
  const mode = (m) => { window.__cvmode = m; $('#mtrack').classList.toggle('on', m === 'track'); $('#mmouse').classList.toggle('on', m === 'mouse'); }; window.__cvmode = window.__cvmode || 'track'; mode(window.__cvmode); $('#mtrack').onclick = () => mode('track'); $('#mmouse').onclick = () => mode('mouse');
  $('#cv').onwheel = (e) => { if (e.target.closest('textarea,video,audio,.chat')) return; e.preventDefault(); if (window.__cvmode === 'mouse' || e.ctrlKey) setZ(CVZ() * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); else { window.__cvp = { x: window.__cvp.x - e.deltaX, y: window.__cvp.y - e.deltaY }; applyV(); } };
  let KEYS = (e) => { if (!$('#cv')) return document.removeEventListener('keydown', KEYS); if (e.target.closest('textarea,input')) return; if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZ(CVZ() + 0.1); } else if (e.ctrlKey && e.key === '-') { e.preventDefault(); setZ(CVZ() - 0.1); } else if (e.ctrlKey && e.key === '0') { e.preventDefault(); fitZ(); } else if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); $('#fit').click(); } else if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) { e.preventDefault(); $('#addN').click(); } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) { e.preventDefault(); const H = (window.__cvh ||= { u: [], r: [] }); const undo = e.key.toLowerCase() === 'z'; const src = undo ? H.u : H.r; const step = src.pop(); if (step) { (undo ? H.r : H.u).push(step); step.forEach((c) => { const n = CUR.canvas.nodes.find((x) => x.id === c.id); if (!n) return; const t = undo ? c.from : c.to; n.x = t.x; n.y = t.y; patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { x: n.x, y: n.y }); }); drawNodes(); drawEdges(); } } else if (e.key === 'h' || e.key === 'H') window.__tool = 'hand'; else if (e.key === 'v' || e.key === 'V') window.__tool = 'move';
    // Atalhos da referência (extensões locais; nunca observados no Pippit): Ctrl A, Delete, Ctrl G,
    // Ctrl Shift G, Ctrl F, Ctrl Enter. Espaço + arrastar é tratado no mousedown do canvas.
    else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); window.__cvSel = CUR.canvas.nodes.map((x) => x.id); SEL = null; drawNodes(); }
    else if (e.key === 'Delete') { e.preventDefault(); const ids = window.__cvSel?.length ? [...window.__cvSel] : SEL ? [SEL] : []; if (ids.length) { window.__cvSel = []; SEL = null; (async () => { for (const i2 of ids) await api(`/api/projects/${CUR.id}/nodes/${i2}`, { method: 'DELETE' }); await pageProject(CUR.id); })(); } }
    else if (e.ctrlKey && e.shiftKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); const ids = window.__cvSel?.length ? window.__cvSel : SEL ? [SEL] : []; (async () => { let n2 = 0; for (const i2 of ids) { const nn = CUR.canvas.nodes.find((x) => x.id === i2); if (nn?.group) { await patch(`/api/projects/${CUR.id}/nodes/${i2}`, { group: null }); n2++; } } toast(n2 ? `Desagrupados ${n2} nó(s).` : 'Selecione nós agrupados para desagrupar (Ctrl Shift G).'); await pageProject(CUR.id); })(); }
    else if (e.ctrlKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); const ids = window.__cvSel?.length ? window.__cvSel : SEL ? [SEL] : []; if (ids.length < 2) return toast('Selecione dois ou mais nós para agrupar (Ctrl G).'); const gid = 'g' + Date.now().toString(36); (async () => { for (const i2 of ids) await patch(`/api/projects/${CUR.id}/nodes/${i2}`, { group: gid }); toast(`Agrupados ${ids.length} nó(s). Mover um nó move o grupo.`); await pageProject(CUR.id); })(); }
    else if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); const m2 = modal(`<h2>Localizar nó</h2><input id="cvsq" placeholder="Buscar por título ou tipo" style="width:100%"><div id="cvsr" style="margin-top:8px"></div>`, 'sm'); const q2 = $('#cvsq'); const drawF = () => { const t = q2.value.toLowerCase(); $('#cvsr').innerHTML = CUR.canvas.nodes.filter((x) => !t || (x.title || x.type).toLowerCase().includes(t)).slice(0, 20).map((x) => `<button class="mediaitem" data-fn="${x.id}">${esc(x.title || x.type)}</button>`).join('') || '<p class="muted">Nenhum nó.</p>'; $('#cvsr').querySelectorAll('[data-fn]').forEach((b) => (b.onclick = () => { SEL = b.dataset.fn; window.__cvSel = []; m2.close(); drawNodes(); drawBar(); const el = document.querySelector(`.node[data-id="${b.dataset.fn}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'center' }); })); }; q2.oninput = drawF; drawF(); q2.focus(); }
    else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); const gg = $('#gg'); if (gg) gg.click(); else toast('Nenhum painel de geração aberto (Ctrl Enter = Gerar).'); }
    else if (e.key === ' ') { window.__spacePan = true; }
  };
  if (window.__cvkeys) document.removeEventListener('keydown', window.__cvkeys); window.__cvkeys = KEYS; document.addEventListener('keydown', KEYS);
  document.addEventListener('keyup', (e) => { if (e.key === ' ') window.__spacePan = false; });
  $('#cv').onmousedown = (e) => { if ((window.__tool !== 'hand' && !window.__spacePan) || e.target.closest('.node,.cv-bar,.cv-add,.cv-top,.cv-right,.cv-hint')) return; let sx = e.clientX, sy = e.clientY; const o = { ...window.__cvp }; const mv = (ev) => { window.__cvp = { x: o.x + ev.clientX - sx, y: o.y + ev.clientY - sy }; applyV(); }; const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); };
  if ($('#tut')) $('#tut').onclick = () => window.open('https://bytedance.larkoffice.com/docx/PIfod47yZoM6b6xMQpvcDb1vnXe', '_blank', 'noopener');
  if ($('#kbd')) $('#kbd').onclick = (e) => { // Linha 47: cada atalho diz se funciona AQUI; o que não foi observado não é afirmado
    const r = e.currentTarget.getBoundingClientRect();
    const fallback = [['Criar', ''], ['Adicionar nó', 'Tab'], ['Zoom', ''], ['Aumentar zoom', 'Ctrl +'], ['Diminuir zoom', 'Ctrl -'], ['Ajustar à tela', 'Ctrl 0'], ['Geral', ''], ['Desfazer', 'Ctrl Z'], ['Refazer', 'Ctrl Y']];
    const draw = (b) => { const groups = b?.groups || fallback.map(([a, k]) => ({ group: a, rows: k ? [{ action: a, keys: k, implemented: true }] : [] })).filter((g) => g.rows.length);
      const m = h(`<div class="kbd-pop" id="kbdPop" style="left:${Math.max(8, r.left - 40)}px;top:${Math.max(8, r.top - 520)}px">${b ? `<div class="muted" style="padding:2px 4px 6px" id="kbdNote">${esc(String(b.note || ''))}</div>` : ''}${groups.map((g) => `<b>${esc(g.group)}</b>${g.rows.map((row) => `<div class="kr" data-k="${esc(row.keys)}"><span>${esc(row.action)}</span><kbd>${esc(row.keys)}</kbd><i class="kstate ${row.implemented ? '' : 'off'}">${row.implemented ? 'local' : 'não implementado'}</i></div>`).join('')}`).join('')}${b?.share ? `<div class="muted" style="padding:6px 4px 0">${esc(b.share.label)}: ${esc(b.share.local)}. Contrato do serviço: ${esc(b.share.contractState)}.</div>` : ''}</div>`);
      document.body.appendChild(m); setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0); };
    if (window.__cvShortcuts) return draw(window.__cvShortcuts);
    api('/api/canvas/shortcuts').then((res) => { window.__cvShortcuts = res.body; draw(res.body); }).catch(() => draw(null));
  };
  if ($('#ptr')) $('#ptr').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); menuAt(r.left, r.top - 90, [{ label: 'Mover   V', fn: () => (window.__tool = 'move') }, { label: 'Ferramenta mão   H', fn: () => (window.__tool = 'hand') }]); };
  if ($('#assetm')) $('#assetm').onclick = () => { const ex = $('#assetpanel'); if (ex) return ex.remove(); const nn = CUR.canvas.nodes.filter((n) => n.assetId); const pn = h(`<div class="asset-panel" id="assetpanel"><b>Ativos de produção</b><div class="row"><span class="pill">Todos os episódios</span><span class="pill">Grupo</span><button id="apc">Recolher</button></div>${nn.length} item(ns)<div>${nn.map((n) => { const a = (window.__assets || []).find((x) => x.id === n.assetId); return a ? `<div class="ap-i">${esc(a.name)} <span class="muted">${a.duration ? '0:' + String(Math.round(a.duration)).padStart(2, '0') : ''}</span></div>` : ''; }).join('')}</div></div>`); $('#cv').appendChild(pn); $('#apc', pn).onclick = () => pn.remove(); };
  if ($('#hintx')) $('#hintx').onclick = () => { const t = $('#hinttx'), g = $('#hintgo'); const on = t.style.display === 'none'; t.style.display = on ? '' : 'none'; g.style.display = on ? '' : 'none'; };
  if ($('#hintgo')) $('#hintgo').onclick = () => toast('Gerar o roteiro do storyboard exige IA de roteiro e vídeo (sem provedor local): nada foi gerado nem debitado.', 6000);
  const share = async () => { const s = (await post(`/api/projects/${id}/share`)).body; try { await navigator.clipboard.writeText(s.link); } catch {} toast(s.message); }; $('#shareB').onclick = share; $('#shareC').onclick = share;
  $('#newChat').onclick = async () => { const c = (await post(`/api/projects/${id}/chats`)).body; CHATID = c.id; pageProject(id); };
  $('#chatLeft').onclick = (e) => { const left = !$('.ws').classList.contains('chat-left'); $('.ws').classList.toggle('chat-left', left); e.currentTarget.setAttribute('aria-pressed', String(left)); e.currentTarget.title = left ? 'Mostrar no lado direito' : 'Mostrar no lado esquerdo'; };
  $('#chatClose').onclick = () => $('.ws').classList.add('chat-closed');
  $('#chatReopen').onclick = () => $('.ws').classList.remove('chat-closed');
  $('#chatHistory').onclick = () => {
    const prior = p.chats.filter((c) => c.id !== CHATID);
    const m = modal(`<h2>Chat history</h2><p class="muted">Histórico disponível apenas neste projeto local.</p>${prior.length ? prior.map((c) => `<button class="mediaitem" data-chat="${esc(c.id)}">${esc(c.title || 'Novo chat')} <span class="muted">${c.messages.length} mensagem(ns)</span></button>`).join('') : '<p>No history yet</p>'}<div class="row" style="margin-top:10px"><input id="chIdea" placeholder="Campo de ideia (documentado no capture; destino no original UNOBSERVED)" style="flex:1"><button class="primary" id="chIdeaGo" aria-label="Enviar ideia">↑</button></div>`, 'sm');
    m.querySelectorAll('[data-chat]').forEach((b) => (b.onclick = () => { CHATID = b.dataset.chat; m.close(); pageProject(id); }));
    // Campo de ideia documentado no capture: o envio real nunca foi observado. Equivalente local: cria um
    // novo chat do projeto com a ideia como primeira mensagem (nada é enviado ao Pippit).
    $('#chIdeaGo').onclick = async () => {
      const t = $('#chIdea').value.trim(); if (!t) return;
      const c = (await post(`/api/projects/${id}/chats`)).body;
      await post(`/api/projects/${id}/chats/${c.id}/messages`, { text: t });
      CHATID = c.id; m.close(); pageProject(id);
    };
  };
  $('#cplus').onclick = () => pickAsset((x) => ($('#cin').value += ` [Mídia: ${x.name}]`)); $('#cat').onclick = () => toast('Menção de mídia (@): use o nome do ativo ou avatar no texto.');
  $('#csend').onclick = () => sendChat({ text: $('#cin').value.trim() }); $('#cin').onkeydown = (e) => { if (e.key === 'Enter' && e.ctrlKey) sendChat({ text: $('#cin').value.trim() }); };
}
async function addNode(type, title) { const r = (await post(`/api/projects/${CUR.id}/nodes`, { type, title })).body; await pageProject(CUR.id); return r; }
async function sendChat(body) { if (!body.text && !body.answer && !body.confirmation) return; toast('Processando… (o planejamento por LLM local pode levar 1–2 minutos)'); const r = await post(`/api/projects/${CUR.id}/chats/${CHATID}/messages`, body); if (!r.ok) toast(r.body?.error || 'erro'); await refresh(); pageProject(CUR.id); }
function drawChat(chat) {
  const el = $('#msgs'); if (!chat.messages.length) el.innerHTML = '<div class="chat-empty">Olá, o que vamos criar hoje?</div>'; else el.innerHTML = chat.messages.map((m) => m.role === 'user' ? `<div class="msg user">${esc(m.text)}</div>` : `<div class="msg agent">${(m.steps || []).map((s) => `<div class="step ${s.state}"><span class="d"></span>${esc(s.label)}${s.duration ? ` · ${s.duration}s` : ''}${s.provider ? ` · ${esc(s.provider)}` : ''}${s.upsell ? ` — <b>${esc(s.upsell.heading)}</b>` : ''}${s.reason ? ` — ${esc(s.reason)}` : ''}</div>`).join('')}<div>${esc(m.text)}</div>${m.form ? formHtml(m, m === chat.messages.at(-1)) : ''}${(m.artifacts || []).map((a) => `${a.animatic ? '<div class="animatic-tag">PRÉVIA (animatic) — não é vídeo gerado por IA</div>' : ''}<video controls src="/files/${CUR.canvas.nodes.find((n) => n.id === a.nodeId)?.assetId ? assetStored(a.assetId) : ''}" width="260"></video>`).join('')}${m.jobs?.length ? `<a href="#/tasks" class="joblink">Ver ${m.jobs.length} tarefa(s) de geração</a>` : ''}</div>`).join('');
  el.scrollTop = el.scrollHeight; bindForms(chat);
}
const assetStored = (id) => { const a = (window.__assets || []).find((x) => x.id === id); return a ? a.stored : ''; };
api('/api/assets').then((r) => (window.__assets = r.body));
function formHtml(m, active) {
  const f = m.form; const dis = active ? '' : 'disabled';
  if (f.type === 'question') return `<div class="form">${f.options.map((o, i) => `<label><input type="radio" name="q" value="${esc(o)}" ${dis}> ${esc(o)}</label>`).join('')}<button class="primary" data-f="answer" ${dis}>Responder</button></div>`;
  if (f.type === 'confirm_production') return `<div class="form"><b>Confirmar produção do vídeo</b><div>1. Como deseja iniciar a produção?</div>${f.options.mode.map((o, i) => `<label><input type="radio" name="mode" value="${esc(o)}" ${i === 0 ? 'checked' : ''} ${dis}> ${esc(o)}</label>`).join('')}<div>2. Após cada segmento, continuar automaticamente?</div>${f.options.autoContinue.map((o, i) => `<label><input type="radio" name="auto" value="${esc(o)}" ${i === 0 ? 'checked' : ''} ${dis}> ${esc(o)}</label>`).join('')}<button class="primary" data-f="confirm" ${dis}>Confirmar</button></div>`;
  if (f.type === 'skill_inputs') return `<div class="form" id="siform"><b>Entradas que faltam</b><ul>${f.missing.map((x) => `<li>${esc(x.label)}${x.hint ? ` <small class="muted">${esc(x.hint)}</small>` : ''}</li>`).join('')}</ul><textarea id="sitext" rows="3" style="width:100%" placeholder="Complemente aqui" ${dis}></textarea><div class="row"><button data-f="siattach" ${dis}>Anexar da biblioteca</button><button class="primary" data-f="sisend" ${dis}>Enviar</button><button data-f="siskip" ${dis}>Continuar assim mesmo</button></div></div>`;
  if (f.type === 'credit_confirm') return `<div class="form">Custo estimado: <b>${f.estimatedCredits}</b> créditos (limite ${f.limit}).<button class="primary" data-f="credit" ${dis}>Confirmar uso de créditos</button></div>`;
  return '';
}
function bindForms() {
  let SIATT = []; const b = (s) => $(`[data-f="${s}"]`); if (b('siattach')) b('siattach').onclick = () => pickAsset((a) => { SIATT.push(a.id); toast(`${SIATT.length} anexo(s) escolhido(s)`); }); if (b('sisend')) b('sisend').onclick = () => { const t = $('#sitext').value.trim() || (SIATT.length ? 'Anexos enviados.' : ''); if (!t) return toast('Escreva o que falta ou anexe um arquivo.'); sendChat({ text: t, attachments: SIATT }); }; if (b('siskip')) b('siskip').onclick = () => sendChat({ text: 'continuar assim mesmo' }); if (b('answer')) b('answer').onclick = () => { const v = document.querySelector('input[name=q]:checked'); if (v) sendChat({ answer: v.value }); };
  if (b('confirm')) b('confirm').onclick = () => sendChat({ confirmation: { mode: document.querySelector('input[name=mode]:checked').value, autoContinue: document.querySelector('input[name=auto]:checked').value } });
  if (b('credit')) b('credit').onclick = () => sendChat({ confirmation: { creditOk: true } });
}
function drawNodes() {
  const cv = $('#cvin'); cv.querySelectorAll('.node').forEach((n) => n.remove());
  CUR.canvas.nodes.forEach((n) => { const a = n.assetId ? (window.__assets || []).find((x) => x.id === n.assetId) : null; const media = a ? (a.kind === 'video' ? `<div class="vnode"><video controls src="/files/${a.stored}"></video><button class="vplay" data-play aria-label="Reproduzir prévia">▶</button></div>` : a.kind === 'image' ? `<img src="/files/${a.stored}">` : `<audio controls src="/files/${a.stored}"></audio>`) : '';
    const el = h(`<div class="node ${SEL === n.id || (window.__cvSel || []).includes(n.id) ? 'sel' : ''}" data-id="${n.id}" style="left:${n.x ?? 60}px;top:${n.y ?? 90}px"><div class="lab">${n.type === 'Vídeo' && a ? '▣ ' + esc(n.title || a.name) : esc(n.type === 'Personagem' ? 'Função sem nome' : n.type)}</div>
     <div class="body">${n.doc ? `<pre>${esc(n.text || '')}</pre>` : n.type === 'Texto' ? `<textarea style="width:100%;height:100px" data-txt>${esc(n.text || '')}</textarea>` : n.type === 'Estúdio de direção 3D' ? '<b>Estúdio de direção 3D</b><span>Abra para editar planos e ver prévias de cenas.</span><button data-3d>Abrir o 3D Director Studio</button>' : media || `<div class="row"><button data-up>Carregar</button><button data-lib>Biblioteca de recursos</button></div>`}</div>
     <div class="meta">${esc(n.title)}${n.type === 'Personagem' || n.type === 'Cena' ? ` · <button data-desc>…</button>` : ''} <button data-link title="Conectar a outro nó">⛓</button> <button data-del title="Excluir nó">🗑</button></div></div>`);
    el.onmousedown = (e) => { if (e.target.closest('button,textarea,video,audio')) return;
      // Alt + arrastar = Duplicar nó; Ctrl Alt + arrastar = Criar cópia (sufixo no título). Extensões
      // locais: o original volta à posição inicial e a cópia fica onde o arrasto terminou.
      const dup = e.altKey ? !!e.ctrlKey : null;
      SEL = n.id; let sx = e.clientX, sy = e.clientY; const ox = n.x ?? 60, oy = n.y ?? 90;
      const mates = (window.__cvgrp = n.group) ? CUR.canvas.nodes.filter((x) => x.group === n.group && x.id !== n.id).map((x) => ({ n: x, x: x.x ?? 60, y: x.y ?? 90 })) : [];
      const mv = (ev) => { n.x = ox + (ev.clientX - sx) / (window.__cvz || 1); n.y = oy + (ev.clientY - sy) / (window.__cvz || 1); if (window.__snap) { n.x = Math.round(n.x / 20) * 20; n.y = Math.round(n.y / 20) * 20; } el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; mates.forEach((mt) => { mt.n.x = mt.x + (n.x - ox); mt.n.y = mt.y + (n.y - oy); const mel = cv.querySelector(`.node[data-id="${mt.n.id}"]`); if (mel) { mel.style.left = mt.n.x + 'px'; mel.style.top = mt.n.y + 'px'; } }); drawEdges(); };
      const up = async () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
        if (dup !== null && (ox !== n.x || oy !== n.y)) {
          // duplicação/criar cópia: o original volta ao lugar; a cópia fica no fim do arrasto
          const fx = n.x, fy = n.y; n.x = ox; n.y = oy;
          await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { x: ox, y: oy });
          const r = await post(`/api/projects/${CUR.id}/nodes`, { type: n.type, title: dup ? (n.title || n.type) + ' (cópia)' : (n.title || n.type) });
          const novo = r?.body; if (novo) { await patch(`/api/projects/${CUR.id}/nodes/${novo.id}`, { x: fx, y: fy, text: n.text || null, assetId: n.assetId || null }); if (n.group) await patch(`/api/projects/${CUR.id}/nodes/${novo.id}`, { group: n.group }); }
          await pageProject(CUR.id); return;
        }
        if (ox !== n.x || oy !== n.y) { const H = (window.__cvh ||= { u: [], r: [] }); H.u.push([{ id: n.id, from: { x: ox, y: oy }, to: { x: n.x, y: n.y } }]); H.r = []; }
        await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { x: n.x, y: n.y });
        for (const mt of mates) await patch(`/api/projects/${CUR.id}/nodes/${mt.n.id}`, { x: mt.n.x, y: mt.n.y });
      }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); drawNodes(); drawEdges(); drawBar(); };
    el.onclick = (e) => { if (e.target.closest('button,textarea')) return; SEL = n.id; window.__cvSel = []; drawNodes(); drawEdges(); drawBar(); };
    cv.appendChild(el);
    const pl = $('[data-play]', el); if (pl) { const v = $('video', el); pl.onclick = (ev) => { ev.stopPropagation(); v.play(); }; v.onplay = () => (pl.style.display = 'none'); v.onpause = () => (pl.style.display = ''); v.onended = () => (pl.style.display = ''); }
    const t = $('[data-txt]', el); if (t) t.onchange = () => patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { text: t.value });
    const up = $('[data-up]', el); if (up) up.onclick = () => fileInput('image/*,video/*,audio/*', async (f) => { const a = await uploadAsset(f); (window.__assets ||= []).unshift(a); await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { assetId: a.id }); pageProject(CUR.id); });
    const lb = $('[data-lib]', el); if (lb) lb.onclick = () => pickAsset(async (a) => { await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { assetId: a.id }); pageProject(CUR.id); });
    const d3 = $('[data-3d]', el); if (d3) d3.onclick = () => openStudio(n, async (scene) => { n.scene = scene; await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { scene }); }, toast);
    $('[data-del]', el).onclick = async () => { await api(`/api/projects/${CUR.id}/nodes/${n.id}`, { method: 'DELETE' }); pageProject(CUR.id); };
    $('[data-link]', el).onclick = async () => { if (!LINKFROM) { LINKFROM = n.id; toast('Escolha o nó de destino e clique em ⛓ nele.'); } else { if (LINKFROM !== n.id) await post(`/api/projects/${CUR.id}/edges`, { from: LINKFROM, to: n.id }); LINKFROM = null; pageProject(CUR.id); } };
    const ds = $('[data-desc]', el); if (ds) ds.onclick = () => descDialog(n);
  }); drawBar();
}
// Ferramentas de nó sem IA (ffmpeg): geram um novo nó ligado ao original. As de IA seguem bloqueadas (a API devolve 501 com o motivo).
const TOOL_FORMS = {
  'Extrair quadro': `<label>Tempo (s) <input id="tp" type="number" step="0.1" min="0" placeholder="vazio = último quadro"></label>`,
  'Cortar': `<label>Início (s) <input id="ts" type="number" step="0.1" min="0" value="0"></label> <label>Fim (s) <input id="te" type="number" step="0.1" min="0" placeholder="vazio = fim"></label>`,
  'Recortar': `<label>Proporção <select id="tr">${['1:1', '9:16', '16:9', '3:4', '4:3', '21:9'].map((x) => `<option>${x}</option>`).join('')}</select></label>`,
  'Girar': `<label>Ângulo <select id="tg"><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>`,
  'Extrair áudio': '<p class="muted">Gera um nó de áudio com a faixa do vídeo.</p>',
};
function nodeTool(n, tool) {
  if (!TOOL_FORMS[tool]) return runNodeTool(n, tool, {});
  const m = modal(`<h2>${esc(tool)}</h2>${TOOL_FORMS[tool]}<p><button class="primary" id="tgo">Aplicar</button></p>`, 'sm');
  $('#tgo', m).onclick = () => { const v = (id) => ($(id, m)?.value ?? ''); const P = tool === 'Extrair quadro' ? (v('#tp') === '' ? { t: 'last' } : { t: Number(v('#tp')) }) : tool === 'Cortar' ? { start: Number(v('#ts')) || 0, end: v('#te') === '' ? undefined : Number(v('#te')) } : tool === 'Recortar' ? { ratio: v('#tr') } : tool === 'Girar' ? { degrees: Number(v('#tg')) } : {}; m.close(); runNodeTool(n, tool, P); };
}
async function runNodeTool(n, tool, params) {
  const r = await post(`/api/projects/${CUR.id}/nodes/${n.id}/tool`, { tool, params });
  if (!r.ok) return toast(r.body.error || 'Falha na ferramenta.');
  (await api('/api/assets')).body && (window.__assets = (await api('/api/assets')).body); await refresh(); toast(`${tool}: novo nó criado.`); pageProject(CUR.id);
}
function drawBar() {
  document.querySelectorAll('.node-bar,.gen').forEach((e) => e.remove()); const n = CUR.canvas.nodes.find((x) => x.id === SEL); if (!n) return; const el = $(`.node[data-id="${n.id}"]`); if (!el) return;
  const editBtn = n.type === 'Vídeo' ? `<button data-edit="${n.id}" title="Extensão local: abre o vídeo deste nó no editor (não observado no Pippit)">Editar no editor</button>${(n.editorIds || []).length ? `<a href="#/editor/${n.editorIds.at(-1)}" class="muted" style="font-size:11px;align-self:center">edição existente</a>` : ''}` : '';
  if (n.tools?.length || editBtn) el.appendChild(h(`<div class="node-bar">${(n.tools || []).map((t) => `<button ${t.enabled ? '' : 'disabled'} data-tool="${esc(t.name)}">${esc(t.name)}</button>`).join('')}${n.tools?.length ? '<button data-tool="Mais">Mais</button>' : ''}${editBtn}</div>`));
  const eb = el.querySelector('[data-edit]'); if (eb) eb.onclick = async (e) => { e.stopPropagation(); const r = await post(`/api/projects/${CUR.id}/nodes/${n.id}/edit`, {}); if (!r.ok) return toast(r.body.error || 'Não foi possível abrir no editor', 6000); await refresh(); location.hash = '/editor/' + r.body.editorId; };
  el.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); if (b.dataset.tool === 'Mais') { const r = b.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, ['Analisar', 'Recorte', 'Expandir'].map((x) => ({ label: x, fn: () => toast(x + ': ferramenta do Pippit (função de IA) não implementada localmente.') }))); } else nodeTool(n, b.dataset.tool); }));
  if (n.panel && !n.doc) { const p = n.panel; const ratios = p.kind === 'video' ? CAT.videoRatios : CAT.imageRatios; const models = p.kind === 'video' ? CAT.videoModels : p.kind === 'image' ? CAT.imageModels : CAT.audioModels; const g = h(`<div class="gen"><div class="muted">${p.kind === 'text' ? 'Descreva o que deseja escrever.' : 'Descreva as suas ideias. Digite @ para mencionar mídia como referência.'}</div><textarea id="gp" style="width:100%" rows="3"></textarea>${p.kind === 'audio' ? `<div class="row"><label>Voz <select id="gv"><option value="">Voz do Windows (SAPI) — padrão</option></select></label><span class="muted" id="gvnote">verificando vozes…</span></div>` : ''}<div class="row"><b>${esc(p.kind === 'text' ? 'Roteador gratuito' : models.find((m) => m.id === p.model)?.name || p.model)}</b>${p.kind !== 'text' ? `<select id="gr">${ratios.filter((r) => r !== 'Inteligente').map((r) => `<option ${p.ratio === r ? 'selected' : ''}>${r}</option>`).join('')}</select>` : ''}${p.kind === 'video' ? `<select id="gs"><option ${p.seconds == 5 ? 'selected' : ''}>5</option><option ${p.seconds == 10 ? 'selected' : ''}>10</option><option>15</option></select>s` : ''}${p.kind !== 'text' ? `<span>✦ ${p.kind === 'video' ? 37 * (p.seconds || 10) : p.cost || '—'}</span>` : ''}<button class="primary" id="gg">Gerar</button></div>${p.kind === 'video' ? '<div class="muted" id="vprog"></div>' : ''}</div>`); g.onmousedown = (e) => e.stopPropagation(); el.appendChild(g);
    // Voz: SAPI é o padrão da instalação; o provedor do usuário aparece como opção e só é usado se escolhido
    // (ou se não existir SAPI nesta máquina). Nada de voz é inventado: a lista vem de /api/tts-voices.
    if (p.kind === 'audio' && $('#gv', g)) api('/api/tts-voices').then((v) => {
      const sel = $('#gv', g), note = $('#gvnote', g); if (!sel || !note) return; const b = v.body || {};
      if (b.defaultEngine === 'cloud') sel.options[0] = new Option('Provedor do usuário — padrão nesta máquina', 'cloud');
      (b.voices || []).forEach((x) => sel.add(new Option(x.name || x, x.name || x)));
      note.textContent = b.sapiAvailable ? 'SAPI (local) é o padrão; provedor do usuário é opção.' : (b.defaultEngine === 'cloud' ? 'Sem SAPI aqui: o provedor configurado é usado.' : 'Nenhuma voz disponível nesta máquina.');
    });
    $('#gg', g).onclick = async () => { const voiceChoice = p.kind === 'audio' ? $('#gv', g)?.value : undefined; const r = await post(`/api/projects/${CUR.id}/nodes/${n.id}/generate`, { ...p, prompt: $('#gp', g).value, ratio: $('#gr', g)?.value, seconds: $('#gs', g) ? Number($('#gs', g).value) : undefined, ...(p.kind === 'audio' ? { voice: voiceChoice === 'cloud' ? undefined : (voiceChoice || undefined), voiceSource: voiceChoice === 'cloud' ? 'cloud' : undefined } : {}) }); if (r.ok && r.body.queued && r.body.run?.task === 'video_generation') { toast(r.body.note || 'Vídeo na fila do roteador gratuito.'); followVideoRun(r.body.run.id); return; } if (r.ok) {
      toast(`Resultado recebido no nó via ${r.body.providerId || r.body.provider || 'provedor'}.`); await refresh(); (await api('/api/assets')).body && (window.__assets = (await api('/api/assets')).body);
      // Enquanto o título está sendo editado, um re-render completo trocava o <input> e descartava o texto
      // digitado. Atualizamos só os nós/arestas nesse caso.
      const editing = TITLE_EDIT.get(String(CUR.id))?.typed === true || document.activeElement?.id === 'ttl';
      if (!editing) pageProject(CUR.id);
      else { const fresh = (await api('/api/projects/' + CUR.id)).body; if (fresh?.id) { CUR = fresh; drawNodes(); drawEdges(); } }
    } else toast(`${r.body.error}${r.body.wouldCost ? ` (custaria ${r.body.wouldCost} créditos; nada foi cobrado)` : ''}`, 7000); }; }
}
function descDialog(n) { const m = modal(`<h2>${n.type === 'Cena' ? 'Informações da descrição da cena' : 'Descrição do personagem'}</h2>${n.type === 'Cena' ? `<label>Digite o nome da cena<br><input id="d1" value="${esc(n.title)}"></label><br><label>Digite o nome da perspectiva da cena<br><input id="d2"></label>` : `<div class="row"><button disabled>Carregar ativo de origem</button><button disabled>Criar colagem</button></div><label>Nome da função<br><input id="d1" value="${esc(n.title)}"></label><br><label>Nome do visual<br><input id="d2" value="Visual padrão"></label><p><b>Voz do personagem</b></p><div class="row"><button data-v="Voz do texto">Voz do texto</button><button data-v="Carregar áudio">Carregar áudio</button><button data-v="Geração por IA">Geração por IA</button><button data-v="Vincular áudio existente">Vincular áudio existente</button></div><div id="vstate" class="muted">${n.voice ? 'Áudio vinculado: ' + esc(n.voice) : ''}</div>`}<label>Episódios<br><input id="d3" placeholder="Insira os episódios" value="${esc(n.episodes || '')}"></label><div class="row" style="margin-top:12px"><button id="dc">Cancelar</button><button class="primary" id="ds">Salvar</button></div>`, 'sm');
  m.querySelectorAll('[data-v]').forEach((b) => (b.onclick = async () => { if (b.dataset.v === 'Carregar áudio') fileInput('audio/*', async (f) => { const a = await uploadAsset(f); n.voice = a.name; $('#vstate', m).textContent = 'Áudio vinculado: ' + a.name; }); else if (b.dataset.v === 'Vincular áudio existente') pickAsset((a) => { n.voice = a.name; $('#vstate', m).textContent = 'Áudio vinculado: ' + a.name; }, 'audio'); else toast(b.dataset.v + ': síntese de voz por IA (Seed Audio 1.0, 17/34 créditos) não disponível localmente.'); }));
  $('#dc', m).onclick = () => m.close(); $('#ds', m).onclick = async () => { await patch(`/api/projects/${CUR.id}/nodes/${n.id}`, { title: $('#d1', m).value, episodes: $('#d3', m).value, voice: n.voice }); m.close(); pageProject(CUR.id); }; }
function drawEdges() { const s = $('#edges'); if (!s) return; const pos = (id) => { const n = CUR.canvas.nodes.find((x) => x.id === id); return n ? { x: (n.x ?? 60) + 130, y: (n.y ?? 90) + 80 } : null; }; s.innerHTML = CUR.canvas.edges.map((e) => { const a = pos(e.from), b = pos(e.to); return a && b ? `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#999" stroke-width="2"/>` : ''; }).join(''); }

// --- Ativos / Skills / Smart / Avatares / Editor / Marketing / Historias / Config
let ASSET_TAB = 'Trabalhos', ASSET_FILTER = 'all', ASSET_SORT = 'desc', ASSET_VIEW = 'large', ASSET_SEL = null;
// confirmação de ações destrutivas (ativos, personagens, produtos): devolve true/false
const askConfirm = (title, body, okLabel = 'Excluir') => new Promise((res) => { const m = modal(`<h2>${esc(title)}</h2><div>${body}</div><div class="row" style="margin-top:12px"><button id="cno">Cancelar</button><button class="danger" id="cyes">${esc(okLabel)}</button></div>`, 'sm'); let done = false; const fin = (v) => { if (done) return; done = true; m.close(); res(v); }; $('#cno', m).onclick = () => fin(false); $('#cyes', m).onclick = () => fin(true); });
const askName = (title, def) => new Promise((res) => { const m = modal(`<h2>${esc(title)}</h2><p><input id="nm" maxlength="60" style="width:100%" value="${esc(def)}"></p><div class="muted" id="nme"></div><div class="row"><button id="cno">Cancelar</button><button class="primary" id="cyes">Adicionar</button></div>`, 'sm'); let done = false; const fin = (v) => { if (done) return; done = true; m.close(); res(v); }; $('#cno', m).onclick = () => fin(null); $('#cyes', m).onclick = () => { const v = $('#nm', m).value.trim(); if (!v) return ($('#nme', m).textContent = 'Digite um nome'); fin(v); }; });
const usageHtml = (u) => { const parts = [...u.characters.map((x) => `personagem “${x.name}”`), ...u.products.map((x) => `produto “${x.name}”`), ...u.nodes.map((x) => `nó ${x.title}`), ...u.editors.map((x) => `edição “${x.title}”`)]; return parts.length ? `<p>Este ativo é usado em:</p><ul id="usage">${parts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p>Os vínculos serão perdidos; os projetos continuam, mas sem este arquivo.</p>` : '<p id="usage">Este ativo não é usado em nenhum projeto.</p>'; };
const downloadAsset = (a) => { const l = document.createElement('a'); l.href = '/files/' + a.stored; l.download = a.name; document.body.appendChild(l); l.click(); l.remove(); };
async function deleteAssets(list) {
  const us = await Promise.all(list.map((a) => api(`/api/assets/${a.id}/usage`).then((r) => r.body))); const total = us.reduce((s, u) => s + u.characters.length + u.products.length + u.nodes.length + u.editors.length, 0);
  const body = list.length === 1 ? usageHtml(us[0]) : `<p>${list.length} ativos serão excluídos${total ? `, com ${total} vínculo(s) em personagens, produtos ou projetos` : ''}.</p>`;
  if (!(await askConfirm(list.length === 1 ? `Excluir “${list[0].name}”?` : `Excluir ${list.length} ativos?`, body + '<p><b>Esta ação não pode ser desfeita.</b></p>'))) return false;
  for (const a of list) await api('/api/assets/' + a.id, { method: 'DELETE' }); window.__assets = (await api('/api/assets')).body; return true;
}
async function assetMenu(ev, a, rerender) {
  const r = ev.target.getBoundingClientRect(); const needImg = (fn) => () => (a.kind === 'image' ? fn() : toast('Apenas imagens podem ser personagem ou produto.', 4000));
  menuAt(r.left, r.bottom + 4, [
    { label: 'Baixar', fn: () => downloadAsset(a) },
    { label: 'Selecionar', fn: () => { ASSET_SEL = new Set([a.id]); rerender(); } },
    { label: 'Adicionar personagem', fn: needImg(async () => { const nm = await askName('Adicionar personagem', a.name.replace(/\.[^.]+$/, '')); if (!nm) return; const x = await post(`/api/assets/${a.id}/character`, { name: nm }); toast(x.ok ? (x.body.reused ? `Este ativo já é o personagem “${x.body.character.name}”.` : `Personagem “${x.body.character.name}” adicionado.`) : x.body.error, 4000); rerender(); }) },
    { label: 'Adicionar produto', fn: needImg(async () => { const nm = await askName('Adicionar produto', a.name.replace(/\.[^.]+$/, '')); if (!nm) return; const x = await post(`/api/assets/${a.id}/product`, { name: nm }); toast(x.ok ? (x.body.reused ? `Este ativo já pertence ao produto “${x.body.product.name}”.` : `Produto “${x.body.product.name}” adicionado.`) : x.body.error, 4000); rerender(); }) },
    { label: 'Vincular produto existente', fn: needImg(async () => { const ps = (await api('/api/products')).body; if (!ps.length) return toast('Nenhum produto ainda. Use “Adicionar produto”.', 4000); const m = modal(`<h2>Vincular produto existente</h2><div id="plist">${ps.map((p) => `<label class="row" style="margin:4px 0"><input type="radio" name="pp" value="${p.id}"> ${esc(p.name)} <small class="muted">${p.assetIds.length} imagem(ns)</small></label>`).join('')}</div><div class="row"><button id="cno">Cancelar</button><button class="primary" id="cyes">Vincular</button></div>`, 'sm'); $('#cno', m).onclick = () => m.close(); $('#cyes', m).onclick = async () => { const v = m.querySelector('input[name=pp]:checked')?.value; if (!v) return; const x = await post(`/api/assets/${a.id}/link-product`, { productId: v }); m.close(); toast(x.ok ? (x.body.reused ? 'Este ativo já está vinculado a esse produto.' : `Vinculado ao produto “${x.body.product.name}”.`) : x.body.error, 4000); rerender(); }; }) },
    { label: 'Excluir', cls: 'danger', fn: async () => { if (await deleteAssets([a])) rerender(); } },
  ]);
}
async function pageAssets() {
  const tabs = { Trabalhos: 'works', 'Carregar histórico': 'upload', Personagem: 'character', Produto: 'product', Rascunhos: null }; const cat = tabs[ASSET_TAB]; const q = (window.__aq || '').toLowerCase();
  let as = cat ? (await api('/api/assets?cat=' + cat)).body : []; const drafts = ASSET_TAB === 'Rascunhos' ? PROJECTS.filter((p) => p.type === 'editor') : [];
  as = as.filter((a) => a.name.toLowerCase().includes(q) && (ASSET_FILTER === 'all' || a.kind === ASSET_FILTER)); as.sort((x, y) => (ASSET_SORT === 'desc' ? -1 : 1) * String(x.createdAt).localeCompare(String(y.createdAt)));
  const ents = ASSET_TAB === 'Personagem' ? (await api('/api/characters')).body : ASSET_TAB === 'Produto' ? (await api('/api/products')).body : []; const entHtml = ents.filter((e) => e.name.toLowerCase().includes(q)).map((e) => `<div class="card ent" data-e="${e.id}"><div style="height:130px;background:#eee;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden">${e.assets[0] ? `<img src="/files/${e.assets[0].stored}" style="max-width:100%;max-height:130px">` : ''}</div><div class="row" style="margin-top:6px"><b style="flex:1;font-weight:500">${esc(e.name)}</b><button data-er="${e.id}" title="Remover cadastro">…</button></div><small class="muted">${e.assetIds.length} imagem(ns)</small></div>`).join('');
  const small = ASSET_VIEW === 'small'; const chips = [['all', 'Tudo'], ['image', 'Imagens'], ['video', 'Vídeos'], ['audio', 'Áudio']];
  const selBar = ASSET_SEL ? `<div class="row card" id="selbar" style="margin:8px 0"><b style="flex:1">${ASSET_SEL.size} selecionado(s)</b><button id="selDl">Baixar</button><button class="danger" id="selDel">Excluir</button><button id="selX">Cancelar</button></div>` : '';
  $('#main').innerHTML = `${credits()}<div class="page assets-page"><h1>Biblioteca de ativos</h1><div class="tabs">${Object.keys(tabs).map((t) => `<button class="${ASSET_TAB === t ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
  <div class="row" id="afilters">${chips.map(([k, l]) => `<button class="chip ${ASSET_FILTER === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}<button id="asort">${ASSET_SORT === 'desc' ? 'Descendente' : 'Ascendente'} ⇅</button><button id="aview">Ver: ${small ? 'Pequeno' : 'Grande'}</button><span style="flex:1"></span><input id="aq" placeholder="Pesquisar ativos" value="${esc(window.__aq || '')}"><button id="addA">Adicionar</button></div>${selBar}
  <div class="grid" id="agrid" style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(${small ? 150 : 260}px,1fr));gap:12px">${entHtml}${as.map((a) => `<div class="card asset ${ASSET_SEL?.has(a.id) ? 'sel' : ''}" data-a="${a.id}"><div style="height:${small ? 90 : 130}px;background:#eee;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden">${a.kind === 'image' ? `<img src="/files/${a.stored}" style="max-width:100%;max-height:100%">` : a.kind === 'video' ? `<video src="/files/${a.stored}" style="max-width:100%;max-height:100%" ${ASSET_SEL ? '' : 'controls'}></video>` : '♪'}</div><div class="row" style="margin-top:6px">${ASSET_SEL ? `<input type="checkbox" data-sel="${a.id}" ${ASSET_SEL.has(a.id) ? 'checked' : ''}>` : ''}<b style="flex:1;font-weight:500;word-break:break-all">${esc(a.name)}</b><button data-m="${a.id}" aria-label="Mais ações">…</button></div><small class="muted">${a.duration ? a.duration.toFixed(1) + ' s · ' : ''}${new Date(a.createdAt).toLocaleString('pt-BR')}</small></div>`).join('') || (drafts.length || entHtml ? '' : `<p class="muted">${ASSET_TAB === 'Personagem' ? 'Nenhum personagem ainda' : ASSET_TAB === 'Produto' ? 'Nenhum produto ainda' : 'Nada aqui ainda.'}</p>`)}${drafts.map((d) => `<div class="card"><b>${esc(d.title)}</b><br><a href="#/editor/${d.id}">Abrir rascunho</a></div>`).join('')}</div></div>`;
  bindCredits(); const again = () => pageAssets();
  document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => { ASSET_TAB = b.dataset.t; ASSET_SEL = null; again(); }));
  document.querySelectorAll('#afilters [data-f]').forEach((b) => (b.onclick = () => { ASSET_FILTER = b.dataset.f; again(); }));
  $('#asort').onclick = () => { ASSET_SORT = ASSET_SORT === 'desc' ? 'asc' : 'desc'; again(); }; $('#aview').onclick = () => { ASSET_VIEW = small ? 'large' : 'small'; again(); };
  $('#aq').oninput = (e) => { window.__aq = e.target.value; again(); setTimeout(() => $('#aq')?.focus(), 0); };
  $('#addA').onclick = () => fileInput('image/*,video/*,audio/*', async (f) => { await uploadAsset(f, cat || 'upload'); window.__assets = (await api('/api/assets')).body; again(); });
  document.querySelectorAll('[data-m]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); assetMenu(e, as.find((x) => x.id === b.dataset.m), again); }));
  document.querySelectorAll('[data-sel]').forEach((c) => (c.onchange = () => { c.checked ? ASSET_SEL.add(c.dataset.sel) : ASSET_SEL.delete(c.dataset.sel); again(); }));
  document.querySelectorAll('[data-er]').forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); const en = ents.find((x) => x.id === b.dataset.er); const kind = ASSET_TAB === 'Personagem' ? 'characters' : 'products'; if (await askConfirm(`Remover o cadastro “${en.name}”?`, '<p>Remove apenas o cadastro. As imagens continuam em Ativos.</p>', 'Remover')) { await api(`/api/${kind}/${en.id}`, { method: 'DELETE' }); again(); } }));
  if (ASSET_SEL) { $('#selX').onclick = () => { ASSET_SEL = null; again(); }; $('#selDl').onclick = () => as.filter((a) => ASSET_SEL.has(a.id)).forEach(downloadAsset); $('#selDel').onclick = async () => { const list = as.filter((a) => ASSET_SEL.has(a.id)); if (!list.length) return toast('Nenhum ativo selecionado.', 3000); if (await deleteAssets(list)) { ASSET_SEL = null; again(); } }; }
}
let SKILL_TAB = 'Todos';
let SKILL_TOP = 'Todos';
// Loja de habilidades: abas Todos/Minhas skills/Favoritos, favoritos persistentes e skills manuais (formato interno do Pippit DESCONHECIDO: o formato local é nome+descrição+instruções).
async function pageSkills() {
  const sk = (await api('/api/skills/state')).body; const all = [...sk.custom, ...CAT.skills]; const cats = ['Todos', 'Drama curto', 'Marketing Publicidade', 'Cinema e televisão profissionais']; const q = (window.__sq || '').toLowerCase();
  const base = SKILL_TOP === 'Minhas skills' ? sk.custom : SKILL_TOP === 'Favoritos' ? all.filter((s) => sk.favorites.includes(s.id)) : all;
  const list = base.filter((s) => (SKILL_TOP !== 'Todos' || SKILL_TAB === 'Todos' || (s.tags || [s.tag]).includes(SKILL_TAB)) && s.name.toLowerCase().includes(q));
  $('#main').innerHTML = `${credits()}<div class="page"><h1>Loja de habilidades</h1><div class="tabs">${['Todos', 'Minhas skills', 'Favoritos'].map((t) => `<button class="${SKILL_TOP === t ? 'on' : ''}" data-top="${t}">${t}</button>`).join('')}</div><div class="row"><input id="sq" placeholder="Buscar habilidades" value="${esc(window.__sq || '')}"><button id="mk">Criar skill ▾</button></div>
  ${SKILL_TOP === 'Todos' ? `<div class="tabs" style="margin-top:10px">${cats.map((c) => `<button class="${SKILL_TAB === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>` : ''}
  <div class="grid g3">${list.map((s) => `<div class="card skill-card" data-sid="${s.id}"><b>${esc(s.name)}</b> ${sk.favorites.includes(s.id) ? '<span title="Favorito">★</span>' : ''} ${SKILL_MODELS(s)}<p class="muted">${esc(s.desc || '')}</p><div class="row"><button class="primary" data-u="${s.id}">Usar</button><button data-d="${s.id}">Detalhes</button></div></div>`).join('') || `<p class="muted">${SKILL_TOP === 'Favoritos' ? 'Nenhum favorito ainda.' : SKILL_TOP === 'Minhas skills' ? 'Você ainda não criou skills.' : 'Nenhuma habilidade encontrada.'}</p>`}</div></div>`;
  bindCredits(); document.querySelectorAll('[data-top]').forEach((b) => (b.onclick = () => { SKILL_TOP = b.dataset.top; pageSkills(); })); document.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { SKILL_TAB = b.dataset.c; pageSkills(); }));
  $('#sq').oninput = (e) => { window.__sq = e.target.value; pageSkills(); setTimeout(() => $('#sq')?.focus(), 0); };
  const useSkill = (id) => { if (id === 'video-de-avatar') { avatarDrawer(); return; } if (id === 'foto-falante-de-ia') { location.hash = '/ai-talking-photo'; return; } HOME.skill = all.find((s) => s.id === id); location.hash = '/home'; };
  $('#mk').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, [{ label: 'Criar com IA', fn: createSkillAI }, { label: 'Enviar skill (ZIP com SKILL.md)', fn: () => fileInput('.zip,application/zip', async (f) => { const r = await api('/api/skills/import', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(f.name) }, body: f }); if (r.ok) { SKILL_TOP = 'Minhas skills'; pageSkills(); toast('Skill importada.'); } else toast(r.body.error); }) }, { label: 'Criar manualmente', fn: createSkillDialog }]); };
  document.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => useSkill(b.dataset.u)));
  document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => {
    const s = all.find((x) => x.id === b.dataset.d); const fav = sk.favorites.includes(s.id);
    const m = modal(`<h2>${esc(s.name)}</h2><p>${esc(s.desc || '')}</p>${s.instructions ? `<p><b>Instruções</b><br><span class="muted">${esc(s.instructions)}</span></p>` : ''}${s.guideWords ? `<div id="sguide"><b>${s.guideKind === 'prefill' ? 'Pedido pré-preenchido' : 'Guia de uso'}</b> <small class="muted">(texto do servidor, catálogo REA 6.7.0; não é a instrução privada da skill)</small><pre style="white-space:pre-wrap;font:inherit;margin:6px 0">${esc(s.guideWords)}</pre></div>` : ''}${s.materialGuide ? `<p id="smat"><b>Guia de ativos</b><br><span class="muted">${esc(s.materialGuide)}</span></p>` : ''}${s.tools ? `<p id="stools"><b>Ferramentas do agente</b> <small class="muted">(declaradas; a ordem de execução não está comprovada)</small><br>${s.tools.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>` : ''}${CAT.skillDefs?.[s.id]?.params?.length ? `<p id="sparams"><b>Entradas</b> <small class="muted">(● obrigatória, ○ opcional; conferência local)</small><br>${CAT.skillDefs[s.id].params.map((x) => `${x.required ? '●' : '○'} ${esc(x.label)}`).join('<br>')}</p>` : ''}${CAT.skillDefs?.[s.id]?.stages?.length ? `<p id="sstages"><b>Etapas do workflow</b> <small class="muted">(PiperLine, a partir do guia observado)</small><br>${CAT.skillDefs[s.id].stages.map((x, k) => `${k + 1}. ${esc(x)}`).join('<br>')}</p>` : ''}<p class="muted">Autor: ${s.custom ? 'Você' : 'Pippit oficial'} · Categoria: ${esc((s.tags || [s.tag]).filter(Boolean).join(', ') || '—')} · Modelos padrão: ${esc(((s.defaultModels ? [s.defaultModels.video, s.defaultModels.imagem].filter(Boolean) : s.models) || []).join(', ') || '—')} · Favoritos: ${sk.favorites.length}</p><div class="row"><button id="sfav">${fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}</button><button class="primary" id="suse">Usar agora</button>${s.custom ? '<button id="sed">Editar</button><button id="spk">Ver pacote</button><a href="/api/skills/custom/' + s.id + '/zip" download><button>Baixar ZIP</button></a><button class="danger" id="sdel">Excluir skill</button>' : ''}</div>`, 'sm');
    $('#sfav', m).onclick = async () => { await post('/api/skills/favorite', { id: s.id, on: !fav }); m.close(); pageSkills(); };
    $('#suse', m).onclick = () => { m.close(); useSkill(s.id); };
    if (s.custom) $('#sed', m).onclick = () => { m.close(); createSkillDialog(s); };
    if (s.custom) $('#spk', m).onclick = () => { m.close(); skillPackageEditor(s.id); };
    if (s.custom) $('#sdel', m).onclick = async () => { await api('/api/skills/custom/' + s.id, { method: 'DELETE' }); m.close(); pageSkills(); };
  }));
}
function createSkillAI() {
  const m = modal(`<h2>Criar skill com IA</h2><p class="muted">Descreva o que a skill deve fazer; o LLM configurado escreve nome, descrição e instruções. Pode levar de 1 a 2 minutos com um modelo local.</p><textarea id="skb" rows="4" style="width:100%" placeholder="Ex.: skill para anúncios curtos de produtos de beleza, ritmo rápido"></textarea><div id="skerr" class="blocked" style="display:none"></div><button class="primary" id="skgo">Criar</button>`, 'sm');
  $('#skgo', m).onclick = async () => { const b = $('#skgo', m); b.disabled = true; b.textContent = 'Criando…'; const r = await post('/api/skills/ai', { brief: $('#skb', m).value }); if (!r.ok) { b.disabled = false; b.textContent = 'Criar'; const e = $('#skerr', m); e.textContent = r.body.error; e.style.display = ''; return; } m.close(); SKILL_TOP = 'Minhas skills'; pageSkills(); toast('Skill criada por ' + r.body.ai); };
}
const SKILL_TAGS = ['Drama curto', 'Marketing Publicidade', 'Cinema e televisão profissionais'];
// Criar skill manualmente (campos e limites observados: nome ≤20, descrição ≤50, texto-guia ≤50, guia de mídia ≤12; pública exige capa+categoria+tipo de saída).
function createSkillDialog(existing) {
  const e = existing || {}; const vm = CAT.videoModels, im = CAT.imageModels; const opt = (l, cur) => `<option value="">—</option>${l.map((x) => `<option value="${esc(x.name)}" ${cur === x.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}`;
  const m = modal(`<h2>${existing ? 'Editar skill' : 'Criar skill'}</h2>
    <p><b>Nome</b> <span class="muted">(até 20)</span><br><input id="skn" maxlength="40" value="${esc(e.name || '')}" placeholder="Dê um nome à sua skill"></p>
    <p><b>Descrição</b> <span class="muted">(até 50)</span><br><input id="skd" style="width:100%" value="${esc(e.description || '')}" placeholder="Descreva brevemente o que esta skill faz"></p>
    <p><b>Conteúdo da skill (SKILL.md)</b><br><textarea id="ski" rows="6" style="width:100%" placeholder="## O que faz&#10;(Descreva o objetivo em uma frase.)&#10;&#10;## Como usar&#10;...">${esc(e.instructions || '')}</textarea></p>
    <p><b>Texto-guia</b> <span class="muted">(até 50; aparece como dica na caixa de entrada)</span><br><input id="skg" style="width:100%" value="${esc(e.guideWords || '')}"></p>
    <p><b>Guia de mídia</b> <span class="muted">(até 12)</span> <input id="skm" value="${esc(e.materialGuide || '')}"></p>
    <p><b>Categorias</b> ${SKILL_TAGS.map((t) => `<label><input type="checkbox" data-tag="${esc(t)}" ${(e.tags || []).includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join(' ')}</p>
    <p><b>Tipo de saída</b> <select id="sko"><option value="">—</option>${['video', 'image', 'audio', 'text'].map((g) => `<option value="${g}" ${e.outputGenre === g ? 'selected' : ''}>${g}</option>`).join('')}</select> <b>Modelo de vídeo padrão</b> <select id="skvm">${opt(vm, e.defaultVideoModel)}</select> <b>Modelo de imagem padrão</b> <select id="skim">${opt(im, e.defaultImageModel)}</select></p>
    <p><b>Capa</b> <span class="muted">(16:9 recomendado, imagem ≤ 10 MB)</span> <button id="skc">${e.cover ? 'Trocar capa' : 'Enviar capa'}</button> <span id="skcs" class="muted">${e.cover ? 'capa definida' : ''}</span></p>
    <p><label><input type="checkbox" id="skp" ${e.allowPublic ? 'checked' : ''}> Permitir que o Pippit destaque minha skill</label></p>
    <div id="skerr" class="blocked" style="display:none"></div><div class="row"><button class="primary" id="sks">Salvar</button><button id="sku">Salvar e usar</button></div>`, 'sm');
  let cover = e.cover || null; $('#skc', m).onclick = () => fileInput('image/*', async (f) => { const a = await uploadAsset(f); cover = a.id; $('#skcs', m).textContent = a.name; });
  const save = async (use) => {
    const body = { name: $('#skn', m).value, description: $('#skd', m).value, content: $('#ski', m).value, guideWords: $('#skg', m).value, materialGuide: $('#skm', m).value, tags: [...m.querySelectorAll('[data-tag]:checked')].map((x) => x.dataset.tag), outputGenre: $('#sko', m).value, defaultVideoModel: $('#skvm', m).value, defaultImageModel: $('#skim', m).value, allowPublic: $('#skp', m).checked, cover };
    const r = existing ? await api('/api/skills/custom/' + existing.id, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) : await post('/api/skills/custom', body);
    if (!r.ok) { const er = $('#skerr', m); er.textContent = r.body.error; er.style.display = ''; return; }
    m.close(); SKILL_TOP = 'Minhas skills'; toast(existing ? 'Alterações salvas' : 'Skill salva'); if (use) { HOME.skill = { ...r.body }; location.hash = '/home'; } else pageSkills();
  };
  $('#sks', m).onclick = () => save(false); $('#sku', m).onclick = () => save(true);
}
// Editor do pacote: arquivos do ZIP; SKILL.md não pode ser renomeado nem excluído; só Markdown pode ser criado; scripts/executáveis são recusados.
async function skillPackageEditor(id) {
  const k = (await api('/api/skills/custom/' + id)).body; const files = { ...k.contents }; let cur = 'SKILL.md';
  const m = modal(`<h2>Pacote: ${esc(k.name)}</h2><div class="row" style="align-items:flex-start;gap:14px"><div style="min-width:220px"><div id="pkl"></div><p><button id="pka">Adicionar arquivo</button></p></div><div style="flex:1"><div id="pkh" class="muted"></div><textarea id="pkt" rows="14" style="width:100%"></textarea><div id="pkerr" class="blocked" style="display:none"></div><div class="row"><button class="primary" id="pks">Salvar pacote</button><button id="pkr">Renomear</button><button class="danger" id="pkd">Excluir arquivo</button><a href="/api/skills/custom/${id}/zip" download><button>Baixar ZIP</button></a></div></div></div>`);
  const err = (t) => { const e = $('#pkerr', m); e.textContent = t || ''; e.style.display = t ? '' : 'none'; };
  const flush = () => { if (cur in files && typeof files[cur] === 'string') files[cur] = $('#pkt', m).value; };
  const draw = () => {
    $('#pkl', m).innerHTML = Object.keys(files).sort().map((f) => `<div class="mediaitem ${f === cur ? 'on' : ''}" data-f="${esc(f)}">${f === 'SKILL.md' ? '🔒 ' : ''}${esc(f)}</div>`).join('');
    const isText = typeof files[cur] === 'string'; $('#pkt', m).value = isText ? files[cur] : ''; $('#pkt', m).disabled = !isText; $('#pkh', m).textContent = isText ? cur : `${cur}: a pré-visualização não está disponível para este arquivo`;
    m.querySelectorAll('[data-f]').forEach((e2) => (e2.onclick = () => { flush(); cur = e2.dataset.f; err(''); draw(); }));
  };
  draw();
  $('#pka', m).onclick = () => { const n = prompt('Nome do arquivo (somente Markdown, ex.: refs/guia.md)'); if (!n) return; flush(); if (!/\.md$/i.test(n)) return err('Only Markdown files can be created here.'); if (n in files || /^\/|\\|\.\.|\/\/|^$/.test(n)) return err('Use a unique, valid file path.'); files[n] = ''; cur = n; err(''); draw(); };
  $('#pkd', m).onclick = () => { if (cur === 'SKILL.md') return err('SKILL.md cannot be renamed or deleted.'); delete files[cur]; cur = 'SKILL.md'; err(''); draw(); };
  $('#pkr', m).onclick = () => { if (cur === 'SKILL.md') return err('SKILL.md cannot be renamed or deleted.'); const n = prompt('Novo nome', cur); if (!n || n === cur) return; if (n in files || /^\/|\\|\.\.|\/\/|^$/.test(n)) return err('Use a unique, valid file path.'); flush(); files[n] = files[cur]; delete files[cur]; cur = n; err(''); draw(); };
  $('#pks', m).onclick = async () => { flush(); const r = await api('/api/skills/custom/' + id, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) }); if (!r.ok) return err(r.body.error); toast('Alterações salvas'); m.close(); pageSkills(); };
}
async function pageSmart() {
  const s = (await api('/api/smart-creation')).body;
  $('#main').innerHTML = `${credits()}<div class="page"><h1>Autorize o Pippit a usar o histórico de chat e os ativos para criar vídeos automaticamente</h1><p>Siga os passos para obter conteúdo criado automaticamente para você todos os dias.</p><ol class="sc-steps">${s.steps.map((x, i) => `<li><b>${esc(x)}</b>${s.details?.[i] ? `<div class="muted">${esc(s.details[i])}</div>` : ''}</li>`).join('')}</ol><div class="blocked">${esc(s.note)}</div><button class="primary" id="auth">${s.authorized ? 'Revogar autorização' : 'Autorizar'}</button>${s.categories ? `<div class="tabs" style="margin-top:18px">${s.categories.map((c, i) => `<button class="${i ? '' : 'on'}">${esc(c)}</button>`).join('')}</div><div class="blocked">Os vídeos de exemplo de cada categoria são conteúdo do serviço original e não são reproduzidos.</div>` : ''}
  ${s.authorized ? `<h2 style="font-weight:500;margin-top:24px">Ideias de hoje</h2><p class="muted">${s.lastRun ? 'Gerado em ' + new Date(s.lastRun).toLocaleString('pt-BR') : 'Ainda não gerado.'}${s.error ? ' · último erro do LLM: ' + esc(s.error) : ''}</p><button id="sgo">Gerar ideias agora</button> <div class="grid g3" style="margin-top:10px">${(s.ideas || []).map((i) => `<div class="card idea"><b>${esc(i.title)}</b><p class="muted">${esc(i.prompt)}</p><small class="muted">${esc(i.source)}</small><div><button class="primary" data-idea="${i.id}">Usar na Home</button></div></div>`).join('') || '<p class="muted">Nenhuma ideia ainda.</p>'}</div>` : ''}</div>`;
  bindCredits(); $('#auth').onclick = async () => { await post('/api/smart-creation', { authorize: !s.authorized }); pageSmart(); };
  const go = $('#sgo'); if (go) go.onclick = async () => { go.disabled = true; go.textContent = 'Gerando… (LLM local: 1–2 min)'; const r = await post('/api/smart-creation/run'); if (!r.ok) toast(r.body.error); pageSmart(); };
  document.querySelectorAll('[data-idea]').forEach((b) => (b.onclick = () => { const i = s.ideas.find((x) => x.id === b.dataset.idea); HOME.text = i.prompt; HOME.mode = 'Agente'; location.hash = '/home'; }));
}
async function pageAvatars() {
  const a = (await api('/api/avatars')).body;
  const videoSamples = [
    ['Emily-Fashion-Bedroom-Sitting', 'emily-fashion-bedroom.png'],
    ['Kavi-Marketing', 'kavi-marketing.png'],
  ];
  const photoSamples = [
    ['Malcolm', 'malcolm.png'],
    ['Helena', 'helena.png'],
  ];
  const sampleCard = ([name, image]) => `<div class="avatar-tile avatar-sample" data-avatar-sample="${esc(name)}" aria-label="${esc(name)}, amostra"><img src="/assets/avatar-samples/${image}" alt="${esc(name)}, amostra"></div>`;
  const ownedPhotoCard = (v) => { const asset = (window.__assets || []).find((x) => x.id === v.assetId); return `<div class="avatar-tile avatar-owned">${asset ? `<img src="/files/${asset.stored}" alt="${esc(v.name)}">` : '<div class="avatar-tile-placeholder"></div>'}<button class="avatar-more" data-avatar-more="${v.id}" aria-label="Menu do avatar">…</button><b class="avatar-tile-name">${esc(v.name)}</b></div>`; };
  $('#main').innerHTML = `${credits()}<div class="page avatar-page"><h1>Crie os seus avatares e vozes</h1>
  <h3>Vídeo em avatar</h3><div class="grid av-grid" id="video-avatars"><div class="avatar-tile avatar-create" id="va" role="button" tabindex="0" aria-label="Criar vídeo em avatar"><span class="avatar-cost">✦ ${a.costs.videoAvatar}/vez</span><span class="avatar-create-plus">＋</span></div>${videoSamples.map((v) => sampleCard(v, 'video')).join('')}${a.video.map((v) => `<div class="avatar-tile avatar-sample"><div class="avatar-tile-placeholder"></div><span class="avatar-sample-tag">Amostra</span><b class="avatar-tile-name">${esc(v.name)}</b></div>`).join('')}${'<div class="av-empty"></div>'.repeat(Math.max(0, 5 - videoSamples.length - a.video.length))}</div>
  <h3>Foto em avatar</h3><div class="grid av-grid" id="photo-avatars"><div class="avatar-tile avatar-create" id="pa" role="button" tabindex="0" aria-label="Criar foto em avatar"><span class="avatar-cost">${'Ilimitado'}</span><span class="avatar-create-plus">＋</span></div>${a.photo.map(ownedPhotoCard).join('')}${photoSamples.map((v) => sampleCard(v, 'photo')).join('')}${'<div class="av-empty"></div>'.repeat(Math.max(0, 5 - photoSamples.length - a.photo.length))}</div>
  <h3>Vozes personalizadas</h3><div class="grid av-voices"><div class="card" id="vc" style="cursor:pointer;height:120px;text-align:center">Criar nova · ✦ ${a.costs.customVoice}/vez</div>${a.voices.map((v) => `<div class="card"><b>${esc(v.name)}</b><div class="muted">${esc(v.mode)}</div></div>`).join('')}${'<div class="av-empty"></div>'.repeat(Math.max(0, 2 - a.voices.length))}</div></div>`;
  bindCredits(); document.querySelectorAll('[data-avatar-sample]').forEach((el) => { el.title = 'Amostra visual de referência; aplicação não disponível sem o serviço original.'; }); document.querySelectorAll('.avatar-create').forEach((el) => { el.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); } }; }); $('#va').onclick = async () => { const r = await post('/api/avatars/video'); const m = modal(`<h2>Vídeo em avatar</h2><p>${esc(r.body.error)}</p><div class="row"><button class="primary" id="pl">Entendi</button></div>`, 'sm'); $('#pl', m).onclick = () => m.close(); };
  $('#pa').onclick = () => photoWizard(); $('#vc').onclick = () => fileInput('audio/*', async (f) => { const r = await api('/api/avatars/voice', { method: 'POST', headers: { 'x-voice-name': encodeURIComponent(f.name) }, body: f }); toast(r.ok ? 'Voz registrada como referência de áudio (sem clonagem por IA).' : 'erro'); pageAvatars(); });
  document.querySelectorAll('[data-apply]').forEach((b) => (b.onclick = () => { HOME.text = (HOME.text || '') + ' @' + a.photo.find((x) => x.id === b.dataset.apply).name; location.hash = '/home'; }));
  document.querySelectorAll('[data-avatar-more]').forEach((b) => (b.onclick = async () => {
    let itens = 'Aplicar — confirmado; menu “…” do avatar — UNOBSERVED; prévia de áudio — UNOBSERVED';
    try { const a = (await api('/api/avatar/menu')).body; itens = a.items.map((x) => `${x.label} — ${x.status}`).join('; '); } catch {}
    modal(`<h2>Menu do avatar próprio</h2><p>O menu “…” de avatares do usuário não foi capturado. As ações disponíveis no Pippit são <b>UNOBSERVED</b>; nenhuma ação de renomear/excluir foi presumida.</p><p class="muted">Evidência local: ${itens}. Observação humana: ${'PENDING'}. Este controle só informa a lacuna e não altera o avatar.</p>`, 'sm');
  }));
}
function photoWizard() {
  let file = null, step = 1, consent = false; const m = modal('<div id="w"></div>'); $('.modal', m).classList.add('avatar-wizard'); const draw = async () => {
    const w = $('#w', m); w.innerHTML = `<h2>Carregue uma foto</h2><div class="steps">${['Carregar', 'Verificar', 'Enviar'].map((s, i) => `<span class="${step === i + 1 ? 'on' : ''}">${i + 1} ${s}</span>`).join('')}</div>`;
    if (step === 1) { w.innerHTML += `<div class="avatar-upload-panel"><b class="avatar-upload-heading">Carregue a sua foto</b><div class="drop" id="dz"><div class="avatar-upload-plus">+</div><b>Solte a sua foto aqui ou clique para carregar</b><div class="muted">Formato: JPG/PNG, Tamanho: &gt;256*256</div><div class="avatar-upload-tips" aria-label="Dicas de carregamento"><span class="avatar-tip-title">Dicas de carregamento</span><div class="avatar-tip-examples"><span class="avatar-tip good" aria-label="Rosto frontal e nítido: recomendado"><svg viewBox="0 0 52 52" aria-hidden="true"><path class="body" d="M8 51c1-12 8-18 18-18s17 6 18 18"/><ellipse class="face" cx="26" cy="20" rx="11" ry="13"/><path class="hair" d="M15 20c0-10 5-15 12-15s12 6 11 16c-2-5-5-8-10-9-3 4-8 6-13 6z"/></svg><i>✓</i></span><span class="avatar-tip" aria-label="Perfil: não recomendado"><svg viewBox="0 0 52 52" aria-hidden="true"><path class="body" d="M8 51c1-12 8-18 18-18s17 6 18 18"/><path class="face" d="M25 8c9 0 13 6 12 13l-4 3-1 8-7 2-5-6-3-1 3-5c-2-9 0-14 5-14z"/><path class="hair" d="M17 19c-1-9 4-15 12-15s12 7 10 16c-3-5-7-8-12-8-2 3-6 6-10 7z"/></svg><i>×</i></span><span class="avatar-tip" aria-label="Óculos escuros: não recomendado"><svg viewBox="0 0 52 52" aria-hidden="true"><path class="body" d="M8 51c1-12 8-18 18-18s17 6 18 18"/><ellipse class="face" cx="26" cy="21" rx="11" ry="13"/><path class="hair" d="M15 20c0-10 5-15 12-15s12 6 11 16c-2-5-5-8-10-9-3 4-8 6-13 6z"/><path class="glasses" d="M15 19h10v5H15zm12 0h10v5H27zM25 21h2"/></svg><i>×</i></span><span class="avatar-tip" aria-label="Mais de uma pessoa: não recomendado"><svg viewBox="0 0 52 52" aria-hidden="true"><path class="body" d="M2 51c1-10 5-15 13-15s12 5 13 15m-2 0c1-12 7-18 15-18s11 6 12 18"/><circle class="face" cx="15" cy="21" r="8"/><circle class="face" cx="36" cy="19" r="10"/><path class="hair" d="M7 21c0-7 3-11 8-11s9 4 8 11c-2-3-5-5-8-5s-5 2-8 5zm19-1c0-8 4-13 10-13s11 5 10 15c-3-4-6-7-11-8-2 3-5 5-9 6z"/></svg><i>×</i></span></div></div>${file ? `<p>📎 ${esc(file.name)}</p>` : ''}</div></div><div class="avatar-consent-row"><label><input type="checkbox" id="cs" ${consent ? 'checked' : ''}> Ao clicar na caixa de seleção, você concorda com o uso do seu conteúdo carregado exclusivamente para criar o seu avatar de IA.</label><button class="primary" id="nx" ${file && consent ? '' : 'disabled'}>Avançar</button></div>`;
      $('#dz', w).onclick = () => fileInput('image/png,image/jpeg', (f) => cropDialog(f, (blob) => { file = new File([blob], f.name.replace(/\.\w+$/, '') + '.png', { type: 'image/png' }); draw(); })); $('#cs', w).onchange = (e) => { consent = e.target.checked; draw(); }; $('#nx', w).onclick = () => { step = 2; draw(); }; }
    if (step === 2) { const v = (await api('/api/avatars/photo/verify', { method: 'POST', body: file })).body; w.innerHTML += `<p>${v.ok ? '<span class="ok">✓ Foto válida</span> ' + v.width + '×' + v.height : '<span style="color:var(--red)">✗ ' + esc((v.errors || []).join('; ')) + '</span>'}</p><p class="muted">${esc(v.note || '')}</p><div class="row"><button id="bk">Voltar</button><button class="primary" id="nx" ${v.ok ? '' : 'disabled'}>Avançar</button></div>`; $('#bk', w).onclick = () => { step = 1; draw(); }; $('#nx', w).onclick = () => { step = 3; draw(); }; }
    if (step === 3) { const voices = ['Carmen at the makeup table', 'Olivia in the kitchen', 'Mason in a room']; w.innerHTML += `<h4>Envie a foto</h4><label>Nomeie o avatar<br><input id="nm" value="My Avatar ${(window.__avN = (window.__avN || 0) + 1)}"></label><p>Voz padrão (<a id="alt" style="color:var(--acc);cursor:pointer">Alterar voz</a>)<br><select id="vz">${voices.map((x) => `<option>${esc(x)}</option>`).join('')}</select> <button id="hear" title="Prévia de voz do serviço original: indisponível">🎧</button></p><p class="muted">Ao enviar, o avatar é criado sem limite de usos (produto gratuito — r20).</p><div class="row"><button id="bk">Carregar novo</button><button class="primary" id="sd">Enviar</button></div>`; $('#hear', w).onclick = () => toast('Prévia de voz: áudio do serviço original, não reproduzido.'); $('#alt', w).onclick = () => $('#vz', w).focus(); $('#bk', w).onclick = () => { step = 1; file = null; draw(); }; $('#sd', w).onclick = async () => { const r = await api('/api/avatars/photo', { method: 'POST', headers: { 'x-consent': String(consent), 'x-avatar-name': encodeURIComponent($('#nm', w).value), 'x-avatar-voice': encodeURIComponent($('#vz', w).value) }, body: file }); if (r.ok) { toast('Avatar criado.'); window.__assets = (await api('/api/assets')).body; await refresh(); m.close(); pageAvatars(); } else { toast(r.body.error, 6000); } }; }
  }; draw();
}
function cropDialog(f, cb) {
  // "Recortar": girar + Feito (recorte livre nao reconstruido; so rotacao foi observada)
  const url = URL.createObjectURL(f); const m = modal(`<h2>Recortar</h2><div style="text-align:center"><img id="ci" src="${url}" style="max-width:100%;max-height:300px"></div><div class="row" style="margin-top:12px"><span>Girar</span><input id="rot" type="range" min="-180" max="180" value="0"><span id="rv">0°</span><button id="rs">Redefinir</button><span style="flex:1"></span><button class="primary" id="ok">Feito</button></div>`); const img = $('#ci', m);
  $('#rot', m).oninput = (e) => { $('#rv', m).textContent = e.target.value + '°'; img.style.transform = `rotate(${e.target.value}deg)`; };
  $('#rs', m).onclick = () => { $('#rot', m).value = 0; $('#rv', m).textContent = '0°'; img.style.transform = ''; };
  $('#ok', m).onclick = () => { const a = Number($('#rot', m).value) * Math.PI / 180; const w = img.naturalWidth, h = img.naturalHeight; const c = document.createElement('canvas'); c.width = a === 0 ? w : Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a)); c.height = a === 0 ? h : Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a)); const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(a); x.drawImage(img, -w / 2, -h / 2); c.toBlob((b) => { m.close(); cb(b); }, 'image/png'); };
}
let ED = null, ED_ID = null, ED_SEL = null, ED_RTAB = 'Básico', ED_ATAB = 'Entrada';
const ratioLabel = (r) => (CAT.editorRatios || []).find((o) => o.id === (r || 'original'))?.label || String(r);
// proporção da pré-visualização: a escolhida; "Original" usa a do primeiro clipe (ou 16/9 sem clipes)
function previewAspect(tl, as) { const r = tl.ratio || 'original'; if (r !== 'original') return r.replace(':', ' / '); const a = tl.clips[0] && as.find((x) => x.id === tl.clips[0].assetId); return a?.width && a?.height ? `${a.width} / ${a.height}` : '16 / 9'; }
async function pageEditor(id) {
  if (ED_ID !== id) { ED_ID = id; ED_SEL = null; ED_RTAB = 'Básico'; ED_ATAB = 'Entrada'; }
  if (!id) { const p = (await post('/api/editor')).body; await refresh(); location.hash = '/editor/' + p.id; return; }
  const p = (await api('/api/projects/' + id)).body; ED = p; const tl = p.timeline || { ratio: 'original', clips: [], texts: [], captions: [], audio: [] }; ED.timeline = tl; window.__assets = (await api('/api/assets')).body; const as = window.__assets;
  const lenOf = (c) => ((c.out || as.find((a) => a.id === c.assetId)?.duration || 0) - (c.in || 0)) / (c.speed || 1);
  const orig = p.origin ? PROJECTS.find((x) => x.id === p.origin.projectId) : null;
  $('#main').innerHTML = `${credits()}${p.origin ? `<div class="muted" id="eorigin" style="margin:0 0 6px">Veio do Canvas ${orig ? `«${esc(orig.title)}»` : '(projeto removido)'} · ${orig ? `<a href="#/project/${orig.id}">voltar ao Canvas</a>` : 'sem vínculo disponível'}</div>` : ''}<div class="ed"><div><div class="tabs"><button class="on" data-t="m">Mídia</button><button data-t="l">Legendas</button><button data-t="a">Avatares</button><button data-t="x">Texto</button><button data-t="u">Áudio</button><button data-t="e">Elementos</button><button data-t="c">Corte rápido</button></div><div id="lp"></div></div>
   <div><div class="row"><input id="etitle" value="${esc(p.title)}"><button id="eratio" title="Ratio">Ratio: ${esc(ratioLabel(tl.ratio))} ▾</button><button class="primary" id="exp">Exportar</button></div><div id="prev" data-ratio="${esc(tl.ratio || 'original')}" style="margin:10px auto;max-height:300px;aspect-ratio:${previewAspect(tl, as)};background:#111;border-radius:12px;color:#aaa;display:flex;align-items:center;justify-content:center;overflow:hidden">${tl.clips.length ? `<video controls src="/files/${as.find((a) => a.id === tl.clips[0].assetId)?.stored}" style="width:100%;height:100%;object-fit:contain"></video>` : 'Pré-visualização'}</div>
   <div class="timeline" id="tl">${tl.clips.map((c, i) => `<div class="clip${ED_SEL === i ? ' sel' : ''}" data-i="${i}">${esc(as.find((a) => a.id === c.assetId)?.name || '?')}<br>${(c.in || 0)}→${c.out || '∞'}s ×${c.speed || 1} <button data-rm="${i}">×</button></div>`).join('') || '<span class="muted">Linha do tempo vazia</span>'}</div><p class="muted">Duração: ${tl.clips.reduce((s, c) => s + lenOf(c), 0).toFixed(1)} s</p><div id="exres"></div></div>
   <div id="rightcol"></div></div>`;
  bindCredits(); const save = async () => { await put('/api/editor/' + id, { ...tl, title: $('#etitle').value }); await refresh(); };
  // Painel direito do editor (captures/auth/cdp/editor_right_panel/*.png): trilho com 6 abas (Básico, Plano de fundo, Ferramentas inteligentes, Áudio, Animação, Velocidade);
  // sem clipe selecionado mostra "Selecione um item para fazer ajustes". Velocidade foi capturada em detalhe (Normal/Curvo; Velocidade 1x; Duração 9.1s; Tom; Câmera lenta suave).
  const RAIL = [['Básico', 'Básico'], ['Plano de fundo', 'Plano de fundo'], ['Ferramentas inteligentes', 'Ferram. intelig.'], ['Áudio', 'Áudio'], ['Animação', 'Anima.'], ['Velocidade', 'Veloci.']];
  const ANIM = ['Nenhum', 'Cubo', 'Estilhaçado', 'Matriz flu…', 'Flash fluor…', 'Pingo d’á…', 'Leque do…', 'Dividir', 'Fechamen…', 'Rotaciona…', 'Mosaico', 'Slide divid…', 'Deslizar p…', 'Shake slide', 'Remar']; // nomes como aparecem (alguns truncados) em 5_5_Animação.png
  const SMART = ['Reenquadramento automático', 'Retoque', 'Remover plano de fundo', 'Rastreio de câmera'];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v)); const numv = (v) => (v === '' ? undefined : Number(v));
  function drawRight() {
    const col = $('#rightcol'); const i = ED_SEL != null && tl.clips[ED_SEL] ? ED_SEL : null; const c = i != null ? tl.clips[i] : null; const a = c && as.find((x) => x.id === c.assetId);
    const src = c ? Math.max(0, (c.out ?? a?.duration ?? 0) - (c.in || 0)) : 0; const sp = c?.speed || 1; let body = '';
    if (!c) body = '<p class="muted" id="rpempty">Selecione um item para fazer ajustes</p>';
    else if (ED_RTAB === 'Básico') body = `<b>Básico</b> <small class="muted">(agrupamento local: o conteúdo desta aba não foi capturado)</small><p>Início <input data-in="${i}" type="number" step="0.1" value="${c.in || 0}" style="width:70px"> Fim <input data-out="${i}" type="number" step="0.1" value="${c.out ?? ''}" style="width:70px"></p>`;
    else if (ED_RTAB === 'Plano de fundo') body = `<b>Plano de fundo</b><p><button id="rratio">Proporção: ${esc(ratioLabel(tl.ratio))} ▾</button></p><p><select id="ebg">${[['black', 'Preto'], ['color', 'Cor'], ['blur', 'Desfoque']].map(([v, l]) => `<option value="${v}" ${(tl.background?.type || 'black') === v ? 'selected' : ''}>${l}</option>`).join('')}</select> <input id="ebgc" type="color" value="#${tl.background?.color || '000000'}" ${tl.background?.type === 'color' ? '' : 'disabled'}></p><small class="muted">Preto/Cor/Desfoque: mapeamento local para o ffmpeg.</small>`;
    else if (ED_RTAB === 'Ferramentas inteligentes') body = `<b>Ferramentas inteligentes</b>${SMART.map((n) => `<p><button disabled class="smart-item">${n}</button></p>`).join('')}<div class="blocked">Funções de IA do serviço do Pippit (precisam de modelos de visão); sem provedor local, permanecem bloqueadas.</div>`;
    else if (ED_RTAB === 'Áudio') body = `<b>Áudio</b> <small class="muted">Básico</small><p>Volume (dB) <input data-cp="volumeDb" data-i="${i}" type="number" step="1" value="${c.volumeDb || 0}" style="width:60px"></p><p>Fade in (s) <input data-cp="fadeIn" data-i="${i}" type="number" step="0.1" min="0" value="${c.fadeIn || 0}" style="width:60px"> Fade out (s) <input data-cp="fadeOut" data-i="${i}" type="number" step="0.1" min="0" value="${c.fadeOut || 0}" style="width:60px"></p><p><label><input data-cp="denoise" data-i="${i}" type="checkbox" ${c.denoise ? 'checked' : ''}> Redução de ruído</label> <label><input data-cp="mute" data-i="${i}" type="checkbox" ${c.mute ? 'checked' : ''}> Mudo</label></p><p><button disabled>Modificador de voz</button></p><div class="blocked">Modificador de voz: função de IA do Pippit, não reproduzida.</div>`;
    else if (ED_RTAB === 'Animação') body = `<b>Animação</b><div class="seg" id="anitabs">${['Entrada', 'Saída', 'Combinação'].map((t) => `<button class="${ED_ATAB === t ? 'on' : ''}" data-at="${t}">${t}</button>`).join('')}</div><div class="anigrid">${ANIM.map((n, k) => `<button class="aniitem ${k === 0 ? 'on' : ''}" ${k === 0 ? '' : 'disabled'}>${esc(n)}</button>`).join('')}</div><div class="blocked">Os efeitos do Pippit (Cubo, Estilhaçado, …) não foram reproduzidos: só os nomes e miniaturas foram vistos, sem o resultado visual. Apenas “Nenhum” está ativo.</div>`;
    else if (ED_RTAB === 'Velocidade') body = `<b>Velocidade</b><div class="seg"><button class="on" data-sm="Normal">Normal</button><button disabled title="Aba vista no Pippit; conteúdo não capturado">Curvo</button></div><div class="row"><b>Básico</b><span style="flex:1"></span><button id="spreset" title="Redefinir">↺</button></div><p>Velocidade <input type="range" data-spr min="0.25" max="4" step="0.05" value="${clamp(sp, 0.25, 4)}"> <input data-sp="${i}" type="number" step="0.05" min="0.1" max="10" value="${sp}" style="width:70px">x</p><p>Duração <span id="durlbl">${src.toFixed(1)}s</span> → <input data-dur="${i}" type="number" step="0.1" min="0.1" value="${(src / sp).toFixed(1)}" style="width:70px">s</p><p><label>Tom <input data-cp="pitch" data-i="${i}" type="checkbox" ${c.pitch ? 'checked' : ''}></label></p><p><label>Câmera lenta suave <input data-cp="smoothSlow" data-i="${i}" type="checkbox" ${c.smoothSlow ? 'checked' : ''}></label></p><small class="muted">Faixa 0,1x–10x e o efeito de “Tom” (altera a altura junto com a velocidade) são decisões locais: o Pippit não mostrou esses detalhes. “Câmera lenta suave” usa interpolação de quadros do ffmpeg.</small>`;
    col.innerHTML = `<div class="card rpanel" id="rpanel"><div class="row"><span style="flex:1"></span>${c ? '<button id="rpclose" aria-label="Fechar">×</button>' : ''}</div>${body}</div><div class="rail" id="rail">${RAIL.map(([k, lab]) => `<button class="${ED_RTAB === k ? 'on' : ''}" data-rt="${k}" title="${k}">${lab}</button>`).join('')}</div>`;
    col.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = () => { ED_RTAB = b.dataset.rt; drawRight(); }));
    const cl = $('#rpclose'); if (cl) cl.onclick = () => { ED_SEL = null; pageEditor(id); };
    col.querySelectorAll('[data-at]').forEach((b) => (b.onclick = () => { ED_ATAB = b.dataset.at; drawRight(); }));
    const commit = async () => { await save(); pageEditor(id); }; if (!c) return;
    col.querySelectorAll('[data-in]').forEach((e) => (e.onchange = async () => { c.in = numv(e.value) || 0; await commit(); })); col.querySelectorAll('[data-out]').forEach((e) => (e.onchange = async () => { c.out = numv(e.value); await commit(); }));
    col.querySelectorAll('[data-sp]').forEach((e) => (e.onchange = async () => { c.speed = clamp(numv(e.value) || 1, 0.1, 10); await commit(); })); col.querySelectorAll('[data-spr]').forEach((e) => (e.onchange = async () => { c.speed = clamp(Number(e.value), 0.1, 10); await commit(); }));
    col.querySelectorAll('[data-dur]').forEach((e) => (e.onchange = async () => { const d = Number(e.value); if (d > 0 && src > 0) c.speed = Math.round(clamp(src / d, 0.1, 10) * 1000) / 1000; await commit(); }));
    const rs = $('#spreset'); if (rs) rs.onclick = async () => { c.speed = 1; c.pitch = false; c.smoothSlow = false; await commit(); };
    col.querySelectorAll('[data-cp]').forEach((e) => (e.onchange = async () => { c[e.dataset.cp] = e.type === 'checkbox' ? e.checked : e.value === '' ? undefined : Number(e.value); await commit(); }));
    const bg = $('#ebg'); if (bg) { const bgSave = async () => { const t = $('#ebg').value; tl.background = { type: t, color: t === 'color' ? $('#ebgc').value.slice(1) : undefined }; $('#ebgc').disabled = t !== 'color'; await save(); }; bg.onchange = bgSave; $('#ebgc').onchange = bgSave; }
    const rr = $('#rratio'); if (rr) rr.onclick = () => $('#eratio').click();
  }
  const draw = (t) => { document.querySelectorAll('.ed .tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); const lp = $('#lp');
    if (t === 'm') { lp.innerHTML = `<button id="up">Carregar</button>${as.map((a) => `<div class="mediaitem" data-a="${a.id}">${a.kind === 'image' ? `<img src="/files/${a.stored}" width="36">` : a.kind === 'audio' ? '♪' : '🎞'} ${esc(a.name)} <small>${a.duration ? a.duration.toFixed(1) + 's' : ''}</small></div>`).join('')}`; $('#up').onclick = () => fileInput('image/*,video/*,audio/*', async (f) => { await uploadAsset(f); pageEditor(id); });
      lp.querySelectorAll('[data-a]').forEach((e) => (e.onclick = async () => { const a = as.find((x) => x.id === e.dataset.a); if (a.kind === 'audio') tl.audio.push({ assetId: a.id, start: 0, volume: 1 }); else if (a.kind === 'video') tl.clips.push({ assetId: a.id, in: 0, out: a.duration || undefined }); else return toast('Imagens ainda não entram na faixa de vídeo desta versão.'); await save(); pageEditor(id); })); }
    if (t === 'l') { lp.innerHTML = `<b>Legendas manuais</b>${tl.captions.map((c, i) => `<div>${esc(c.text)} (${c.start}–${c.end}s) <button data-rc="${i}">×</button></div>`).join('')}<input id="ct" placeholder="Texto"><input id="cs" type="number" step="0.1" placeholder="início" style="width:70px"><input id="ce" type="number" step="0.1" placeholder="fim" style="width:70px"><button id="ac">Adicionar</button><div class="blocked">Letras automáticas (karaokê) do serviço original não foram observadas. As legendas automáticas usam transcrição: whisper.cpp local com modelo ggml ou a pilha gratuita (Cloudflare whisper) — o botão abaixo mostra o motivo quando nenhum dos dois está disponível.</div><button id="auto">Gerar (automáticas)</button>`; $('#ac').onclick = async () => { tl.captions.push({ text: $('#ct').value, start: Number($('#cs').value) || 0, end: Number($('#ce').value) || 2 }); await save(); pageEditor(id); }; $('#auto').onclick = async () => { const r = await post(`/api/editor/${id}/captions-auto`); toast(r.body.error, 6000); }; lp.querySelectorAll('[data-rc]').forEach((b) => (b.onclick = async () => { tl.captions.splice(b.dataset.rc, 1); await save(); pageEditor(id); })); }
    if (t === 'x') { lp.innerHTML = `<b>Modelos de texto</b>${tl.texts.map((c, i) => `<div>${esc(c.text)} (${c.start}–${c.end}s) <button data-rt="${i}">×</button></div>`).join('')}<input id="tt" placeholder="Adicionar cabeçalho / corpo de texto"><input id="ts" type="number" step="0.1" placeholder="início" style="width:70px"><input id="te" type="number" step="0.1" placeholder="fim" style="width:70px"><button id="at">Adicionar</button>`; $('#at').onclick = async () => { tl.texts.push({ text: $('#tt').value, start: Number($('#ts').value) || 0, end: Number($('#te').value) || 3 }); await save(); pageEditor(id); }; lp.querySelectorAll('[data-rt]').forEach((b) => (b.onclick = async () => { tl.texts.splice(b.dataset.rt, 1); await save(); pageEditor(id); })); }
    if (t === 'u') lp.innerHTML = `<b>Áudio na faixa</b>${tl.audio.map((a, i) => `<div>${esc(as.find((x) => x.id === a.assetId)?.name || '?')} <input data-vol="${i}" type="number" step="0.1" value="${a.volume}" style="width:60px"> <button data-ra="${i}">×</button></div>`).join('') || '<p class="muted">Adicione áudios pela aba Mídia.</p>'}<div class="blocked">Biblioteca de músicas e efeitos sonoros licenciados do Pippit: não reproduzida.</div>`;
    if (t === 'a') lp.innerHTML = '<div class="blocked">Avatares falantes no editor dependem da geração de vídeo em avatar do Pippit (não disponível localmente).</div>';
    if (t === 'e') lp.innerHTML = '<div class="blocked">Stickers, efeitos, transições e filtros: catálogo do Pippit não reproduzido.</div>';
    if (t === 'c') { lp.innerHTML = '<b>Corte rápido</b><p class="muted">Remove os trechos silenciosos dos clipes com áudio (detecção de silêncio do ffmpeg, sem IA).</p><label>Limite (dB) <input id="qn" type="number" value="-30" style="width:70px"></label> <label>Silêncio mínimo (s) <input id="qs" type="number" step="0.1" value="0.5" style="width:70px"></label><br><button class="primary" id="qsil">Remover silêncios</button><hr><b>Legendas automáticas</b><p class="muted">Transcreve com o whisper.cpp local (modelo Whisper em Configurações &gt; Assistente de IA) ou, sem modelo, pela pilha gratuita (Cloudflare @cf/openai/whisper, áudio em trechos de 25 s). Sem credencial, a resposta diz qual variável falta.</p><button id="qc">Gerar legendas</button><hr><b>Corte por transcrição</b><p class="muted">Mantém as falas e corta as pausas longas com os tempos por palavra da transcrição. Sem provedor, use “Remover silêncios”.</p><label>Pausa mínima (s) <input id="qg" type="number" step="0.1" value="0.6" style="width:70px"></label><button class="primary" id="qcut">Cortar por transcrição</button>';
      $('#qsil').onclick = async () => { const r = await post(`/api/editor/${id}/silence-cut`, { noiseDb: Number($('#qn').value), minSilence: Number($('#qs').value) }); if (r.ok) { toast(`${r.body.clips} clipe(s); ${r.body.removedSeconds} s de silêncio removidos.`); pageEditor(id); } else toast(r.body.error); };
      $('#qc').onclick = async () => { toast('Transcrevendo…'); const r = await post(`/api/editor/${id}/captions-auto`); if (r.ok) { toast(`${r.body.captions} legenda(s) por ${r.body.backend === 'local' ? 'whisper local' : r.body.provider?.providerName || 'roteador'} (${r.body.chunks} trecho(s)).`); pageEditor(id); } else toast(r.body.error, 7000); };
      $('#qcut').onclick = async () => { toast('Transcrevendo para cortar…'); const r = await post(`/api/editor/${id}/quick-cut`, { minGapMs: Math.round((Number($('#qg').value) || 0.6) * 1000) }); if (r.ok) { toast(`${r.body.clips} clipe(s); ${r.body.removedSeconds} s de pausa removidos.`); pageEditor(id); } else toast(r.body.error, 7000); }; }
    lp.querySelectorAll('[data-ra]').forEach((b) => (b.onclick = async () => { tl.audio.splice(b.dataset.ra, 1); await save(); pageEditor(id); })); lp.querySelectorAll('[data-vol]').forEach((i) => (i.onchange = async () => { tl.audio[i.dataset.vol].volume = Number(i.value); await save(); })); };
  draw('m'); document.querySelectorAll('.ed .tabs button').forEach((b) => (b.onclick = () => draw(b.dataset.t)));
  $('#eratio').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, (CAT.editorRatios || []).flatMap((o) => [{ label: `${(tl.ratio || 'original') === o.id ? '✓ ' : '   '}${o.label}${o.hint ? ' — ' + o.hint : ''}`, fn: async () => { tl.ratio = o.id; await save(); pageEditor(id); } }, ...(o.id === 'original' || o.id === '2:1' ? ['-'] : [])])); }; $('#etitle').onchange = save; // divisores do menu como no Pippit
  document.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => { tl.clips.splice(b.dataset.rm, 1); ED_SEL = null; await save(); pageEditor(id); }));
  drawRight(); document.querySelectorAll('#tl .clip').forEach((e) => (e.onclick = (ev) => { if (ev.target.closest('button')) return; ED_SEL = Number(e.dataset.i); pageEditor(id); }));
  // Tour de balões do editor (observado: passo 1/2 "Recursos materiais" com "Avançar"; passo 2 só o título "Alterar barra lateral" foi lido; rótulo "Concluir" é local). Aparece uma vez por navegador.
  { let seen = false; try { seen = localStorage.getItem('pippit_editor_tour') === '1'; } catch {} if (!seen) { const TOUR = [{ t: 'Recursos materiais', b: 'Você pode carregar a sua própria mídia ou usar os materiais que fornecemos.', btn: 'Avançar' }, { t: 'Alterar barra lateral', b: '', btn: 'Concluir' }]; let k = 0; const el = h('<div class="tour" id="etour"></div>'); $('#main').insertBefore(el, $('.ed')); const paint = () => { const st = TOUR[k]; el.innerHTML = `<b>${st.t}</b>${st.b ? `<div>${st.b}</div>` : ''}<div class="row"><small class="muted">${k + 1}/${TOUR.length}</small><span style="flex:1"></span><button id="tournext" class="primary">${st.btn}</button></div>`; $('#tournext', el).onclick = () => { if (k < TOUR.length - 1) { k++; paint(); } else { try { localStorage.setItem('pippit_editor_tour', '1'); } catch {} el.remove(); } }; }; paint(); } }
  // Diálogo "Export settings" observado: Video cover, Name (obrigatório, máx. 100), Watermark, Resolution, Quality, Frame rate, Format, Download.
  $('#exp').onclick = async () => {
    const O = (await api('/api/editor-export-options')).body; const W = (await api('/api/watermark')).body; const nm = $('#etitle').value || ED.title || '';
    const sel = (id_, list, cur) => `<select id="${id_}">${list.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const m = modal(`<h2>Export settings</h2><div class="row"><b>Video cover</b> <span class="muted">primeiro quadro do vídeo</span></div><p><img id="excover" alt="Capa do vídeo: miniatura do primeiro quadro" src="/api/editor/${id}/cover" style="max-width:220px;border-radius:6px;background:#000" onerror="this.style.display='none';document.getElementById('excovernote').style.display=''"><span id="excovernote" class="muted" style="display:none">Miniatura indisponível (sem vídeo na timeline ou ffmpeg ausente).</span></p><p class="muted">Clique na capa não abre seletor: o Pippit observado não tem escolha livre de capa (UNOBSERVED).</p>
      <p><b>Name</b> <input id="exname" maxlength="100" value="${esc(nm)}"><span id="exnamerr" class="blocked" style="display:none">Enter a name</span></p>
      <p><b>Watermark</b> ${sel('exwm', [['with', `Com marca d'água${W.brandName ? ' (' + W.brandName + ')' : ''}`], ['without', W.saveWithoutWatermark.allowed ? "Sem marca d'água" : "Sem marca d'água — disponível nos planos pagos"]], 'with')}</p>
      <p class="muted" style="margin-top:-6px">${esc(W.note)}</p>
      <p><b>Resolution</b> ${sel('exres_', Object.keys(O.resolution).map((k) => [k, ['1080p', '2k', '4k'].includes(k) ? `${k} — Free for now` : k]), O.defaults.resolution)}</p>
      <p><b>Quality</b> ${sel('exq', [['better', 'Better quality'], ['recommended', 'Recommended'], ['faster', 'Faster export']], O.defaults.quality)}</p>
      <p><b>Frame rate</b> ${sel('exfps', O.fps.map((f) => [f, f + 'fps']), O.defaults.fps)}</p>
      <p><b>Format</b> ${sel('exfmt', Object.keys(O.format).map((f) => [f, f.toUpperCase()]), O.defaults.format)}</p><button class="primary" id="exdl">Download</button>`, 'sm');
    $('#exdl', m).onclick = async () => {
      const name = $('#exname', m).value.trim(); if (!name) { $('#exnamerr', m).style.display = ''; return; }
      const body = { name, watermark: $('#exwm', m).value === 'with', resolution: $('#exres_', m).value, quality: $('#exq', m).value, fps: Number($('#exfps', m).value), format: $('#exfmt', m).value };
      m.close(); $('#exres').textContent = 'Exportando…'; await save(); const r = await post(`/api/editor/${id}/export`, body); if (r.ok) {
        window.__assets = (await api('/api/assets')).body; $('#exres').innerHTML = (r.body.linked ? '<div class="muted" id="exlinked">Resultado adicionado ao Canvas de origem como novo nó de vídeo ligado ao nó editado.</div>' : '') + `<div class="ok">Exportado: ${r.body.info.duration.toFixed(1)} s, ${r.body.info.width}×${r.body.info.height}, ${r.body.info.fps} fps, ${esc(r.body.asset.name.split('.').pop().toUpperCase())}</div><video controls src="/files/${r.body.asset.stored}" width="260"></video><br><a href="/files/${r.body.asset.stored}" download="${esc(r.body.asset.name)}"><button>Baixar</button></a>`; } else $('#exres').innerHTML = `<div class="blocked">${esc(r.body.error)}</div>`;
    };
  };
}
async function marketingEntityPicker(kind, choose) {
  const isProduct = kind === 'product'; const endpoint = isProduct ? '/api/products' : '/api/characters';
  const title = isProduct ? 'Produto' : 'Personagem'; let tab = 'mine', sort = 'desc', query = '', entries = (await api(endpoint)).body || [], selected = null;
  const m = modal(`<h2>${title}</h2>${isProduct ? '' : '<div class="tabs"><button class="on" data-tab="mine">Minha</button><button data-tab="recommended">Recomendados</button></div>'}<div class="row"><input id="mkEntitySearch" placeholder="Pesquisar ${isProduct ? 'produtos' : 'personagens'}" style="flex:1"><button id="mkEntitySort">${sort === 'desc' ? 'Descendente' : 'Ascendente'} ⇅</button><button id="mkEntityAdd">＋ Adicionar</button></div><div id="mkEntityList" class="grid g3" style="max-height:55vh;overflow:auto"></div><div class="row"><button id="mkEntityCancel">Cancelar</button><span style="flex:1"></span><button id="mkEntityClose">Fechar</button><button class="primary" id="mkEntitySelect" disabled>Adicionar</button></div>`, 'sm');
  const draw = () => {
    const list = tab === 'recommended' ? [] : entries.filter((e) => e.name.toLowerCase().includes(query)).sort((a,b) => (sort === 'desc' ? -1 : 1) * String(a.createdAt).localeCompare(String(b.createdAt)));
    $('#mkEntityList', m).innerHTML = tab === 'recommended'
      ? '<p class="muted">Personagens recomendados vêm do serviço do Pippit; catálogo não incluído nesta reconstrução.</p>'
      : list.map((e) => `<button class="card mk-entity ${selected?.id === e.id ? 'sel' : ''}" data-entity="${esc(e.id)}" style="text-align:left">${e.assets?.[0] ? `<img src="/files/${esc(e.assets[0].stored)}" style="width:100%;height:90px;object-fit:contain">` : ''}<b>${esc(e.name)}</b><small class="muted">${e.assetIds.length} imagem(ns)</small></button>`).join('') || `<p class="muted">${isProduct ? 'Nenhum produto ainda' : 'Nenhum personagem ainda'}</p>`;
    m.querySelectorAll('[data-entity]').forEach((el) => (el.onclick = () => { selected = entries.find((e) => e.id === el.dataset.entity) || null; $('#mkEntitySelect', m).disabled = !selected; draw(); }));
    m.querySelectorAll('[data-tab]').forEach((el) => (el.onclick = () => { tab = el.dataset.tab; m.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b === el)); draw(); }));
  };
  $('#mkEntitySearch', m).oninput = (e) => { query = e.target.value.toLowerCase(); draw(); };
  $('#mkEntitySort', m).onclick = () => { sort = sort === 'desc' ? 'asc' : 'desc'; $('#mkEntitySort', m).textContent = `${sort === 'desc' ? 'Descendente' : 'Ascendente'} ⇅`; draw(); };
  $('#mkEntityAdd', m).onclick = () => pickAsset(async (asset) => {
    const name = await askName(`Adicionar ${isProduct ? 'produto' : 'personagem'}`, asset.name.replace(/\.[^.]+$/, '')); if (!name) return;
    const result = await post(`/api/assets/${asset.id}/${kind}`, { name }); if (!result.ok) return toast(result.body.error, 4000);
    entries = (await api(endpoint)).body || []; selected = result.body[kind] || null; draw(); $('#mkEntitySelect', m).disabled = !selected;
  }, 'image');
  $('#mkEntitySelect', m).onclick = () => { if (!selected) return; choose(selected); m.close(); };
  $('#mkEntityCancel', m).onclick = () => m.close(); $('#mkEntityClose', m).onclick = () => m.close(); draw();
}

function pageMarketing(embedded) {
  // Palco medido no original (pt_home_marketing*.txt): compositor com os blocos Produto/Personagem (96px) à esquerda,
  // barra com Habilidades · Gancho|Estilo visual · Modelo|Preferência, 5 skills e a grade de cartões de modelo (3 colunas).
  const REC = [['anuncios-de-drama', 'GPT Image 2', 'drama-ads'], ['geracao-em-lote', '', 'batch-generation'], ['url-do-video', '', 'video-url'], ['traducao-de-video', '', 'video-translation'], ['video-de-marketing', 'GPT Image 2', 'marketing-video']];
  const TPL_TABS = ['Tudo', 'Anúncios em alta🔥', 'Anúncios UGC', 'Demonstrações de produtos', 'Efeitos visuais', 'Anúncios guiados por histórias', 'Seedance 2.5', 'ASMR'];
  const head = embedded ? homeHero() : '<h1 class="mk-title">Nunca fique sem boas ideias</h1><p class="center muted">Explore formatos de anúncio, ganchos e estilos, e dê vida a cada ideia</p><div class="row" style="justify-content:flex-end"><a href="#/templates" id="marketingTemplates">Modelos de marketing</a></div>';
  const pill = (id, label, icon) => `<button class="pill" id="${id}">${icon ? `<i class="ic">${icon}</i>` : ''}<span class="tx">${label} <span class="car">▾</span></span></button>`;
  $('#main').innerHTML = `${credits()}<div class="page home mk-page">${head}<div class="composer mk-composer"><div class="mk-top"><div class="mk-slots"><div class="mk-slot" id="prod"><span class="mk-tag">Produto</span><span>＋</span></div><div class="mk-slot" id="chr"><span class="mk-tag">Personagem</span><span>＋</span></div></div><div class="mk-main"><div id="mkchips" class="row"></div><textarea id="mp" placeholder="Adicione um produto e seus argumentos de venda e deixe o agente criar o plano"></textarea></div></div>
   <div class="crow"><div class="cgroup"><button class="cicon" id="plus" aria-label="Adicionar material">${IC.plus}</button><button class="cicon" id="at" aria-label="Mencionar ativo">${IC.at}</button></div><span class="sp"></span><div class="cgroup">${pill('mkskill', 'Habilidades', IC.skills)}${embedded ? '' : pill('fmt', 'Formatos de anúncio')}<div class="pill-join">${pill('hook', 'Gancho')}${pill('sty', 'Estilo visual')}</div><button class="pill" id="mkmodel"><i class="ic">${IC.model}</i><span class="tx">Modelo <span class="div">|</span> Preferência <span class="car">▾</span></span></button></div><span class="sp"></span><label class="canvas-sw">Tela <input type="checkbox" id="mkcanvas" checked></label><button class="primary" id="gen" aria-label="Generate">${IC.send}</button></div></div>
  <div class="home-col"><div class="sk-head"><h2>Skills recomendadas</h2><a href="#/skills">Todos</a></div><div class="sk-grid">${REC.map(([id, bd, img]) => { const k = CAT.skills.find((x) => x.id === id); return k ? `<div class="skill" data-ms="${id}"><img class="sk-ic" src="/assets/skills/${img}.webp" alt=""><span class="sk-meta"><span class="sk-name">${esc(k.name)}</span>${bd ? `<span class="sk-badge">${bd}</span>` : ''}</span><i class="sk-go muted">↵${IC.enter}</i></div>` : ''; }).join('')}</div></div>
  <div class="tpl-wrap"><div class="tabs tpl-tabs">${TPL_TABS.map((t, i) => `<button class="${i ? '' : 'on'}">${t}</button>`).join('')}</div><div class="tpl-grid" id="tplGrid"></div></div></div>`; bindCredits();
  const syncGen = () => $('#gen')?.classList.toggle('ready', !!$('#mp').value.trim()); $('#mp').addEventListener('input', syncGen);
  // Cartões de modelo: títulos, descrições e categorias observados no original (96 cartões; cada filtro mostra
  // só os da sua categoria); as imagens são fotos pequenas de exemplo (assets/templates).
  let TPL = null, tplCat = 0;
  const drawTpl = () => { const g = $('#tplGrid'); if (!g || !TPL) return; const cat = TPL.filters[tplCat];
    const items = tplCat === 0 ? TPL.items : TPL.items.filter((t) => (t.cats || []).includes(cat));
    g.innerHTML = items.map((t) => `<div class="tpl" data-tpl="${esc(t.title)}"><div class="tpl-imgs">${[0, 1, 2].map((k) => (t.files[k] ? `<img src="/assets/templates/${t.files[k]}" alt="" loading="lazy">` : '<span></span>')).join('')}<button class="tpl-remix">Remixar</button></div><div class="tpl-tx"><b>${esc(t.title)}</b><p>${esc(t.desc)}</p></div></div>`).join('') || '<p class="muted">Nenhum modelo nesta categoria.</p>';
    g.querySelectorAll('.tpl').forEach((c) => (c.onclick = () => { MK.fmt = c.dataset.tpl; chips(); $('#main').scrollTo({ top: 0, behavior: 'smooth' }); $('#mp').focus(); })); };
  document.querySelectorAll('.tpl-tabs button').forEach((b, n) => (b.onclick = () => { tplCat = n; document.querySelectorAll('.tpl-tabs button').forEach((x) => x.classList.toggle('on', x === b)); drawTpl(); }));
  api('/assets/templates/_templates.json').then((r) => { if (!r.body || !Array.isArray(r.body.items)) return; TPL = r.body; drawTpl(); }).catch(() => {});
  document.querySelectorAll('[data-ms]').forEach((c) => (c.onclick = () => { HOME.skill = CAT.skills.find((x) => x.id === c.dataset.ms); HOME.tab = 'Criativo'; if (embedded) pageHome(); else location.hash = '/home'; }));
  $('#mkskill').onclick = () => (location.hash = '/skills'); $('#plus').onclick = () => pickAsset((a) => ($('#mp').value += ` [Mídia: ${a.name}]`)); $('#at').onclick = () => toast('Menção de mídia (@): não reproduzida neste estúdio.');
  $('#mkmodel').onclick = () => toast('Modelo | Preferência do Estúdio de marketing: comportamento não observado.');
  // seletores do estúdio (Ad formats / Hook / Visual style): busca, categorias, cartões com Expand/Select. Categoria de cada Ad format e itens de Hook não foram capturados.
  const MK = window.__mk || (window.__mk = { fmt: null, hook: null, sty: null });
  const chips = () => { $('#mkchips').innerHTML = [['fmt', 'Formato'], ['hook', 'Gancho'], ['sty', 'Estilo']].filter(([k]) => MK[k]).map(([k, l]) => `<span class="pill" data-x="${k}">${l}: ${esc(MK[k])} ×</span>`).join(' '); document.querySelectorAll('#mkchips [data-x]').forEach((c) => (c.onclick = () => { MK[c.dataset.x] = null; chips(); })); };
  const picker = (key, title, spec, cats, all) => () => {
    let cat = 'All', q = ''; const m = modal(`<h2>${title}</h2><input id="mq" placeholder="${esc(spec.search)}" style="width:100%">${spec.capturedDescription ? `<p class="muted" id="mkCaptured">Exemplo de descrição capturado, <b>sem dono</b> (a captura não diz de qual cartão veio): “${esc(spec.capturedDescription.text)}”</p>` : ''}<div class="tabs" id="mcats" style="margin:8px 0"></div><div id="mgrid" class="grid g3"></div>`);
    const draw = () => {
      $('#mcats', m).innerHTML = ['All', ...cats].map((c) => `<button class="${c === cat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
      const items = all.filter((i) => (cat === 'All' || i.cat === cat) && i.name.toLowerCase().includes(q));
      $('#mgrid', m).innerHTML = items.map((i) => `<div class="card mk-card" data-n="${esc(i.name)}"><b>${esc(i.name)}</b><div class="muted">${i.cat ? esc(i.cat) : ''}</div><div class="row"><button data-ex="${esc(i.name)}">Expand</button><button class="primary" data-sel="${esc(i.name)}">Select</button></div><div class="muted mk-ex" style="display:none">${i.description ? esc(i.description) : 'Descrição original não capturada (UNOBSERVED).'}</div></div>`).join('') || `<p class="muted">${cat !== 'All' && !items.length ? 'O conteúdo desta categoria não foi capturado do original.' : 'Nada encontrado.'}</p>`;
      m.querySelectorAll('#mcats [data-c]').forEach((b) => (b.onclick = () => { cat = b.dataset.c; draw(); }));
      m.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => { const e = b.closest('.mk-card').querySelector('.mk-ex'); const expanded = e.style.display === 'none'; e.style.display = expanded ? '' : 'none'; b.textContent = expanded ? 'Collapse' : 'Expand'; }));
      m.querySelectorAll('[data-sel]').forEach((b) => (b.onclick = () => { MK[key] = b.dataset.sel; chips(); m.close(); }));
    };
    $('#mq', m).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); }; draw();
  };
  const M = CAT.marketing; const styleCats = M.styles.categories;
  // Descrições/categorias por cartão nunca foram capturadas: o estado vem da rota e é exibido como UNOBSERVED.
  api('/api/marketing/ad-formats').then((r) => { const b = r.body; if (!r.ok || !b?.items) return; const by = new Map(b.items.map((i) => [i.name, i])); M.adFormats.items = M.adFormats.items.map((i) => ({ ...i, ...(by.get(i.name) || {}) })); M.adFormats.capturedDescription = b.capturedDescription; }).catch(() => {});
  if ($('#fmt')) $('#fmt').onclick = picker('fmt', 'Formatos de anúncio', M.adFormats, ['Trending Ads', 'UGC Ads', 'Product Demos', 'Visual Effects'], M.adFormats.items.map((i) => ({ name: i.name, cat: i.category })));
  $('#hook').onclick = picker('hook', 'Gancho', M.hooks, M.hooks.categories, M.hooks.items);
  $('#sty').onclick = picker('sty', 'Estilo visual', M.styles, styleCats.map((c) => c.name), styleCats.flatMap((c) => c.items.map((n) => ({ name: n, cat: c.name })))); chips();
  window.__mkEntities ||= { product: null, character: null };
  const drawEntities = () => { for (const [kind, id] of [['product', 'prod'], ['character', 'chr']]) { const entity = window.__mkEntities[kind]; const el = $('#' + id); el.innerHTML = entity ? `<span class="mk-tag">${kind === 'product' ? 'Produto' : 'Personagem'}</span><b style="flex:1">${esc(entity.name)}</b><button data-clear="${kind}" aria-label="Remover">×</button>` : `<span class="mk-tag">${kind === 'product' ? 'Produto' : 'Personagem'}</span><span>＋</span>`; el.querySelector('[data-clear]')?.addEventListener('click', (e) => { e.stopPropagation(); window.__mkEntities[kind] = null; drawEntities(); }); el.onclick = () => marketingEntityPicker(kind, (value) => { window.__mkEntities[kind] = value; drawEntities(); }); } };
  drawEntities();
  $('#gen').onclick = async () => { const t0 = $('#mp').value.trim(); if (!t0) return toast('Descreva o produto primeiro.'); const sel = [['Formato de anúncio', MK.fmt], ['Gancho', MK.hook], ['Estilo visual', MK.sty]].filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`).join('; '); const t = sel ? `${t0}\n[${sel}]` : t0; const p = (await post('/api/projects', { type: 'canvas', title: t.slice(0, 40) })).body; const c = (await post(`/api/projects/${p.id}/chats`)).body; await post(`/api/projects/${p.id}/chats/${c.id}/messages`, { text: t, modelId: 'seedance-2.5' }); await refresh(); location.hash = '/project/' + p.id; };
}
function pageStory(embedded) {
  // Palco medido no original (pt_home_story*.png): faixa de 4 abas, painel branco com área tracejada,
  // nota de rodapé e "Meus projetos" em cartões.
  const tab = window.__stTab || 'up';
  const again = () => { pageStory(embedded); if (embedded) bindHero(); };
  const panel = tab === 'ai' ? '<div class="st-pn"><textarea id="sp" placeholder="Descreva suas ideias de roteiro"></textarea><div class="row"><span>Proporção padrão</span><span>10 episódios</span><button class="primary" id="sg" disabled>Gerar</button></div></div>' : '<div class="st-drop"><div class="row" style="justify-content:center"><button class="primary-lg" id="up">＋ Carregar roteiro</button><button id="paste" class="pill-lg">Colar roteiro</button></div><div class="muted">Arraste e solte um arquivo aqui para carregar (.txt/.docx, máx. 100 mil caracteres)</div></div>';
  const T = [['up', 'Carregar roteiro', '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="7" stroke-dasharray="2.2 2"/><path d="M9 12V6.5M6.8 8.6 9 6.4l2.2 2.2"/></svg>'], ['ai', 'Roteirista de IA', IC.creative], ['tc', 'Tela criativa', IC.canvas], ['rd', 'Redesenhar', '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="9" height="9" rx="2.5"/><path d="M12 3.5H5.5a2 2 0 0 0-2 2V12"/><circle cx="10.5" cy="10.5" r="1.6"/></svg>']];
  const head = embedded ? homeHero() : '<h1 class="center">Estúdio de histórias</h1><p class="center muted">Seu agente de histórias com IA para dramas curtos, filmes com IA e muito mais</p>';
  const mine = PROJECTS.filter((p) => p.type === 'story');
  $('#main').innerHTML = `${credits()}<div class="page home story-page">${head}<div class="st-card"><div class="st-tabs">${T.map(([k, l, ic]) => `<button class="${tab === k ? 'on' : ''}" data-st="${k}" ${k === 'rd' ? 'disabled title="Recurso novo; fluxo não reproduzido"' : ''} id="${k === 'ai' ? 'ai' : k === 'tc' ? 'tc' : 'tab-' + k}"><i class="ic">${ic}</i>${l}${k === 'rd' ? ' <span class="new">NEW</span>' : ''}</button>`).join('')}</div><div class="st-box">${panel}</div></div><div id="pn"></div><p class="st-note"><span>ⓘ Você precisa ter direitos de uso de qualquer roteiro que adicionar · 25 créditos/1000 caracteres</span><i class="div"></i><a id="skip" style="cursor:pointer"><b>Pular para a tela</b></a></p><div class="st-proj"><div class="st-ph"><h3>Meus projetos</h3><a href="#/assets">Tudo ›</a></div><div class="st-grid">${mine.map((p) => `<a class="st-pc" href="#/project/${p.id}"><span class="th"></span><b>${esc(p.title)}</b><small>${esc(p.subtitle || '')}</small></a>`).join('') || '<p class="muted">Sem projetos de histórias.</p>'}</div></div></div>`; bindCredits();
  document.querySelectorAll('[data-st]').forEach((b) => { if (b.dataset.st === 'up') b.onclick = () => { window.__stTab = 'up'; again(); }; if (b.dataset.st === 'ai') b.onclick = () => { window.__stTab = 'ai'; again(); }; });
  const mk = async (title, ratio) => { const p = (await post('/api/projects', { type: 'story', title })).body; await refresh(); location.hash = '/project/' + p.id; };
  if ($('#paste')) $('#paste').onclick = () => { const m = modal(`<h2>Colar roteiro</h2><textarea id="rs" style="width:100%;height:220px" placeholder="Insira o seu roteiro aqui"></textarea><div><span id="cnt">0/100000</span></div><div class="row"><button id="c1">Cancelar</button><button class="primary" id="c2" disabled>Concluído</button></div>`, 'sm'); $('#rs', m).oninput = (e) => { $('#cnt', m).textContent = e.target.value.length + '/100000'; $('#c2', m).disabled = !e.target.value.length || e.target.value.length > 100000; }; $('#c1', m).onclick = () => m.close(); $('#c2', m).onclick = () => { toast(`Roteiro de ${$('#rs', m).value.length} caracteres: o Pippit cobraria ${Math.ceil($('#rs', m).value.length / 1000) * 25} créditos; a análise por IA não está disponível aqui.`, 7000); m.close(); }; };
  if ($('#up')) $('#up').onclick = () => fileInput('.txt,.docx', (f) => toast(`Roteiro ${f.name}: análise por IA não disponível localmente.`));
  if ($('#sg')) { $('#sp').oninput = (e) => ($('#sg').disabled = !e.target.value); $('#sg').onclick = () => mk($('#sp').value.slice(0, 40)); }
  $('#tc').onclick = () => mk('Untitled'); $('#skip').onclick = () => mk('Untitled');
}
const PROV_TITLES = { video: 'Vídeo', audio: 'Áudio (narração)', image: 'Imagem', talkingphoto: 'Foto falante (lip-sync)' };
function provSection(PR) {
  return `<h3>Provedores de mídia (do usuário)</h3><p class="muted">${esc(PR.note)}</p>` + ['video', 'audio', 'image', 'talkingphoto'].map((k) => { const v = PR.providers[k]; return `<div class="card prov" data-k="${k}" style="margin:8px 0"><b>${PROV_TITLES[k]}</b> <span class="muted">${v.configured ? 'configurado' : 'não configurado'}</span>
    <p><select data-f="adapter"><option value="">— escolha o adaptador —</option>${v.adapters.map((a) => `<option value="${a.id}" ${v.adapter === a.id ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></p>
    <p>URL base <input data-f="baseUrl" style="width:60%" value="${esc(v.baseUrl)}" placeholder="https://api.openai.com/v1"> Modelo <input data-f="model" value="${esc(v.model)}"> Chave <input data-f="apiKey" type="password" placeholder="${v.hasKey ? 'configurada em memória/ambiente' : 'não configurada'}"> ${k === 'audio' ? `Voz <input data-f="voice" value="${esc(v.voice)}" style="width:90px">` : ''}</p>
    ${k === 'talkingphoto' ? `<p class="muted">Foto + áudio → vídeo. Cada tarefa exige o SEU consentimento depois de ver o orçamento; custo e moeda abaixo são informados por você (o PiperLine não consulta preços). Sem custo informado, o custo é tratado como DESCONHECIDO.</p>
    <p class="muted">Adaptadores gratuitos: <b>huggingface-space</b> (Space com Gradio — SadTalker/Hallo2/Wav2Lip; token opcional via <code>HF_TOKEN</code>) e <b>local-command</b> (roda o seu Wav2Lip/LivePortrait; o PiperLine não baixa modelo).</p>
    <p>Space (dono/space) <input data-f="space" style="width:34%" value="${esc(v.space || '')}" placeholder="ex.: usuario/sadtalker"> API Gradio <input data-f="apiName" style="width:15%" value="${esc(v.apiName || '')}" placeholder="predict"></p>
    <p>Comando local <input data-f="command" style="width:70%" value="${esc(v.command || '')}" placeholder="wav2lip --face {image} --audio {audio} --out {out}"> <span class="muted">{image} {audio} {out} {workdir} · no Windows roda no PowerShell; se o comando começar com aspas, o <code>&</code> é posto automaticamente</span></p><p>Custo por segundo <input data-f="costPerSecond" type="number" step="any" min="0" style="width:80px" value="${esc(v.costPerSecond)}"> Moeda <input data-f="currency" style="width:50px" maxlength="3" value="${esc(v.currency)}" placeholder="USD"> Limite por tarefa <input data-f="maxCostPerTask" type="number" step="any" min="0" style="width:80px" value="${esc(v.maxCostPerTask)}"> Áudio máx. (s) <input data-f="maxAudioSeconds" type="number" min="1" max="300" style="width:60px" value="${esc(v.maxAudioSeconds)}" placeholder="60"></p><p>Campos do modelo (JSON; ex.: {"image":"face","audio":"audio","gesture":"prompt"}) <input data-f="inputMap" style="width:60%" value="${esc(v.inputMap ? JSON.stringify(v.inputMap) : '')}"></p><p>Parâmetros (JSON; ex.: {"resolution":"size"}) <input data-f="paramMap" style="width:50%" value="${esc(v.paramMap ? JSON.stringify(v.paramMap) : '')}"></p>` : ''}
    <p><label><input type="checkbox" data-f="allowSpend" ${PR.allowSpend[k] ? 'checked' : ''}> Autorizo chamadas pagas neste provedor</label> <button data-psave="${k}">Salvar</button> <button data-pdel="${k}" class="danger">Remover</button> <span class="muted" data-pres="${k}"></span></p></div>`; }).join('');
}
async function freeRouterSection() {
  const result = await api('/api/free-router/config'); const status = result.body || {}; const encoded = JSON.stringify(status.config || { version: 1, paidFallback: false, providers: [], taskPreferences: {} }, null, 2);
  const secretFields = (status.config?.providers || []).filter((p) => p.id !== 'ollama').map((p) => `<label>${esc(p.id)} API key <input type="password" data-fr-secret="${esc(p.id)}" autocomplete="new-password" placeholder="${p.hasKey ? 'configurada em memória/ambiente' : 'não configurada'}"></label>${p.hasKey ? `<label><input type="checkbox" data-fr-clear="${esc(p.id)}"> limpar chave efêmera</label>` : ''}`).join(' · ');
  return `<section class="card" id="free-router" style="margin:14px 0"><h3>Roteador de modelos gratuitos</h3><p class="muted">${esc(status.note || 'Configuração de provedores sem chamadas reais até você executar uma tarefa. Chaves nunca são salvas no db.json; podem vir do ambiente ou ficar apenas em memória até reiniciar.')}</p><p class="muted">Tarefas: ${Object.entries(status.tasks || {}).map(([k,v]) => `${esc(k)} — ${esc(v)}`).join(' · ')}</p><label>Configuração (JSON; baseUrl, modelos/capabilities, confirmação explícita de cota gratuita e limite diário local)<br><textarea id="frconfig" rows="12" style="width:100%;font-family:monospace">${esc(encoded)}</textarea></label><p>${secretFields}</p><p><button id="frsave" class="primary">Salvar configuração gratuita</button> <button id="fromni">Usar Omni Router (127.0.0.1:20128)</button> <button id="frstack">Usar pilha gratuita (FreeLLMAPI + Cloudflare + Omni + NVIDIA)</button> <span id="frresult" class="muted"></span></p><p class="muted">Pilha: texto FreeLLMAPI (<code>127.0.0.1:3001/v1</code>, modelo <code>auto</code>) → Omni → NVIDIA; imagem Cloudflare <code>flux-1-schnell</code> → Omni <code>flux.2-klein</code>; voz na nuvem Cloudflare <code>melotts</code> (WAV) só com <code>voiceSource:"cloud"</code> — o padrão continua a voz local SAPI. Vídeo segue PENDING. O token (<code>CLOUDFLARE_API_TOKEN</code>), a conta (<code>CLOUDFLARE_ACCOUNT_ID</code>) e a chave do FreeLLMAPI vêm só do ambiente: nada é gravado aqui.</p><p class="muted">O cap diário é um limite local por número de tentativas; não substitui a quota real do provedor. Modelos/cotas cloud só entram no roteamento quando você confirma elegibilidade gratuita. Nunca use endpoints pagos.</p></section>`;
}
function bindFreeRouter() {
  const save = $('#frsave'); if (!save) return;
  const preset = $('#fromni'); if (preset) preset.onclick = async () => {
    const out = $('#frresult'); const r = await post('/api/free-router/preset/omni', {});
    if (!r.ok) { out.textContent = r.body?.error || 'Não foi possível aplicar o preset do Omni.'; return; }
    out.textContent = `Preset aplicado: ${r.body.provider.baseUrl} · texto ${r.body.provider.models[0].id} · imagem ${r.body.provider.models[1].id}. Chave ${r.body.hasKey ? 'no ambiente' : 'ainda não configurada (OMNIROUTER_API_KEY ou campo abaixo)'}.`;
    setTimeout(() => repaintIfRoute('/settings', () => pageSettings('llm')), 400);
  };
  const stack = $('#frstack'); if (stack) stack.onclick = async () => {
    const out = $('#frresult'); const r = await post('/api/free-router/preset/stack', {});
    if (!r.ok) { out.textContent = r.body?.error || 'Não foi possível aplicar a pilha gratuita.'; return; }
    const miss = (r.body.missing || []).join('; ');
    out.textContent = `Pilha aplicada: texto ${r.body.order.text.join(' → ')} · imagem ${r.body.order.image.join(' → ')}. Voz padrão SAPI; nuvem só com voiceSource:"cloud".${miss ? ` Falta: ${miss}.` : ''} ${r.body.pending?.video_generation || ''}`;
    setTimeout(() => repaintIfRoute('/settings', () => pageSettings('llm')), 400);
  };
  save.onclick = async () => { const out = $('#frresult'); let config; try { config = JSON.parse($('#frconfig').value); } catch { out.textContent = 'JSON inválido.'; return; }
    const secrets = Object.fromEntries([...document.querySelectorAll('[data-fr-secret]')].map((x) => [x.dataset.frSecret, document.querySelector(`[data-fr-clear="${x.dataset.frSecret}"]`)?.checked ? null : x.value]).filter(([,v]) => v === null || v));
    const result = await post('/api/free-router/config', { config, secrets }); out.textContent = result.ok ? 'Salvo. Segredos recebidos somente em memória; a execução continua sujeita à quota/cap local.' : result.body.error; if (result.ok) setTimeout(() => repaintIfRoute('/settings', () => pageSettings('llm')), 300);
  };
}
function bindProvSection() {
  document.querySelectorAll('[data-psave]').forEach((b) => (b.onclick = async () => { const k = b.dataset.psave; const c = document.querySelector(`.prov[data-k="${k}"]`); const f = (n) => c.querySelector(`[data-f="${n}"]`); const body = { adapter: f('adapter').value, baseUrl: f('baseUrl').value, model: f('model').value, allowSpend: f('allowSpend').checked }; if (f('apiKey').value) body.apiKey = f('apiKey').value; if (f('voice')) body.voice = f('voice').value;
    if (k === 'talkingphoto') { for (const n of ['space', 'apiName', 'command']) body[n] = f(n).value; for (const n of ['costPerSecond', 'currency', 'maxCostPerTask', 'maxAudioSeconds']) body[n] = f(n).value; for (const n of ['inputMap', 'paramMap']) { const raw = f(n).value.trim(); if (raw) { try { body[n] = JSON.parse(raw); } catch { c.querySelector(`[data-pres="${k}"]`).textContent = `${n}: JSON inválido`; return; } } else body[n] = null; } } const r = await post('/api/providers/' + k, body); c.querySelector(`[data-pres="${k}"]`).textContent = r.ok ? 'Salvo.' : r.body.error; if (r.ok) setTimeout(() => repaintIfRoute('/settings', () => pageSettings('llm')), 400); }));
  document.querySelectorAll('[data-pdel]').forEach((b) => (b.onclick = async () => { await api('/api/providers/' + b.dataset.pdel, { method: 'DELETE' }); pageSettings('llm'); }));
}
// Item 3 da rodada 6: uma única tela de provedores — os 7 do catálogo gratuito, a pilha por tipo, o estado com
// motivo/horário, as variáveis de ambiente esperadas e o botão Testar de cada um. A tela nunca recebe chave:
// o servidor manda apenas hasKey/hasAccount e os nomes das variáveis.
function providersPanel(P) {
  const badge = (p) => `<span class="pill" data-state="${esc(p.state)}" title="${esc(p.reason || p.stateLabel)}">${esc(P.icons?.[p.state] || '')} ${esc(p.stateLabel)}</span>`;
  const when = (iso) => { const ms = Date.parse(iso) - Date.now(); if (!Number.isFinite(ms)) return '—'; const min = Math.max(1, Math.round(ms / 60000)); return `${min} min (até ${new Date(iso).toLocaleTimeString()})`; };
  const envList = (p) => [p.envNames.key, p.envNames.account, p.envNames.optionalKey, p.envNames.base, p.envNames.model].filter(Boolean).map((e) => `<code>${esc(e)}</code>`).join(' ');
  const rows = P.providers.map((p) => {
    const tasks = p.tasks.map((x) => `${esc(x.label)}: <code>${esc(x.model)}</code>`).join('<br>') || '<span class="muted">fora da pilha</span>';
    const testBtn = p.tasks.length ? `<button data-ptest="${esc(p.id)}" data-ptask="${esc((p.testable[0] || p.tasks[0]).task)}">Testar</button>` : '';
    const videoBtn = p.tasks.some((x) => x.task === 'video_generation') ? `<button data-ptest="${esc(p.id)}" data-ptask="video_generation" data-pvideo="1" title="gasta 1 das ${esc(String(P.daily?.videoLimit))} gerações do dia">Testar vídeo</button>` : '';
    const usage = p.dailyLimit ? ` · <b>${p.usedToday}/${p.dailyLimit}</b> hoje` : p.usedToday ? ` · ${p.usedToday} chamada(s) hoje` : '';
    return `<tr data-prov="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.locality)}</span></td>
      <td>${badge(p)}${p.unavailable ? `<br><span class="muted">volta em ${esc(when(p.unavailable.until))}</span>` : ''}${p.reason && p.state !== 'ready' ? `<br><span class="muted">${esc(p.reason)}</span>` : ''}${usage}</td>
      <td>${p.hasKey ? 'chave <b>presente</b> (ambiente ou .env)' : p.keyRequired ? '<span class="muted">chave <b>ausente</b></span>' : 'sem chave obrigatória'}${p.accountEnv ? `<br><span class="muted">${p.hasAccount ? 'conta presente' : 'conta ausente'}: <code>${esc(p.accountEnv)}</code></span>` : ''}<br><span class="muted">${envList(p)}</span></td>
      <td>${tasks}</td><td><div class="prov-test">${testBtn} ${videoBtn}</div><div class="muted" data-pout="${esc(p.id)}"></div></td></tr>`;
  }).join('');
  const stacks = Object.entries(P.stacks).map(([k, s]) => `<li><b>${esc(s.label)}</b>: ${s.ok ? s.order.map((x) => `<code>${esc(x)}</code>`).join(' → ') : `<span class="muted">${esc(s.reason || 'não configurada')}</span>`}</li>`).join('');
  return `<section class="card" id="prov-panel" style="margin:14px 0"><h3>Provedores</h3>
    <p class="muted">${esc(P.note)}</p>
    <p class="muted">Vídeo hoje: <b>${esc(String(P.daily?.videoUsedToday ?? 0))}/${esc(String(P.daily?.videoLimit ?? 0))}</b> gerações gratuitas usadas.</p>
    <table class="prov-table"><thead><tr><th>Provedor</th><th>Estado</th><th>Credencial (só nomes)</th><th>Papel na pilha</th><th>Teste</th></tr></thead><tbody>${rows}</tbody></table>
    <h4>Pilha por tipo de tarefa</h4><ul class="prov-stacks">${stacks}</ul>
    <p class="muted" id="envFileNote" style="font-size:12px">Credenciais aparecem só como presente/ausente: nenhum valor é lido pela tela. Origem: verificando…</p></section>`;
}
function bindProvidersPanel() {
  document.querySelectorAll('[data-ptest]').forEach((b) => (b.onclick = async () => {
    const id = b.dataset.ptest; const task = b.dataset.ptask; const out = document.querySelector(`[data-pout="${id}"]`);
    let confirm = false;
    if (b.dataset.pvideo) { if (!window.confirm(`Testar vídeo consome 1 das ${5} gerações gratuitas do dia. Continuar?`)) return; confirm = true; }
    if (out) out.textContent = ' testando…'; b.disabled = true;
    const r = await post('/api/free-router/test', { providerId: id, task, confirm });
    b.disabled = false;
    if (out) out.textContent = r.ok ? ` ✅ ${r.body.label} em ${(r.body.ms / 1000).toFixed(1)} s${r.body.sample ? ': ' + r.body.sample : ''}` : ` ⛔ ${r.body.error || 'falhou'}`;
    if (r.ok) setTimeout(() => repaintIfRoute('/settings', () => pageSettings('llm')), 1200);
  }));
}
// ---- autenticação na tela de configurações (estado real dos adaptadores; nada de chave na tela)
function authSettingsHtml(A) {
  const ss = A.sessions || [];
  return `<h3>Login</h3><p class="muted">${esc(A.note)}</p>
  <div class="card"><p><b>Adaptador</b> <select id="authAdapter">${A.adapters.map((a) => `<option value="${a.id}" ${a.id === A.adapter ? 'selected' : ''}>${esc(a.label)} — ${a.enabled ? 'ligado' : 'desligado'}${a.id === 'supabase' ? ', fala GoTrue' : ''}</option>`).join('')}</select>
  <button id="authSave">Aplicar</button> <span class="muted">Supabase lê SUPABASE_URL/SUPABASE_ANON_KEY do ambiente (nunca de arquivo ou tela); as chamadas vão para o GoTrue do projeto e o token fica em cookie HttpOnly, fora de log e de resposta de API.</span></p>
  <p><label><input type="checkbox" id="authRequired" ${A.required ? 'checked' : ''} ${A.adapter === 'local' ? '' : 'disabled'}> Exigir login nas rotas da API</label></p>
  <p><b>Senha local</b> <span class="muted">${A.hasPassword ? 'definida (scrypt)' : 'nenhuma — entrar em branco'}</span> <input id="authPass" type="password" placeholder="nova senha (mín. 6)" style="width:12em"> <button id="authPassSet">Definir</button> <button id="authPassDel" ${A.hasPassword ? '' : 'disabled'}>Remover</button></p></div>
  <h3>Sessões</h3><div class="card">${A.session ? `<p>Sessão atual: ${esc(A.session.adapter)} · desde ${new Date(A.session.createdAt).toLocaleString('pt-BR')} · expira ${new Date(A.session.expiresAt).toLocaleString('pt-BR')}</p>` : '<p class="muted">Nenhuma sessão ativa.</p>'}
  ${ss.length ? `<table><tr><th>Adaptador</th><th>Criada</th><th>Expira</th><th></th></tr>${ss.map((s) => `<tr><td>${esc(s.adapter)}${s.current ? ' (atual)' : ''}</td><td>${new Date(s.createdAt).toLocaleString('pt-BR')}</td><td>${new Date(s.expiresAt).toLocaleString('pt-BR')}</td><td><button data-revoke="${esc(s.id)}">Revogar</button></td></tr>`).join('')}</table>` : ''}
  <div class="row" style="margin-top:6px"><button id="authSignOut">Sair</button><button id="authLoginPage">Abrir tela de login</button></div></div>
  <h3>Contas vinculadas</h3><p>${A.adapter === 'supabase' ? 'Google/TikTok entram pelo GoTrue quando o provedor está ligado no projeto (PKCE, retorno em 127.0.0.1). Vincular/desvincular conta ainda não existe no app.' : 'Login com Google/TikTok/Facebook: não aplicável (instalação local de usuário único).'}</p><div class="blocked">Vincular/Desvincular depende dos provedores de identidade do Pippit.</div>
  <div class="card">${A.oauth.map((o) => `<p><b>${esc(o.label)}</b> — ${esc(o.status)} · escopos ${o.scopes.map((s) => `<code>${esc(s)}</code>`).join(' ')}</p>`).join('')}
  <p class="muted">Contrato do adaptador Supabase: ${Object.entries(A.contract || {}).map(([k, v]) => `${esc(k)} <code>${esc(v)}</code>`).join(' · ') || 'não descrito'}.</p></div>`;
}
async function pageSettings(tab) {
  const WM_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
  const WM_LABELS = { 'top-left': 'superior esquerdo', 'top-right': 'superior direito', 'bottom-left': 'inferior esquerdo', 'bottom-right': 'inferior direito', center: 'centro' };
  const tabs = { personal_information: 'Informações da conta', account_authorization: 'Autorização de conta', points_prompt_settings: 'Estratégia de confirmação de uso de créditos', sign_management: 'Login e gerenciamento', watermark: "Marca d'água", language: 'Language', llm: 'Assistente de IA (LLM)' }; const soc = (await api('/api/social')).body; const cc = ST.settings.creditConfirm;
  let body = '';
  if (tab === 'personal_information') body = `<table><tr><td>Nome</td><td>${esc(ST.user.name)}</td></tr><tr><td>ID do usuário</td><td>${ST.user.id} <button onclick="navigator.clipboard.writeText('${ST.user.id}')">Copiar</button></td></tr></table><h3>Plano</h3><p>${esc(ST.plan.name)} (${ST.user.billing === 'annual' ? 'anual' : 'mensal'}) <button id="pl">Planos e preços</button></p><h3>Gerenciar conta</h3><button class="danger" disabled>Excluir conta</button> <span class="muted">Não aplicável localmente.</span>`;
  if (tab === 'account_authorization') body = `<h3>Contas de redes sociais (${Object.keys(soc.accounts).length}/${soc.limit})</h3>${soc.platforms.map((p) => `<div class="row card" style="margin:6px 0"><b style="flex:1">${esc(p)} (0 conta vinculada)</b><button data-p="${esc(p)}">Detalhes</button></div>`).join('')}<div class="blocked">${esc(soc.note)}</div>`;
  if (tab === 'points_prompt_settings') body = `<h2>Confirmação de uso de créditos</h2><p>Escolha quando deseja que seja solicitada a confirmação de uso de créditos, apenas para o Agente criativo.</p><label class="card" style="display:block;margin:6px 0"><input type="radio" name="cm" value="threshold" ${cc.mode === 'threshold' ? 'checked' : ''}> Perguntar quando o uso de créditos exceder um limite definido (Recomendado)<br>Limite de uso de créditos <input id="lim" type="number" value="${cc.limit}" style="width:100px"> Créditos</label><label class="card" style="display:block"><input type="radio" name="cm" value="ignore" ${cc.mode === 'ignore' ? 'checked' : ''}> Sempre ignorar confirmação</label><p class="muted">Estas configurações se aplicam apenas à sua conta atual e podem ser alteradas a qualquer momento.</p><button class="primary" id="sv">Salvar</button><h3>Provedor de geração (reconstrução local)</h3><select id="prov"><option value="none" ${ST.provider === 'none' ? 'selected' : ''}>Nenhum (geração por IA indisponível)</option><option value="local-ffmpeg" ${ST.provider === 'local-ffmpeg' ? 'selected' : ''}>Local ffmpeg (NÃO é IA: cor/zoom de imagem + montagem real)</option></select>`;
  if (tab === 'llm') { const L = (await api('/api/llm/status')).body; const PR = (await api('/api/providers')).body; const provHtml = provSection(PR); const freeRouterHtml = await freeRouterSection(); const panel = (await api('/api/free-router/panel')).body; body = `<h3>Assistente de IA (LLM)</h3><p class="muted">${esc(L.note)}</p>${panel?.ok ? providersPanel(panel) : ''}<div class="card" id="llmst">${L.reachable ? `Ativo: <b>${esc(L.label)}</b> (${L.source === 'router' ? 'pilha de texto do roteador gratuito' : L.source === 'auto' ? 'detectado automaticamente' : 'configurado à mão'})` : `Indisponível${L.error ? ': ' + esc(L.error) : ''} — o agente usa regras locais.`}
    <p class="muted" style="margin:6px 0 0">Pilha de texto padrão (agente, refinar prompt, Skills com IA, Criação Inteligente): ${(L.router?.planned || []).length ? esc((L.router.planned || []).join(' → ')) : esc(L.router?.reason || 'não configurada — aplique a pilha gratuita abaixo')}. Timeout mínimo por provedor: ${Math.round((L.router?.timeoutMs || 60000) / 1000)} s. Ollama local: ${L.ollama?.used ? 'em uso' : 'opcional, fora de uso'}.</p></div>
    <p><label><input type="checkbox" id="llen" ${L.enabled ? 'checked' : ''}> Usar LLM</label></p><p><b>URL base (compatível com OpenAI)</b><br><input id="llurl" style="width:100%" value="${esc(L.baseUrl)}"></p><p><b>Modelo</b><br><input id="llmod" list="llmods" style="width:100%" value="${esc(L.model || '')}" placeholder="vazio = detectar"><datalist id="llmods">${L.models.map((m) => `<option value="${esc(m)}">`).join('')}</datalist></p><p><b>Modelo Whisper (ggml) para legendas automáticas</b> <span class="muted">${L.whisperFilter ? 'filtro whisper do ffmpeg disponível' : 'este ffmpeg não tem o filtro whisper'}</span><br><input id="llwh" style="width:100%" value="${esc(L.whisperModel || '')}" placeholder="C:\\caminho\\ggml-base.bin (baixe você mesmo; nada é baixado automaticamente)"></p><p><b>Chave de API (opcional)</b><br><input id="llkey" type="password" style="width:100%" placeholder="${L.hasKey ? 'configurada em memória/ambiente' : 'não necessária para Ollama local'}"></p>
    ${freeRouterHtml}${provHtml}<div class="row"><button class="primary" id="llsave">Salvar</button><button id="lltest">Testar</button><span id="llres" class="muted"></span></div>`; }
  if (tab === 'language') body = `<h2>Language</h2><label for="lang">Language</label><p><select id="lang">${LANGS.map((l) => `<option value="${l.code}" ${ST.settings.language === l.code ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></p><p class="muted">${LANGS.length} languages listed from the observed settings catalog. Translations of the rest of this local interface remain UNOBSERVED.</p>`;
  if (tab === 'watermark') { const W = (await api('/api/watermark')).body; const c = W.config; const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
    body = `<h3>Marca d'água</h3><p class="muted">Um único módulo (<code>app/lib/watermark.mjs</code>) decide e aplica a marca na exportação por ffmpeg. Fica <b>desligada por padrão</b>; a imagem é substituível e o nome da marca vem desta tela — nada de nome fixo no código.</p>
    <div class="card"><p><label><input type="checkbox" id="wmen" ${c.enabled ? 'checked' : ''}> Aplicar marca d'água nas exportações</label></p>
    <p><b>Tipo</b> <select id="wmkind">${opt('image', 'Imagem (arquivo)', c.kind)}${opt('text', 'Texto', c.kind)}</select> · <b>Posição</b> <select id="wmpos">${WM_POSITIONS.map((p2) => opt(p2, WM_LABELS[p2], c.position)).join('')}</select></p>
    <p><b>Nome da marca</b> <input id="wmname" maxlength="40" value="${esc(W.brandName)}" placeholder="usado no texto e nas telas"> <span class="muted">${W.brandConfigured ? '' : 'não configurado'}</span></p>
    <p><b>Texto</b> <input id="wmtext" maxlength="120" value="${esc(c.text)}" placeholder="vazio = usa o nome da marca"></p>
    <p><b>Escala</b> <input id="wmscale" type="number" step="0.01" min="0.01" max="1" value="${c.scale}" style="width:6em"> <span class="muted">fração da largura</span> · <b>Opacidade</b> <input id="wmop" type="number" step="0.05" min="0" max="1" value="${c.opacity}" style="width:6em"> · <b>Margem</b> <input id="wmmg" type="number" step="0.01" min="0" max="0.49" value="${c.margin}" style="width:6em"></p>
    <div class="row"><button class="primary" id="wmsave">Salvar</button><span id="wmres" class="muted"></span></div></div>
    <div class="card"><b>Imagem da marca</b> <code>${esc(W.image.path)}</code> — ${W.image.exists ? `${W.image.bytes} bytes no disco` : 'arquivo ausente'}<div id="wmpv">${W.image.exists ? `<img src="${W.image.url}?t=${Date.now()}" alt="Prévia da marca d'água" style="max-width:220px;display:block;margin:8px 0;background:#555">` : ''}</div>
    <div class="row"><input type="file" id="wmfile" accept="image/png,image/jpeg"><button id="wmupl">Substituir imagem</button><button id="wmrm">Remover</button></div><p class="muted">PNG ou JPEG até 8 MB; salvo no próprio disco (sem enviar para terceiros).</p></div>
    <div class="card"><b>Plano atual:</b> ${esc(W.plan.name || W.plan.id)} — ${W.saveWithoutWatermark.allowed ? 'permite salvar sem marca d\'água' : 'exporta sempre com marca d\'água'}.<br>
    <label><input type="checkbox" id="wmnoauto" ${W.saveWithoutWatermark.preference ? 'checked' : ''} ${W.saveWithoutWatermark.allowed ? '' : 'disabled'}> Salvar sem marca d'água</label>
    <p class="muted">${esc(W.note)}</p></div>`;
  }
  if (tab === 'sign_management') { const A = (await api('/api/auth/state')).body; body = authSettingsHtml(A) + `<h3>Idioma</h3><select id="lang">${LANGS.map((l) => `<option value="${l.code}" ${ST.settings.language === l.code ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select> <span class="muted">A escolha é salva; tradução integral da interface permanece UNOBSERVED.</span><h3>Aparência</h3><label><input type="radio" name="theme" value="light" ${ST.settings.theme !== 'dark' ? 'checked' : ''}> Modo claro</label> <label><input type="radio" name="theme" value="dark" ${ST.settings.theme === 'dark' ? 'checked' : ''}> Modo escuro</label><h3>Salvar sem marca d’água</h3><label><input id="saveNoWatermark" type="checkbox" ${ST.settings.saveWithoutWatermark ? 'checked' : ''}> Preferência local</label><p class="muted">A preferência é salva somente nesta instalação. Remoção/efeito sobre o arquivo exportado permanece UNOBSERVED; exportações locais não são alteradas por esta opção.</p>`; }
  $('#main').innerHTML = `${credits()}<div class="page"><h1>Configurações</h1><div class="tabs">${Object.entries(tabs).map(([k, v]) => `<button class="${k === tab ? 'on' : ''}" data-k="${k}">${v}</button>`).join('')}</div>${body}</div>`; bindCredits();
  document.querySelectorAll('.tabs [data-k]').forEach((b) => (b.onclick = () => (location.hash = '/settings/' + b.dataset.k))); const pl = $('#pl'); if (pl) pl.onclick = plansModal;
  document.querySelectorAll('[data-p]').forEach((b) => (b.onclick = async () => { const r = await post('/api/social/connect', { platform: b.dataset.p }); modal(`<h2>${esc(b.dataset.p)}</h2><div class="blocked">${esc(r.body.error)}</div>`, 'sm'); }));
  const llsave = $('#llsave'); if (llsave) { bindProvSection(); bindFreeRouter(); bindProvidersPanel();
    llsave.onclick = async () => { const b = { enabled: $('#llen').checked, baseUrl: $('#llurl').value, model: $('#llmod').value, whisperModel: $('#llwh').value }; if ($('#llkey').value) b.apiKey = $('#llkey').value; const r = await post('/api/llm/config', b); toast(r.ok ? 'Salvo.' : r.body.error); if (r.ok) pageSettings('llm'); };
    $('#lltest').onclick = async () => { $('#llres').textContent = 'Testando…'; const r = await post('/api/llm/test'); $('#llres').textContent = r.ok ? `OK em ${(r.body.ms / 1000).toFixed(1)} s: "${r.body.text}"` : r.body.error; };
  }
  // item 2 da rodada 8: dizer de onde vêm as credenciais (ambiente ou .env local) sem nunca mostrar o valor.
  const envNote = $('#envFileNote'); if (envNote) api('/api/env-file').then(({ body: E }) => {
    envNote.innerHTML = E.found
      ? `Credenciais: só <b>presente/ausente</b>. Origem: <code>.env</code> local encontrado — ${E.loadedCount} variável(is) lida(s) do arquivo${E.keptCount ? `, ${E.keptCount} mantida(s) do ambiente` : ''}. O arquivo é ignorado pelo git e nenhum valor aparece aqui.`
      : 'Credenciais: só <b>presente/ausente</b>. Origem: nenhum <code>.env</code> local — as variáveis vêm apenas do ambiente do processo (nada de arquivo, log ou tela).';
  }).catch(() => { envNote.textContent = 'Credenciais: só presente/ausente (origem local indisponível).'; });
  const lang = $('#lang'); if (lang) lang.onchange = async () => { await post('/api/preferences', { language: lang.value }); await refresh(); document.documentElement.lang = lang.value; toast('Idioma salvo.'); };
  document.querySelectorAll('input[name=theme]').forEach((i) => (i.onchange = async () => { await post('/api/preferences', { theme: i.value }); await refresh(); document.documentElement.dataset.theme = i.value; }));
  const aSave = $('#authSave'); if (aSave) {
    aSave.onclick = async () => { const r = await post('/api/auth/adapter', { adapter: $('#authAdapter').value }); toast(r.ok ? 'Adaptador aplicado.' : (r.body.error || 'falhou')); pageSettings('sign_management'); };
    const req = $('#authRequired'); req.onchange = async () => { const r = await post('/api/auth/require', { required: req.checked }); if (!r.ok) { req.checked = !req.checked; toast(r.body.error); } else { toast(req.checked ? 'Login agora é exigido.' : 'Login deixou de ser exigido.'); pageSettings('sign_management'); } };
    $('#authPassSet').onclick = async () => { const r = await post('/api/auth/password', { password: $('#authPass').value }); toast(r.ok ? 'Senha local definida.' : (r.body.error || 'falhou')); if (r.ok) pageSettings('sign_management'); };
    $('#authPassDel').onclick = async () => { const r = await api('/api/auth/password', { method: 'DELETE' }); toast(r.ok ? 'Senha removida.' : (r.body.error || 'falhou')); pageSettings('sign_management'); };
    $('#authSignOut').onclick = signOut; $('#authLoginPage').onclick = () => (location.hash = '/login');
    document.querySelectorAll('[data-revoke]').forEach((b) => (b.onclick = async () => { await api('/api/auth/sessions/' + b.dataset.revoke, { method: 'DELETE' }); toast('Sessão revogada.'); pageSettings('sign_management'); }));
  }
  const wmsave = $('#wmsave'); if (wmsave) {
    wmsave.onclick = async () => { const body2 = { brandName: $('#wmname').value, config: { enabled: $('#wmen').checked, kind: $('#wmkind').value, text: $('#wmtext').value, position: $('#wmpos').value, scale: Number($('#wmscale').value), opacity: Number($('#wmop').value), margin: Number($('#wmmg').value) } };
      const r = await post('/api/watermark', body2); if (!r.ok) { $('#wmres').textContent = '⛔ ' + (r.body.error || 'falhou'); return; } toast('Marca d\'água salva.'); pageSettings('watermark'); };
    $('#wmupl').onclick = async () => { const f = $('#wmfile').files[0]; if (!f) { toast('Escolha um arquivo PNG ou JPEG.'); return; } const buf = await f.arrayBuffer(); const r = await api('/api/watermark/image', { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream' }, body: buf });
      if (!r.ok) { toast(r.body.error || 'falhou'); return; } toast('Imagem da marca substituída.'); pageSettings('watermark'); };
    $('#wmrm').onclick = async () => { const r = await api('/api/watermark/image', { method: 'DELETE' }); toast(r.ok ? 'Imagem removida.' : (r.body.error || 'falhou')); if (r.ok) pageSettings('watermark'); };
    const nw = $('#wmnoauto'); if (nw) nw.onchange = async () => { const r = await post('/api/preferences', { saveWithoutWatermark: nw.checked }); if (!r.ok) { nw.checked = !nw.checked; toast(r.body.error); } else { toast('Preferência salva.'); pageSettings('watermark'); } };
  }
  const noWatermark = $('#saveNoWatermark'); if (noWatermark) noWatermark.onchange = async () => { const r = await post('/api/preferences', { saveWithoutWatermark: noWatermark.checked }); if (!r.ok) { noWatermark.checked = !noWatermark.checked; toast(r.body.error); } else toast('Preferência local salva; a exportação não foi alterada.'); };
  const sv = $('#sv'); if (sv) sv.onclick = async () => { await post('/api/settings', { creditConfirm: { mode: document.querySelector('input[name=cm]:checked').value, limit: Number($('#lim').value) }, provider: $('#prov').value }); await refresh(); toast('Salvo.'); pageSettings(tab); };
}
const LOCAL_RUN_LABEL = { queued: 'Na fila', running: 'Executando', succeeded: 'Concluída', blocked: 'Bloqueada', failed: 'Falhou', canceled: 'Cancelada' };
// Acompanha um vídeo na fila (NovAI): mostra estado/progresso no nó e atualiza o Canvas quando termina.
function followVideoRun(id) {
  const paintRun = (s) => { const e = document.getElementById('vprog'); if (!e) return; e.textContent = `Vídeo: ${s.state === 'running' ? 'em andamento' : s.state}${Number.isFinite(s.progress) ? ` · ${s.progress}%` : ''}${s.queuePosition ? ` · fila ${s.queuePosition}` : ''}${s.remoteStatus ? ` · ${s.remoteStatus}` : ''}${s.error ? ` · ${s.error}` : ''}`; };
  const tick = async () => {
    const s = (await api(`/api/local-runs/${encodeURIComponent(id)}`)).body || {};
    paintRun(s);
    if (['queued', 'running'].includes(s.state)) return setTimeout(tick, 2500);
    toast(s.state === 'succeeded' ? 'Vídeo salvo no nó.' : `Vídeo: ${s.error || s.state}`);
    // Só repinta o Canvas se ele ainda estiver na tela: o usuário pode ter navegado para outra página.
    await refresh(); if (CUR?.id && document.getElementById('vprog')) pageProject(CUR.id);
    return null;
  };
  setTimeout(tick, 800);
}
async function pageLocalRun(id) {
  if (window.__localRunSource) window.__localRunSource.close();
  // Rodada 10, item 3: a tarefa pode não estar legível no instante em que a rota abre (servidor
  // gravando, resposta 404/500 passageira). Antes, um corpo nulo estourava no paint() e a tela ficava
  // a anterior, sem aviso — no Windows isso aparecia como "#localRunPage não apareceu em 30 s".
  // Agora: até 4 tentativas com espera crescente e, se ainda falhar, o motivo escrito na tela.
  let run = null, motivo = '';
  for (let tentativa = 1; tentativa <= 4 && !run; tentativa++) {
    try {
      const r = await api(`/api/local-runs/${encodeURIComponent(id)}`);
      if (r.ok && r.body && r.body.id) run = r.body;
      else motivo = r.status === 404 ? 'a tarefa não está disponível no servidor (404)' : `o servidor respondeu ${r.status}`;
    } catch (e) { motivo = 'falha de rede: ' + String(e.message || e).slice(0, 120); }
    if (!run && tentativa < 4) await new Promise((ok) => setTimeout(ok, 300 * tentativa));
  }
  if (!run) {
    $('#main').innerHTML = `${credits()}<div class="page" id="localRunPage" data-erro="1"><div class="row"><a href="#/tasks">← Tarefas</a></div>
      <h1>Tarefa do roteador gratuito</h1><p class="muted">Não foi possível carregar a tarefa <code>${esc(id)}</code>: ${esc(motivo || 'motivo desconhecido')}.</p>
      <p><button class="pill primary" id="localRunRetry">Tentar de novo</button> · <a href="#/home">Voltar para o início</a></p></div>`;
    const b = $('#localRunRetry'); if (b) b.onclick = () => route_();
    return;
  }
  const paint = () => {
    const active = ['queued', 'running'].includes(run.state);
    $('#main').innerHTML = `${credits()}<div class="page" id="localRunPage"><div class="row"><a href="#/tasks">← Tarefas</a><span class="sp"></span><a href="#/project/${esc(run.projectId)}">Abrir Canvas / Histórico</a></div><h1>Tarefa do roteador gratuito</h1><p><b>Estado:</b> <span id="runState">${esc(LOCAL_RUN_LABEL[run.state] || run.state)}</span>${run.route ? ` · ${esc(run.route.providerName)} / ${esc(run.route.modelId)}` : ''}${active ? ` · <span id="runProgress">${esc(run.phase === 'polling' ? 'consultando o provedor' : (run.phase || 'em andamento'))}${Number.isFinite(run.progress) ? ` · ${run.progress}%` : ''}${run.queuePosition ? ` · fila ${run.queuePosition}` : ''}${run.remoteStatus ? ` · ${esc(run.remoteStatus)}` : ''}</span>` : ''}</p><div class="card" id="runPrompt"><b>Solicitação</b><p>${esc(run.prompt)}</p></div>${run.asset ? `<div class="card" style="margin-top:10px"><b>${run.asset.kind === 'video' ? 'Vídeo gerado' : 'Imagem gerada'}</b><p>${run.asset.kind === 'video' ? `<video id="runAsset" controls src="/files/${esc(run.asset.stored)}" style="max-width:100%;border-radius:10px"></video>` : `<img id="runAsset" src="/files/${esc(run.asset.stored)}" alt="${esc(run.asset.name)}" style="max-width:100%;border-radius:10px">`}</p><a href="/files/${esc(run.asset.stored)}" download="${esc(run.asset.name)}"><button>Baixar</button></a></div>` : ''}${!run.asset && run.result ? `<div class="card" style="margin-top:10px"><b>Resposta</b><p>${esc(run.result)}</p></div>` : ''}${run.error ? `<div class="blocked" id="runError">${esc(run.error)}</div>` : ''}<div class="row" style="margin-top:12px">${active ? '<button id="cancelLocalRun">Cancelar tarefa</button>' : ''}${run.resultNodeId ? `<a href="#/project/${esc(run.projectId)}"><button class="primary">Ver no Canvas e Histórico</button></a>` : ''}</div><p class="muted">Execução local do Roteador gratuito; custos/quota do fornecedor não são verificados. Nenhum fallback pago.</p></div>`;
    bindCredits(); if ($('#cancelLocalRun')) $('#cancelLocalRun').onclick = async () => { const r = await post(`/api/local-runs/${encodeURIComponent(id)}/cancel`, {}); if (r.ok) { run = r.body.run; paint(); window.__localRunSource?.close(); } else toast(r.body?.error || 'Não foi possível cancelar.'); };
  };
  paint();
  if (['queued', 'running'].includes(run.state) && window.EventSource) {
    const source = new EventSource(`/api/local-runs/${encodeURIComponent(id)}/events`); window.__localRunSource = source;
    source.addEventListener('state', (e) => { try { run = JSON.parse(e.data); paint(); if (!['queued', 'running'].includes(run.state)) source.close(); } catch {} });
  }
}
const RUN_LABEL = { 1: 'Gerando…', 3: 'Concluída', 4: 'Falhou', 5: 'Cancelada' };
async function pageTasks() { const as = (await api('/api/assets?cat=works&kind=video')).body; const runs = (await api('/api/direct/runs')).body || []; const localRuns = (await api('/api/local-runs')).body || [];
  const jobs = (await api('/api/jobs')).body || []; const JL = { blocked: 'Bloqueada', queued: 'Na fila', running: 'Gerando', succeeded: 'Concluída', failed: 'Falhou', canceled: 'Cancelada' };
  const jobsHtml = jobs.length ? `<h2 style="font-weight:500">Tarefas de geração (provedor)</h2>${jobs.map((j) => `<div class="row card job-task" style="margin:6px 0" data-job="${j.id}"><b style="flex:1">${esc(j.title)} <small class="muted">${JL[j.state] || j.state}${j.state === 'running' ? ' · ' + j.progress + '%' : ''} · ${esc(j.prompt.slice(0, 70))}${j.error ? ' · ' + esc(j.error) : ''}</small></b>${['queued', 'running', 'blocked'].includes(j.state) ? `<button data-jc="${j.id}">Cancelar</button>` : ''}${['failed', 'canceled'].includes(j.state) ? `<button data-jr="${j.id}">Tentar de novo</button>` : ''}</div>`).join('')}` : '';
  const localRunsHtml = localRuns.length ? `<h2 style="font-weight:500">Tarefas do roteador gratuito</h2>${localRuns.map((r) => `<div class="row card" style="margin:6px 0"><b style="flex:1">${esc(r.prompt.slice(0, 65))} <small class="muted">${esc(LOCAL_RUN_LABEL[r.state] || r.state)}${r.route ? ` · ${esc(r.route.providerName)}` : ''}${r.error ? ` · ${esc(r.error)}` : ''}</small></b><a href="#/tasks/run/${esc(r.id)}"><button>Abrir</button></a>${r.resultNodeId ? `<a href="#/project/${esc(r.projectId)}"><button>Canvas / Histórico</button></a>` : ''}</div>`).join('')}` : '';
  const runsHtml = runs.length ? `<h2 style="font-weight:500">Gerações diretas</h2>${runs.map((r) => `<div class="row card run-task" style="margin:6px 0" data-run="${r.run_id}"><b style="flex:1">${esc(r.title || r.prompt.slice(0, 40))} <small class="muted">${esc(r.model)} · ${r.duration_sec}s · ${RUN_LABEL[r.state] || r.state}${r.detail ? ' · ' + esc(r.detail) : ''}</small></b><a href="#/direct/${r.project_id}/${r.canvas_id}/${r.run_id}"><button>Abrir</button></a></div>`).join('')}` : '';
  $('#main').innerHTML = `${credits()}<div class="page"><h1>Tarefas concluídas</h1>${localRunsHtml}${jobsHtml}${runsHtml}${as.slice(0, 10).map((a) => `<div class="row card" style="margin:6px 0"><b style="flex:1">${esc(a.name)} <small class="muted">${new Date(a.createdAt).toLocaleString('pt-BR')} · Exportado</small></b><button data-pub="${a.id}" title="Publicar" aria-label="Publicar">↗</button><a href="/files/${a.stored}" download="${esc(a.name)}"><button>Baixar</button></a></div>`).join('') || '<p class="muted">Nenhuma tarefa concluída.</p>'}<p class="muted">Apenas os 10 downloads mais recentes são mostrados aqui.</p></div>`; bindCredits(); document.querySelectorAll('[data-jc]').forEach((b) => (b.onclick = async () => { await post(`/api/jobs/${b.dataset.jc}/cancel`); pageTasks(); })); document.querySelectorAll('[data-jr]').forEach((b) => (b.onclick = async () => { await post(`/api/jobs/${b.dataset.jr}/retry`); pageTasks(); })); document.querySelectorAll('[data-pub]').forEach((b) => (b.onclick = () => {
  const a = as.find((x) => x.id === b.dataset.pub); const d = new Date();
  const m = modal(`<h2>Programar publicação</h2><div class="row"><b>Publicação</b><span style="flex:1"></span><button id="selc">Selecionar conta ▾</button></div><div class="grid" style="grid-template-columns:260px 1fr"><video src="/files/${a.stored}" controls style="width:250px;background:#000;border-radius:10px"></video><div><p><b>Quando publicar</b><br><small class="muted">Fuso horário do sistema</small><br><input type="date" id="pd" value="${d.toISOString().slice(0, 10)}"> <input type="time" id="pt" value="${d.toTimeString().slice(0, 5)}"></p><p><b>Adicionar descrição</b><br><textarea id="pdsc" maxlength="2200" style="width:100%" rows="4" placeholder="Descreva a sua publicação para que ela se destaque"></textarea><small id="pc" class="muted">0/2200</small></p></div></div><div id="chs"></div><div class="row"><button disabled>Salvar como projeto</button><span style="flex:1"></span><a href="/files/${a.stored}" download="${esc(a.name)}"><button>Baixar</button></a><button class="primary" id="prog" disabled>Programar</button></div>`);
  $('#pdsc', m).oninput = (e) => ($('#pc', m).textContent = e.target.value.length + '/2200');
  $('#selc', m).onclick = () => { $('#chs', m).innerHTML = '<div class="card"><div>Adicione um canal</div><div class="row"><button data-c="TikTok">TikTok</button><button data-c="Facebook Page">Facebook Page</button><button data-c="Instagram Reels">Instagram Reels</button></div><div class="blocked">Nenhuma conta vinculada: vincular exige OAuth real (bloqueado). “Programar” permanece desabilitado; nenhuma publicação é simulada.</div></div>'; $('#chs', m).querySelectorAll('[data-c]').forEach((x) => (x.onclick = async () => toast((await post('/api/social/connect', { platform: x.dataset.c })).body.error, 6000))); };
})); }
const PUB_ILLUSTRATION = `<div class="pub-art" aria-hidden="true"><div class="pub-cal"><b>Publishing</b><div class="pub-month">‹ 05/2024 ›</div><div class="pub-grid">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui'].map((d) => `<span class="pub-h">${d}</span>`).join('')}${Array.from({ length: 15 }, (_, k) => `<span class="pub-c">${k + 27 > 31 ? k - 4 : k + 27}</span>`).join('')}</div></div><div class="pub-plat"><small>Plataforma</small><div>TikTok</div><div>Instagram</div><div>Facebook</div></div></div>`;
function pageSocial(kind) {
  const an = kind === 'analytics';
  const head = an ? 'Um painel único para as suas publicações nas plataformas de mídia social.' : 'Gerencie suas publicações nas plataformas sociais em um só lugar.';
  const pts = an ? [['Por conta', 'Acompanhe as principais métricas de engajamento de cada conta social.'], ['Por publicação', 'Detalhe os dados por stories, publicações e reels individuais.'], ['Agregue e compare', 'Agregue dados e compare o desempenho das publicações com facilidade.']] : [['Publique mais, cresça mais', 'Tudo o que você precisa para criar, editar e publicar publicações para construir a sua marca nas mídias sociais.'], ['Simplifique o seu fluxo de trabalho', 'Gerencie todo o seu conteúdo de mídia social em um só lugar.'], ['Economize tempo', 'Programe para publicar conteúdo automaticamente sempre que desejar.']];
  $('#main').innerHTML = `${credits()}<div class="page pub-page"><div class="pub-left"><h1>${head}</h1>${pts.map(([t, d]) => `<div class="pub-pt"><b>${t}</b><div class="muted">${d}</div></div>`).join('')}<button id="vc" class="primary-lg">Vincular conta ⌄</button><div class="blocked">Vincular conta exige OAuth real da rede social (aplicativo registrado e aprovado). Bloqueado nesta instalação local; nenhuma publicação é simulada.</div></div><div class="pub-right">${an ? '<div class="pub-art muted">Ilustração do Pippit não capturada</div>' : PUB_ILLUSTRATION}</div></div>`; bindCredits(); $('#vc').onclick = (e) => { const r = e.target.getBoundingClientRect(); menuAt(r.left, r.bottom + 4, ['TikTok', 'Facebook Page', 'Instagram Reels'].map((l) => ({ label: l, fn: async () => toast((await post('/api/social/connect', { platform: l })).body.error, 6000) }))); }; if (kind === 'schedule') pageDrafts(); }
async function pageDrafts() {
  const [dr, st, as, qp, adp] = await Promise.all([api('/api/social/drafts'), api('/api/social/structure'), api('/api/assets'), api('/api/social/queue'), api('/api/social/adapters')]);
  const vids = (as.body?.assets || as.body || []).filter((a) => a.kind === 'video'); const drafts = dr.body?.drafts || []; const cod = st.body?.platformCodes || {};
  const Q = qp.body || { tasks: [], counts: {}, labels: {} }; const AD = (adp.body?.adapters || []);
  const pubs = Object.entries(cod).filter(([, v]) => v.publisher);
  const box = document.createElement('details'); box.className = 'page'; box.id = 'pubdrafts'; box.open = !!window.__pdOpen; box.addEventListener('toggle', () => (window.__pdOpen = box.open));
  box.innerHTML = `<summary>Rascunhos locais (extensão do PiperLine: não existe no Pippit)</summary><div class="blocked">Rascunho local: salvo só neste computador. Nada é enviado nem agendado em nenhuma rede social (contas não vinculadas; publicação real exigirá APIs oficiais e a sua autorização).</div>
  <div class="card" style="margin:10px 0"><div class="row"><select id="pdasset">${vids.length ? vids.map((a) => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('') : '<option value="">Nenhum vídeo nos ativos</option>'}</select><input id="pdwhen" type="datetime-local"></div>
  <textarea id="pdcap" rows="3" maxlength="2200" placeholder="Descrição" style="width:100%;margin-top:8px"></textarea><div class="muted" id="pdcount">0/2200</div>
  <div class="row" style="margin-top:6px">${pubs.map(([c, v]) => `<label><input type="checkbox" class="pdplat" value="${esc(c)}"> ${esc(v.name)}${v.mapa === 'inferido' ? ' (inferido)' : ''}</label>`).join('')}</div>
  <button id="pdsave" style="margin-top:8px">Salvar rascunho local</button></div>
  <div id="pdlist">${drafts.length ? drafts.map((d) => `<div class="card" data-d="${esc(d.id)}"><b>${esc(d.status)}</b> · ${esc((d.platforms || []).map((c) => cod[c]?.name || c).join(', '))}${d.scheduledAt ? ' · ' + esc(new Date(d.scheduledAt).toLocaleString()) : ''}<div class="muted">${esc(d.caption || '(sem descrição)')}</div><div class="row"><button data-enq="${esc(d.id)}">Enfileirar (estrutura)</button><button data-del="${esc(d.id)}">Excluir rascunho</button></div></div>`).join('') : '<div class="muted">Nenhum rascunho.</div>'}</div>
  <details style="margin-top:12px" id="pubqueue" ${window.__pqOpen ? 'open' : ''}><summary>Fila de publicação (estrutura) — ${Q.total || 0} tarefa(s), nenhuma enviada</summary>
  <div class="blocked">Estados: ${(Q.states || ['rascunho', 'agendado', 'publicando', 'publicado', 'falhou']).map((s) => `${esc(Q.labels?.[s] || s)} (${Q.counts?.[s] || 0})`).join(' · ')}. ${esc(Q.note || '')}</div>
  <div id="pqlist">${(Q.tasks || []).length ? Q.tasks.map((t2) => `<div class="card" data-q="${esc(t2.id)}"><b>${esc(Q.labels?.[t2.state] || t2.state)}</b> · ${esc((t2.platforms || []).map((c) => cod[c]?.name || c).join(', '))}${t2.scheduledAt ? ' · ' + esc(new Date(t2.scheduledAt).toLocaleString('pt-BR')) : ''}<div class="muted">${esc(t2.caption || '(sem descrição)')}</div>${t2.reason ? `<div class="muted">motivo: ${esc(t2.reason)}</div>` : ''}<div class="row"><button data-try="${esc(t2.id)}">Tentar publicar</button><button data-cancel="${esc(t2.id)}">Voltar a rascunho</button><button data-qdel="${esc(t2.id)}">Remover</button></div></div>`).join('') : '<div class="muted">Fila vazia.</div>'}</div>
  <h4>Adaptadores oficiais (nenhum conectado)</h4>
  <table><tr><th>Plataforma</th><th>Estado</th><th>Escopos</th><th>Falta</th></tr>${AD.map((a2) => `<tr><td>${esc(a2.label)}</td><td>${esc(a2.status)}</td><td>${a2.oauth.scopes.map((s) => `<code>${esc(s)}</code>`).join(' ')}</td><td class="muted">${esc(a2.missing.join('; '))}</td></tr>`).join('')}</table></details>
  <details style="margin-top:12px"><summary>Estrutura de contas e publicação preservada (para APIs oficiais)</summary><div class="muted">Códigos de plataforma observados: ${Object.keys(cod).join(', ')}. Mapa código→plataforma: ${pubs.map(([c, v]) => c + '=' + v.name).join('; ')} (inferido, não observado). Detalhes em PIPPIT_PUBLISHING_STRUCTURE.md.</div></details>`;
  $('#main').querySelector('.page').after(box);
  const pq = $('#pubqueue', box); if (pq) pq.addEventListener('toggle', () => (window.__pqOpen = pq.open));
  const cap = $('#pdcap', box); cap.oninput = () => ($('#pdcount', box).textContent = `${cap.value.length}/2200`);
  $('#pdsave', box).onclick = async () => { const platforms = [...box.querySelectorAll('.pdplat:checked')].map((x) => Number(x.value)); const when = $('#pdwhen', box).value; const r = await post('/api/social/drafts', { assetId: $('#pdasset', box).value, caption: cap.value, platforms, scheduledAt: when ? new Date(when).toISOString() : null }); if (!r.ok) return toast(r.body?.error || 'erro', 5000); toast('Rascunho local salvo (nada foi enviado).'); pageSocial('schedule'); };
  box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => { await api('/api/social/drafts/' + b.dataset.del, { method: 'DELETE' }); pageSocial('schedule'); }));
  box.querySelectorAll('[data-enq]').forEach((b) => (b.onclick = async () => { const r = await post('/api/social/queue', { draftId: b.dataset.enq }); if (!r.ok) return toast(r.body?.error || 'erro', 5000); toast(r.body.note, 5000); window.__pdOpen = true; pageSocial('schedule'); }));
  box.querySelectorAll('[data-try]').forEach((b) => (b.onclick = async () => { const r = await post(`/api/social/queue/${b.dataset.try}/attempt`); toast((r.body?.error || 'falhou') + ' (nada foi publicado)', 6000); window.__pdOpen = true; pageSocial('schedule'); }));
  box.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => { const r = await post(`/api/social/queue/${b.dataset.cancel}/cancel`); if (!r.ok) toast(r.body?.error || 'erro'); window.__pdOpen = true; pageSocial('schedule'); }));
  box.querySelectorAll('[data-qdel]').forEach((b) => (b.onclick = async () => { await api('/api/social/queue/' + b.dataset.qdel, { method: 'DELETE' }); window.__pdOpen = true; pageSocial('schedule'); }));
}
function pageGen() {
  const fillToolsNote = async () => { try { const t = (await api('/api/generator/tools')).body; const n = $('#genToolsNote'); if (n) n.innerHTML = `${t.tools.length} ferramentas com nome observado (${t.tools.map((x) => x.label).join(', ')}); lista de chips original: ${t.chiplist.observed ? 'observada' : 'UNOBSERVED'}. Presets citados: ${t.presets.map((x) => x.label).join('; ')} — prévia ${t.presets[0].preview}.`; } catch { const n = $('#genToolsNote'); if (n) n.textContent = 'Ferramentas populares: estado local indisponível.'; } };
 $('#main').innerHTML = `${credits()}<div class="page gen-page"><h1 class="gen-title">Transforme qualquer coisa em vídeos</h1><div class="composer gen-composer"><textarea id="gp" placeholder="Gere quadros-chave para a sua história e depois transforme-os em vídeo"></textarea><div class="crow"><button class="pill" id="gplus">＋</button><button class="pill" id="gat">@</button><button class="pill" id="gsk">Habilidades ▾</button><button class="pill" id="gm">Modelo ▾</button><button class="pill" id="grf" title="Extensão local (não existe no Pippit)">Refinar prompt (IA local)</button><span class="sp"></span><button class="primary" id="gs">↑</button></div></div><div class="gen-ex">${['Troca mágica de marca', 'Vitrine de salto elegante', 'Laboratório mágico de cores'].map((x) => `<button class="pill" data-ex="${x}">${x} ↗</button>`).join('')}</div><h3 class="center">Ferramentas populares</h3><p class="muted" id="genToolsNote">Ferramentas populares: verificando estado observado…</p><div class="grid g3 gen-tools"><a class="gen-tool" id="gav">Vídeo de avatar</a><a class="gen-tool" id="tp" href="#/ai-talking-photo">Foto falante de IA</a><a class="gen-tool" id="rb">Remover plano de fundo</a><a class="gen-tool" href="#/editor">Corte rápido</a><a class="gen-tool" href="#/editor">Editor de vídeos</a></div></div>`; bindCredits(); $('#gm').onclick = modelPrefs; $('#gsk').onclick = () => (location.hash = '/skills'); $('#gplus').onclick = () => pickAsset((x) => ($('#gp').value += ` [Mídia: ${x.name}]`)); $('#gat').onclick = () => toast('Menção de mídia (@): não reproduzida neste gerador.'); document.querySelectorAll('[data-ex]').forEach((c) => (c.onclick = () => { $('#gp').value = c.dataset.ex; }));
  $('#grf').onclick = async () => { const t = $('#gp').value.trim(); if (t.length < 3) return toast('Digite uma ideia geral primeiro.'); const b = $('#grf'); b.disabled = true; b.textContent = 'Refinando…'; const r = await post('/api/prompt/refine', { text: t }); b.disabled = false; b.textContent = 'Refinar prompt (IA local)'; if (r.ok) { $('#gp').value = r.body.prompt; toast('Prompt refinado por ' + r.body.label); } else toast(r.body.error); };
  $('#gs').onclick = async () => { HOME.text = $('#gp').value; HOME.canvas = true; location.hash = '/home'; fillToolsNote(); }; $('#gav').onclick = () => avatarDrawer(); $('#rb').onclick = () => toast('Remover plano de fundo: ferramenta de IA não disponível localmente.'); fillToolsNote(); }
async function pageShare(t) { const r = await api('/api/share/' + t); $('#main').innerHTML = `<div class="page"><h1>Projeto compartilhado (somente leitura)</h1>${r.ok ? `<pre>${esc(JSON.stringify(r.body.project.chats.map((c) => c.messages), null, 1)).slice(0, 4000)}</pre>` : '<p>Link inválido.</p>'}</div>`; }

// ---------- Avatar video (drawer) e Foto falante de IA (página): observados no Pippit atual em 22/10/2026 (captures/current_670/avatar_drawer*, ai_talking_photo_page). Export/geração bloqueados: sem provedor local.
const AVD_OPT_PT = { Female: 'Feminino', Male: 'Masculino', Young: 'Jovem', Mature: 'Adulto', Elderly: 'Idoso', Average: 'Médio', Large: 'Grande', Gaming: 'Jogos', Finance: 'Finanças', Education: 'Educação', 'Living room': 'Sala de estar', Bedroom: 'Quarto', Bathroom: 'Banheiro', Outdoors: 'Ao ar livre', Kitchen: 'Cozinha', 'Inside car': 'Dentro do carro', 'Esports room': 'Sala de eSports', 'Makeup table': 'Penteadeira', Cloakroom: 'Vestiário', 'No background': 'Sem fundo', Office: 'Escritório', 'Solid color background': 'Fundo de cor sólida', 'Sit upright': 'Sentado ereto', 'Stand facing forward': 'Em pé de frente', 'Take selfies while sitting': 'Selfie sentado', 'Sit sideways': 'Sentado de lado', 'Take selfies while talking': 'Selfie falando', 'Stand sideways': 'Em pé de lado', Sporty: 'Esportivo', Traditional: 'Tradicional' };
const AVD_FILTER_PT = { Gender: 'Gênero', Age: 'Idade', Figure: 'Figura', Name: 'Nome', Industry: 'Setor', Scene: 'Cena', Pose: 'Pose', 'Outfit style': 'Estilo de roupa' };
const AVD_LANG = { English: 'en', 'Simplified Chinese': 'zh-Hans', Bulgarian: 'bg', Croatian: 'hr', Czech: 'cs', Danish: 'da', Dutch: 'nl', Filipino: 'fil', Finnish: 'fi', French: 'fr', Japanese: 'ja', German: 'de', Greek: 'el', Hindi: 'hi', Indonesian: 'id', Italian: 'it', Malay: 'ms', Polish: 'pl', Portuguese: 'pt', Romanian: 'ro', Russian: 'ru', Slovak: 'sk', Spanish: 'es', Swedish: 'sv', Ukrainian: 'uk', Tamil: 'ta', Vietnamese: 'vi', Thai: 'th', Turkish: 'tr', 'Traditional Chinese': 'zh-Hant', Korean: 'ko' };
const avdLang = (n) => { try { return new Intl.DisplayNames(['pt-BR'], { type: 'language' }).of(AVD_LANG[n]) || n; } catch { return n; } };
const avdOpt = (o) => AVD_OPT_PT[o] || o;
const avdSecs = (t) => Math.max(1, Math.round((t.length / 20.9) * 100) / 100);
const avdCost = (t) => { const c = Math.max(1, Math.round(avdSecs(t) * 1.87)); return { c, was: Math.round((c * 23) / 11) }; };
const fmtSec = (s) => `00:${String(Math.min(59, Math.round(s))).padStart(2, '0')}`;
async function avatarDrawer() {
  const D = (await api('/api/avatar-drawer')).body; const loc = (await api('/api/avatars')).body; const fv = (await api('/api/avatar-favorites')).body; const CAT_ = D.catalogo || { avatares: [], filtros: [], semantica: {} };
  const FIRST = 'Victor in the kitchen'; const found = CAT_.avatares.find((a) => a.name === FIRST); const ALL = found ? [found, ...CAT_.avatares.filter((a) => a !== found)] : [{ name: FIRST, tags: [], destaque: true }, ...CAT_.avatares];
  const S = { tab: 'choose', sub: 'rec', sel: FIRST, filters: {}, script: D.roteiroPadrao, lang: 'English', captions: true, undo: [], redo: [], editing: false, open: null, shown: 50, favs: new Set(fv.favorites || []) };
  const bg = h('<div class="avd-mask" id="avdrawer"></div>'); document.body.appendChild(bg); const close = () => { document.removeEventListener('keydown', esc_); bg.remove(); }; const esc_ = (e) => { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', esc_);
  const snap = () => ({ sel: S.sel, script: S.script, lang: S.lang, captions: S.captions }); const apply = (x) => Object.assign(S, x); const push = () => { S.undo.push(snap()); S.redo = []; };
  const fdef = (k) => (CAT_.filtros || []).find((f) => f.campo === k) || { campo: k, opcoes: (D.filtros[k] || []).map((l) => ({ label: l, disponivel: false })) };
  const active = () => Object.entries(S.filters).filter(([, v]) => v && v.length);
  const matches = (a) => active().every(([k, sel]) => { const tags = fdef(k).opcoes.filter((o) => sel.includes(o.label) && o.disponivel).map((o) => o.tag); return tags.length ? a.destaque ? false : tags.some((t) => a.tags.includes(t)) : true; });
  const missing = () => active().filter(([k, sel]) => fdef(k).opcoes.some((o) => sel.includes(o.label) && !o.disponivel)).map(([k]) => k);
  const fav = (n) => S.favs.has(n);
  const draw = () => {
    const observed = S.script === D.roteiroPadrao; const sec = avdSecs(S.script); const list = ALL.filter(matches); const miss = missing(); const page = list.slice(0, S.shown);
    const tile = (n) => `<div class="avd-tile ${S.sel === n ? 'on' : ''}" data-av="${esc(n)}"><div class="avd-ph"></div><span>${esc(n)}</span><button class="avd-fav ${fav(n) ? 'on' : ''}" data-fav="${esc(n)}" aria-label="${fav(n) ? 'Remover dos favoritos' : 'Favoritar'}" title="${fav(n) ? 'Remover dos favoritos' : 'Favoritar'}">${fav(n) ? '♥' : '♡'}</button></div>`;
    const lbl = (k) => { const s = S.filters[k] || []; return s.length ? esc(s.length === 1 ? avdOpt(s[0]) : avdOpt(s[0]) + ' +' + (s.length - 1)) : esc(AVD_FILTER_PT[k] || k); };
    const filters = Object.keys(D.filtros).map((k) => `<span class="avd-fw"><button class="pill avd-f ${(S.filters[k] || []).length ? 'on' : ''}" data-f="${k}">${lbl(k)} ${S.open === k ? '⌃' : '⌄'}</button>${S.open === k ? `<div class="avd-menu">${fdef(k).opcoes.map((o) => `<label class="lv-checkbox"><input type="checkbox" data-o="${esc(o.label)}" ${(S.filters[k] || []).includes(o.label) ? 'checked' : ''}> ${esc(avdOpt(o.label))}</label>`).join('')}<button class="avd-reset" data-reset="${k}" ${(S.filters[k] || []).length ? '' : 'disabled'}>Redefinir${(S.filters[k] || []).length ? ` (${S.filters[k].length})` : ''}</button></div>` : ''}</span>`).join('');
    const mine = (loc.photo || []).map((p) => tile(p.name)).join('');
    const favList = ALL.filter((a) => fav(a.name));
    const choose = S.sub === 'rec' ? `<div class="avd-filters">${filters}</div>${miss.length ? `<div class="muted" id="avdmiss" style="margin:6px 0">Sem dados do serviço para filtrar por: ${miss.map((k) => esc(AVD_FILTER_PT[k] || k)).join(', ')}. Esses filtros não alteram a lista aqui.</div>` : ''}<div class="avd-count muted" id="avdcount">${list.length} avatar(es)</div><div class="avd-grid" id="avdgrid">${page.map((a) => tile(a.name)).join('') || '<div class="muted">Nenhum avatar encontrado.</div>'}</div>${list.length > page.length ? '<button id="avmore2" class="pill" style="margin:12px auto;display:block">Carregar mais</button>' : ''}` : S.sub === 'fav' ? (favList.length ? `<div class="avd-grid">${favList.map((a) => tile(a.name)).join('')}</div>` : `<div class="avd-empty"><b>Nenhum avatar favorito ainda</b><div class="muted">Marque seus avatares favoritos para vê-los aqui.</div></div>`) : `<div class="avd-mine"><b>Crie seus próprios avatares com fotos ou vídeos</b><div class="row"><button class="primary" id="avcreate">Criar agora</button><button id="avtalk">Foto falante de IA</button></div><div class="avd-grid">${mine}</div></div>`;
    const script = `<div class="avd-script"><label class="canvas-sw">Mostrar como legendas <input type="checkbox" id="avcap" ${S.captions ? 'checked' : ''}></label>${S.editing ? `<textarea id="avtxt">${esc(S.script)}</textarea><div class="row"><button id="avcancel">Cancelar</button><button class="primary" id="avsave">Salvar</button></div>` : `<div class="avd-text">${esc(S.script)}</div><button id="avedit">Editar</button>`}<div class="row"><select id="avlang">${D.idiomas.map((l) => `<option value="${esc(l)}" ${S.lang === l ? 'selected' : ''}>${esc(avdLang(l))}</option>`).join('')}</select><button id="avcapstyle">Alterar estilo da legenda</button></div></div>`;
    bg.innerHTML = `<div class="avd"><button class="avd-x" id="avclose" aria-label="Fechar">✕</button><div class="avd-head"><div><h2>Crie rapidamente um vídeo com avatar</h2><div class="avd-warn">⚠ A sincronização labial precisa estará disponível após a exportação.</div></div><div class="avd-acts"><button id="avundo" ${S.undo.length ? '' : 'disabled'} aria-label="Desfazer">↶</button><button id="avredo" ${S.redo.length ? '' : 'disabled'} aria-label="Refazer">↷</button><button id="avmore">Editar mais</button><button id="avexp" class="primary" title="${observed ? 'Valor observado no Pippit só para esta configuração (roteiro padrão de 5,88 s): 11 créditos, 23 riscado. Não é uma tabela de preços.' : 'Custo não observado para este roteiro: o Pippit não revelou a regra de cobrança.'}">⬇ ✦ ${observed ? '11 <s>23</s>' : '–'} Exportar vídeo</button></div></div>
    <div class="avd-body"><div class="avd-prev"><div class="avd-screen"><b>${esc(S.sel)}</b><small>Prévia do serviço original não reproduzida</small></div><div class="avd-player">▶ 00:00 | ${fmtSec(sec)} <span style="flex:1"></span>🔊 ⛶</div></div>
    <div class="avd-right"><div class="avd-tabs"><button class="${S.tab === 'choose' ? 'on' : ''}" data-tab="choose">Escolher avatar</button><button class="${S.tab === 'script' ? 'on' : ''}" data-tab="script">Editar roteiro</button></div>${S.tab === 'choose' ? `<div class="avd-sub">${[['rec', 'Avatares recomendados'], ['fav', 'Favoritos'], ['mine', 'Meus avatares']].map(([k, l]) => `<button class="pill ${S.sub === k ? 'on' : ''}" data-sub="${k}">${l}</button>`).join('')}</div>${choose}` : script}</div></div></div>`;
    bg.querySelector('#avclose').onclick = close; bg.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; S.open = null; draw(); })); bg.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => { S.sub = b.dataset.sub; S.open = null; draw(); }));
    bg.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { S.open = S.open === b.dataset.f ? null : b.dataset.f; draw(); }));
    bg.querySelectorAll('.avd-menu input[data-o]').forEach((c) => (c.onchange = () => { const k = S.open; const cur = new Set(S.filters[k] || []); if (c.checked) cur.add(c.dataset.o); else cur.delete(c.dataset.o); S.filters[k] = [...cur]; S.shown = 50; draw(); }));
    bg.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => { S.filters[b.dataset.reset] = []; S.shown = 50; draw(); }));
    bg.querySelectorAll('.avd-head h2').forEach((t) => (t.onclick = () => { if (S.open) { S.open = null; draw(); } }));
    bg.querySelectorAll('[data-av]').forEach((t) => (t.onclick = (e) => { if (e.target.closest('[data-fav]')) return; if (S.sel !== t.dataset.av) { push(); S.sel = t.dataset.av; draw(); } }));
    bg.querySelectorAll('[data-fav]').forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); const n = b.dataset.fav; const on = !fav(n); const r = await post('/api/avatar-favorites', { name: n, on }); if (r.ok) { S.favs = new Set(r.body.favorites); draw(); } }));
    const mo = bg.querySelector('#avmore2'); if (mo) mo.onclick = () => { S.shown += 50; draw(); };
    const u = bg.querySelector('#avundo'); if (u) u.onclick = () => { if (!S.undo.length) return; S.redo.push(snap()); apply(S.undo.pop()); draw(); }; const r = bg.querySelector('#avredo'); if (r) r.onclick = () => { if (!S.redo.length) return; S.undo.push(snap()); apply(S.redo.pop()); draw(); };
    const cr = bg.querySelector('#avcreate'); if (cr) cr.onclick = () => { close(); location.hash = '/avatars'; }; const tk = bg.querySelector('#avtalk'); if (tk) tk.onclick = () => { close(); location.hash = '/ai-talking-photo'; };
    const ed = bg.querySelector('#avedit'); if (ed) ed.onclick = () => { S.editing = true; draw(); }; const ca = bg.querySelector('#avcancel'); if (ca) ca.onclick = () => { S.editing = false; draw(); }; const sv = bg.querySelector('#avsave'); if (sv) sv.onclick = () => { const t = bg.querySelector('#avtxt').value.trim(); if (!t) return toast('O roteiro não pode ficar vazio.'); push(); S.script = t; S.editing = false; draw(); };
    const lg = bg.querySelector('#avlang'); if (lg) lg.onchange = () => { push(); S.lang = lg.value; draw(); }; const cp = bg.querySelector('#avcap'); if (cp) cp.onchange = () => { push(); S.captions = cp.checked; draw(); }; const cs = bg.querySelector('#avcapstyle'); if (cs) cs.onclick = () => toast('Estilo da legenda: comportamento não observado no Pippit.');
    bg.querySelector('#avmore').onclick = () => toast('Editar mais: destino não observado no Pippit.'); bg.querySelector('#avexp').onclick = () => toast('Exportar vídeo com avatar exige o serviço de avatar falante do Pippit (sem provedor local): nada foi debitado.', 6000);
  };
  draw(); return bg;
}
function pageTalkingPhoto() {
  const T = window.__tp || (window.__tp = { file: null, assetId: null, ok: false, step: 1, tab: 'tts', script: '', voice: '', audio: null, gesture: '', result: null, busy: false, mode: 'local', prov: null, tpjob: null, tpquote: null, tperr: '', ack1: false, ack2: false, tpvideo: null }); const ex = [['Street interview', '00:05'], ['Spanish dance music', '00:16'], ['Hot dancing girls', '00:11'], ['Halloween labubu', '00:12'], ['Baby complaining', '00:07'], ['Rapper', '00:10'], ['Big Bear Sings and Dances', '00:13'], ['Baby talk', '00:10'], ['Rap boy', '00:14'], ['Phonk singer', '00:10'], ['Korean children singing', '00:25'], ['Spanish children singing', '00:07'], ['Baby interview', '00:07'], ['Trick or treat', '00:12'], ['Statue singing', '00:17'], ['Holiday travel', '00:12'], ['Angel baby love to sing', '00:13'], ['Italian brain rot song DJ version', '00:15'], ['Baby talking podcast', '00:09'], ['Baby talking podcast 2', '00:10'], ['Comic male singing Gangnam style', '00:10']];
  const steps = ['Enviar foto', 'Adicionar locução', 'Exportar'];
  // Exportar habilita como no Omni (canExport): aba de roteiro com texto, ou aba de áudio com clipe enviado
  const canExport = T.tab === 'tts' ? !!T.script.trim() : !!T.audio;
  const tip = canExport ? 'Os créditos necessários dependem do tamanho do roteiro ou do áudio enviado (aqui nenhum crédito é debitado).' : 'Digite aqui o que você quer que o personagem da foto diga';
  $('#main').innerHTML = `<div class="tp-page"><div class="tp-top"><a href="#/home" class="tp-back" aria-label="Voltar">‹</a><h1>Foto falante de IA</h1>${credits()}</div><div class="tp-body"><div class="tp-steps">${steps.map((s, i) => `<span class="${T.step === i + 1 ? 'on' : ''}"><i>${i + 1}</i> ${s}</span>`).join('<hr>')}</div>
  ${T.step === 1 ? `<div class="tp-box"><b>Envie a sua foto</b><div class="tp-drop" id="tpdrop"><div class="tp-plus">＋</div><div><b>Solte sua foto aqui ou clique para enviar</b></div><div class="muted">Envie uma foto com um ou vários personagens</div><div class="muted">Formato: JPG / PNG, Tamanho: >256*256, <a id="tptips">Dicas de envio</a></div>${T.file ? `<div id="tpname">📎 ${esc(T.file.name)} (${T.file.w}×${T.file.h})</div>` : ''}</div></div>
  <h3>Crie vídeos com fotos falantes de IA abaixo</h3><div class="tp-ex">${ex.map(([n, d]) => `<div class="tp-card"><div class="tp-ph"></div><b>${esc(n)}</b><span class="muted">${d}</span></div>`).join('')}</div><div class="blocked">As prévias em vídeo dos exemplos são conteúdo do serviço original e não são reproduzidas.</div>
  <div class="tp-foot"><label><input type="checkbox" id="tpok" ${T.ok ? 'checked' : ''}> Ao marcar esta caixa, você confirma e concorda que possui os direitos, ou obteve todas as permissões necessárias, sobre a foto, o vídeo ou o áudio que está enviando ao Pippit. Certifique-se de que o conteúdo enviado cumpre todas as leis e regulamentos aplicáveis, os nossos Termos de Serviço e as Diretrizes da Comunidade. Você é o único responsável por qualquer conteúdo ou anúncio criado com este recurso e pelo modo como é usado. Ao prosseguir, você reconhece essas responsabilidades. <a>Saiba mais</a></label><button class="primary" id="tpnext" ${T.file && T.ok ? '' : 'disabled'}>Próximo</button></div>`
  : T.step === 2 ? `<div class="tp-box"><b>Falante e fala</b><div class="blocked">Estrutura da etapa conforme a página original (abas de roteiro/áudio, gesto e movimento, Voltar/Exportar). A <b>extensão local</b> gera só uma prévia: foto estática + voz do Windows (SAPI, <b>padrão</b>) ou o áudio enviado, sem IA e sem custo. O lip-sync por provedor externo é opção e exige o seu consentimento. A verificação da foto e a escolha de personagens do Pippit não existem localmente.</div>
  <div class="row" role="tablist"><button id="tptab-tts" class="${T.tab === 'tts' ? 'primary' : ''}">Ler roteiro</button><button id="tptab-vo" class="${T.tab === 'voiceover' ? 'primary' : ''}">Enviar clipe de áudio</button></div>
  ${T.tab === 'tts' ? `<textarea id="tpscript" maxlength="2000" placeholder="Digite o que você quer que o(s) personagem(ns) selecionado(s) diga(m)">${esc(T.script)}</textarea><div class="muted" id="tpcount">${T.script.length}/2000</div><div class="row"><label>Voz <select id="tpvoice"><option value="">(padrão do Windows)</option></select></label><span class="muted" id="tpvnote"></span></div>`
  : `<div class="tp-drop" id="tpaudiodrop"><div class="tp-plus">＋</div><div><b>Envie ou solte o clipe de áudio aqui</b></div><div class="muted">Áudio (mp3/wma/flac) ou vídeo (mp4/avi/mov/wmv/mkv), &lt;30 s</div><div class="muted">* Extraímos o áudio do vídeo enviado para você</div>${T.audio ? `<div id="tpaudioname">🎵 Clipe de áudio enviado: ${esc(T.audio.name)} (${T.audio.duration.toFixed(1)} s) <a id="tpaudiorm">Remover</a></div>` : ''}</div>`}
  <b>Gesto e movimento</b><textarea id="tpgesture" maxlength="500" placeholder="Descreva a pose, o gesto ou o movimento de câmera (opcional)">${esc(T.gesture)}</textarea><div class="row"><button id="tpsample">Experimentar exemplo</button><span class="muted">O gesto descrito não é aplicado na prévia local.</span></div>
  <div class="row"><button id="tpback">Voltar</button><button class="primary" id="tpexport" title="${esc(tip)}" ${canExport ? '' : 'disabled'}>Exportar</button><button id="tpprov" title="${esc(T.prov?.configured ? 'Prepara a geração e mostra o orçamento; NADA é enviado antes do seu consentimento.' : 'Configure um provedor de foto falante em Configurações > Assistente de IA > Provedores.')}" ${canExport && T.prov?.configured ? '' : 'disabled'}>Gerar com lip-sync (provedor externo)</button></div></div>`
  : T.mode === 'provider' ? tpProviderPanel(T) : `<div class="tp-box"><b>Exportar</b>${T.busy ? '<p id="tpgen">Gerando vídeo…</p>' : `<div class="blocked">A animação labial por IA do Pippit não está disponível localmente. O resultado é uma <b>prévia local</b>, salva em Ativos. Nenhum crédito é debitado.</div>
    <div class="row"><button id="tpai" title="Gera um clipe de 5 s no provedor gratuito NovAI (cogvideox-flash). A foto e o áudio NÃO são enviados: a API aceita só o texto, então o clipe não tem sincronia labial.">Gerar clipe de IA (NovAI, 5 s)</button><span class="tp-hint" id="tpaiprog" style="opacity:.7;font-size:12px"></span></div>
    <p class="tp-hint" style="opacity:.7;font-size:12px">Sem lip-sync: o clipe é gerado só a partir da descrição (roteiro ou gesto). Para manter o vídeo acima, use Exportar.</p>
    ${T.aiVideo ? `<video controls src="/files/${esc(T.aiVideo.stored)}" style="max-width:360px;margin-top:10px"></video><p class="tp-hint" id="tpaidone" style="opacity:.7;font-size:12px">Clipe de IA (NovAI cogvideox-flash) salvo em <a href="#/assets">Ativos</a>.</p>` : ''}${T.result ? `<video controls src="/files/${esc(T.result.video.stored)}" style="max-width:360px;margin-top:10px"></video><p class="muted">${esc(T.result.label)} <a href="#/assets">Abrir em Ativos</a></p>` : ''}<div class="row"><button id="tpback">Voltar</button><button class="primary" id="tpnew">Criar novo</button></div>`}</div>`}</div></div>`; bindCredits();
  const pick = () => fileInput('image/jpeg,image/png', async (f) => { const url = URL.createObjectURL(f); const im = new Image(); im.onload = async () => { URL.revokeObjectURL(url); if (!/^image\/(jpeg|png)$/.test(f.type)) return toast('Formato inválido: use JPG ou PNG.'); if (im.width <= 256 || im.height <= 256) return toast('A imagem deve ser maior que 256×256.'); const r = await api('/api/talking-photo/photo', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(f.name), 'content-type': f.type }, body: f }); if (!r.ok) return toast(r.body?.error || 'Falha ao enviar a foto.'); T.file = { name: f.name, w: im.width, h: im.height }; T.assetId = r.body.asset.id; T.result = null; pageTalkingPhoto(); }; im.onerror = () => toast('Não foi possível ler a imagem.'); im.src = url; });
  if ($('#tpdrop')) $('#tpdrop').onclick = (e) => { if (e.target.id !== 'tptips') pick(); }; if ($('#tptips')) $('#tptips').onclick = () => toast('Dicas de envio: conteúdo do serviço original não capturado.');
  if ($('#tpok')) $('#tpok').onchange = (e) => { T.ok = e.target.checked; $('#tpnext').disabled = !(T.file && T.ok); }; if ($('#tpnext')) $('#tpnext').onclick = () => { T.step = 2; pageTalkingPhoto(); };
  const pickAudio = () => fileInput('.mp3,.wma,.flac,.mp4,.avi,.mov,.wmv,.mkv,audio/*,video/*', async (f) => { const r = await api('/api/talking-photo/audio', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(f.name), 'content-type': f.type || 'application/octet-stream' }, body: f }); if (!r.ok) return toast(r.body?.error || 'Algo deu errado. Tente novamente.'); T.audio = { assetId: r.body.asset.id, name: f.name, duration: r.body.duration }; pageTalkingPhoto(); });
  if ($('#tptab-tts')) { $('#tptab-tts').onclick = () => { T.gesture = $('#tpgesture').value; T.tab = 'tts'; pageTalkingPhoto(); }; $('#tptab-vo').onclick = () => { T.gesture = $('#tpgesture').value; T.tab = 'voiceover'; pageTalkingPhoto(); }; }
  if ($('#tpgesture')) { $('#tpgesture').oninput = (e) => { T.gesture = e.target.value; }; $('#tpsample').onclick = () => { T.gesture = 'Levante a mão, aponte para frente, ande em direção à câmera'; $('#tpgesture').value = T.gesture; }; }
  if ($('#tpaudiodrop')) { $('#tpaudiodrop').onclick = (e) => { if (e.target.id !== 'tpaudiorm') pickAudio(); }; if ($('#tpaudiorm')) $('#tpaudiorm').onclick = () => { T.audio = null; pageTalkingPhoto(); }; }
  if ($('#tpscript')) { $('#tpscript').oninput = (e) => { T.script = e.target.value; $('#tpcount').textContent = `${T.script.length}/2000`; const ok = !!T.script.trim(); $('#tpexport').disabled = !ok; $('#tpexport').title = ok ? 'Os créditos necessários dependem do tamanho do roteiro ou do áudio enviado (aqui nenhum crédito é debitado).' : 'Digite aqui o que você quer que o personagem da foto diga'; }; api('/api/tts-voices').then((v) => { const sel = $('#tpvoice'); if (!sel) return; if (!v.body.available) { $('#tpvnote').textContent = 'Voz local indisponível nesta máquina.'; return; } sel.innerHTML += (v.body.voices || []).map((x) => `<option value="${esc(x.name || x)}" ${T.voice === (x.name || x) ? 'selected' : ''}>${esc(x.name || x)}</option>`).join(''); sel.onchange = () => (T.voice = sel.value); }); }
  if ($('#tpback')) $('#tpback').onclick = () => { T.step = T.step - 1; pageTalkingPhoto(); };
  if ($('#tpai')) $('#tpai').onclick = async () => {
    const scene = String(T.script || '').trim() || String(T.gesture || '').trim();
    if (scene.length < 15) return toast('Descreva a cena com pelo menos 15 caracteres (roteiro ou gesto).');
    const r = await post('/api/talking-photo/ai-video', { assetId: T.assetId, text: scene });
    if (!r.ok) return toast(r.body?.error || 'Não foi possível iniciar o clipe.');
    const id = r.body.run.id; const prog = $('#tpaiprog'); if (prog) prog.textContent = 'Clipe na fila do roteador gratuito…'; toast(r.body.label, 7000);
    const timer = setInterval(async () => {
      const s = (await api(`/api/local-runs/${encodeURIComponent(id)}`)).body || {};
      const el = $('#tpaiprog'); if (el) el.textContent = `Clipe: ${s.state}${Number.isFinite(s.progress) ? ` · ${s.progress}%` : ''}${s.queuePosition ? ` · fila ${s.queuePosition}` : ''}${s.remoteStatus ? ` · ${s.remoteStatus}` : ''}`;
      if (['queued', 'running'].includes(s.state)) return;
      clearInterval(timer);
      if (s.asset) { T.aiVideo = s.asset; pageTalkingPhoto(); } else toast(s.error || 'O clipe não foi concluído.');
    }, 2500);
  };
  if ($('#tpnew')) $('#tpnew').onclick = () => { window.__tp = null; pageTalkingPhoto(); };
  if (T.prov == null && !T.provReq) { T.provReq = true; api('/api/providers').then((r) => { T.prov = r.body?.providers?.talkingphoto || { configured: false }; if (window.__tp === T && T.step === 2) pageTalkingPhoto(); }); }
  if ($('#tpprov')) $('#tpprov').onclick = async () => { // prepara a tarefa (criada BLOQUEADA no servidor): nada é enviado aqui
    T.mode = 'provider'; T.step = 3; T.busy = true; T.tperr = ''; T.tpjob = null; T.tpquote = null; T.ack1 = false; T.ack2 = false; T.tpvideo = null; pageTalkingPhoto();
    const r = await post('/api/talking-photo/generate', { assetId: T.assetId, audioAssetId: T.tab === 'voiceover' ? T.audio?.assetId : undefined, text: T.tab === 'tts' ? T.script : '', voice: T.voice, gesture: T.gesture });
    T.busy = false; if (!r.ok) T.tperr = r.body?.error || 'Falha ao preparar a geração.'; else { T.tpjob = r.body.job; T.tpquote = r.body.quote; } pageTalkingPhoto(); };
  if (T.mode === 'provider' && T.step === 3) tpBindProvider(T);
  if ($('#tpexport')) $('#tpexport').onclick = async () => { T.mode = 'local'; T.step = 3; T.busy = true; T.result = null; pageTalkingPhoto(); const r = await post('/api/talking-photo/render', { assetId: T.assetId, text: T.tab === 'tts' ? T.script : '', audioAssetId: T.tab === 'voiceover' ? T.audio?.assetId : undefined, voice: T.voice, gesture: T.gesture }); T.busy = false; if (!r.ok) { toast(r.body?.error || 'Falha ao gerar a prévia.', 6000); T.step = 2; } else { T.result = r.body; await refresh(); } pageTalkingPhoto(); };
}

// Foto falante com lip-sync por PROVEDOR EXTERNO do usuário: orçamento -> consentimento por tarefa -> acompanhamento. O bloqueio de gasto é do servidor (esta tela só o reflete).
const TP_REMOTE_CANCEL = { not_submitted: 'Nada tinha sido enviado ao provedor.', requested: 'Pedido de cancelamento enviado ao provedor (a confirmação final é dele).', refused: 'O provedor recusou o cancelamento: a tarefa pode continuar e ser cobrada.', failed: 'Falha ao pedir o cancelamento ao provedor: a tarefa pode continuar e ser cobrada.', unsupported: 'Este adaptador não suporta cancelamento remoto: só a tarefa local foi cancelada; o provedor pode continuar e cobrar.', unknown: 'Envio interrompido: não é possível saber se o provedor recebeu a tarefa.' };
function tpProviderPanel(T) {
  const head = '<b>Lip-sync por provedor externo</b>';
  if (T.busy) return `<div class="tp-box">${head}<p id="tpgen">Preparando o orçamento…</p></div>`;
  if (T.tperr) return `<div class="tp-box">${head}<div class="blocked" id="tperr">${esc(T.tperr)}</div><div class="row"><button id="tpback">Voltar</button></div></div>`;
  const j = T.tpjob, q = T.tpquote; if (!j || !q) return `<div class="tp-box">${head}</div>`;
  const cost = q.cost.known ? `${esc(String(q.cost.amount))} ${esc(q.cost.currency)} <span class="muted">(${esc(q.cost.basis)})</span>` : '<b>DESCONHECIDO</b> — o provedor pode cobrar por esta geração';
  const quote = `<table class="tp-quote"><tr><td>Provedor / modelo</td><td id="tpq-prov">${esc(q.provider.model)} <span class="muted">(${esc(q.provider.host)})</span></td></tr><tr><td>Duração do áudio</td><td id="tpq-sec">${esc(String(q.seconds))} s</td></tr><tr><td>Custo estimado</td><td id="tpq-cost">${cost}</td></tr><tr><td>Limite por tarefa</td><td>${q.maxCostPerTask == null ? '— (não definido)' : esc(String(q.maxCostPerTask))}</td></tr><tr><td>Enviado ao provedor</td><td>${esc(q.accepted.join(', '))}${q.ignored.length ? ` <span class="muted">· NÃO recebe: ${esc(q.ignored.join(', '))}</span>` : ''}</td></tr></table><ul id="tpq-warn">${q.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
  const st = j.state;
  if (st === 'blocked') return `<div class="tp-box">${head}${quote}<p class="muted" id="tpreason">${esc(j.error || '')}</p><label><input type="checkbox" id="tpack1" ${T.ack1 ? 'checked' : ''}> Li o orçamento e autorizo ESTA tarefa (a foto e o áudio serão enviados ao provedor).</label>${q.needsUnknownCostAck ? `<br><label><input type="checkbox" id="tpack2" ${T.ack2 ? 'checked' : ''}> Aceito uma cobrança que o PiperLine não consegue estimar.</label>` : ''}<div class="row"><button id="tpback">Voltar</button><button id="tpcancel">Cancelar tarefa</button><button class="primary" id="tpauth" ${T.ack1 && (!q.needsUnknownCostAck || T.ack2) && !q.overLimit ? '' : 'disabled'}>Autorizar e enviar ao provedor</button></div></div>`;
  if (st === 'queued' || st === 'running') return `<div class="tp-box">${head}${quote}<p id="tprun">Processando no provedor… ${esc(String(j.progress || 0))}%</p><div class="row"><button id="tpcancel">Cancelar</button></div></div>`;
  if (st === 'succeeded') return `<div class="tp-box">${head}${T.tpvideo ? `<video controls src="/files/${esc(T.tpvideo.stored)}" style="max-width:360px;margin-top:10px"></video>` : '<p>Carregando o vídeo…</p>'}<p class="muted" id="tpdone">Vídeo recebido do provedor "${esc(q.provider.model)}". A sincronização labial depende do modelo e NÃO é verificada localmente. Salvo em <a href="#/assets">Ativos</a>${j.source?.type === 'node' ? ' e no nó do projeto' : ''}.</p><div class="row"><button class="primary" id="tpnew">Criar novo</button></div></div>`;
  if (st === 'canceled') return `<div class="tp-box">${head}<p id="tpcanceled">Tarefa cancelada. ${esc(TP_REMOTE_CANCEL[j.remoteCancel] || '')}${j.remoteCancelNote ? ` (${esc(j.remoteCancelNote)})` : ''}</p><div class="row"><button id="tpback">Voltar</button></div></div>`;
  return `<div class="tp-box">${head}<div class="blocked" id="tperr">${esc(j.error || 'Falha')}</div>${j.ambiguousSend ? '<p><b>Atenção:</b> o provedor pode ter recebido a tarefa e cobrado. Confira no painel dele antes de tentar de novo.</p>' : ''}<div class="row"><button id="tpback">Voltar</button></div></div>`;
}
function tpBindProvider(T) {
  const rerender = () => { if (window.__tp === T) pageTalkingPhoto(); }; const j = T.tpjob; if (!j || !T.tpquote) return; const q = T.tpquote;
  const okAuth = () => T.ack1 && (!q.needsUnknownCostAck || T.ack2) && !q.overLimit;
  if ($('#tpack1')) $('#tpack1').onchange = (e) => { T.ack1 = e.target.checked; $('#tpauth').disabled = !okAuth(); }; if ($('#tpack2')) $('#tpack2').onchange = (e) => { T.ack2 = e.target.checked; $('#tpauth').disabled = !okAuth(); };
  if ($('#tpauth')) $('#tpauth').onclick = async () => { const r = await post(`/api/talking-photo/jobs/${j.id}/authorize`, { confirm: true, quoteDigest: q.digest, acknowledgeUnknownCost: T.ack2 }); if (!r.ok) return toast(r.body?.error || 'Falha ao autorizar.', 6000); T.tpjob = r.body; rerender(); };
  if ($('#tpcancel')) $('#tpcancel').onclick = async () => { const r = await post(`/api/jobs/${j.id}/cancel`); if (r.ok) T.tpjob = r.body; rerender(); };
  clearTimeout(T.wt); if (['queued', 'running'].includes(j.state) || (j.state === 'succeeded' && !T.tpvideo)) T.wt = setTimeout(async () => {
    if (window.__tp !== T || T.step !== 3 || T.mode !== 'provider') return; await post('/api/jobs/tick'); const cur = ((await api('/api/jobs')).body || []).find((x) => x.id === j.id); if (cur) T.tpjob = cur;
    if (cur?.state === 'succeeded' && !T.tpvideo) T.tpvideo = ((await api('/api/assets?kind=video')).body || []).find((a) => a.id === cur.assetId) || null; if (cur?.state === 'succeeded') await refresh(); rerender(); }, 1200);
}

// ---------- roteador

// ---------- geracao direta de video (Auto Route): mesma sequencia de chamadas observada no HAR do Pippit (PIPPIT_API_CATALOG.md)
async function directVideo(text) {
  const R = async (p, b) => (await post(p, b)).body; const U = { consumer_uid: ST.user.id };
  const chk = await R('/commerce/v3/benefits/batch_check_withhold_deduct', { action_type: 1, strict: true, item_list: [{ resource_type: 'aigc', resource_id: 'cc_biz_video_agent_minimaxh3_768p', benefit_type: 'cc_biz_video_agent_minimaxh3_trial_768p', amount: 1, high_precision_amount: 4, submit_id: '' }], client_check_group: [] });
  // r20: o check de benefícios segue no fluxo (espelho observado), mas nunca bloqueia nem abre planos.
  const pid = (await R('/api/biz/v1/agent/create_creative_project', { user_info: U })).data.project_id;
  const ids = (await R('/api/biz/v1/asset/batch_generate_asset_id')).data.ids; const canvasId = ids[0], nodeId = ids[1];
  await R('/api/biz/v1/asset/namespace_create', { Base: { Client: 'web' }, namespace_data: [{ FileName: 'canvas.json', PippitAssetID: canvasId, ProjectID: String(pid) }] });
  const runId = crypto.randomUUID(); const param = JSON.stringify({ prompt: text, images: HOME.attachments.map((a) => a.id), ratio: '9:16', resolution: '768p', model: 'MiniMax-H3-trial', duration_sec: 4 });
  const r = await R('/api/biz/v1/agent/submit_run', { project_id: pid, message: { content: [{ type: 'data', data: JSON.stringify({ param, extra: '{}', tool_name: 'biz/x_tool_name_video_part' }), sub_type: 'biz/x_data_direct_tool_call_req' }], role: 'user', thread_id: `canvas_thread_${canvasId}_pippit_video_part_agent`, run_id: runId, created_at: Date.now(), message_id: crypto.randomUUID() }, user_info: U, agent_name: 'pippit_video_part_agent', concurrency_control: { policy: 1, conflict_key: nodeId }, entrance_from: 'web_video_direct', run_extra: JSON.stringify({ babi_param: { edit_type: 'integrated_agent', tool_id: 'integrated_agent_canvas', scene_lv1: 'ai_agent', scene_lv2: 'front_tool', tab_name: 'canvas' }, client_extra: { generate_mode: 'video_gen', canvas_type: 'integrated_agent', project_id: pid, target: 'video', run_source: 'video_part' } }), request_id: crypto.randomUUID() });
  if (r.ret !== '0') return toast('Algo deu errado. Tente novamente.');
  HOME.text = ''; HOME.attachments = []; location.hash = `/direct/${pid}/${canvasId}/${runId}`;
}
async function pageDirect(pid, canvasId, runId) {
  const thread = `canvas_thread_${canvasId}_pippit_video_part_agent`;
  $('#main').innerHTML = `<div class="page" id="dcv"><div class="row"><button id="dback" aria-label="Voltar">←</button> <b>Canvas</b> <span class="muted" id="dsaved">Salvando</span></div><div class="row" style="align-items:flex-start;gap:24px;margin-top:16px"><div><div class="muted">▶ Video</div><div id="dnode" class="card" style="width:480px;height:270px;display:flex;align-items:center;justify-content:center;flex-direction:column"></div></div><div class="card" style="flex:1;min-height:300px"><h2 style="font-weight:400">Olá, o que vamos criar hoje?</h2></div></div></div>`;
  $('#dback').onclick = () => (location.hash = '/home'); const node = $('#dnode');
  node.innerHTML = '<div id="dspin">Gerando…</div><button id="dcancel" style="margin-top:12px">Cancelar</button>';
  $('#dcancel').onclick = async () => { await post('/api/biz/v1/agent/cancel_run', { run_id: runId, thread_id: thread }); };
  for (let i = 0; i < 120; i++) {
    const t = (await post('/api/biz/v1/agent/get_thread', { thread_id: thread, scopes: ['run_list.entry_list'] })).body; const run = t.data?.thread?.run_list?.find((x) => x.run_id === runId);
    if (run && run.state === 5) { node.innerHTML = '<b>Geração cancelada.</b>'; $('#dsaved').textContent = 'Salvo'; return; }
    if (run && run.state === 4) { node.innerHTML = `<b style="color:#a22" title="${esc(run.fail_reason?.detail || '')}">Não foi possível gerar. Tente novamente.</b><div class="muted">${esc(run.fail_reason?.message || '')}</div>`; $('#dsaved').textContent = 'Salvo'; return; }
    if (run && run.state === 3) {
      const files = (await post('/api/biz/v1/agent/list_project_file', { Base: { Client: 'web' }, PageNum: 1, PageSize: 300, project_id: pid })).body.data.Files; const f = files[files.length - 1];
      const info = (await post('/api/biz/v1/common/mget_asset_info', { asset_ids: [f.Raw.AgentAsset.SourceID], need_transcode: true })).body.data[0];
      node.style.width = '272px'; node.style.height = '476px'; node.innerHTML = `<video controls muted style="width:100%;height:100%;object-fit:cover" src="${esc(info.download_url)}"></video>`; $('#dsaved').textContent = 'Salvo'; await refresh(); return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
let NOTE_UNREAD = 0;
// Central de notificações: lista, "Todas lidas" e ponto vermelho de não lidas (comportamento observado).
// Conteúdo: eventos do próprio app + os 8 anúncios editoriais observados por tema (REA ev_72d7b4c2…7b20,
// jan–abr/2026) — títulos, datas e textos individuais dos anúncios são UNOBSERVED e não são inventados.
async function openNotifications() {
  // Medido no original (pt_notif.txt): painel 448px, raio 24, fundo branco translúcido, acima do sino; título +
  // "Todos lidos"; cada item com título (ponto roxo se não lido), uma linha de texto e a data.
  if ($('.note-pop')) return closeAccountMenu();
  closeAccountMenu(); document.querySelectorAll('.menu').forEach((m) => m.remove());
  const n = (await api('/api/notifications')).body; const kind = { success: '✔', error: '✖', info: 'ℹ', ad: '📣' };
  const eventos = n.items.filter((x) => x.kind !== 'ad'); const ads = n.items.filter((x) => x.kind === 'ad');
  const card = (x) => `<div class="note ${x.read ? '' : 'unread'}"><b>${x.read ? '' : '<i class="nd"></i>'}${kind[x.kind] || ''} ${esc(x.title)}</b><p>${esc(/UNOBSERVED/.test(x.body || '') ? '' : x.body)}</p><small>${x.at ? new Date(x.at).toLocaleString('pt-BR') : ''}</small></div>`;
  const p = h(`<div class="note-pop" role="dialog" aria-label="Notificações"><div class="np-head"><h2>Notificações</h2><button id="allread">Todos lidos</button></div><div class="np-list">${[...eventos, ...ads].map(card).join('') || '<p class="muted">Sem notificações.</p>'}</div></div>`);
  document.body.appendChild(p);
  const r = $('#acc').getBoundingClientRect(); p.style.left = '8px'; p.style.bottom = (innerHeight - r.top + 4) + 'px';
  p.addEventListener('click', (e) => e.stopPropagation());
  $('#allread', p).onclick = async () => { await post('/api/notifications/read-all'); NOTE_UNREAD = 0; closeAccountMenu(); renderSide(location.hash.replace(/^#/, '') || '/home'); };
  setTimeout(() => { const off = (e) => { if (e.type === 'keydown' && e.key !== 'Escape') return; closeAccountMenu(); document.removeEventListener('click', off); document.removeEventListener('keydown', off); }; document.addEventListener('click', off); document.addEventListener('keydown', off); }, 0);
}
const KNOWN_MARKETING_TEMPLATES = Object.freeze([
  'Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal',
  'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop',
]);
function pageTemplates() {
  $('#main').innerHTML = `${credits()}<div class="page" id="templateStudio"><h1>Templates de marketing</h1><p class="muted">O inventário registra 10 templates. Só estes oito nomes foram preservados; os outros dois, imagens e textos pré-preenchidos são desconhecidos. Nenhum prompt foi inventado.</p><div class="grid g3">${KNOWN_MARKETING_TEMPLATES.map((name) => `<button class="card template-card" data-template="${esc(name)}" style="text-align:left"><b>${esc(name)}</b><div class="muted">Detalhes de template não preservados</div></button>`).join('')}</div><p id="templateCount" class="muted">8 nomes conhecidos de 10 relatados no inventário · 2 não identificados</p><p id="templateEvidence" class="muted">Templates: verificando estado observado…</p><a href="#/marketing">Voltar ao Estúdio de marketing</a></div>`; bindCredits();
  // linha 76: dizer na tela o que falta — imagens, texto pré-preenchido e fluxo Gerar nunca foram capturados.
  (async () => { try { const t = (await api('/api/templates/state')).body; const n = $('#templateEvidence'); if (n) n.innerHTML = `${t.namesPreserved.length} nomes preservados de ${t.totalReported} relatados; ${t.missingNames} sem nome. Imagens: ${t.images}; texto pré-preenchido: ${t.prefillText}; fluxo Gerar: ${t.generateFlow}.`; } catch { const n = $('#templateEvidence'); if (n) n.textContent = 'Templates: estado local indisponível.'; } })();
  document.querySelectorAll('[data-template]').forEach((b) => (b.onclick = () => modal(`<h2>${esc(b.dataset.template)}</h2><p>Template identificado no inventário local.</p><ul><li>Imagem do personagem: não capturada neste checkout</li><li>Texto de “Qual é a história?”: não preservado</li><li>Configurações e efeito de Gerar: não reproduzidos</li></ul><p class="blocked">UNOBSERVED: este painel não executa geração e não imita respostas do serviço.</p>`, 'sm')));
}
function pageOmni() {
  const endpoints = ['get_tone_list', 'get_hot_audio_list', 'text_to_speech', 'audio_to_text', 'image_object_detect', 'get_img_category_list', 'preprocess_submit_request', 'before_create_limit_check', 'try_task', 'retry_task', 'batch_delete_digital'];
  $('#main').innerHTML = `${credits()}<div class="page" id="omniLocal"><h1>Omni · humano digital</h1><p>Os bundles locais nomeiam APIs Omni/digital_human, mas corpos, estados, tela e respostas em execução não foram capturados.</p><div class="blocked">PENDENTE DE OBSERVAÇÃO HUMANA. Esta reconstrução não chama essas APIs nem cria/exporta avatares reais.</div><h2>Capacidades referenciadas estaticamente</h2><ul>${endpoints.map((x) => `<li><code>${x}</code> — contrato/resposta <b>UNOBSERVED</b></li>`).join('')}</ul><p class="muted" id="omniEvidence">Capacidades: verificando o que foi preservado…</p><a href="#/avatars">Avatares e vozes locais</a></div>`; bindCredits();
  // linha 92: os nomes existem nos bundles, os corpos não; conferir contra a rota e dizer na tela.
  (async () => { try { const o = (await api('/api/capabilities/omni')).body; const n = $('#omniEvidence'); if (n) n.innerHTML = `${o.endpoints.length} endpoints nomeados nos bundles; corpos: ${o.bodies}; tela: ${o.screen}; execução: ${o.execution}. Nada é chamado e nenhum avatar real é criado.`; } catch { const n = $('#omniEvidence'); if (n) n.textContent = 'Capacidades: estado local indisponível.'; } })();

}
// ---- autenticação: tela de login e saída. Adaptador `local` (usuário único) é o padrão; `supabase` fala GoTrue de verdade.
async function signOut() { await post('/api/auth/logout'); ST = null; PROJECTS = []; location.hash = '/login'; toast('Sessão encerrada.'); }
async function pageLogin(preloaded) {
  const A = preloaded || (await api('/api/auth/state')).body;
  const isSupabase = A.adapterInfo.id === 'supabase';
  // Só no Supabase: perguntar ao GoTrue quais provedores estão ligados (a chave nunca vem para a tela).
  let S = null; if (isSupabase) { try { S = (await api('/api/auth/settings')).body; } catch { S = { ok: false }; } }
  const googleOn = S?.ok === true && S.google === true;
  const tiktokOn = S?.ok === true && Array.isArray(S.providers) && S.providers.includes('tiktok');
  const oauthRows = [
    { id: 'google', label: 'Google', on: googleOn, why: googleOn ? '' : 'o GoTrue não informou google=true em /auth/v1/settings (ou a URL/chave não responderam): ligue o provedor em Authentication → Providers → Google.' },
    { id: 'tiktok', label: 'TikTok', on: tiktokOn, why: tiktokOn ? '' : 'o GoTrue não listou o provedor tiktok: a tela fica desligada até o projeto ligar o provedor.' },
  ];
  $('#main').innerHTML = `<div class="page" id="loginPage"><h1>Entrar</h1>
    <p class="muted">Autenticação em camada própria, com adaptadores. Hoje: <b>${esc(A.adapterInfo.label)}</b> (${esc(A.adapterInfo.mode || 'funcional')}). ${A.session ? `Sessão ativa desde ${new Date(A.session.createdAt).toLocaleString('pt-BR')}.` : ''}</p>
    <div class="card" style="max-width:460px"><p><b>E-mail</b><br><input id="loginEmail" style="width:100%" value="${esc(ST?.user?.name || (isSupabase ? '' : 'local'))}${isSupabase ? '' : '@local'}" ${isSupabase ? '' : 'disabled'}></p>
    <p><b>Senha</b> <span class="muted">${isSupabase ? '(a do projeto Supabase)' : A.hasPassword ? '(definida nesta instalação)' : '(nenhuma senha definida: deixe em branco)'}</span><br><input id="loginPass" type="password" style="width:100%" autocomplete="current-password"></p>
    <div class="row"><button class="primary" id="loginGo">Entrar</button>${isSupabase ? '<button id="loginSignup">Criar conta</button>' : ''}<span id="loginRes" class="muted"></span></div>
    ${isSupabase ? '<p class="muted" style="font-size:12px">O projeto exige confirmação de e-mail: depois de criar a conta, confirme pelo link recebido antes de entrar.</p>' : ''}</div>
    <h3>Entrar com provedor</h3><div class="card">${oauthRows.map((o) => `<div class="row" style="margin:6px 0"><b style="flex:1">${esc(o.label)}</b><span class="muted" style="flex:1;font-size:12px">${esc(o.on ? 'ligado no GoTrue — PKCE (S256)' : (isSupabase ? 'desligado' : 'falta credencial'))}</span><button data-oauth="${esc(o.id)}" ${o.on ? '' : 'disabled'} title="${esc(o.on ? 'Entrar com ' + o.label : o.why)}">Continuar com o ${esc(o.label)}</button></div>`).join('')}
    ${isSupabase ? oauthRows.filter((o) => !o.on).map((o) => `<p class="muted" style="font-size:12px">⛔ ${esc(o.label)}: ${esc(o.why)}</p>`).join('') : `<p class="muted">Escopos previstos: ${A.oauth.map((o) => `${esc(o.label)} (${o.scopes.join(', ')})`).join(' · ')}.</p>`}
    <p class="muted" style="font-size:12px">${isSupabase ? 'O retorno do provedor cai em ' + esc(A.redirectTo) + ' (sempre 127.0.0.1, nunca localhost).' : 'Nenhum redirect é feito sem o adaptador Supabase.'}</p></div>
    <h3>Adaptadores</h3><div class="card">${A.adapters.map((a) => `<div class="row" style="margin:6px 0"><b style="flex:1">${esc(a.label)}</b><span class="muted" style="flex:1">${esc(a.mode)} · ${a.enabled ? 'ligado' : 'desligado'}${a.id === A.adapter ? ' · em uso' : ''} · ${a.configured ? 'variáveis presentes' : 'sem credencial'}</span></div>`).join('')}
    <p class="muted">${esc(A.note)}</p></div>`;
  bindCredits();
  const go = $('#loginGo'); if (go) go.onclick = async () => { const r = await post('/api/auth/login', { email: $('#loginEmail')?.value, password: $('#loginPass').value });
    if (!r.ok) { $('#loginRes').textContent = '⛔ ' + (r.body.error || 'falhou'); return; } toast('Bem-vindo.'); ST = null; location.hash = '/home'; };
  const su = $('#loginSignup'); if (su) su.onclick = async () => { const r = await post('/api/auth/signup', { email: $('#loginEmail')?.value, password: $('#loginPass').value });
    if (!r.ok) { $('#loginRes').textContent = '⛔ ' + (r.body.error || 'falhou'); return; }
    if (r.body.needsEmailConfirmation) { $('#loginRes').textContent = '✉️ ' + (r.body.message || 'Confirme seu e-mail antes de entrar.'); return; }
    toast('Conta criada.'); ST = null; location.hash = '/home'; };
  document.querySelectorAll('#loginPage [data-oauth]').forEach((b) => (b.onclick = () => { location.href = '/api/auth/oauth/' + b.dataset.oauth; }));
}
async function pageHelp() {
  const h = (await api('/api/help')).body;
  $('#main').innerHTML = `${credits()}<div class="page" id="helpCenter"><h1>${esc(h.title)}</h1><p class="muted">Página pública observada em <code>${esc(h.source)}</code>; conteúdo interno não foi capturado.</p><p>Central pública: <a href="${esc(h.publicUrl)}" target="_blank" rel="noreferrer">${esc(h.publicUrl)}</a></p><div class="blocked"><b>UNOBSERVED</b>: ${h.unobserved.map((x) => esc(x)).join(' · ')}. Nenhuma busca, artigo ou widget externo é inventado ou carregado aqui.</div><p class="muted">Contagens observadas: ${h.counts.links} links · ${h.counts.images} imagens · ${h.counts.videos} vídeos · ${h.counts.sections} seções.</p></div>`;
  bindCredits();
}
async function pageInspiration() {
  const s = (await api('/api/inspiration/state')).body;
  const areas = Object.entries(s.endpointAreas || {}).map(([area, eps]) => `<h2>${esc(area)}</h2><ul>${eps.map((e) => `<li><code>${esc(e)}</code> — contrato/resposta <b>UNOBSERVED</b></li>`).join('')}</ul>`).join('');
  $('#main').innerHTML = `${credits()}<div class="page" id="inspirationLocal"><h1>Inspiration · feed e desafios</h1><p>O inventário conhece nomes de endpoints para feed, curtidas, remix, publicações e desafios; nenhuma tela/feed capturado está neste checkout.</p><div class="blocked">Conteúdo não incluído. Sem cartões inventados, curtidas, remix ou chamadas a serviços externos.</div><ul>${(s.features || []).map((f) => `<li><code>${esc(f.id)}</code> — ${esc(f.label)}: <b>${esc(f.status)}</b></li>`).join('')}</ul><h2>Endpoints observados por área (nomes estáticos dos bundles)</h2>${areas}<p class="muted">${esc(s.note || '')}</p></div>`; bindCredits();
}
function pagePricing() {
  const questions = ['Há testes gratuitos disponíveis?', 'Qual é a diferença entre assinatura e créditos?', 'Quais são as diferenças entre a assinatura anual e a mensal?', 'Quais métodos de pagamento são aceitos?', 'Como usar os créditos do Pippit?', 'E se eu ficar sem créditos antes do final do mês?'];
  $('#main').innerHTML = `${credits()}<div class="page" id="pricingFaq"><h1>Preços e perguntas frequentes</h1><p class="muted">Lista de perguntas e cabeçalhos observada na página pública de preços. As respostas completas não foram preservadas neste checkout; não usar como cotação atual.</p><p class="muted" id="integrationsNote">Integrações: verificando…</p><p class="muted" id="faqEvidence">FAQ: verificando o que foi preservado…</p><button id="faqPlans" class="primary">Ver comparação local de planos</button><h2>Detalhes do plano</h2><h3>Créditos</h3><h2>Por que escolher o Pippit</h2><p class="blocked">Conteúdo desta seção não preservado na captura local — <b>UNOBSERVED</b>.</p><h2>Avaliações</h2><div id="reviewCarousel" class="card"><div class="row"><button id="revPrev" class="pill">Previous review</button><span id="revCount" class="muted">Show review 1</span><button id="revNext" class="pill">Next review</button></div><div class="row" id="revDots"></div><p class="blocked">Os textos das avaliações não foram preservados na captura local (5 revisões com navegação Previous/Next/Show review 1–5 observada) — conteúdo <b>UNOBSERVED</b>.</p></div><h2>Perguntas frequentes</h2>${questions.map((q, i) => `<details class="faq-item" data-faq="${i}"><summary>${esc(q)}</summary><p class="blocked">Texto integral da resposta não preservado na captura local; resposta <b>UNOBSERVED</b>.</p></details>`).join('')}<h2>Crie com asas Criação de conteúdo turbinada</h2><p class="blocked">Conteúdo desta seção não preservado na captura local — <b>UNOBSERVED</b>.</p><h2>O Agente de IA definitivo que facilita o marketing eficaz.</h2><p class="blocked">Conteúdo desta seção não preservado na captura local — <b>UNOBSERVED</b>.</p></div>`; bindCredits(); $('#faqPlans').onclick = plansModal;
  // Avaliações (carrossel observado: Previous/Next/Show review 1–5). Só a navegação é observada; os
  // textos das revisões nunca foram preservados — nada é inventado.
  let rev = 0; const revShow = () => { $('#revCount').textContent = `Show review ${rev + 1}`; $('#revDots').innerHTML = [1, 2, 3, 4, 5].map((n) => `<button class="pill" data-rev="${n}" ${n === rev + 1 ? 'aria-current="true"' : ''}>Show review ${n}</button>`).join(''); $('#revDots').querySelectorAll('[data-rev]').forEach((b) => (b.onclick = () => { rev = Number(b.dataset.rev) - 1; revShow(); })); };
  $('#revPrev').onclick = () => { rev = (rev + 4) % 5; revShow(); }; $('#revNext').onclick = () => { rev = (rev + 1) % 5; revShow(); }; revShow();
  // linha 78: as perguntas existem, as respostas não — dizer isso na tela em vez de deixar solto.
  (async () => { try { const q = (await api('/api/pricing/faq')).body; const n = $('#faqEvidence'); if (n) n.innerHTML = `${q.questions.length} perguntas preservadas; respostas: ${q.answers}; avaliações: ${q.ratings}; seções de recursos: ${q.featureSectionsContent}. Comparação de planos: ${q.planComparison}.`; } catch { const n = $('#faqEvidence'); if (n) n.textContent = 'FAQ: estado local indisponível.'; } })();
  // linha 77: a página de preços cita integração com marketplace, mas nenhuma tela existe; dizer isso na tela.
  (async () => { try { const i = (await api('/api/integrations')).body; const n = $('#integrationsNote'); if (n) n.innerHTML = `Integração com o mercado de vendas online: ${i.marketplace.status} — ${i.marketplace.note}. Redes sociais confirmadas: ${i.social.map((x) => x.label).join(', ')} (em <a href="#/publishing">Publicação</a>; OAuth real ${i.oauth}).`; } catch { const n = $('#integrationsNote'); if (n) n.textContent = 'Integrações: estado local indisponível.'; } })();
}
// Redesenho atrasado (setTimeout de um botão "Salvar") só vale se a tela que o agendou AINDA for a
// rota atual. Rodada 10, item 3: sem isso, o timer de Configurações > LLM disparava depois de o
// usuário navegar e pintava a tela de Configurações por cima da Home ou da tarefa do roteador
// (era o "element is not stable"/"detached from the DOM" da rodada 9 e o #localRunPage que não
// aparecia em 30 s). Rota diferente = o redesenho é descartado.
function repaintIfRoute(prefix, fn) { try { if (routeTarget().startsWith(prefix)) fn(); } catch (e) { console.error('redesenho:', e); } }

// ---------- roteador: uma renderização por vez ----------
// Rodada 9, item 4: a carga e o hashchange podiam chamar route_() em paralelo — uma rajada de
// mudanças de hash disparava uma execução por evento, e cada uma reescreve #main no fim. A mais
// antiga podia terminar depois da mais nova e trocar a tela debaixo do usuário (na suíte aparecia
// como "element is not stable" e "detached from the DOM"). Agora:
//   • só uma execução trabalha por vez; as chamadas que chegam no meio viram UMA nova execução;
//   • se o hash mudou durante os awaits, a execução antiga não desenha (quem desenha é a nova);
//   • window.__piperlineRoute expõe contadores para o teste provar que não há sobreposição.
function routeTarget() {
  const rawRoute = location.hash.replace(/^#/, '');
  const externalCanvas = rawRoute.startsWith('/nest-agent-project') ? rawRoute : location.pathname === '/nest-agent-project' ? `${location.pathname}${location.search}` : '';
  const externalQuery = externalCanvas.includes('?') ? externalCanvas.slice(externalCanvas.indexOf('?') + 1) : location.search.slice(1); const projectIdFromUrl = externalCanvas ? new URLSearchParams(externalQuery).get('projectId') : null;
  return projectIdFromUrl ? `/project/${projectIdFromUrl}` : rawRoute || '/home';
}
const routeDiag = { renders: 0, skipped: 0, concurrent: 0, maxConcurrent: 0, lastRoute: '' };
window.__piperlineRoute = routeDiag;
let routeBusy = false, routePending = false, routePendingForce = false;
// route_(): chamada explícita (depois de renomear um projeto, trocar de plano, ...) — sempre desenha.
// onHashChange(): o hash mudou. Se já houver renderização em curso, não empilha uma por evento: no
// fim, só desenha de novo se o alvo realmente mudou. Assim uma rajada de hash não redesenha a mesma
// tela duas vezes.
function route_() { runRoute(true); }
function onHashChange() { runRoute(false); }
function runRoute(force) {
  // routePending fica marcado mesmo quando o pedido é sem força: o hash mudou e alguém tem de
  // desenhar a rota nova; a força só decide se um redesenho da MESMA rota também vale.
  if (routeBusy) { routePending = true; routePendingForce = routePendingForce || force === true; return; }
  routeBusy = true; routeDiag.concurrent += 1; routeDiag.maxConcurrent = Math.max(routeDiag.maxConcurrent, routeDiag.concurrent);
  renderRoute().catch((e) => console.error('rota:', e)).finally(() => {
    routeDiag.concurrent -= 1; routeBusy = false;
    if (!routePending) return;
    const forced = routePendingForce; routePending = false; routePendingForce = false;
    if (forced || routeTarget() !== routeDiag.lastRoute) setTimeout(() => runRoute(forced), 0);
  });
}
// ---------- Portas de idade, aviso US, PWA e painel dev (#27) — TUDO por configuração (PIPPIT_AGE_GATE,
// PIPIT_US_NOTICE, PIPIT_PWA, PIPIT_DEV_PANEL). Desligado = a interface não muda. Textos reais UNOBSERVED.
async function ensureGates() {
  if (window.__gatesDone) return; window.__gatesDone = true;
  const g = (await api('/api/gates')).body || {}; window.__gates = g;
  if (g.age?.enabled && !localStorage.getItem('piperline_age_ok')) {
    const ov = document.createElement('div'); ov.id = 'ageGate'; ov.setAttribute('role', 'dialog');
    ov.innerHTML = `<div class="gate-card"><h2>${esc(g.age.title || 'Confirme sua idade')}</h2><p class="muted">${esc(g.age.text || '')} — entrada restrita a maiores de ${g.age.minAge} anos.</p>
      <div class="row"><input type="date" id="ageBirth" aria-label="Data de nascimento"><button id="ageOk" class="primary">Entrar</button></div><p class="blocked" id="ageErr"></p></div>`;
    document.body.append(ov);
    $('#ageOk').onclick = async () => {
      const r = await post('/api/gates/age/verify', { birthDate: $('#ageBirth').value });
      if (r.body?.allowed) { localStorage.setItem('piperline_age_ok', '1'); ov.remove(); }
      else $('#ageErr').textContent = r.body?.reason || 'não foi possível verificar';
    };
  }
  if (g.usNotice?.enabled) {
    const bar = document.createElement('div'); bar.id = 'usNotice';
    bar.innerHTML = `<span>${esc(g.usNotice.text || '')} (aviso US — texto real UNOBSERVED)</span><button id="usNoticeX" aria-label="Fechar">×</button>`;
    document.body.prepend(bar);
    $('#usNoticeX').onclick = () => bar.remove();
  }
  if (g.pwa?.enabled) {
    const link = document.createElement('link'); link.rel = 'manifest'; link.href = '/manifest.webmanifest'; document.head.append(link);
    if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('/sw.js'); } catch {} }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      const b = document.createElement('button'); b.id = 'pwaInstall'; b.className = 'pill'; b.textContent = g.pwa.installLabel || 'Instalar app';
      b.style.cssText = 'position:fixed; right:78px; bottom:26px; z-index:65;';
      b.onclick = async () => { b.remove(); e.prompt(); };
      document.body.append(b);
    });
  }
  if (g.devPanel?.enabled) window.__devPanelEnabled = true;
}
async function pageDev() {
  const d = (await api('/api/dev-panel')).body || {};
  $('#main').innerHTML = `${credits()}<div class="page" id="devPanel"><h1>Painel dev</h1><p class="muted">Ativado por configuração (PIPPIT_DEV_PANEL). Só presença/ausência de variáveis — nunca valores.</p><pre id="devJson">${esc(JSON.stringify(d, null, 2))}</pre></div>`;
}
// ---------- Chat legado (#3) SOMENTE LEITURA — leitor do formato conhecido (agent-chat); UNOBSERVED onde faltar.
async function pageLegacyChat() {
  $('#main').innerHTML = `${credits()}<div class="page" id="legacyChat"><h1>Chat legado</h1>
    <p class="muted">Somente leitura. O conteúdo real de conversas antigas não foi capturado — <b>UNOBSERVED</b>. Cole a conversa exportada (array, <code>{"{ messages: [] }"}</code> ou JSONL) e o leitor interpreta o formato.</p>
    <textarea id="lcText" rows="8" style="width:100%" placeholder='[{"role":"user","content":"…"}]'></textarea>
    <div class="row"><button id="lcRead" class="primary">Ler conversa</button><span class="muted" id="lcInfo"></span></div>
    <div id="lcOut"></div></div>`;
  $('#lcRead').onclick = async () => {
    let data = null; try { data = JSON.parse($('#lcText').value); } catch { data = $('#lcText').value; }
    const r = await post('/api/legacy-chat/read', { data });
    if (!r.body?.ok) { $('#lcOut').innerHTML = `<p class="blocked">${esc(r.body?.error || 'não foi possível ler')}</p>`; return; }
    $('#lcInfo').textContent = `${r.body.messages.length} mensagem(ns) — somente leitura`;
    $('#lcOut').innerHTML = r.body.messages.map((m) => `<div class="card" style="margin:8px 0"><b>${esc(m.role)}</b> <small class="muted">${esc(m.at || 'UNOBSERVED')}</small>
      <div>${esc(m.content)} ${m.content === 'UNOBSERVED' ? '<span class="blocked">UNOBSERVED</span>' : ''}</div></div>`).join('') + r.body.warnings.map((w) => `<p class="blocked">${esc(w)}</p>`).join('');
  };
}
// ---------- Widget de ajuda local (#19): botão flutuante, painel e conversa — MESMA interface genérica
// do widget de terceiros observado (kefu-im), mas 100% local e SEM token de terceiro. Textos do widget
// real UNOBSERVED; as respostas vêm da base local (app/lib/help_widget.mjs).
function ensureHelpWidget() {
  if (document.getElementById('helpWidgetBtn')) return;
  const btn = document.createElement('button'); btn.id = 'helpWidgetBtn'; btn.className = 'hw-btn'; btn.setAttribute('aria-label', 'Ajuda'); btn.title = 'Ajuda'; btn.textContent = '?';
  const panel = document.createElement('div'); panel.id = 'helpWidgetPanel'; panel.className = 'hw-panel'; panel.hidden = true;
  panel.innerHTML = `<div class="hw-head"><b id="hwTitle">Como podemos ajudar?</b><button id="hwClose" aria-label="Fechar">×</button></div>
    <div class="hw-msgs" id="helpWidgetMsgs"></div>
    <form class="hw-form" id="hwForm"><input id="hwInput" placeholder="Escreva sua dúvida…" autocomplete="off" aria-label="Mensagem"><button id="hwSend" class="primary">Enviar</button></form>
    <small class="hw-note">Widget local — sem atendimento de terceiros. Perguntas sem base local respondem como UNOBSERVED.</small>`;
  document.body.append(btn, panel);
  btn.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) document.getElementById('hwInput').focus(); };
  document.getElementById('hwClose').onclick = () => { panel.hidden = true; };
  document.getElementById('hwForm').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('hwInput'); const text = input.value.trim(); if (!text) return;
    const msgs = document.getElementById('helpWidgetMsgs');
    msgs.insertAdjacentHTML('beforeend', `<div class="hw-msg user">${esc(text)}</div>`); input.value = '';
    const r = await post('/api/help-widget/chat', { message: text }); const b = r.body || {};
    msgs.insertAdjacentHTML('beforeend', `<div class="hw-msg bot">${esc(b.reply || 'Não foi possível responder agora.')} ${b.confidence === 'unobserved' ? '<span class="blocked">UNOBSERVED</span>' : ''}</div>`);
    msgs.scrollTop = msgs.scrollHeight;
  };
}
// ---------- Integrações (linha #14): conexão com loja, importação de produto e envio de vídeo.
// A credencial vive SÓ no ambiente; a tela nunca mostra chave. O layout da tela do Pippit real não foi
// capturado — a estrutura local é funcional mas o conteúdo visual original é UNOBSERVED.
async function pageIntegrations() {
  $('#main').innerHTML = `${credits()}<div class="page" id="integrationsPage"><h1>Integrações</h1>
    <p class="muted">Loja/marketplace: conexão, importação de produto e envio de vídeo. Credencial no ambiente (<code>MARKETPLACE_BASE_URL</code> + <code>MARKETPLACE_API_KEY</code>). Layout da tela do Pippit real <b>UNOBSERVED</b>.</p>
    <div class="card"><h3>Loja</h3><div id="mktState">verificando…</div><button id="mktConnect" class="primary">Conectar loja</button></div>
    <div class="card"><h3>Produtos</h3><div class="row"><input id="mktProdId" placeholder="id do produto"><button id="mktImport">Importar produto</button><button id="mktList">Listar da loja</button></div><div id="mktProducts"></div></div>
    <div class="card"><h3>Enviar vídeo ao produto</h3><div class="row"><select id="mktAsset"></select><input id="mktProdAlvo" placeholder="id do produto"><input id="mktCaption" placeholder="legenda"></div><button id="mktSend" class="primary">Enviar vídeo</button><div id="mktSendOut"></div></div></div>`;
  const state = async () => {
    const s = (await api('/api/marketplace/status')).body || {};
    const el = $('#mktState'); if (!el) return s;
    el.innerHTML = `Conexão: <b>${s.connected ? `conectada${s.shop?.name ? ' — ' + esc(s.shop.name) : ''}` : 'desconectada'}</b> · configuração no ambiente: <b>${s.configured ? 'presente' : 'ausente'}</b> · produtos importados: <b>${(s.products || []).length}</b><br><small class="muted">${esc(s.note || '')}</small>`;
    return s;
  };
  const prods = (list) => { const el = $('#mktProducts'); if (el) el.innerHTML = (list || []).map((p) => `<div class="row"><b>${esc(p.id)}</b> ${esc(p.title)} — ${esc(String(p.price))} ${p.price === 'UNOBSERVED' ? '<span class="blocked">UNOBSERVED</span>' : ''}</div>`).join('') || '<p class="muted">nenhum produto</p>'; };
  const s0 = await state(); prods(s0.products);
  const assets = (await api('/api/assets')).body; const list = (assets && (assets.assets || assets)) || [];
  const vids = Array.isArray(list) ? list.filter((a) => a.kind === 'video') : [];
  $('#mktAsset').innerHTML = vids.map((a) => `<option value="${a.id}">${esc(a.name || a.id)}</option>`).join('') || '<option value="">nenhum vídeo nos ativos</option>';
  $('#mktConnect').onclick = async () => { const r = await post('/api/marketplace/connect', {}); $('#mktState').textContent = r.body?.ok ? 'Loja conectada.' : `Falha: ${r.body?.error || r.status}`; await state(); };
  $('#mktList').onclick = async () => { const r = await api('/api/marketplace/products'); if (r.body?.ok) prods(r.body.products); else $('#mktProducts').textContent = `Falha: ${r.body?.error || r.status}`; };
  $('#mktImport').onclick = async () => { const r = await post('/api/marketplace/products/import', { productId: $('#mktProdId').value }); $('#mktProducts').innerHTML = r.body?.ok ? `Importado: <b>${esc(r.body.product.id)}</b> ${esc(r.body.product.title)}` : `Falha: ${esc(r.body?.error || String(r.status))}`; await state(); };
  $('#mktSend').onclick = async () => {
    const r = await post('/api/marketplace/video', { productId: $('#mktProdAlvo').value, assetId: $('#mktAsset').value, caption: $('#mktCaption').value });
    $('#mktSendOut').innerHTML = r.body?.ok ? `Vídeo enviado (id remoto: ${esc(String(r.body.remoteId))}).` : `<span class="blocked">Falha: ${esc(r.body?.error || String(r.status))}</span>`;
  };
}
async function renderRoute() {
  const r = routeTarget();
  // login exigido? a tela de entrada vem antes de qualquer outra chamada (o resto da API responde 401)
  const authNow = (await api('/api/auth/state')).body || {};
  if (r !== routeTarget()) { routeDiag.skipped += 1; return; }
  if (authNow.required && !authNow.authenticated) { renderSide(r); routeDiag.renders += 1; routeDiag.lastRoute = r; return pageLogin(authNow); }
  if (!ST) await refresh(); else { ST = (await api('/api/state')).body; PROJECTS = (await api('/api/projects')).body; }
  NOTE_UNREAD = ((await api('/api/notifications')).body || {}).unread || 0;
  // a rota mudou enquanto buscávamos: esta execução está obsoleta, a próxima desenha o alvo certo
  if (r !== routeTarget()) { routeDiag.skipped += 1; return; }
  document.body.classList.toggle('cv-full', /^\/(project\/|ai-talking-photo)/.test(r)); document.documentElement.dataset.theme = ST.settings.theme === 'dark' ? 'dark' : 'light'; document.documentElement.lang = ST.settings.language || 'pt-BR';
  renderSide(r); track(r); ensureHelpWidget(); ensureGates();
  // Rodada 10, item 3: a rota só entra em lastRoute DEPOIS de pintar. Antes, lastRoute era gravado
  // antes do despacho: se a página falhasse (por exemplo GET /api/local-runs/<id> respondendo 404/500),
  // nada aparecia e a deduplicação do roteador tratava a rota como "já desenhada" — qualquer novo
  // hashchange para a mesma rota era descartado e a tela ficava parada até o teste estourar 30 s.
  try { await paintRoute(r); }
  catch (e) { console.error('rota:', e); paintRouteError(r, e); return; }
  routeDiag.renders += 1; routeDiag.lastRoute = r;
}
// Desenha a rota. Devolve a promessa da página (as páginas são async: o erro delas chega aqui).
function paintRoute(r) {
  const m = r.match(/^\/project\/(\d+)/); if (m) return pageProject(m[1]);
  const dm = r.match(/^\/direct\/(\d+)\/(\d+)\/([\w-]+)/); if (dm) return pageDirect(dm[1], dm[2], dm[3]);
  if (r.startsWith('/ai-talking-photo')) return pageTalkingPhoto(); if (r.startsWith('/assets')) return pageAssets(); if (r.startsWith('/skills')) return pageSkills(); if (r.startsWith('/smart')) return pageSmart(); if (r.startsWith('/avatars')) return pageAvatars();
  if (r.startsWith('/editor')) return pageEditor(r.split('/')[2]); if (r.startsWith('/marketing')) return pageMarketing(); if (r.startsWith('/templates')) return pageTemplates(); if (r.startsWith('/help')) return pageHelp(); if (r.startsWith('/omni')) return pageOmni(); if (r.startsWith('/inspiration')) return pageInspiration(); if (r.startsWith('/pricing')) return pagePricing(); if (r.startsWith('/story')) return pageStory(); if (r.startsWith('/gen')) return pageGen();
  const localRunMatch = r.match(/^\/tasks\/run\/([\w-]+)$/); if (localRunMatch) return pageLocalRun(localRunMatch[1]);
  if (r.startsWith('/settings')) return pageSettings(r.split('/')[2] || 'personal_information'); if (r.startsWith('/tasks')) return pageTasks(); if (r.startsWith('/analytics')) return pageSocial('analytics'); if (r.startsWith('/schedule')) return pageSocial('schedule');
  if (r.startsWith('/integrations')) return pageIntegrations(); if (r.startsWith('/dev')) return pageDev(); if (r.startsWith('/legacy-chat')) return pageLegacyChat(); if (r.startsWith('/world')) return pageWorld();
  if (r.startsWith('/login')) return pageLogin(); if (r.startsWith('/share/')) return pageShare(r.split('/')[2]); return pageHome();
}
// Falha ao desenhar uma tela: mostrar o motivo NA TELA (com "tentar de novo"), nunca deixar a tela
// anterior parada como se nada tivesse acontecido.
function paintRouteError(route, e) {
  try {
    const msg = String((e && e.message) || e || 'erro desconhecido').slice(0, 200);
    $('#main').innerHTML = `${credits()}<div class="page" id="routeError"><h1>Não foi possível abrir esta tela</h1>
      <p class="muted">Rota <code>${esc(route)}</code>: ${esc(msg)}</p>
      <p><button class="pill primary" id="routeRetry">Tentar de novo</button> <a href="#/home">Voltar para o início</a></p></div>`;
    const b = $('#routeRetry'); if (b) b.onclick = () => route_();
    if (window.__piperlineRoute) window.__piperlineRoute.lastError = { route, message: msg };
  } catch (e2) { console.error('rota (erro ao desenhar o erro):', e2); }
}
window.addEventListener('hashchange', onHashChange); onHashChange();
