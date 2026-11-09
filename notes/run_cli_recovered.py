# Roda a CLI do REA (rea-agents 6.5.0) em cada JS recuperado (scripts/recovered, sem a pasta q/), deduplicando por sha256 e
# pulando o que ja foi analisado a partir de scripts/raw. Saida: evidence_cli/recovered/<nome>.json + _run_log_recovered.tsv
import subprocess, time, os, re, sys, hashlib, json, csv
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
ROOT = r'C:\w\PiperLine'
OUT = os.path.join(ROOT, 'evidence_cli', 'recovered')
os.makedirs(OUT, exist_ok=True)
PFX = '\\\\?\\'
L = lambda p: p if p.startswith(PFX) else PFX + os.path.abspath(p)
def sha(p):
    h = hashlib.sha256()
    with open(L(p), 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
seen = {}
for dp, _, fs in os.walk(os.path.join(ROOT, 'scripts', 'raw')):
    for f in fs:
        if f.endswith('.js'): seen[sha(os.path.join(dp, f))] = 'raw:' + f
jobs = []
for dp, dn, fs in os.walk(os.path.join(ROOT, 'scripts', 'recovered')):
    dn[:] = [d for d in dn if d != 'q']
    for f in sorted(fs):
        p = os.path.join(dp, f)
        rel = os.path.relpath(p, os.path.join(ROOT, 'scripts', 'recovered')).replace('\\', '/')
        if not (f.endswith('.js') or rel.endswith('/js') or f == 'gtm.js'): continue
        h = sha(p)
        if h in seen: continue
        seen[h] = rel
        if len(p) > 230:  # caminho longo demais para o node: copia (o original fica) para uma pasta curta
            q = os.path.join(ROOT, 'scripts', 'stage_short', h[:10], f)
            os.makedirs(os.path.dirname(q), exist_ok=True)
            if not os.path.exists(q):
                import shutil; shutil.copyfile(L(p), q)
            p = q
        jobs.append((p, rel, h))
name_of = lambda rel: re.sub(r'[^A-Za-z0-9._-]+', '_', rel)[-150:]
json.dump([(r, h, os.path.getsize(L(p))) for p, r, h in jobs], open(os.path.join(ROOT, 'notes', '_recovered_jobs.json'), 'w'), indent=0)
print(len(jobs), 'jobs unicos')
if len(sys.argv) > 1 and sys.argv[1] == 'list': sys.exit()
log = os.path.join(OUT, '_run_log_recovered.tsv')
done = set()
if os.path.exists(log):
    for l in open(log, encoding='utf-8'):
        p = l.split('\t')
        if len(p) > 3 and p[1] == '0': done.add(p[0])
heap = '3072'
for p, rel, h in sorted(jobs, key=lambda j: os.path.getsize(L(j[0]))):
    nm = name_of(rel)
    if nm in done: continue
    out = os.path.join(OUT, nm + '.json'); t = time.time()
    with open(out, 'wb') as fo, open(os.path.join(OUT, nm + '.err'), 'wb') as fe:
        rc = subprocess.call(['node', 'scripts/rea.mjs', 'analyze-javascript-application', os.path.dirname(p), '--source-path', os.path.basename(p),
            '--max-semantic-nodes', '1000000', '--max-semantic-nodes-per-file', '1000000', '--max-heap-mb', heap,
            '--analysis-timeout-ms', '1800000', '--integrity-policy', 'record-and-continue', '--artifact-format', 'directory',
            '--format', 'json', '--full-output'], cwd=PKG, stdout=fo, stderr=fe)
    sz = os.path.getsize(out); txt = open(out, 'rb').read() if sz < 900_000_000 else b''
    trunc = len(re.findall(rb'"truncated":\s*true', txt)); rc_c = txt.count(b'Resource constraint')
    m = re.search(rb'"visited_ast_nodes":\s*(\d+)', txt)
    with open(log, 'a', encoding='utf-8') as f:
        f.write(f"{nm}\t{rc}\t{round(time.time()-t)}\t{sz}\t{m.group(1).decode() if m else '?'}\t{trunc}\t{rc_c}\t{os.path.getsize(L(p))}\t{rel}\n")
