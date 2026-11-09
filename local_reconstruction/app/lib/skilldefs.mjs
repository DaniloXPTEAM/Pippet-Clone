// Definições LOCAIS das 13 skills oficiais do Pippit: parâmetros de entrada, etapas do workflow, regra de aprovação e instrução de planejamento.
// FONTES: (1) campos observados no servidor (official_skills.json: guide_words, material_guide_words, tools, modelos padrão, categorias, versões; REA 6.7.0, ver PIPPIT_SKILLS_PROMPTS_CATALOG.md);
// (2) texto de planejamento ESCRITO PELO PIPPERLINE em suas próprias palavras a partir do comportamento descrito nesses guias. NÃO são as instruções privadas das skills (SKILL.md/Fornax, inacessíveis).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OFF = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'official_skills.json'), 'utf8'));
const ATT = (n = 1) => (c) => (c.attachments?.length || 0) >= n; const TXT = (n) => (c) => String(c.text || '').trim().length >= n; const RE = (re) => (c) => re.test(String(c.text || ''));
const RATIO = RE(/\b(9:16|16:9|1:1|3:4|4:3|21:9)\b|vertical|horizontal|quadrad/i);
const p = (id, label, required, detect, hint) => ({ id, label, required, detect, hint });
export const SKILL_DEFS = {
  'anuncios-de-drama': {
    output: 'video', approval: 'storyboard',
    params: [p('produto', 'Nome do produto e pontos fortes', true, TXT(30), 'Descreva o produto e 2–3 pontos fortes.'), p('imagem_produto', 'Imagem do produto (anexo)', true, ATT(1), 'Anexe uma imagem do produto.'), p('genero', 'Gênero do drama', true, RE(/ceo|rom[aâ]nce|vingan|revenge|tri[aâ]ngulo|triangle|fam[ií]lia|family|poder|workplace|reviravolta|twist|namoro falso|fake dating|inimigos|enemies|recome|second.?chance|glow.?up/i), 'Ex.: romance de CEO, vingança, triângulo amoroso, drama de família, reviravolta, namoro falso, inimigos que se apaixonam.'), p('proporcao', 'Proporção do vídeo', true, RATIO, 'Ex.: 9:16 ou 16:9.'), p('pessoa', 'Referência de pessoa (opcional, fixa o rosto)', false, ATT(2))],
    stages: ['Conferir entradas (pergunta antes de produzir se faltar algo)', 'Roteiro com a fórmula: gancho nos 2 primeiros segundos, escalada rápida, uma virada limpa e desfecho em que o produto é o motivo da virada', 'Storyboard por segmento', 'Aprovação do storyboard e dos prompts', 'Geração de vídeo/imagem', 'Composição e exportação'],
    planning: 'Estruture o anúncio como um mini-drama de alta tensão: gancho nos 2 primeiros segundos, escalada rápida, uma única virada limpa e um desfecho em que o produto é a razão da virada. Respeite o gênero de drama pedido e mantenha o produto fiel à imagem enviada. Se houver referência de pessoa, mantenha o rosto dela. Idioma padrão das falas: inglês americano, a menos que o usuário peça outro.',
  },
  'shorts-de-historia': {
    output: 'video', approval: 'cada-etapa',
    params: [p('historia', 'História (roteiro completo ou ideia de uma linha)', true, TXT(20), 'Premissa, personagens principais e o final ou sentimento desejado.'), p('formato', 'Formato (duração, proporção, idioma, público)', false, RATIO), p('preservar', 'O que deve ser mantido (falas exatas, "sem legenda"…)', false, RE(/sem legenda|sem m[úu]sica|manter|exat/i)), p('fotos', 'Fotos de personagens / imagens de locais (anexos)', false, ATT(1)), p('voz', 'Amostra de voz (opcional)', false, ATT(1))],
    stages: ['Entender a história e o formato', 'Roteiro fiel ao texto e aos diálogos informados', 'Storyboard com personagens e locais consistentes', 'Pausa para aprovação em cada etapa-chave', 'Geração por segmento', 'Composição'],
    planning: 'Transforme o roteiro ou a ideia em um curta cinematográfico completo com personagens consistentes, diálogos fiéis ao que o usuário escreveu e narrativa de início, meio e fim. Preserve falas exatas e restrições informadas. Avance em etapas e peça aprovação antes de construir cada parte importante.',
  },
  'gerador-de-vlog': {
    output: 'video', approval: 'storyboard',
    params: [p('midia', 'Fotos, clipes ou áudio (anexos)', true, ATT(1), 'Anexe fotos, clipes curtos e música/som real.'), p('momento', 'Melhor momento (vira o gancho)', false, TXT(20)), p('tema', 'Tema, plataforma (16:9/9:16) e duração', false, RATIO)],
    stages: ['Receber mídia e escolher o melhor momento como gancho', 'Ritmo natural com início envolvente e final satisfatório', 'Storyboard', 'Aprovação', 'Geração/edição', 'Composição'],
    planning: 'Monte um vlog guiado por história, não uma apresentação de slides: comece com o melhor momento (reação, resultado, antes/depois, surpresa) como gancho, mantenha ritmo natural e termine de forma satisfatória. Prefira poucos planos fortes a muitas fotos parecidas.',
  },
  'creator-commerce': {
    output: 'video', approval: 'storyboard',
    params: [p('produto', 'Nome do produto', true, TXT(8)), p('foto', 'Ao menos uma foto clara do produto (anexo)', true, ATT(1)), p('pontos', 'Pontos fortes (recomendado)', false, RE(/ponto|benef|vantag|selling|feature/i)), p('publico', 'Público e mercado', false, RE(/p[úu]blico|mercado|audience|target/i)), p('estilo', 'Estilo do criador: experimentar, unboxing, demonstração, review ou indicação', false, RE(/unbox|experiment|try.?on|demo|review|indica|friend/i)), p('formato', 'Duração e proporção', false, RATIO), p('cta', 'Chamada para ação', false, RE(/cta|compre|chamada|call to action/i))],
    stages: ['Conferir produto e foto', 'Roteiro de criador autêntico (unboxing, experimentação, demonstração ou review)', 'Storyboard', 'Aprovação', 'Geração', 'Composição'],
    planning: 'Crie um vídeo no estilo de criador de conteúdo autêntico que pareça filmado por uma pessoa real e esteja pronto para vender. Mantenha o produto fiel à foto, não invente alegações e use fala conversacional. Se o usuário informou estilo (unboxing, experimentação, demonstração, review), siga-o.',
  },
  'renderizacao-3-visualizacoes': {
    output: 'image_sheet', approval: 'prompt',
    params: [p('personagem', 'Imagem do personagem (anexo) ou descrição', true, (c) => ATT(1)(c) || TXT(40)(c), 'Imagem frontal ou de corpo inteiro, ou uma descrição (aparência, cabelo, roupa, acessórios, estilo).'), p('assimetrias', 'Detalhes assimétricos e o lado de cada um (opcional)', false, RE(/esquerd|direit|left|right|assim[ée]tric/i)), p('fidelidade', 'Se for pessoa real: o que preservar (opcional)', false, RE(/rosto|corpo|pele|face|likeness|semelhan/i))],
    stages: ['Receber imagem ou descrição do personagem', 'Especificar a folha de referência 16:9', 'Aprovação do prompt', 'Geração da imagem (provedor de imagem)'],
    planning: 'Gere UMA folha de referência 16:9: close do rosto grande à esquerda e, à direita, três corpos inteiros consistentes (frente, lateral verdadeira e costas). Respeite detalhes assimétricos e o lado informado.',
    sheet: 'Folha de referência de personagem em 16:9: à esquerda um close grande do rosto; à direita, desenhos de corpo inteiro nas vistas frontal, lateral e costas, consistentes entre si.',
  },
  'replicacao-viral': {
    output: 'video', approval: 'storyboard',
    params: [p('referencia', 'Vídeo de referência (anexo ou link completo)', true, (c) => ATT(1)(c) || /https?:\/\//i.test(String(c.text || '')), 'Envie um vídeo, use um ativo da tarefa ou cole o link completo (caminhos locais e links quebrados não são lidos).'), p('direcao', 'Direção: refazer no mesmo estilo, manter o gancho trocando pessoa/cena/tema, divergir, ou só análise', true, RE(/mesmo estilo|manter|trocar|divergir|remix|imitar|replic|an[áa]lise|analysis|same.?style/i), '"Imitar" ou "remix" sozinhos não bastam: diga o que manter e o que trocar.'), p('trocas', 'Ativos a substituir (opcional)', false, ATT(2))],
    stages: ['Receber a referência e a direção', 'Análise da referência: gancho e pontos remixáveis', 'Plano do novo vídeo (mesmo estilo, gancho mantido com troca, ou livre)', 'Aprovação', 'Geração dos segmentos em ordem', 'União num corte final'],
    planning: 'Analise o gancho da referência e proponha um vídeo novo no mesmo estilo ou remixado, conforme a direção informada: manter o núcleo (refazer), manter o gancho trocando pessoa/cena/tema, ou divergir livremente. Se o usuário quer apenas análise, descreva o gancho e os pontos remixáveis sem gerar. Pessoas enviadas mantêm a aparência real.',
    analysisOnly: /s[óo] an[áa]lise|apenas an[áa]lise|analysis only|somente an[áa]lise/i,
  },
  'geracao-em-lote': {
    output: 'video', approval: 'storyboard', prefill: true,
    params: [p('produto', 'Produto e objetivo dos anúncios', true, TXT(25), 'Descreva o produto e o público; a skill gera várias variações para teste A/B.')],
    stages: ['Entender o produto', 'Gerar vários roteiros de anúncio (ex.: 3)', 'Variações de vídeo para teste A/B', 'Aprovação', 'Geração em lote', 'Composição'],
    planning: 'Proponha várias variações distintas de roteiro e de vídeo para o mesmo produto, pensadas para teste A/B rápido: mude o gancho, o ângulo e o chamado à ação entre as variações.',
  },
  'url-do-video': {
    output: 'video', approval: 'storyboard', prefill: true,
    params: [p('url', 'Link do produto ou site', true, RE(/https?:\/\/\S+/i), 'Cole a URL completa do produto/site.')],
    stages: ['Ler a URL e extrair imagens e textos do produto (exige leitor de URL)', 'Roteiro promocional curto', 'Storyboard', 'Aprovação', 'Geração', 'Composição'],
    planning: 'Crie um vídeo promocional rápido e envolvente (formato curto para redes sociais) destacando as principais características do produto do link informado, com foco em conversão.',
  },
  'traducao-de-video': {
    output: 'video', approval: 'storyboard', prefill: true,
    params: [p('video', 'Vídeo original (anexo)', true, ATT(1)), p('idioma', 'Mercado ou idioma de destino', true, RE(/ingl[êe]s|espanhol|franc[êe]s|alem[ãa]o|italiano|portugu[êe]s|japon|coreano|chin[êe]s|[áa]rabe|idioma|language|mercado|market/i))],
    stages: ['Receber o vídeo e o idioma de destino', 'Analisar o vídeo e preservar ganchos e ritmo', 'Tradução e dublagem; avatar local opcional', 'Aprovação', 'Geração', 'Composição'],
    planning: 'Traduza o vídeo para o idioma de destino preservando os ganchos e o ritmo originais; se pedido, troque o ator por um avatar local.',
  },
  'video-de-marketing': {
    output: 'video', approval: 'storyboard-e-prompts',
    params: [p('produto', 'Fatos do produto e pontos fortes', true, TXT(30)), p('imagem', 'Imagem do produto (anexo)', true, ATT(1)), p('hook', 'Hook / Estilo / Play (opcional)', false, RE(/hook|estilo|style|play|gancho/i))],
    stages: ['Receber fatos do produto e o Hook/Estilo/Play', 'Ranquear os pontos fortes em uma promessa + prova', 'Roteiro de anúncio: gancho → ponte → corpo centrado no produto → CTA', 'Mostrar o storyboard completo e os prompts exatos e aguardar aprovação (mudança material reabre a aprovação)', 'Geração', 'Corte final'],
    planning: 'Construa um roteiro de anúncio de verdade: gancho, ponte, corpo centrado no produto e CTA. Ranqueie os pontos fortes em uma única promessa memorável com prova, em vez de listar tudo igualmente. Antes de gerar, mostre o storyboard completo e os prompts exatos e aguarde aprovação. Idioma padrão: inglês americano.',
  },
  'criar-habilidades': { output: 'skill', params: [], stages: ['Descrever a ideia da skill', 'Criar com IA (Habilidades > Criar skill > Criar com IA)'], planning: '' },
  'foto-falante-de-ia': { output: 'special', params: [], stages: ['Fluxo próprio de foto falante (Avatares)'], planning: '' },
  'video-de-avatar': { output: 'special', params: [], stages: ['Fluxo próprio de vídeo com avatar (Avatares)'], planning: '' },
};
export const OFFICIAL = OFF;
export function skillDef(id) { const d = SKILL_DEFS[id]; return d ? { id, ...d, official: OFF[id] || null } : null; }
// entradas obrigatórias ainda não atendidas (heurística por palavras/anexos; devolve rótulos). ctx: { text, attachments }
export function missingInputs(def, ctx) { return (def?.params || []).filter((x) => x.required && !x.detect(ctx)); }
export function skillSummary(id) { const d = skillDef(id); if (!d) return null; return { id, output: d.output, approval: d.approval || null, prefill: !!d.prefill, stages: d.stages, params: d.params.map(({ id: pid, label, required, hint }) => ({ id: pid, label, required, hint: hint || '' })), official: d.official }; }
