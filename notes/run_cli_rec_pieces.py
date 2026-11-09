# REA CLI sobre pecas (scripts/split_rec/*) dos scripts recuperados que estouraram o orcamento, mais gtag.js (extensao corrigida).
import subprocess, time, os, re, sys, glob
PKG = r'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
ROOT = r'C:\w\PiperLine'
OUT = ROOT + r'\evidence_cli\recovered_pecas'; os.makedirs(OUT, exist_ok=True)
jobs = [(ROOT + r'\scripts\stage_short\gtag', 'gtag.js', 'gtag_js')]
for d in sorted(glob.glob(ROOT + r'\scripts\split_rec\*')):
    for f in sorted(glob.glob(d + r'\*.js')):
        jobs.append((d, os.path.basename(f), os.path.basename(d) + '__' + os.path.basename(f)[:-3].split('__')[-1]))
log = OUT + r'\_run_log.tsv'; done = set()
if os.path.exists(log):
    for l in open(log, encoding='utf-8'):
        p = l.split('\t')
        if len(p) > 6: done.add(p[0])
for root, src, name in jobs:
    if name in done: continue
    out = os.path.join(OUT, name + '.json'); t = time.time()
    with open(out, 'wb') as fo, open(os.path.join(OUT, name + '.err'), 'wb') as fe:
        rc = subprocess.call(['node', 'scripts/rea.mjs', 'analyze-javascript-application', root, '--source-path', src,
            '--max-semantic-nodes', '1000000', '--max-semantic-nodes-per-file', '1000000', '--max-heap-mb', '3072',
            '--analysis-timeout-ms', '1800000', '--integrity-policy', 'record-and-continue', '--artifact-format', 'directory',
            '--format', 'json', '--full-output'], cwd=PKG, stdout=fo, stderr=fe)
    sz = os.path.getsize(out); txt = open(out, 'rb').read() if sz < 900_000_000 else b''
    trunc = len(re.findall(rb'"truncated":\s*true', txt)); rc_c = txt.count(b'Resource constraint')
    m = re.search(rb'"visited_ast_nodes":\s*(\d+)', txt)
    with open(log, 'a', encoding='utf-8') as f:
        f.write(f"{name}\t{rc}\t{round(time.time()-t)}\t{sz}\t{m.group(1).decode() if m else '?'}\t{trunc}\t{rc_c}\n")
