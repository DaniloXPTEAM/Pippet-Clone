// Catalogo de modelos, custos e parametros OBSERVADOS (PIPPIT_FEATURE_CATALOG.md / PIPPIT_NODES_AND_AVATAR_FLOWS.md).
export const VIDEO_MODELS = [
  { id: 'auto', name: 'Correspondência inteligente', note: 'Seleciona automaticamente um modelo de vídeo quando o agente detecta uma solicitação de geração de vídeo.' },
  { id: 'seedance-2.5', name: 'Dreamina Seedance 2.5', note: 'Geração de vídeo de 30s, edição precisa por segmento', perSecond: 37, maxSeconds: 30 },
  { id: 'seedance-2.0-fast', name: 'Dreamina Seedance 2.0 Fast', note: 'Detalhes e qualidade aprimorados, com custos acessíveis', requiresPlan: 'starter', maxSeconds: 15 },
  { id: 'seedance-2.0', name: 'Dreamina Seedance 2.0', note: 'Referência mais precisa, realista, até 4K', maxSeconds: 15 },
  { id: 'seedance-2.0-mini-test', name: 'Dreamina Seedance 2.0 Mini (teste)', note: 'Ideal para geração rápida, por apenas 7 créditos/s', perSecond: 7, maxSeconds: 15 },
  { id: 'seedance-2.0-mini', name: 'Dreamina Seedance 2.0 Mini', note: 'Inferência leve, melhor custo-benefício', maxSeconds: 15 },
  { id: 'auto-route', name: 'Auto Route', note: 'Experimente 3 vezes. Seleciona entre modos de geração de vídeo para melhor custo-benefício.', freeTries: 3 },
];
export const IMAGE_MODELS = [
  { id: 'auto', name: 'Correspondência inteligente' }, { id: 'gpt-image-2.5-sunburst', name: 'GPT Image 2.5 Sunburst', perImage: 68, minPlan: null },
  { id: 'gpt-image-2.5-flare', name: 'GPT Image 2.5 Flare' }, { id: 'gpt-image-2', name: 'GPT Image 2' }, { id: 'nano-banana-pro', name: 'Nano Banana Pro' },
  { id: 'nano-banana-2.1', name: 'Nano Banana 2.1' }, { id: 'seedream-5.0-pro', name: 'Seedream 5.0 Pro', freeUses: 1 }, { id: 'seedream-5.0-flash', name: 'Seedream 5.0 Flash' },
  { id: 'seedream-5.0-lite', name: 'Seedream 5.0 Lite' }, { id: 'seedream-4.5', name: 'Seedream 4.5' }, { id: 'seedream-4.0', name: 'Seedream 4.0' },
];
export const AUDIO_MODELS = [{ id: 'seed-audio-1.0', name: 'Seed Audio 1.0', tier: 'vip', sampleRates: [44100], creditsPerUse: [17, 34] }];
export const VIDEO_RATIOS = ['Inteligente', '9:16', '3:4', '1:1', '4:3', '16:9', '21:9'];
export const IMAGE_RATIOS = ['Inteligente', '16:9', '21:9', '9:16', '4:3', '3:4', '1:1'];
export const VIDEO_RES = ['480p', '720p']; export const IMAGE_RES = ['1K', '1.5K', '2K', '4K'];
export const SKILLS = [
  { id: 'criar-habilidades', name: 'Criar habilidades', desc: 'Desenvolva habilidades reutilizáveis para concluir tarefas específicas com mais estabilidade.', tag: 'Todos' },
  { id: 'anuncios-de-drama', name: 'Anúncios de drama', models: ['GPT Image 2', 'SD 2.5'], desc: 'Coloca seu produto dentro de um mini-drama de alta tensão para que os espectadores fiquem para o enredo e saiam querendo o produto.', tag: 'Drama curto' },
  { id: 'shorts-de-historia', name: 'Shorts de história', desc: 'Transforme um roteiro ou uma ideia simples em um curta-metragem cinematográfico completo - com personagens consistentes, diálogo fiel e narrativa em estilo de estúdio.', tag: 'Drama curto' },
  { id: 'gerador-de-vlog', name: 'Gerador de Vlog', desc: 'Transforme suas fotos, clipes e áudios em um vlog guiado por histórias – com um gancho real, ritmo natural e final satisfatório.', tag: 'Todos' },
  { id: 'creator-commerce', name: 'Creator Commerce', models: ['GPT Image 2', 'SD 2.5'], desc: 'Transforme uma foto do produto em um vídeo autêntico no estilo de criador: unboxing, prova, demonstração ou avaliação.', tag: 'Marketing Publicidade' },
  { id: 'renderizacao-3-visualizacoes', name: 'Renderização de 3 Visualizações', models: ['GPT Image 2', 'SD 2.5'], desc: 'Transforme uma imagem ou descrição do personagem em uma folha de referência 16:9 com close do rosto e vistas de frente, lado e verso.', tag: 'Cinema e televisão profissionais' },
  { id: 'replicacao-viral', name: 'Replicação Viral', desc: 'Dê um vídeo de referência e ele faz a engenharia reversa do gancho, criando um vídeo novo no estilo original ou remixado.', tag: 'Marketing Publicidade' },
  { id: 'geracao-em-lote', name: 'Geração em lote', desc: 'Transforme um produto em várias variações de vídeo instantaneamente. Feito para testes A/B rápidos e encontrar seus anúncios vencedores.', tag: 'Marketing Publicidade' },
  { id: 'url-do-video', name: 'URL do vídeo', desc: 'Basta colocar a URL do produto ou do site e extraímos automaticamente as imagens e os textos para gerar vídeos prontos para postar.', tag: 'Marketing Publicidade' },
  { id: 'traducao-de-video', name: 'Tradução de vídeo', desc: 'Leve seus vídeos virais para o mundo em um clique. Envie a filmagem original e traduza automaticamente para vários idiomas, preservando seus ganchos e o ritmo. Libere tráfego global com um único ativo e impulsione suas vendas internacionais sem custo extra.', tag: 'Marketing Publicidade' },
  { id: 'video-de-marketing', name: 'Vídeo de marketing', models: ['GPT Image 2'], desc: 'O motor central de vídeo de marketing: transforma as informações do produto mais um briefing de Gancho/Estilo/Jogada em um vídeo pronto para comercial, do roteiro e do storyboard até o corte final.', tag: 'Marketing Publicidade' },
  { id: 'foto-falante-de-ia', name: 'Foto falante de IA', desc: 'Faça uma foto falar de forma muito natural com um roteiro ou um áudio.', tag: 'Todos' },
  { id: 'video-de-avatar', name: 'Vídeo de avatar', desc: 'Crie qualquer vídeo de marketing com avatares da nossa biblioteca.', tag: 'Todos' },
];
export const NODE_PANELS = {
  Personagem: { kind: 'image', model: 'gpt-image-2.5-sunburst', ratio: '9:16', res: '1K', cost: 68 },
  Cena: { kind: 'image', model: 'gpt-image-2.5-sunburst', ratio: '9:16', res: '1K', cost: 68 },
  Imagem: { kind: 'image', model: 'gpt-image-2.5-sunburst', ratio: '9:16', res: '1K', cost: 68 },
  Vídeo: { kind: 'video', model: 'seedance-2.5', ratio: '9:16', res: '720p', seconds: 10 },
  Áudio: { kind: 'audio', model: 'seed-audio-1.0', sampleRate: 44100 },
};
export function videoCost(modelId, seconds) {
  const m = VIDEO_MODELS.find((x) => x.id === modelId) || VIDEO_MODELS[1];
  return m.perSecond ? m.perSecond * seconds : null; // custo exibido so observado para 2.5 (37/s) e Mini teste (7/s)
}
export const NEEDS = { video: 'Nenhum provedor de geração de vídeo por IA configurado nesta instalação local.', image: 'Nenhum provedor de geração de imagem por IA configurado nesta instalação local.', audio: 'Nenhum provedor de áudio/voz por IA configurado nesta instalação local.' };
// Estúdio de marketing: seletores observados (FEATURE_INVENTORY.md: Ad formats, Hook, Visual style). A categoria de cada cartão de Ad formats e os itens de Hook NÃO foram capturados (null/[]).
export const MARKETING = {
  adFormats: { search: 'Search ad format', categories: ['All', 'Trending Ads', 'UGC Ads', 'Product Demos', 'Visual Effects', 'Story-Driven Ads', 'Seedance 2.5', 'ASMR'],
    items: ['Shot-and-Drop Reveal', 'Secret Shelf Test', 'Living Garment Swap Reveal', 'Cursor Download Reveal', 'Product Spin Reveal', 'Folder Outfit Demo', 'Robbery Bag Reveal', 'Single Image Detail Stop'].map((name) => ({ name, category: null })) },
  hooks: { search: 'Search hook', categories: ['Eye-Catching Visuals', 'Video Formats', 'Persuasive Messaging', 'Catchy Sounds', 'Standout Styles'], items: [] },
  styles: { search: 'Search style', categories: [
    { name: 'Natural Living', items: ['Outdoor Forest Natural Light', 'Paris Street Film', 'Candid Social Film', 'Scandinavian Natural', 'Mediterranean Wellness', 'California Sunshine Lifestyle', 'French Countryside Natural'] },
    { name: 'Eastern Aesthetics', items: ['Retro Hong Kong Comedy', 'Ancient Eastern Palace', 'Modern Chinese Elegance'] },
    { name: 'Premium Aesthetics', items: ['Quiet Luxury Minimalism', 'Soft Pastel Dream', 'Warm Earth Tones', 'Art Deco Luxury', 'Korean Cream Light', 'European Rococo Palace'] },
    { name: 'Youth Trends', items: ['Gen Z Color Pop', 'Expressive 3D Animation', 'Y2K Chrome'] },
    { name: 'Future Technology', items: ['Clean Future Tech'] } ] },
};
