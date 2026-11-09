# Confere, so com arquivos locais, quais dos 63 scripts / ativos de rede ausentes agora existem em scripts/.
import os, csv, collections
os.chdir(r'C:\w\PiperLine')
have = {}
for dp, _, fs in os.walk('scripts'):
    if os.sep + 'q' in dp.replace('recovered' + os.sep + 'get' + os.sep, '') and dp.endswith(os.sep + 'q'): continue
    for f in fs: have.setdefault(f, os.path.join(dp, f))
rows = list(csv.reader(open('notes/MISSING_SCRIPT_PRIORITY.csv', encoding='utf-8-sig')))[1:]
miss = [r for r in rows if r[1] not in have]
print(len(rows), 'scripts ausentes antes;', len(miss), 'ainda sem arquivo local')
for r in miss: print('  ', r[1], r[2], r[5])
a = list(csv.reader(open('notes/MISSING_NETWORK_ASSETS.csv', encoding='utf-8-sig')))
print(a[0])
still = collections.Counter(); tot = collections.Counter(); lst = []
for r in a[1:]:
    if r[6] == 'nao preservado':
        tot[r[2]] += 1
        b = os.path.basename(r[0].split('?')[0])
        if b not in have: still[r[2]] += 1; lst.append(r[0])
print('ausentes antes por tipo:', dict(tot))
print('ainda sem arquivo (por basename):', dict(still))
for u in lst[:40]: print('  ', u)
