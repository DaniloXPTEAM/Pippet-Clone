# Lote 5 (pelo REA CLI): formularios dos tipos de no do canvas via menu "Adicionar no" + detalhes de skill/ativo por texto.
# Cria nos vazios no canvas "PROJECT" da conta de teste (sem geracao, sem custo).
import sys
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
CANVAS = 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260'
def safe(fn, name):
    try: fn()
    except Exception as e: print(f'[{name}] ERRO', repr(e)[:200], flush=True)
TYPES = {'cena': 'Cena', 'estudio3d': 'Est\u00fadio de dire\u00e7\u00e3o 3D', 'texto': 'Texto', 'imagem': 'Imagem', 'video': 'V\u00eddeo', 'audio': '\u00c1udio'}
def node(lab, nm):
    s = S('b5_node_' + lab, CANVAS); s.wait(9000).click_role('button', 'Adicionar n\u00f3', 'add').wait(1500)
    s.click_css(f'[role=menuitem]:has-text("{nm}")', 'type').wait(5000)
    s.run(timeout=500)
def skill_card():
    s = S('b5_skill_card', 'https://www.pippit.ai/skill'); s.wait(9000)
    s.click_css('xpath=(//*[normalize-space(text())="Shorts de hist\u00f3ria"])[1]', 'card').wait(5000)
    s.run(timeout=500)
def asset_item():
    s = S('b5_asset_item', 'https://www.pippit.ai/asset-management-material'); s.wait(8000)
    s.click_css('xpath=(//*[contains(normalize-space(text()),"Pippit_1007_Desjejum.mp4")])[1]', 'item').wait(5000)
    s.run(timeout=500)
if __name__ == '__main__':
    for lab, nm in TYPES.items():
        safe(lambda lab=lab, nm=nm: node(lab, nm), 'node_' + lab)
    safe(skill_card, 'skill_card'); safe(asset_item, 'asset_item')
