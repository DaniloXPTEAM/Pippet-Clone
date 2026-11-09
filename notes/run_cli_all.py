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
jobs = [
 (B,'bat.js','bat'),
 (L,'modern-inline.js','landing_modern-inline'),(L,'modern-run-window-fn.js','landing_modern-run-window-fn'),(L,'react-inline-csp.js','landing_react-inline-csp'),
 (L,'js/route-manifest-main.d19e5232.js','landing_route-manifest-main'),(L,'js/argus-builder-strategy.da0ba176b5.js','landing_argus-builder-strategy'),
 (L,'js/builder-runtime.92e913169e.js','landing_builder-runtime'),(L,'js/async/921.c19cefee82.js','landing_async-921'),(L,'js/async/lv-user-login-sdk.3796387e7d.js','landing_lv-user-login-sdk'),
 (K,'upload/side-code/user-tracking-EKBFCCXL.js','kep_user-tracking'),
 (KS,'js/route-manifest-marketing-studio.faf46dfd.js','kep_route-manifest-marketing-studio'),(KS,'js/builder-runtime.183c44a8.js','kep_builder-runtime'),
 (KS,'js/171.2a1ea649.js','kep_171'),(KS,'js/386.1319fec8.js','kep_386'),(KS,'js/lib-router.6dad4cc6.js','kep_lib-router'),(KS,'js/lib-axios.29bed537.js','kep_lib-axios'),
 (P,'1.0.0.965/devtools.js','privacy_devtools'),(P,'1.0.0.965/core.js','privacy_core'),(P,'index.js','privacy_index'),
 (KS,'js/pricing.ec3e7ac7.js','kep_pricing'),(KS,'js/200.63bb53fe.js','kep_200'),
 (L,'js/lib-router.e2ea4c581e.js','landing_lib-router'),(L,'js/lib-react.ac0c27841f.js','landing_lib-react'),(KS,'js/lib-react.48190763.js','kep_lib-react'),
 (KS,'js/async/lv-cookie-consent.8b26699e.js','kep_lv-cookie-consent'),
 (L,'js/lib-polyfill.28d1c202ec.js','landing_lib-polyfill'),(KS,'js/lib-polyfill.086083a9.js','kep_lib-polyfill'),
 (U,'uifid-fingerprint-init.6709749a.js','uifid-fingerprint-init'),
 (L,'js/main.f77ba7085c.js','landing_main'),(L,'js/771.5a26a240f4.js','landing_771'),(KS,'js/69.885e370e.js','kep_69'),
]
OUT = r'C:\w\PiperLine\evidence_cli'
os.makedirs(OUT, exist_ok=True)
log = os.path.join(OUT, '_run_log.tsv')
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
