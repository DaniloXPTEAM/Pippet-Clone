# Classifica os 63 scripts vistos na rede e nao preservados. Usa SO material ja existente (capturas, runtime do kep, lista de ativos).
# Saida: notes/MISSING_SCRIPT_PRIORITY.csv (8 colunas pedidas). Nao faz requisicoes de rede.
import os, json, csv, re, collections
os.chdir('C:/w/PiperLine')
data = json.load(open('notes/_missing_scripts_data.json', encoding='utf-8'))
# runtime do kep: id -> arquivo (extraido de builder-runtime.183c44a8.js)
rt = {}
import subprocess
rtfile = [os.path.join(dp, f) for dp, _, fs in os.walk('scripts/raw') for f in fs if f == 'builder-runtime.183c44a8.js'][0]
res = subprocess.run(['node', 'notes/_runtime_chunkmap.mjs', rtfile], capture_output=True, text=True)
rt = json.loads(res.stdout)
rt_by_file = {os.path.basename(v): k for k, v in rt.items()}
ncap_scripts = collections.Counter()
for o in data:
    for fi in o['first']: ncap_scripts[fi['cap']] += 0
def app_of(path, host):
    if '/cms_consumer/' in path: return 'cms_consumer'
    if '/kep/' in path: return 'kep'
    if 'seeyou_bedrock' in path: return 'seeyou_bedrock (pre-SDK)'
    if 'slardar' in path or '/scm_storage/sdk/browser.' in path: return 'slardar (monitoramento)'
    if 'tiktok-cookie-banner' in path: return 'tiktok-cookie-banner'
    return 'outros'
CRIT, PCRIT, VEND, RUNT, VIS, ANA, IND = 'CRÍTICO FUNCIONAL', 'PROVAVELMENTE CRÍTICO', 'VENDOR', 'RUNTIME', 'VISUAL/UI', 'ANALYTICS/TELEMETRIA', 'INDETERMINADO'
def classify(o):
    b = o['base']; stem = o['stem']; app = app_of(o['path'], o['host']); inrt = rt_by_file.get(b)
    rtnote = ' O runtime do kep lista este arquivo como chunk %s.' % inrt if inrt else ''
    # ---- kep
    if app == 'kep':
        if stem == 'marketing-studio': return ('app do estúdio de modelos (rota template-studio)', CRIT, 'Entrada do app Marketing Studio carregada ao abrir /template-studio; o app "kep" preservado só contém pricing.', 'Sim')
        if stem == 'route-manifest-templates': return ('manifesto de rotas/assets do estúdio de modelos', RUNT, 'Equivalente ao route-manifest-marketing-studio já preservado (que só lista a rota pricing); mapeia chunks e CSS das rotas de templates.', 'Sim')
        if stem == '26': return ('chunk compartilhado do kep, carregado pelo runtime sem passar por import dinâmico', PCRIT, 'O runtime do kep resolve 26 numa lista fixa junto de 171/354/131/458 (conjunto base), logo faz parte do núcleo carregado em toda rota.', 'Provável')
        if stem == '541': return ('chunk de rota do kep', IND, 'Id 541 não aparece no mapa do runtime preservado (nem como async, nem na lista fixa); só se sabe que foi carregado em template-studio. Conteúdo desconhecido.', 'Indeterminado')
        if stem in ('109', '244', '475', '846'): return ('chunk assíncrono anônimo do kep (import dinâmico)', IND, 'Consta no mapa de chunks do runtime (id %s, hash %s) mas sem nome; nome só permite concluir que é um split de código carregado sob demanda.' % (stem, o['hash']), 'Indeterminado')
        if stem.startswith('components-CopyrightModal'): return ('modal de direitos autorais', VIS, 'Chunk de componente de interface (nome); id %s no runtime.' % inrt, 'Não')
        if stem.startswith('components-LanguageSelectorModal'): return ('modal de seleção de idioma', VIS, 'Chunk de componente de interface (nome); id %s no runtime. Necessário só para o seletor de idiomas.' % inrt, 'Não')
        if stem == 'fetch_starling_text': return ('cliente do serviço de textos/traduções (Starling)', RUNT, 'Busca textos traduzidos; já temos os JSON de tradução (pt-BR.89180 e pt-BR.a61aa), que podem ser lidos diretamente.' + rtnote, 'Não')
        if stem == 'lv-user-login-sdk': return ('SDK de login compartilhado', VEND, 'Existe versão da landing já preservada (lv-user-login-sdk.3796387e7d); este é o build do kep.' + rtnote, 'Não')
    # ---- cms_consumer
    if app == 'cms_consumer':
        if stem == 'main': return ('entrada do app cms_consumer (páginas de ferramentas/CMS)', CRIT, 'Entry chunk do app; sem ele não há código de rotas nem de renderização das páginas CMS.', 'Sim')
        if stem == 'builder-runtime': return ('runtime/mapa de chunks do cms_consumer', RUNT, 'Contém o mapa id→nome→hash dos chunks assíncronos do cms_consumer (como o do kep nos permitiu nomear os chunks do kep); com ele se resolvem os chunks numéricos.', 'Sim')
        if stem == 'route-manifest-main': return ('manifesto de rotas e assets por rota do cms_consumer', RUNT, 'Diz quais chunks e CSS cada rota do cms_consumer carrega; é a ponte entre rotas e arquivos.', 'Sim')
        if stem == 'argus-builder-strategy': return ('estratégia do builder (carregamento/execução)', RUNT, 'Há versão da landing preservada (argus-builder-strategy.da0ba176b5); este é o build do cms_consumer.', 'Provável não')
        if stem in ('lib-react', 'lib-router', 'lib-polyfill'): return ('biblioteca vendorizada (%s)' % stem, VEND, 'Pacote de terceiros; versões equivalentes de %s já preservadas (landing e kep), a do cms_consumer pode diferir em versão.' % stem, 'Não')
        if stem == 'lib-axios': return ('cliente HTTP (axios) do cms_consumer', VEND, 'Pacote de terceiros; axios do kep já preservado (lib-axios.29bed537).', 'Não')
        if stem == 'fetch_starling_text': return ('cliente do serviço de textos/traduções (Starling)', RUNT, 'Mesma função do chunk do kep; os JSON de tradução do cms_consumer já estão preservados (pt-BR.a61aa).', 'Não')
        if stem == 'lv-cookie-consent': return ('banner de consentimento de cookies', VIS, 'Há versão do kep preservada (lv-cookie-consent.8b26699e).', 'Não')
        if stem.startswith('components-GoogleOneTapPrompt'): return ('prompt de login com Google One Tap', VIS, 'Componente de interface de login; só relevante para o fluxo de login.', 'Não')
        if stem.startswith('wrappers-Pippit'): return ('layout/wrapper da marca Pippit para as páginas CMS', PCRIT, 'Wrapper por nome (envolve header/footer e conteúdo); sem ele as páginas não montam no layout do produto.', 'Provável')
        if stem.startswith('templates-landing-page'): return ('template de página (landing page do CMS)', PCRIT, 'Define a composição das páginas por blocos; liga os blocos Default-* à página.', 'Provável')
        if stem.startswith('business-components-pippit-Pippit'): return ('%s da marca Pippit' % ('cabeçalho' if 'Header' in stem else 'rodapé'), VIS, 'Componente de interface de navegação; afeta fidelidade visual, não a lógica.', 'Não (visual)')
        if stem.startswith('byted-image-seeyou-cms-components-components-Default-'):
            blk = stem.split('Default-')[-1]
            return ('bloco CMS "%s" das páginas de ferramenta' % blk, VIS, 'Bloco de conteúdo do CMS; necessário para a aparência fiel das páginas de ferramentas.', 'Parcial (fidelidade visual)')
        if stem.startswith('byted-image-seeyou-cms-components-components-Pippit-AnyInput'): return ('campo de entrada "AnyInput" (prompt/entrada de criação)', PCRIT, 'Por nome é o campo de entrada principal da criação (prompt/upload) nas páginas de ferramenta; central para reproduzir o fluxo de criação.', 'Provável')
        if stem == '$': return ('rota coringa (splat) que renderiza páginas CMS por slug', PCRIT, 'Chunk "$" é a convenção do roteador para rota splat; é o código que casa qualquer slug de ferramenta.', 'Provável')
        if stem == '4017': return ('chunk compartilhado do cms_consumer (não assíncrono)', PCRIT, 'Único chunk numérico carregado fora de /async/, ou seja, vem junto do núcleo (entre main e as libs).', 'Provável')
        if re.fullmatch(r'\d+', stem): return ('chunk assíncrono anônimo do cms_consumer', IND, 'Split de código sem nome; só o builder-runtime do cms_consumer (ausente) diz o que ele contém.', 'Indeterminado')
    # ---- SDKs e terceiros
    if app.startswith('slardar'):
        if '/scm_storage/sdk/browser.' in o['path']: return ('núcleo do SDK de monitoramento (Slardar), inferido', ANA, 'Mesmo diretório (ies/ccweb/scm_storage/sdk) e mesma versão 1.14.1 dos plugins Slardar carregados em seguida; inferência pelo caminho, conteúdo não visto.', 'Não')
        return ('SDK de monitoramento de erros/desempenho (Slardar)', ANA, 'Plugin do SDK de monitoramento (ByteDance); não afeta o produto.', 'Não')
    if app == 'tiktok-cookie-banner': return ('banner de consentimento do TikTok', ANA, 'SDK de consentimento/privacidade; não é lógica do produto.', 'Não')
    if app.startswith('seeyou_bedrock'): return ('preset do pré-SDK de SEO (overseas)', IND, 'Nome indica configuração de SEO de mercados externos; função exata desconhecida.', 'Não (provável)')
    return ('desconhecida', IND, 'Sem informação.', 'Indeterminado')
rows = []
for o in data:
    func, cat, why, blk = classify(o)
    fi = o['first'][0] if o['first'] else None
    ordem = ''
    if fi: ordem = ' Ordem de carga: script nº %d da captura %s (evento %d, passo "%s").' % (fi['rank'], fi['cap'], fi['seq'], fi['step'])
    pagina = (o['pages'].split(' | ')[0]).replace('https://www.pippit.ai', '') if o['pages'] else ''
    rows.append([o['url'], o['base'], app_of(o['path'], o['host']), pagina, func, cat, (why + ordem).strip(), blk])
assert len(rows) == 63
order = {CRIT: 0, PCRIT: 1, RUNT: 2, VIS: 3, VEND: 4, IND: 5, ANA: 6}
rows.sort(key=lambda r: (r[2], order[r[5]], r[1]))
with open('notes/MISSING_SCRIPT_PRIORITY.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f)
    w.writerow(['URL', 'Nome', 'App', 'Página', 'Função provável', 'Categoria', 'Motivo', 'Bloqueia reconstrução?'])
    w.writerows(rows)
print(len(rows), 'linhas')
print(collections.Counter((r[2], r[5]) for r in rows))
print(collections.Counter(r[7] for r in rows))
