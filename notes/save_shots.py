# Salva os screenshots (data_base64) de uma ou mais capturas REA em screenshots/auth/<rotulo>_<passo>.png
import json, base64, os, sys, glob
os.chdir(r'C:\w\PiperLine')
os.makedirs('screenshots/auth', exist_ok=True)
pats = sys.argv[1:] or ['captures/auth/scenario_*.json']
for pat in pats:
    for f in glob.glob(pat):
        label = os.path.basename(f)[len('scenario_'):-5]
        try:
            j = json.load(open(f, encoding='utf-8'))
            d = (j.get('data') or j).get('normalized_result') or j['normalized_result']
        except Exception as e:
            continue
        for s in d.get('steps', []):
            a = s['artifacts'].get('screenshot', {})
            if a.get('state') == 'captured':
                out = f"screenshots/auth/{label}_{s['step_id']}.png"
                open(out, 'wb').write(base64.b64decode(a['value']['data_base64']))
                print(out)
