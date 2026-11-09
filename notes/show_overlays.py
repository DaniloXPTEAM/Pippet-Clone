# Mostra, por passo, os trechos de sobreposicao (dialog/menu/listbox/popover/tooltip) da acessibilidade de uma captura. Uso: show_overlays.py <rotulo> [passo ...]
import re, sys, os
os.chdir(r'C:\w\PiperLine\captures\auth')
lab = sys.argv[1]; only = set(sys.argv[2:])
for f in sorted(os.listdir(lab)):
    st = f[:-4]
    if only and st not in only: continue
    t = open(f'{lab}/{f}', encoding='utf-8').read(); L = t.splitlines()
    idx = [i for i, l in enumerate(L) if re.match(r'\s*- (dialog|menu|listbox|alertdialog|tooltip|popover)\b', l)]
    if not idx: continue
    s = idx[0]; blk = [re.sub(r'^\s{0,6}', '', l)[:210] for l in L[s:s+int(os.environ.get('N', '38'))] if not re.match(r'\s*- img', l)]
    print(f'--- {lab}/{st}'); print('\n'.join(blk))
