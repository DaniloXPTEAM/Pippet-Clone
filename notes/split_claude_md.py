import shutil, os
src = r'C:\Users\Dannilo\CLAUDE.md'
bak = r'C:\Users\Dannilo\.claude\backup_CLAUDE_md_home_20261021.md'
lines = open(src, encoding='utf-8').read().split('\n')
idx = [i for i, l in enumerate(lines) if l.startswith('# ')]
assert len(idx) == 3, idx
parts = {'life': '\n'.join(lines[idx[0]:idx[1]]).rstrip() + '\n', 'rpg': '\n'.join(lines[idx[1]:idx[2]]).rstrip() + '\n', 'piper': '\n'.join(lines[idx[2]:]).rstrip() + '\n'}
dest = {'life': r'C:\Novo Job\LIFE\CLAUDE.md', 'rpg': r'C:\Users\Dannilo\Documents\GitHub\RPG-utilidades\CLAUDE.md', 'piper': r'C:\w\PiperLine\CLAUDE.md'}
for p in dest.values():
    assert not os.path.exists(p), p
shutil.copy2(src, bak)
for k, p in dest.items():
    open(p, 'w', encoding='utf-8', newline='\n').write(parts[k])
    assert open(p, encoding='utf-8').read() == parts[k]
index = r'''# Índice de projetos (detalhes no CLAUDE.md de cada pasta; carregam só quando a sessão está nela)

- **LIFE Academia — Relatórios Comerciais**: `C:\Novo Job\LIFE\CLAUDE.md` (relatórios .docx em `C:\Users\Dannilo\Downloads\`).
- **RPG-utilidades — Bússola de Arton** (site Tormenta20): `C:\Users\Dannilo\Documents\GitHub\RPG-utilidades\CLAUDE.md`.
- **PiperLine — reconstrução local do Pippit**: `C:\w\PiperLine\CLAUDE.md`.

Se a tarefa for de um desses projetos e a sessão não estiver na pasta dele, leia o CLAUDE.md indicado antes de começar. Backup do original completo: `C:\Users\Dannilo\.claude\backup_CLAUDE_md_home_20261021.md`.
'''
open(src, 'w', encoding='utf-8', newline='\n').write(index)
print({k: len(v) for k, v in parts.items()}, 'novo:', len(index))
