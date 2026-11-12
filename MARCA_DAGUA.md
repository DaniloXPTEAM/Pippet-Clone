# MARCA_DAGUA — marca d'água do PiperLine (estrutura pronta)

Contrato **interno do PiperLine**, escrito em 09/11/2026 para o item 2 da rodada 7. A estrutura está completa e testada; **falta apenas o conteúdo** (a imagem da marca e o nome), que é do usuário. Nada é baixado, nada é enviado para terceiros, nenhuma marca de fábrica é imposta.

## 1. Regra única (um módulo decide)

| Peça | Arquivo | Papel |
|---|---|---|
| Módulo único | `local_reconstruction/app/lib/watermark.mjs` | `normalizeWatermark` (validação/padrões), `effectiveWatermark` (decisão), `buildWatermarkFilter` (filtro ffmpeg), `resolveImagePath`, `overlayPosition`, `pickFont`. |
| Aplicação real | `local_reconstruction/app/lib/media.mjs` (`finalize`) | Sobrepõe a marca **na exportação**: `overlay` para imagem (2ª entrada do ffmpeg) e `drawtext` para texto. Sem marca, o encode é o de antes. |
| Rotas | `local_reconstruction/app/server.mjs` | `GET/POST /api/watermark`, `POST/DELETE /api/watermark/image`; `POST /api/editor/:id/export` devolve `watermark: { applied, kind, reason }`. |
| Interface | `local_reconstruction/app/public/app.js` | Configurações → **Marca d'água** (ligar/desligar, tipo, nome, texto, posição, escala, opacidade, margem, imagem) e o diálogo *Export settings* mostra o nome configurado e o motivo quando a marca não será aplicada. |
| Teste | `local_reconstruction/test/watermark_export.test.mjs` | Exporta o **mesmo** projeto com e sem marca e **compara os pixels** do quadro (faixa com marca × centro intacto), para texto e para imagem, além de opacidade, upload, plano e persistência. |

## 2. Configuração (tudo num objeto só)

```json
{ "enabled": false,
  "kind": "image",                       // "image" | "text"
  "text": "",                            // vazio = usa o nome da marca
  "imagePath": "assets/brand/watermark.png",
  "position": "bottom-right",            // top-left | top-right | bottom-left | bottom-right | center
  "scale": 0.14,                         // largura da marca / largura do vídeo
  "opacity": 0.7,                        // 0–1
  "margin": 0.03 }                       // fração do lado menor
```

- **Desligada por padrão** (`enabled: false`): exportar com o diálogo em "com marca" não desenha nada enquanto a configuração estiver desligada, e a resposta diz o motivo.
- **Imagem substitível**: `local_reconstruction/app/public/assets/brand/watermark.png` (servida em `/assets/brand/watermark.png`). Pode ser trocada pela tela (PNG/JPEG até 8 MB) ou por qualquer arquivo no disco. Já vem com um placeholder neutro, sem nome de marca.
- **Nome da marca vem da configuração** (`settings.brandName`, campo da tela). Nenhum nome de marca está escrito no código; sem nome, o modo texto não se aplica e informa o motivo.
- Fonte do texto: primeira fonte do sistema encontrada (`pickFont`); sem fonte, o ffmpeg usa a dele.

## 3. Decisão na exportação (`effectiveWatermark`)

Ordem exata, sempre a mesma:

1. configuração **desligada** → não aplica ("marca d'água desligada na configuração (padrão)");
2. diálogo pediu **sem marca** → não aplica ("exportação pedida sem marca d'água");
3. modo **texto** sem nome, ou modo **imagem** sem arquivo → não aplica e **diz o motivo** (nunca inventa marca);
4. preferência **"Salvar sem marca d'água"** ligada:
   - plano com `noWatermark: true` → não aplica;
   - plano sem esse direito (Gratuito) → **aplica mesmo assim**, com o motivo "preferência ignorada: o plano atual não remove a marca d'água";
5. caso contrário → aplica.

Os planos e o direito vêm de `src/plans.mjs` (`PLANS[].noWatermark`) — nada é fixado no código da marca.

## 4. O que ainda depende do usuário

- **Conteúdo**: desenhar/enviar o PNG da marca e escrever o nome (`settings.brandName`). Até lá a marca fica desligada, como exigido.
- **Decisão comercial**: quais planos terão `noWatermark: true` (hoje só o catálogo local diz quem pode; nenhuma cobrança existe).
- O restante (posicionamento, opacidade, escala, margem, sobreposição real no arquivo exportado) **já funciona** e está coberto por teste de pixel.
