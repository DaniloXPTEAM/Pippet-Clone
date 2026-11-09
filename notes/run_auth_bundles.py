# Analise estatica (REA CLI 6.5.0) de cada bundle do app autenticado em scripts/auth_bundles -> evidence_cli/auth_bundles/<nome>.json
# Uso: python run_auth_bundles.py [workers]   Retoma: pula o que ja tem .json. Nao executa os scripts (so analise estatica).
import os, subprocess, sys, time, json, concurrent.futures as cf
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
SRC = r'C:\w\PiperLine\scripts\auth_bundles'
OUT = r'C:\w\PiperLine\evidence_cli\auth_bundles'
os.makedirs(OUT, exist_ok=True)
files = sorted(os.listdir(SRC), key=lambda f: (0 if not f.startswith('async__') else 1, os.path.getsize(os.path.join(SRC, f))))
LOG = os.path.join(OUT, '_run_log.tsv')
def run(f):
    o = os.path.join(OUT, f + '.json')
    if os.path.exists(o) and os.path.getsize(o) > 0: return f, 'skip', 0, 0
    t = time.time()
    env = dict(os.environ, NODE_OPTIONS='--max-old-space-size=4096')
    cmd = ['node', 'scripts/rea.mjs', 'analyze-javascript-application', SRC, '--source-path', f, '--max-heap-mb', '4096', '--analysis-timeout-ms', '600000', '--integrity-policy', 'record-and-continue', '--artifact-format', 'directory', '--format', 'json', '--full-output']
    try:
        with open(o, 'wb') as fo, open(o[:-5] + '.err', 'wb') as fe:
            r = subprocess.run(cmd, cwd=PKG, stdout=fo, stderr=fe, env=env, timeout=900)
        rc = r.returncode
    except subprocess.TimeoutExpired: rc = 'timeout'
    sz = os.path.getsize(o)
    with open(LOG, 'a', encoding='utf-8') as lg: lg.write(f'{f}\t{rc}\t{int(time.time()-t)}\t{sz}\n')
    return f, rc, int(time.time() - t), sz
w = int(sys.argv[1]) if len(sys.argv) > 1 else 3
with cf.ThreadPoolExecutor(w) as ex:
    for f, rc, s, sz in ex.map(run, files): print(f, rc, s, sz, flush=True)
print('FIM')
