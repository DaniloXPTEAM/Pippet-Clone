// Inventário completo por AST de TODOS os .js públicos salvos (percorre cada nó). Só leitura; nada é executado.
// Segredos: strings com cara de chave/segredo/token NÃO são gravadas (apenas contadas).
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const ROOT = 'C:\\w\\PiperLine\\scripts\\raw';
const OUT = 'C:\\w\\PiperLine\\notes\\ast_inventory';
fs.mkdirSync(OUT, { recursive: true });

const files = [];
(function walkDir(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walkDir(p); else if (e.name.endsWith('.js')) files.push(p); } })(ROOT);

const SECRET = /(secret|passw(or)?d|private[_-]?key|api[_-]?key|access[_-]?token|bearer\s|authorization)/i;
const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'request']);
const rel = (p) => p.replace(ROOT + '\\', '');

function inventory(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast, mode = 'script';
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true, allowReturnOutsideFunction: true }); }
  catch { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); mode = 'module'; }

  const inv = { arquivo: rel(file), bytes: Buffer.byteLength(src), parse: mode, nos: 0, strings_total: 0, segredo_like_ignoradas: 0,
    urls: new Set(), dominios: new Set(), caminhos_api: new Set(), rotas_path: new Set(),
    chamadas_http: [], fetch: [], xhr_open: [], beacon: [], websocket: [], storage: new Set(), eventos: new Set(), globais_window: new Set(),
    postMessage: 0, cookie_refs: 0, indexeddb: 0, serviceworker: 0, worker: 0, dynamic_import: 0, lazy: 0,
    chaves_i18n_usadas: new Set(), modulos_webpack: 0 };

  const addStr = (s) => {
    inv.strings_total++;
    if (SECRET.test(s)) { inv.segredo_like_ignoradas++; return; }
    if (/^https?:\/\//i.test(s) || /^\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) {
      const clean = s.split('?')[0].slice(0, 220); inv.urls.add(clean);
      const m = clean.match(/^(?:https?:)?\/\/([^/]+)/i); if (m) inv.dominios.add(m[1]);
    } else if (/^\/[A-Za-z0-9_\-./{}:]+$/.test(s) && s.length > 3 && /(api|\/v\d|\/lv\/|service|monitor|collect|passport|login|user|config|report|event|upload|download|search)/i.test(s)) {
      inv.caminhos_api.add(s.slice(0, 160));
    }
    if (/^(Pippit|pp|pippit|web|cc4b|ppseo)_[A-Za-z0-9_]{6,}$/.test(s)) inv.chaves_i18n_usadas.add(s);
  };
  const strOf = (n) => !n ? null : n.type === 'Literal' && typeof n.value === 'string' ? n.value
    : n.type === 'TemplateLiteral' ? n.quasis.map((q) => q.value.cooked).join('${}') : null;
  const calleeName = (c) => c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' ? ((c.object.type === 'Identifier' ? c.object.name : (c.object.type === 'ThisExpression' ? 'this' : '…')) + '.' + (c.property.name || c.property.value || '?')) : '?';

  const stack = [ast];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n.type !== 'string') continue;
    inv.nos++;
    switch (n.type) {
      case 'Literal': if (typeof n.value === 'string') addStr(n.value); break;
      case 'TemplateLiteral': { const t = strOf(n); if (t && t.length < 300) addStr(t); break; }
      case 'ImportExpression': inv.dynamic_import++; break;
      case 'CallExpression': case 'NewExpression': {
        const cn = calleeName(n.callee); const a0 = strOf(n.arguments[0]); const a1 = strOf(n.arguments[1]);
        if (cn === 'fetch' || /(\.|^)fetch$/.test(cn)) { if (a0 && !SECRET.test(a0)) inv.fetch.push(a0.split('?')[0].slice(0, 200)); else inv.fetch.push('(dinâmico)'); }
        else if (/\.open$/.test(cn) && a0 && /^(GET|POST|PUT|DELETE|PATCH|HEAD)$/i.test(a0) && a1) inv.xhr_open.push(a0.toUpperCase() + ' ' + a1.split('?')[0].slice(0, 200));
        else if (/sendBeacon$/.test(cn)) inv.beacon.push(a0 ? a0.split('?')[0].slice(0, 200) : '(dinâmico)');
        else if (n.type === 'NewExpression' && cn === 'WebSocket') inv.websocket.push(a0 || '(dinâmico)');
        else if (n.type === 'NewExpression' && cn === 'Worker') inv.worker++;
        else if (/(getItem|setItem|removeItem)$/.test(cn) && /(local|session)Storage|storage|Storage/.test(cn + (n.callee.object?.name || '')) && a0 && !SECRET.test(a0)) inv.storage.add(cn.split('.').pop() + ':' + a0.slice(0, 80));
        else if (/addEventListener$/.test(cn) && a0) inv.eventos.add(a0.slice(0, 60));
        else if (/postMessage$/.test(cn)) inv.postMessage++;
        else if (/indexedDB\.open$/.test(cn)) inv.indexeddb++;
        else if (/\.lazy$|^lazy$/.test(cn)) inv.lazy++;
        else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && HTTP_METHODS.has(n.callee.property.name) && a0 && /^\/|^https?:/.test(a0) && !SECRET.test(a0))
          inv.chamadas_http.push(n.callee.property.name.toUpperCase() + ' ' + a0.split('?')[0].slice(0, 200) + ' [' + calleeName(n.callee) + ']');
        break;
      }
      case 'MemberExpression':
        if (n.property && !n.computed) { if (n.property.name === 'cookie' && n.object.name === 'document') inv.cookie_refs++; if (n.property.name === 'serviceWorker') inv.serviceworker++; }
        break;
      case 'AssignmentExpression':
        if (n.left.type === 'MemberExpression' && !n.left.computed && n.left.object.type === 'Identifier' && /^(window|globalThis|self)$/.test(n.left.object.name) && n.left.property.name) inv.globais_window.add(n.left.property.name);
        break;
      case 'Property':
        if (!n.computed && n.key && (n.key.name === 'path' || n.key.value === 'path') && n.value.type === 'Literal' && typeof n.value.value === 'string') inv.rotas_path.add(n.value.value.slice(0, 120));
        break;
      case 'ObjectExpression': {
        const fp = n.properties.filter((p) => p.type === 'Property' && (p.value.type === 'FunctionExpression' || p.value.type === 'ArrowFunctionExpression')).length;
        if (fp >= 8) inv.modulos_webpack = Math.max(inv.modulos_webpack, fp);
        break;
      }
    }
    for (const k in n) {
      if (k === 'type' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) { for (let i = v.length - 1; i >= 0; i--) if (v[i] && typeof v[i].type === 'string') stack.push(v[i]); }
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
  const dedupe = (a) => [...new Set(a)];
  return { ...inv, urls: [...inv.urls].sort(), dominios: [...inv.dominios].sort(), caminhos_api: [...inv.caminhos_api].sort(), rotas_path: [...inv.rotas_path].sort(),
    chamadas_http: dedupe(inv.chamadas_http), fetch: dedupe(inv.fetch), xhr_open: dedupe(inv.xhr_open), beacon: dedupe(inv.beacon), websocket: dedupe(inv.websocket),
    storage: [...inv.storage].sort(), eventos: [...inv.eventos].sort(), globais_window: [...inv.globais_window].sort(), chaves_i18n_usadas: inv.chaves_i18n_usadas.size };
}

const resumo = [];
for (const f of files) {
  try {
    const r = inventory(f);
    fs.writeFileSync(path.join(OUT, path.basename(f) + '.json'), JSON.stringify(r, null, 1), 'utf8');
    resumo.push({ f: r.arquivo.split('\\').slice(-1)[0], kb: Math.round(r.bytes / 1024), nos: r.nos, str: r.strings_total, urls: r.urls.length, dom: r.dominios.length, api: r.caminhos_api.length, fetch: r.fetch.length, xhr: r.xhr_open.length, http: r.chamadas_http.length, rotas: r.rotas_path.length, stor: r.storage.length, ev: r.eventos.length, glob: r.globais_window.length, mods: r.modulos_webpack, seg: r.segredo_like_ignoradas, modo: r.parse });
  } catch (e) { resumo.push({ f: path.basename(f), erro: String(e.message).slice(0, 80) }); }
}
fs.writeFileSync(path.join(OUT, '_resumo.json'), JSON.stringify(resumo, null, 1));
console.log(JSON.stringify({ arquivos: files.length, ok: resumo.filter((x) => !x.erro).length, erros: resumo.filter((x) => x.erro), total_nos: resumo.reduce((a, x) => a + (x.nos || 0), 0) }));
