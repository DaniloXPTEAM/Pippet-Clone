# Uso: python ingest_scenario.py <nome_do_arquivo_em_tool-results.txt> <rotulo>
# Copia o resultado do REA para captures/auth/scenario_<rotulo>.json e grava um .txt por passo (acessibilidade, e-mails mascarados)
# em captures/auth/<rotulo>/. Imprime passo, status e URL.
import json, re, sys, os, shutil
os.chdir(r'C:\w\PiperLine')
src, label = sys.argv[1], sys.argv[2]
BASE = (r'C:\Users\Dannilo\.claude\projects\C--Users-Dannilo-AppData-Local-Claude-Data-claude-pzs8sxrjxfjjc-scratch-workspaces-'
        r'89e4551d-c901-4c2c-8348-ed9b81a95af0-a167d6e0-8432-4079-85d5-aeb7dbe5002c-scratch-2026-10-15-039b86'
        r'\c4f509bb-5c0b-4107-9fd7-0f1b4dcd4831\tool-results')
if not os.path.exists(src):
    src = '\\\\?\\' + BASE + '\\' + src
dst = f'captures/auth/scenario_{label}.json'
shutil.copyfile(src, dst)
d = json.load(open(dst, encoding='utf-8'))['normalized_result']
os.makedirs(f'captures/auth/{label}', exist_ok=True)
for s in d['steps']:
    err = (s.get('error') or '')[:100].replace('\n', ' ')
    print(f"{s['step_id']:<24}{s['status']:<10}{s['after_url']['url'][:100]}  {err}")
    a = s['artifacts'].get('accessibility', {})
    if a.get('state') == 'captured':
        t = re.sub(r'[\w.+-]+@[\w-]+\.[\w.]+', '<email>', a['value']['text'])
        open(f"captures/auth/{label}/{s['step_id']}.txt", 'w', encoding='utf-8').write(t)
