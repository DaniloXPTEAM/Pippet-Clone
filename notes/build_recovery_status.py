# Gera notes/RECOVERY_STATUS.csv (63 scripts ausentes -> arquivo local, sha256, saida do REA) e evidence_cli/recovered/INDEX.md
import os, csv, json, hashlib, re
os.chdir(r'C:\w\PiperLine')
PFX = '\\\\?\\'
L = lambda p: PFX + os.path.abspath(p)
def sha(p):
    h = hashlib.sha256()
    with open(L(p), 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
loc = {}
for dp, _, fs in os.walk('scripts'):
    if dp.replace('/', os.sep).endswith(os.sep + 'q') or 'stage_short' in dp or 'split' in dp: continue
    for f in fs: loc.setdefault(f, []).append(os.path.join(dp, f))
log = {}
for l in open('evidence_cli/recovered/_run_log_recovered.tsv', encoding='utf-8'):
    p = l.rstrip('\n').split('\t'); log[p[0]] = p
jobs = {h: r for r, h, s in json.load(open('notes/_recovered_jobs.json'))}
pieces_dirs = {'4017': 'cms_4017', 'lib-polyfill.ac9fc4ec': 'cms_polyfill', 'default.no-tea.esm': 'cookiebanner', 'gtm.js': 'gtm'}
name_of = lambda rel: re.sub(r'[^A-Za-z0-9._-]+', '_', rel)[-150:]
byhash = {}
for rel, h in [(r, h) for h, r in jobs.items()]: byhash[rel] = h
rows = list(csv.reader(open('notes/MISSING_SCRIPT_PRIORITY.csv', encoding='utf-8-sig')))[1:]
out = [['Nome', 'App', 'Categoria', 'arquivo_local', 'bytes', 'sha256', 'saida_REA', 'situacao_REA']]
for r in rows:
    b = r[1]; paths = loc.get(b, [])
    if not paths: out.append([b, r[2], r[5], 'AUSENTE', '', '', '', 'AUSENTE']); continue
    p = paths[0]; h = sha(p)
    rel = jobs.get(h); outn = ''; sit = 'duplicata de arquivo ja analisado (mesmo sha256)'
    if rel:
        nm = name_of(rel); outn = 'evidence_cli/recovered/' + nm + '.json'
        row = log.get(nm)
        if row and row[5] == '0' and row[6] == '0': sit = 'completo (inteiro, sem truncamento)'
        elif row: sit = 'inteiro truncado; coberto por pecas em evidence_cli/recovered_pecas/'
    out.append([b, r[2], r[5], p.replace('\\', '/'), os.path.getsize(L(p)), h, outn, sit])
csv.writer(open('notes/RECOVERY_STATUS.csv', 'w', newline='', encoding='utf-8-sig')).writerows(out)
import collections
print(len(out) - 1, collections.Counter(o[7] for o in out[1:]))
