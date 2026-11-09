# Extrai dos bundles autenticados os textos i18n (en) das skills do Pippit -> notes/auth_skill_strings.json (regras de criação/pacote/upload/limites).
import re, glob, json, os
SRC = r'C:\w\PiperLine\scripts\auth_bundles'
pat = re.compile(r'"(Pippit_(?:xyqweb_)?skill[A-Za-z0-9_]*)":"((?:[^"\\]|\\.)*)"')
out = {}
for f in glob.glob(os.path.join(SRC, '*.js')):
    s = open(f, encoding='utf-8', errors='ignore').read()
    for k, v in pat.findall(s): out[k] = v.replace('\\"', '"').replace('\\n', '\n')
json.dump(out, open(r'C:\w\PiperLine\notes\auth_skill_strings.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
print(len(out), 'strings')
for k in sorted(out):
    if re.search(r'create|package|upload|limit|error|toast|public|tag|missing|size|invalid|name|desc|dialog|zip', k, re.I): print(k, '=', out[k][:150])
