# Lote 1 (pelo REA CLI): avatar ja criado (resultados) + formularios de criacao de nos do canvas. Somente leitura/UI; nada e gerado.
import sys, traceback
sys.path.insert(0, r'C:\w\PiperLine\notes')
from rea_scn import S
CANVAS = 'https://www.pippit.ai/nest-agent-project?projectId=1206033530372&entranceFrom=history&page_from=home&canvasId=1207806464260'
def safe(fn, name):
    try: fn()
    except Exception as e: print(f'[{name}] ERRO', repr(e)[:200])

def assets_character():
    s = S('b1_assets_character', 'https://www.pippit.ai/asset-management-material')
    s.wait(5000).click_role('tab', 'Personagem').wait(6000).click_role('tab', 'Produto').wait(4000).click_role('tab', 'Rascunhos').wait(4000)
    s.click_role('tab', 'Carregar hist\u00f3rico').wait(4000)
    s.run(timeout=400)
def avatar_voice():
    s = S('b1_avatar_voice', 'https://www.pippit.ai/avatar-and-voice'); s.wait(8000); s.run(timeout=300)
def editor_avatars():
    s = S('b1_editor_avatars', 'https://www.pippit.ai/editor?tab_name=video_generator&sub_tab=video&edit_type=edit')
    s.wait(8000).click_role('menuitem', 'Avatares').wait(4000); s.run(timeout=400)
def canvas_load():
    s = S('b1_canvas_load', CANVAS); s.wait(10000); s.run(timeout=400)
def canvas_nodes():
    for kind in ['Personagem', 'Cena', 'Est\u00fadio de dire\u00e7\u00e3o 3D', 'V\u00eddeo', 'Imagem', 'Texto', '\u00c1udio']:
        lab = 'b1_node_' + kind.replace(' ', '_').replace('\u00fa', 'u').replace('\u00e7', 'c').replace('\u00e3', 'a').replace('\u00ed', 'i').replace('\u00c1', 'A').replace('\u00e1', 'a')
        def one(kind=kind, lab=lab):
            s = S(lab, CANVAS, bodies=True)
            s.wait(9000).click_role('button', f'Crie rapidamente um novo n\u00f3 de item {kind}').wait(5000)
            s.run(timeout=400)
        safe(one, lab)
if __name__ == '__main__':
    for f in (assets_character, avatar_voice, editor_avatars, canvas_load, canvas_nodes):
        safe(f, f.__name__)
