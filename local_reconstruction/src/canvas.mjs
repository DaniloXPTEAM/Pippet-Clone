// Modelo do canvas observado (PIPPIT_NODES_AND_AVATAR_FLOWS.md). Somente o que foi visto; geracao em si e dependencia externa.
export const NODE_TYPES = ['Personagem', 'Cena', 'Estúdio de direção 3D', 'Vídeo', 'Imagem', 'Texto', 'Áudio'];
// Paineis de geracao observados (valores padrao vistos na conta gratuita)
export const GENERATION_PANELS = {
  Personagem: { kind: 'image', model: 'GPT Image 2.5 Sunburst', aspect: '9:16', resolution: '1K', creditsPerImage: 68, mention: '@', reference: true },
  Cena: { kind: 'image', model: 'GPT Image 2.5 Sunburst', aspect: '9:16', resolution: '1K', creditsPerImage: 68, mention: '@', reference: true },
  Imagem: { kind: 'image', aspect: '9:16', resolution: '1K', mention: '@', reference: true },
  Vídeo: { kind: 'video', model: 'Dreamina Seedance 2.5', aspect: '9:16', resolution: '720P', seconds: 10, creditsFor: { seconds: 10, resolution: '720P', credits: 370 }, reference: true },
  Áudio: { kind: 'audio', model: 'Seed Audio 1.0', tier: 'vip', sampleRateHz: 44100, send: 'Ctrl+Enter' },
};
export const NODE_TOOLS = {
  Personagem: ['Ficha de três vistas', 'Close do personagem', 'Grade de expressões', 'Amplificar', 'Isolar camadas', 'Recortar', 'Girar'],
  Cena: ['Panorama de 360°', 'Amplificar', 'Isolar camadas', 'Recortar', 'Girar'],
  Imagem: ['Panorama de 360°', 'Grade de expressões', 'Iluminação', 'Câmera', 'Amplificar', 'Preencher', 'Isolar camadas'],
  Vídeo: ['Extrair quadro', 'Melhorar qualidade', 'Cortar', 'Extrair áudio', 'Recortar', 'Analisar', 'Analisar vídeo'],
  Áudio: ['Editar áudio', 'Traduzir áudio', 'Vincular ao personagem', 'Captura de áudio', 'Separar voz e plano de fundo'],
};
export const videoCredits = (seconds, perSecond = 37) => seconds * perSecond; // 10 s x 37 = 370 (observado)
export class Canvas {
  constructor(projectId) { this.projectId = projectId; this.nodes = []; this.edges = []; this.saved = true; }
  // "Adicionar nó": cria no vazio e salva automaticamente ("Salvo")
  addNode(type) {
    if (!NODE_TYPES.includes(type)) throw new Error('tipo de nó desconhecido');
    const n = { id: `n${this.nodes.length + 1}`, type, title: type === 'Personagem' ? 'Função sem nome' : type, tools: (NODE_TOOLS[type] || []).map((t) => ({ name: t, enabled: false })) };
    this.nodes.push(n); this.saved = true; return n;
  }
  link(a, b) { this.edges.push({ from: a.id, to: b.id }); }
  // ferramentas ficam desabilitadas ate haver midia no no
  attachMedia(node) { node.hasMedia = true; node.tools.forEach((t) => (t.enabled = true)); }
  toJSON() { return { project_id: this.projectId, file_name: 'canvas.json', nodes: this.nodes, edges: this.edges }; }
}
