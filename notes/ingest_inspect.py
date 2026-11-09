# Uso: python ingest_inspect.py <nome_em_tool-results.txt> <rotulo>
# Copia a inspecao passiva do REA para captures/auth/inspect_<rotulo>.json e imprime os nomes acessiveis em ordem de arvore
# (e-mails mascarados), para ler tooltips/tours/menus abertos no momento.
import json, re, sys, os, shutil, collections
os.chdir(r'C:\w\PiperLine')
src, label = sys.argv[1], sys.argv[2]
BASE = (r'C:\Users\Dannilo\.claude\projects\C--Users-Dannilo-AppData-Local-Claude-Data-claude-pzs8sxrjxfjjc-scratch-workspaces-'
        r'89e4551d-c901-4c2c-8348-ed9b81a95af0-a167d6e0-8432-4079-85d5-aeb7dbe5002c-scratch-2026-10-15-039b86'
        r'\c4f509bb-5c0b-4107-9fd7-0f1b4dcd4831\tool-results')
if not os.path.exists(src):
    src = '\\\\?\\' + BASE + '\\' + src
dst = f'captures/auth/inspect_{label}.json'
shutil.copyfile(src, dst)
d = json.load(open(dst, encoding='utf-8'))['normalized_result']
print(d['target']['url'])
nodes = d['accessibility']['nodes']
by = {n['node_id']: n for n in nodes}
ch = collections.defaultdict(list)
for n in nodes:
    ch[n['parent_id']].append(n['node_id'])
roots = [n['node_id'] for n in nodes if n['parent_id'] is None or n['parent_id'] not in by]
out = []
def walk(i, dep):
    n = by[i]; nm = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '<email>', (n.get('name') or '').strip()); r = n['role']
    if r not in ('InlineTextBox',) and nm and not n.get('ignored') and r != 'none':
        out.append('  ' * min(dep, 8) + f'{r}: {nm[:160]}')
    for c in ch[i]:
        walk(c, dep + 1)
for r in roots:
    walk(r, 0)
txt = '\n'.join(out)
open(f'captures/auth/inspect_{label}.txt', 'w', encoding='utf-8').write(txt)
print(len(out), 'linhas ->', f'captures/auth/inspect_{label}.txt')
