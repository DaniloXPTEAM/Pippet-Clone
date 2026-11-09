# Chamadas de API OBSERVADAS por pagina (REA capture_browser_scenario com events=network): diretas + eventos "http" embutidos nos lotes de telemetria (Slardar).
# Uso: python observed_calls.py <pagina>=<nome-do-resultado> ...   -> acrescenta em notes/observed_calls.json (so metodo, caminho, status; sem valores)
import json, sys, base64, os, re, collections
OUT = r'C:\w\PiperLine\notes\observed_calls.json'
acc = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
for arg in sys.argv[1:]:
    page, name = arg.split('=')
    d = json.load(open(rf'C:\w\PiperLine\captures\audit\rea\{name}.json', encoding='utf-8'))
    items = d['normalized_result']['events']['items']
    calls = acc.setdefault(page, {})
    req = {}
    for it in items:
        if it['kind'] == 'request': req[it['transaction_id']] = (it['method'], it['url']['url'].split('?')[0])
        if it['kind'] == 'response' and it['transaction_id'] in req:
            m, u = req[it['transaction_id']]
            if re.search(r'/(api|lv|commerce|passport)/', u): calls[f"{m} {u.split('pippit.ai')[-1]}"] = it['status']
    for it in items:
        if it['kind'] != 'network-content' or it['phase'] != 'request' or it['body'].get('state') != 'captured': continue
        try: j = json.loads(base64.b64decode(it['body']['content']).decode('utf-8', 'ignore'))
        except Exception: continue
        if not isinstance(j, dict): continue
        for e in (j.get('list') or []):
            if isinstance(e, dict) and e.get('ev_type') == 'http':
                p = e['payload']; rq = p.get('request', {}); rs = p.get('response', {})
                u = rq.get('url', '').split('?')[0]
                if re.search(r'/(api|lv|commerce|passport)/', u): calls.setdefault(f"{str(rq.get('method')).upper()} {u.split('pippit.ai')[-1]}", rs.get('status'))
json.dump(acc, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for pg, c in acc.items(): print(pg, len(c))
