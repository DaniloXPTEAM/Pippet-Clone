# Roda a CLI do REA (rea-agents 6.5.0, do cache local) em cada um dos 31 scripts ORIGINAIS, gravando a saida completa em evidence_cli/.
import subprocess, time, os, re, sys, json
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
RAW = r'C:\w\PiperLine\scripts\raw'
L = RAW + r'\sf16-ug-neutral.capcutstatic.com\obj\seeyou-us\growth\pippit\landing_page\static'
K = RAW + r'\sf16-web-login-neutral.capcutstatic.com\obj\capcut-web-login-static\growth\pippit\kep'
KS = K + r'\static'
U = RAW + r'\sf16-web-login-neutral.capcutstatic.com\obj\capcut-web-login-static\ies\ccweb\scm_storage\iife\uifid-fingerprint-init'
P = RAW + r'\sf16-web-login-neutral.capcutstatic.com\obj\capcut-web-login-static\tiktok_privacy_protection_framework\loader\atsx'
B = RAW + r'\bat.bing.com'

SP = r'C:\w\PiperLine\scripts\split'
import glob
jobs=[]
for d,tag in [('landing_polyfill','landing_lib-polyfill'),('kep_polyfill','kep_lib-polyfill'),('uifid','uifid-fingerprint-init'),('landing_771','landing_771'),('kep_69','kep_69')]:
    for f in sorted(glob.glob(os.path.join(SP,d,'*.js'))):   # so arquivos de topo (pecas originais por modulo)
        b=os.path.basename(f); jobs.append((os.path.join(SP,d),b,tag+'__'+b.replace('.js','').split('__')[-1]))
OUT = r'C:\w\PiperLine\evidence_cli\pecas'

os.makedirs(OUT, exist_ok=True)
log = os.path.join(OUT, '_run_log_pecas.tsv')
done = set()
if os.path.exists(log):
    for l in open(log, encoding='utf-8'):
        p = l.split('\t'); 
        if len(p) > 3 and p[1] == '0' and p[5] == '0' and p[6] == '0': done.add(p[0])
heap = sys.argv[1] if len(sys.argv) > 1 else '3072'
for root, src, name in jobs:
    if name in done: continue
    out = os.path.join(OUT, name + '.json'); t = time.time()
    with open(out, 'wb') as fo, open(os.path.join(OUT, name + '.err'), 'wb') as fe:
        rc = subprocess.call(['node', 'scripts/rea.mjs', 'analyze-javascript-application', root, '--source-path', src,
            '--max-semantic-nodes', '1000000', '--max-semantic-nodes-per-file', '1000000', '--max-heap-mb', heap,
            '--analysis-timeout-ms', '1800000', '--integrity-policy', 'record-and-continue', '--artifact-format', 'directory',
            '--format', 'json', '--full-output'], cwd=PKG, stdout=fo, stderr=fe)
    sz = os.path.getsize(out); txt = open(out, 'rb').read() if sz < 900_000_000 else b''
    trunc = len(re.findall(rb'"truncated":\s*true', txt)); rc_c = txt.count(b'Resource constraint')
    m = re.search(rb'"visited_ast_nodes":\s*(\d+)', txt)
    with open(log, 'a', encoding='utf-8') as f:
        f.write(f"{name}\t{rc}\t{round(time.time()-t)}\t{sz}\t{m.group(1).decode() if m else '?'}\t{trunc}\t{rc_c}\n")
