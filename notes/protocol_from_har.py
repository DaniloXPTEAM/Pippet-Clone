# Extrai dos HARs de captures/auth/autoroute os contratos (formas de corpo/resposta, ids, estados) dos endpoints do protocolo do agente.
# Saida: notes/protocol_contracts.md (secao pronta para o catalogo) — so formas e valores de enumeracao; ids/tokens viram <id>.
import json, re, collections
D = r'C:\w\PiperLine\captures\auth\autoroute'
HARS = ['send2.har', 'send3.har', 'erro_canvas.har', 'ok_canvas.har']
EP = ['batch_check_withhold_deduct', 'create_creative_project', 'get_thread', 'submit_run', 'get_run', 'subscribe_run', 'subscribe_thread',
      'generation_task_list', 'user_credit', 'sse_asset', 'subscribe_asset', 'batch_patch_asset', 'namespace_create', 'batch_generate_asset_id']

def j(x):
    try: return json.loads(x)
    except Exception: return None

def shape(o, d=0):
    if isinstance(o, dict): return {k: shape(v, d + 1) for k, v in o.items()} if d < 7 else '{...}'
    if isinstance(o, list): return [shape(o[0], d + 1), '...n=%d' % len(o)] if o else []
    if isinstance(o, str):
        x = j(o)
        if isinstance(x, (dict, list)): return {'json-string': shape(x, d + 1)}
        if re.fullmatch(r'[0-9a-f-]{36}', o): return '<uuid>'
        if re.fullmatch(r'\d{9,}', o): return '<id>'
        if o.startswith('http'): return '<url>'
        if re.fullmatch(r'\d+\.\d+\.\d+\.\d+', o): return '<ip>'
        if len(o) > 40 and re.fullmatch(r'[A-Za-z0-9+/=]+', o): return '<assinatura>'
        return o[:60]
    if isinstance(o, (int, float)) and not isinstance(o, bool) and abs(o) > 10**8: return '<num>'
    return o

by = collections.OrderedDict()
for h in HARS:
    for i, e in enumerate(json.load(open(D + '\\' + h, encoding='utf-8'))['log']['entries']):
        name = e['request']['url'].split('?')[0].split('/')[-1]
        if name in EP: by.setdefault(name, []).append((h, i, e))

out = ['## Contratos observados em execução (HARs `captures/auth/autoroute/*.har`; formas, não valores; ids → `<id>`)\n']
for name in EP:
    items = by.get(name, [])
    out.append(f'### `{name}` — {len(items)} ocorrência(s) em {sorted(set(h for h,_,_ in items))}\n')
    if not items: out.append('Não observado.\n'); continue
    h, i, e = items[0]
    q = (e['request'].get('postData') or {}).get('text', '')
    rq = j(q) if q else None
    out.append(f'- {e["request"]["method"]} `{e["request"]["url"].split("pippit.ai")[-1].split("?")[0]}` · status {sorted(set(x[2]["response"]["status"] for x in items))}')
    out.append('- Requisição: ' + ('`' + json.dumps(shape(rq), ensure_ascii=False)[:1600] + '`' if rq is not None else ('(sem corpo)' if not q else 'corpo não JSON (%d bytes)' % len(q))))
    c = e['response']['content']
    r = j(c.get('text') or '')
    if r is not None: out.append('- Resposta: `' + json.dumps(shape(r), ensure_ascii=False)[:1800] + '`')
    else: out.append('- Resposta: ' + (c.get('comment') or 'sem corpo') + ' — **conteúdo desconhecido**')
    # estados/valores variaveis
    if name in ('get_run', 'get_thread', 'submit_run'):
        sts = set()
        for _, _, x in items:
            rr = j(x['response']['content'].get('text') or '') or {}
            run = (rr.get('data') or {}).get('run') or (((rr.get('data') or {}).get('thread') or {}).get('run_list') or [None])[0]
            if run: sts.add(run.get('state'))
        out.append(f'- `run.state` observados: {sorted(sts, key=str)}')
    out.append('')
open(r'C:\w\PiperLine\notes\protocol_contracts.md', 'w', encoding='utf-8').write('\n'.join(out))
print('ok', {k: len(v) for k, v in by.items()})
