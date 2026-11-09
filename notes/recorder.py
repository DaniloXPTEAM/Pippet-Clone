# Gravador continuo PASSIVO pelo REA CLI (inspect-web-page + capture-web-screenshot): nao clica, nao navega, nao executa JS.
# A cada ciclo inspeciona as abas pippit.ai; quando o texto acessivel muda, salva a inspecao completa e um screenshot.
# Requisicoes vistas em cada janela de observacao vao para requests.jsonl. Parar: criar o arquivo STOP na pasta da sessao.
import json, os, subprocess, sys, time, hashlib, base64, re, urllib.request
ROOT = r'C:\w\PiperLine'
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
EP = 'http://127.0.0.1:9222'
label = sys.argv[1] if len(sys.argv) > 1 else time.strftime('rec_%H%M%S')
maxmin = float(sys.argv[2]) if len(sys.argv) > 2 else 40
D = os.path.join(ROOT, 'captures', 'auth', 'rec', label); os.makedirs(D, exist_ok=True)
log = open(os.path.join(D, 'rec.log'), 'a', encoding='utf-8', buffering=1)
def say(*a):
    log.write(time.strftime('%H:%M:%S ') + ' '.join(str(x) for x in a) + '\n')
def cli(args, timeout=60):
    r = subprocess.run(['node', 'scripts/rea.mjs'] + args, cwd=PKG, capture_output=True, timeout=timeout)
    return r.stdout.decode('utf-8', 'replace')
def pages():
    try: lst = json.load(urllib.request.urlopen(EP + '/json/list', timeout=4))
    except Exception: return []
    return [x for x in lst if x['type'] == 'page' and 'pippit.ai' in x['url']]
last = {}; n = 0; t0 = time.time(); seen_req = set()
say('inicio', label)
while time.time() - t0 < maxmin * 60 and not os.path.exists(os.path.join(D, 'STOP')):
    for pg in pages():
        tid = pg['id']
        try:
            out = cli(['inspect-web-page', EP, tid, '--include-accessibility-text', '--observation-ms', '1200', '--full-output', '--format', 'json'], 90)
            j = json.loads(out); d = (j.get('data') or j).get('normalized_result') or {}
        except Exception as e:
            say('erro inspect', tid[:6], repr(e)[:120]); continue
        names = [re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '<email>', (x.get('name') or '')) for x in d.get('accessibility', {}).get('nodes', [])]
        sig = hashlib.sha1('|'.join(names).encode()).hexdigest()
        for r in (d.get('network', {}).get('requests') or []):
            u = r.get('url') if isinstance(r.get('url'), str) else (r.get('url') or {}).get('url', '')
            key = (r.get('method'), u.split('?')[0], r.get('status'))
            if key not in seen_req:
                seen_req.add(key); open(os.path.join(D, 'requests.jsonl'), 'a', encoding='utf-8').write(json.dumps({'t': time.strftime('%H:%M:%S'), 'method': r.get('method'), 'url': u.split('?')[0], 'status': r.get('status')}, ensure_ascii=False) + '\n')
        if last.get(tid) != sig:
            last[tid] = sig; n += 1
            open(os.path.join(D, f'{n:03d}_{time.strftime("%H%M%S")}_inspect.json'), 'w', encoding='utf-8').write(out)
            try:
                so = cli(['capture-web-screenshot', EP, tid, '--full-output', '--format', 'json'], 60)
                sj = json.loads(so); a = ((sj.get('data') or sj).get('normalized_result') or {}).get('artifact', {})
                if a.get('data_base64'): open(os.path.join(D, f'{n:03d}_{time.strftime("%H%M%S")}.png'), 'wb').write(base64.b64decode(a['data_base64']))
            except Exception as e: say('erro screenshot', repr(e)[:100])
            say('MUDANCA', n, pg['url'][:90], 'nomes:', len(names))
    time.sleep(1.5)
say('fim')
