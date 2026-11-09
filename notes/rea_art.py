# Extrai texto de acessibilidade e screenshot do ultimo passo de um resultado REA salvo em captures/audit/rea/<nome>.json
import base64, json, sys
name = sys.argv[1]; base = 'C:/w/PiperLine/captures/audit/rea/'
d = json.load(open(base + name + '.json', encoding='utf-8')); n = d['normalized_result']
print('evidence_id', d['evidence_id'], 'completeness', n['completeness']['status'])
for s in n['steps']:
    a = s['artifacts']; tag = s['step_id']
    if a.get('accessibility', {}).get('state') == 'captured':
        open(f'{base}{name}_{tag}.a11y.txt', 'w', encoding='utf-8').write(a['accessibility']['value']['text']); print(tag, 'a11y', a['accessibility']['value']['bytes'], 'bytes')
    if a.get('screenshot', {}).get('state') == 'captured':
        open(f'{base}{name}_{tag}.png', 'wb').write(base64.b64decode(a['screenshot']['value']['data_base64'])); print(tag, 'png')
