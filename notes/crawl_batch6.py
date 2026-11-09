# Lote 6: recaptura dos nos Cena e Imagem (timeout no lote 5) com espera maior.
import sys
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
CANVAS = 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260'
for lab, nm in (('cena', 'Cena'), ('imagem', 'Imagem')):
    try:
        s = S('b6_node_' + lab, CANVAS); s.wait(14000).click_role('button', 'Adicionar n\u00f3', 'add', timeout=15000).wait(2000)
        s.click_css(f'[role=menuitem]:has-text("{nm}")', 'type', timeout=15000).wait(6000); s.run(timeout=600)
    except Exception as e: print('ERRO', lab, repr(e)[:150], flush=True)
