# LIPSYNC_PROVIDERS — provedores de Foto falante (lip-sync por IA) no PiperLine

Contrato **interno do PiperLine**. Não é o protocolo privado do Pippit (esse está em `PIPPIT_TALKING_PHOTO.md`) nem o de um provedor específico. Escrito em 27/10/2026 depois da autorização do usuário para implementar a arquitetura. **Nenhum serviço foi contratado, nenhuma foto foi enviada e nenhuma geração real foi feita.** Todos os testes usam um servidor de mentira em loopback (formato de predições) e **falham** se houver chamada a host externo.

## 1. O que foi implementado

| Peça | Arquivo | Resumo |
|---|---|---|
| Tipo de provedor `talkingphoto` + adaptador `replicate-lipsync` | `src/providers.mjs` | Contrato comum (`submit/describe/estimate/limits/poll/download/cancel`) e adaptador no formato de predições (Replicate). **Não testado contra o serviço real.** Campos de texto, voz, gesto e parâmetros só são enviados se o usuário os mapear (`inputMap`/`paramMap`); os demais aparecem como "NÃO recebe". |
| Orçamento e consentimento | `app/lib/talkingphoto.mjs` | `buildQuote` (provedor, modelo, host, duração, custo e moeda, limite por tarefa, campos aceitos/ignorados, avisos) com um **digest** que amarra o consentimento a provedor+modelo+duração+custo+hash da foto e do áudio. `consentProblem` devolve por que NÃO pode enviar. |
| Bloqueio no servidor | `app/lib/jobs.mjs` | `blockReason` exige: provedor configurado, orçamento válido, consentimento `confirm === true` com o digest atual, custo desconhecido só com aceite explícito, custo ≤ limite, `allowSpend` do provedor. **Fail-closed:** sem a função de consentimento ou com erro, bloqueia. Revalida imediatamente antes do envio e confere o SHA-256 dos bytes. |
| Ciclo de vida | `app/lib/jobs.mjs`, `app/server.mjs` | `blocked → queued → running → succeeded/failed/canceled`; `sendIntent` gravado **antes** do envio (queda no meio ⇒ falha "ambígua", **nunca reenvia sozinho**); falha de rede após o envio também é ambígua; repetição exige novo consentimento; persistência em `db.jobs` e retomada da consulta sem reenvio. |
| Cancelamento honesto | `app/lib/jobs.mjs` | `remoteCancel`: `not_submitted`, `requested` (o provedor aceitou o PEDIDO; a confirmação final é dele), `refused`/`failed` (pode continuar e cobrar), `unsupported`, `unknown`. |
| Rotas | `app/server.mjs` | `POST /api/talking-photo/quote` (sem envio), `…/generate` (cria a tarefa **sempre bloqueada**, e um nó de vídeo no Canvas se `projectId`), `…/jobs/:id/authorize` (+ `DELETE` para revogar), `/api/providers/talkingphoto`, `/api/jobs` e `/api/jobs/:id/cancel` já existentes. |
| Integração | `afterJob` (existente) | Ao concluir: vídeo em **Ativos** (`works`), nó do Canvas recebe o vídeo, e o nó pode ir ao **editor** (`/nodes/:id/edit`). |
| Interface | `app/public/app.js` | Configurações > Assistente de IA > Provedores > "Foto falante (lip-sync)" (custo/moeda/limites/mapeamento); na página da Foto falante, botão "Gerar com lip-sync (provedor externo)" → orçamento → dois aceites quando o custo é desconhecido → acompanhamento → vídeo / cancelamento com a verdade sobre o provedor. |
| Testes | `test/talkingphoto_provider.test.mjs`, `test/talkingphoto_ui.test.mjs` | Contrato, orçamento, bloqueios, ciclo de vida, recuperação, cancelamento, ausência de chamadas externas, Canvas/Ativos/editor, UI no navegador. |

Configuração de exemplo (apenas ilustrativa; os valores de custo são **do usuário**, o PiperLine não consulta preços):

```json
{ "adapter": "replicate-lipsync", "baseUrl": "https://api.replicate.com/v1", "model": "<dono>/<modelo>", "apiKey": "<sua chave>",
  "inputMap": { "image": "<campo da foto>", "audio": "<campo do áudio>", "gesture": "<campo opcional>" },
  "paramMap": { "resolution": "<campo opcional>" }, "extraInput": {},
  "costPerSecond": 0.05, "currency": "USD", "maxCostPerTask": 1, "maxAudioSeconds": 60, "allowSpend": false }
```

## 2. Como habilitar um provedor real (checklist técnico)

1. **Escolha e autorização do usuário** (conta, chave, custo). Nada é escolhido automaticamente.
2. **Formato de entrada do modelo:** foto e áudio como *data URI* (o adaptador atual), como **URL pública** (exige hospedar os arquivos — mudança de privacidade que o PiperLine não faz sozinho) ou *multipart*. Muitos serviços pedem URL; nesse caso é preciso um adaptador específico.
3. **Autenticação e rotas:** cabeçalho (`Bearer`, `x-api-key` etc.), rota de criação, de consulta e de cancelamento, e o formato do estado (`starting/processing/succeeded/failed/canceled` no adaptador atual).
4. **Mapeamento de campos** (`inputMap`) de foto, áudio, gesto/texto/voz e `paramMap`; campos sem mapeamento NÃO são enviados e ficam visíveis no orçamento.
5. **Custo:** informar `costPerSecond` + `currency` só se o usuário souber o preço; senão o custo é DESCONHECIDO e cada tarefa exige o aceite explícito. Definir `maxCostPerTask`.
6. **Limites:** duração máxima do áudio (`maxAudioSeconds`, padrão 60 s), tamanho da foto, formatos; validar contra a documentação do modelo.
7. **Saída:** URL do vídeo (muitas expiram), marca d'água em planos de teste, licença de uso comercial do modelo.
8. **Cancelamento:** se o provedor não tem rota de cancelamento, o adaptador não declara `cancel` e a interface avisa que o provedor pode continuar e cobrar.
9. **Privacidade:** foto e áudio saem da máquina; revisar a retenção nos termos do provedor.
10. **Teste real controlado:** com orçamento mínimo, autorização explícita e um provedor de verdade — só depois de aprovado pelo usuário.

## 3. Opções conhecidas (verificação por fontes secundárias; confirmar nas páginas oficiais antes de decidir)

| Opção | O que a pesquisa encontrou | Observação para integração |
|---|---|---|
| Modelos hospedados na Replicate (ex.: Wav2Lip empacotado) | A listagem de um Wav2Lip na Replicate indica ~US$ 0,026 por execução (varia com a entrada) em GPU A100; o preço por segundo de cada modelo está na página dele | Wav2Lip e vários modelos pedem **vídeo + áudio**, não foto + áudio; escolha um modelo de **foto + áudio** e confira os nomes dos campos |
| Sync Labs (lipsync-2 … sync-3) | Preço por segundo de saída, de ~US$ 0,04/s a ~US$ 0,133/s, segundo a página de modelos | API própria (adaptador específico); trabalha sobre vídeo |
| D-ID | Fontes divergem sobre o teste grátis (de 20 créditos a ~3–5 min), com marca d'água e uso não comercial; plano de entrada em torno de US$ 5/mês | API própria com foto + áudio; exige adaptador específico; **gratuidade não confirmada** |
| HeyGen | Plano grátis de API com 10 créditos/mês; um desenvolvedor relatou erro de geração de foto falante nesse plano; preço por segundo citado por terceiros | API própria; **gratuidade não confirmada** |
| Local, código aberto (LatentSync, MuseTalk, SadTalker, Wav2Lip) | Licenças divergentes entre fontes (Wav2Lip proíbe uso comercial; LatentSync Apache 2.0 ou OpenRAIL++; MuseTalk MIT; SadTalker com ressalvas); VRAM relatada de ~4 GB a ~18 GB | **Não instalado** e **não executado** (exige GPU). Se o usuário quiser, seria um novo adaptador "local" que não envia dados para fora; licenças devem ser conferidas nos repositórios |

Fontes consultadas: [sync.so — modelos](https://sync.so/docs/models), [Replicate — cog-wav2lip](https://replicate.com/devxpy/cog-wav2lip), [sync.so — LatentSync](https://sync.so/blog/what-is-latentsync), [Creative AI News — licenças de lip-sync](https://www.creativeainews.com/articles/open-source-lip-sync-licenses-commercial-use-2026/), [HeyGen — planos de API](https://intercom.help/heygen/en/articles/10060327-new-heygen-api-plans), [Build Fast with AI — D-ID](https://buildfastwithai.com/ai-tools/d-id).

## 4. O que ainda falta para gerar um vídeo com lip-sync real

- Um **provedor escolhido e autorizado pelo usuário** (conta, chave, custo, termos) e o **nome exato dos campos** do modelo para o `inputMap`.
- Se o provedor não aceitar *data URI*: um adaptador específico (envio por URL/multipart) — não implementado.
- Um **teste real controlado** (não feito): só ele prova que o adaptador funciona contra o serviço e que há lip-sync correto. O PiperLine não verifica a qualidade da sincronização labial.
- Preços reais por modelo: informados pelo usuário (o PiperLine não os consulta).
