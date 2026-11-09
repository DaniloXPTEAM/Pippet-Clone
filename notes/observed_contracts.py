# Resume contratos OBSERVADOS (REA capture_browser_scenario com network.request_body/response_body) em FORMA (chaves/tipos), sem valores.
# Uso: python observed_contracts.py <nome1> [nome2 ...]   (le captures/audit/rea/<nome>.json) -> acrescenta em notes/observed_contracts.json
import json, sys, base64, os, re, collections
OUT = r'C:\w\PiperLine\notes\observed_contracts.json'
acc = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
def shape(o, d=0):
    if isinstance(o, dict): return {k: (shape(v, d + 1) if d < 3 else type(v).__name__) for k, v in list(o.items())[:40]}
    if isinstance(o, list): return [shape(o[0], d + 1), f'len={len(o)}'] if o else []
    if isinstance(o, bool): return 'bool'
    if isinstance(o, (int, float)): return 'num'
    if isinstance(o, str):
        return 'str' if len(o) > 24 or re.search(r'\d{6,}|token|sign', o, re.I) else f'str:{o}'
    return type(o).__name__
def body(it):
    b = it.get('body', {})
    if b.get('state') != 'captured': return None
    raw = b.get('content', '')
    try: raw = base64.b64decode(raw) if b.get('encoding') == 'base64' else raw.encode()
    except Exception: return None
    try: return json.loads(raw.decode('utf-8', 'ignore'))
    except Exception: return ('nao-json', len(raw))
for name in sys.argv[1:]:
    d = json.load(open(rf'C:\w\PiperLine\captures\audit\rea\{name}.json', encoding='utf-8'))
    items = d['normalized_result']['events']['items']
    tx = collections.defaultdict(dict)
    for it in items:
        t = it.get('transaction_id')
        if it['kind'] == 'request': tx[t]['method'] = it['method']; tx[t]['url'] = it['url']['url'].split('?')[0]
        elif it['kind'] == 'response': tx[t]['status'] = it['status']
        elif it['kind'] == 'network-content': tx[t]['req' if it['phase'] == 'request' else 'res'] = body(it)
    for t, x in tx.items():
        u = x.get('url', '')
        if not re.search(r'/(api|lv|commerce)/', u) or '/event/report' in u: continue
        path = '/' + u.split('pippit.ai/', 1)[-1]
        c = acc.setdefault(path, {'method': x.get('method'), 'status': set(), 'request_shape': None, 'response_shape': None, 'sources': set()})
        c['status'].add(x.get('status')); c['sources'].add(name)
        if x.get('req') is not None and c['request_shape'] is None: c['request_shape'] = shape(x['req']) if isinstance(x['req'], (dict, list)) else x['req']
        if x.get('res') is not None and c['response_shape'] is None: c['response_shape'] = shape(x['res']) if isinstance(x['res'], (dict, list)) else x['res']
ser = {p: {k: (sorted(v, key=str) if isinstance(v, set) else v) for k, v in c.items()} for p, c in acc.items()}
json.dump(ser, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(ser), 'endpoints com contrato observado')
for p, c in sorted(ser.items()): print(c['method'], p, c['status'], '| req:', json.dumps(c['request_shape'], ensure_ascii=False)[:90], '| res:', json.dumps(c['response_shape'], ensure_ascii=False)[:110])
