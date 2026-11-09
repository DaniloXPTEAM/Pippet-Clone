# Opportunity — Blueprint de implementação própria

**Origem:** capacidades observadas no frontend público do Pippit (ver `PIPPIT_PRODUCT_TECHNICAL_ANALYSIS.md`).
**Regra deste documento:** transforma **o que o produto faz** em **requisitos independentes**. **Não contém, nem deve levar a copiar,** código, textos, imagens, nomes de modelos de roteiro, identidade visual ou prompts do Pippit. O backend do Pippit **não foi observado**: tudo abaixo é **projeto nosso**, não engenharia reversa.
**Marcação:** *[Estimativa]* = número ou prazo meu, sem base medida. *[Decidir]* = escolha que cabe à Opportunity.

---

## 0. O que NÃO copiar
- Código, bundles, estrutura de componentes e nomes internos (`lv`, `kep`, `seeyou`, `cc4b` etc.).
- Textos, microcopy, nomes de modelos de roteiro ("templates"), imagens e vídeos de vitrine, paleta, tipografia e layout característicos (trade dress).
- Nomes comerciais de modelos de terceiros como se fossem nossos.
- Qualquer dado de usuário ou chamada a endpoints do Pippit.

## 1. Escopo e ligação com os projetos da Opportunity
| Projeto (página Labs) | Capacidades do blueprint que o alimentam |
|---|---|
| **CineForma** (história → roteiro → storyboard → vídeo) | F4, F7, F9, F11 |
| **Opportunity Creators** (personagens/influenciadoras virtuais) | F5, F6, F10 |
| **AI Image Studio** (imagem por API) | F2, F8, F13 |
| **Kirana / CRM / Gabi** | F12, F15 (identidade, observabilidade); integração opcional com F10 |

**Proposta de MVP [Decidir]:** F1 + F2 + F7 + F8 + F9 + F12 + F14 (gerar vídeo e imagem a partir de prompt/imagem, com créditos, fila, login e proteção básica). O resto vem depois.

## 2. Arquitetura de referência própria
```
[Web/PWA]  ──►  [API Gateway / BFF] ──► [Serviço de Identidade]
 (React/…)            │                 [Serviço de Créditos/Cobrança]
                      ├──► [Serviço de Projetos & Ativos] ──► [Object Storage + CDN]
                      ├──► [Serviço de Jobs] ──► [Fila] ──► [Workers de Geração]
                      │                                         │
                      │                       [Camada de Provedores de Modelo] (adaptadores)
                      │                                         │
                      │                         [Pós-processo: transcode, rótulo, miniaturas]
                      ├──► [Serviço de Publicação] ──► APIs de redes sociais
                      ├──► [Moderação / Conformidade]
                      └──► [Eventos] ──► [Analytics / Observabilidade / Experimentos]
[CMS] ──► [Páginas públicas / SEO]
```
Princípios: **geração sempre assíncrona**; **adaptadores de provedor** (trocar modelo sem mexer no produto); **créditos como livro-razão**; **mídia só por URL assinada**.

---

## 3. Capacidades (uma a uma)

### F1 — Gerador de vídeo por agente
- **Observado:** o usuário escreve um prompt e/ou anexa **link, mídia ou documento**; há modos de qualidade/velocidade; mostra progresso e erros claros; limita tamanho dos arquivos.
- **Implementação própria:**
  - **Frontend:** formulário com campo de prompt, anexos (link, arquivos, documento), seletor de modo/modelo, duração e formato (vertical/horizontal), botão gerar, tela de progresso.
  - **Backend:** `POST /v1/video-jobs` valida entrada, **extrai conteúdo** de link/documento (serviço de ingestão), monta um **plano de cena** (LLM de roteiro), reserva créditos e cria o job.
  - **Fila:** job entra na fila de vídeo; workers executam **plano → geração de cenas → voz/música → montagem → render**.
  - **Storage:** upload direto por URL assinada; saída em bucket próprio + CDN.
  - **Modelo:** provedor escolhido por nós [Decidir]; modos "rápido" e "qualidade" = perfis de modelo.
  - **Catálogo de modelos por usuário/região:** o frontend do Pippit pede ao backend a "lista de modelos disponíveis para o agente". Próprio: `GET /v1/models` que devolve só o que o plano, a região e a saúde do provedor permitem (e esconde o que está fora do ar).
  - **Aceite:** do prompt ao vídeo reproduzível; falha reembolsa créditos; limites de arquivo aplicados no cliente e no servidor.

### F2 — Gerador de imagem e conversão em vídeo
- **Observado:** gera imagem por modelo; edita; baixa em formato/tamanho; botão para **transformar em vídeo**.
- **Próprio:** `POST /v1/image-jobs` (prompt, referências, proporção); página de resultado com **variações**, ações "editar", "baixar (PNG/JPG/WebP, tamanho)" e "enviar ao F1 como primeiro quadro".
- **Fila:** mesma infraestrutura, fila de imagem (mais barata e rápida). **Aceite:** imagem em segundos; encadeamento imagem→vídeo reutiliza o ativo, sem novo upload.

### F3 — Estúdio de modelos de roteiro (templates parametrizados)
- **Observado:** lista de modelos prontos de vídeo curto; cada um pede **uma imagem** e **uma história**, com configurações de geração.
- **Próprio:** entidade `Template` = {nome, descrição, **esquema de entradas**, **prompt-base versionado**, perfil de modelo, exemplo}. Painel administrativo (CMS) para criar templates **originais nossos**; o front monta o formulário a partir do esquema.
- **Coleções e busca:** o frontend tem módulo de **coleções e busca de modelos por segmento (e-commerce)** com versão para SEO. Próprio: `Template` com tags/segmento, `Collection` curada e busca textual; páginas públicas de coleção indexáveis.
- **Aceite:** adicionar um template novo **sem deploy**; versionamento e A/B de prompt-base.

### F4 — Estúdio de histórias (roteiro → storyboard → vídeo)
- **Observado:** páginas de roteiro de IA, drama curto, filme, storyboard e fluxo de trabalho.
- **Próprio:** fluxo em etapas **editáveis**: ideia → roteiro (LLM) → personagens/cenários (consistência por imagem de referência) → storyboard por cena → geração por cena → montagem. Cada etapa salva um **artefato versionado**; o usuário pode regenerar só uma cena.
- **Fila:** job pai com **sub-jobs por cena** (paralelos). **Aceite:** regenerar 1 cena não refaz as outras; custo por etapa visível antes de confirmar. *(Núcleo do CineForma.)*

### F5 — Avatares, foto falante, voz, dublagem e tradução
- **Observado:** avatar digital e **personalizado** (de foto/vídeo), foto falante com áudio de até ~17 s, voz de IA, dublagem e tradução de vídeo.
- **Próprio:** serviços separados — **TTS/voz** (catálogo próprio + clonagem **com consentimento registrado**), **animação facial** (foto + áudio → vídeo), **tradução** (transcrição → tradução → TTS → sincronização labial opcional).
- **Dados:** `Avatar`, `VoiceProfile` com **prova de consentimento** e vínculo ao dono.
- **Aceite:** não é possível clonar voz/rosto sem declaração de direitos e consentimento; limites de duração por plano.

### F6 — Showcase de produto e e-commerce
- **Observado:** a partir de imagens/links de produto, gera vídeos e imagens de venda; pede ao usuário declarar que é dono da mídia.
- **Próprio:** ingestão de **URL de produto** (título, fotos, atributos) → templates de vídeo de produto (F3) → variações por canal (formatos). Integração opcional com lojas via **APIs oficiais** [Decidir].
- **Aceite:** do link do produto a 3 variações de vídeo; declaração de direitos obrigatória e registrada.

### F7 — Edição por conversa e render final
- **Observado:** chat que permite **prévia**, **gerar de novo**, **mencionar item no prompt** e **renderizar o vídeo completo**.
- **Próprio:** o projeto é um **documento de timeline** (JSON versionado: cenas, falas, legendas, trilha). O chat altera o documento por **operações** (trocar cena, mudar texto, ajustar ritmo); a prévia usa render de baixa resolução; "renderizar" cria job de alta qualidade.
- **Aceite:** desfazer/refazer; histórico por projeto; prévia rápida separada do render final.

### F8 — Créditos, planos e cobrança
- **Observado:** plano grátis e 3 pagos (mensal/anual), créditos diários, bônus de cadastro, créditos comprados com validade e sem reembolso, expiração, **indicação de amigos**, programa de afiliados.
- **Próprio:**
  - **Livro-razão** (`CreditLedger`): lançamentos imutáveis (concessão, compra, consumo, estorno, expiração) com saldo por **bucket** e validade.
  - **Reserva → confirmação → estorno** em cada job (idempotente).
  - **Tabela de custo** por operação (versão e data), editável sem deploy.
  - **Cobrança** por gateway de pagamento [Decidir] com **webhooks**; planos, trial, cupom, impostos e notas fiscais (Brasil).
  - **Indicação/afiliados:** código de convite, atribuição, regras antifraude.
- **Preço por região:** o cliente consulta preços por localização/país e "entradas de compra" (pontos de upsell). Próprio: tabela `Price(plan, country, currency, version)`, moeda local (BRL no início), impostos e exibição pelo país detectado, com opção de o usuário trocar.
- **Aceite:** nunca consumir crédito sem job; saldo reconciliável; estorno automático em falha.

### F9 — Fila e prioridade
- **Observado:** mostra **posição, tempo estimado** e uma **fila rápida** para assinantes.
- **Próprio:** filas por tipo e por plano; **estimativa de espera** calculada por throughput recente; limites de concorrência por usuário; **cancelamento**; reprocessamento automático com *backoff*; DLQ.
- **Aceite:** estimativa aparece na interface; assinantes têm prioridade previsível; picos não derrubam o sistema (contrapressão e mensagem "alta demanda").

### F10 — Publicação, agendamento e análise
- **Observado:** publicar em TikTok, Facebook e YouTube; agendar por dia/hora; painel de análise; exigências de conteúdo de marca.
- **Próprio:** `SocialAccount` com **OAuth oficial de cada rede**; fila de publicação com agenda; adaptação de formato/legenda por rede; coleta de métricas pela API oficial.
- **Aceite:** o usuário conecta/desconecta contas, agenda e vê resultado; **tokens guardados criptografados**; respeito às regras de cada plataforma. *[Decidir]* quais redes no MVP.

### F11 — Biblioteca de ativos, workspace e equipe
- **Observado:** espaço de trabalho, convite, limite de armazenamento, upgrade de espaço, compartilhamento, histórico.
- **Próprio:** `Workspace` → `Project` → `Asset`; papéis (dono, editor, leitor); cotas por plano; lixeira com retenção; links de compartilhamento com expiração; deduplicação por hash.
- **Aceite:** convidar membro; cota respeitada; excluir de verdade (LGPD) após a retenção.

### F12 — Autenticação e conta
- **Observado:** login por TikTok, Facebook, Google, e-mail com código; exclusão de conta; bônus no primeiro cadastro.
- **Próprio:** provedor de identidade próprio ou gerenciado [Decidir], com **OAuth/OIDC**, e-mail com código ou *magic link*, MFA opcional, sessões revogáveis, **exclusão de conta** com apagamento de dados.
- **Aceite:** conta única por pessoa (vincular provedores); bônus de cadastro com antiabuso (limite por dispositivo/IP/e-mail).

### F13 — Páginas públicas, SEO, i18n e CMS
- **Observado:** dezenas de páginas por ferramenta e por modelo, 7 idiomas, textos vindos de uma plataforma de tradução, páginas guiadas por CMS.
- **Próprio:** site público com **SSR/SSG**, CMS headless, **componentes de bloco** reutilizáveis (cabeçalho, rodapé, CTA, FAQ, depoimentos), `hreflang`, *sitemap* e dados estruturados. Textos em arquivos por idioma com chaves **nossas**.
- **Idiomas:** o Pippit tem rotas para ~28 idiomas, embora o seletor mostre 7. Próprio: **preparar as chaves e rotas por idioma desde o início** e liberar idiomas aos poucos, conforme revisão das traduções.
- **Aceite:** publicar uma página nova sem deploy; Lighthouse e Core Web Vitals monitorados; pt-BR e en no início [Decidir].

### F14 — Conformidade e segurança de conteúdo
- **Observado:** rótulo de conteúdo de IA, declaração de direitos sobre a mídia enviada, regras de conteúdo de marca, bloqueio regional, exclusão de conta, consentimento de cookies.
- **Próprio:**
  - **Moderação** de prompt e de saída (texto, imagem, vídeo) com política escrita; bloqueio de rosto de terceiros sem consentimento.
  - **Procedência:** marca/metadado de conteúdo gerado por IA nos arquivos exportados.
  - **Declaração de direitos** no upload, registrada com data e versão do termo.
  - **LGPD:** base legal, política de privacidade, consentimento de cookies, direitos do titular (acesso, exclusão), retenção definida. **Revisão jurídica obrigatória [Decidir].**
  - **Geoblocking** configurável por regra.
- **Aceite:** conteúdo proibido é bloqueado e auditável; exclusão de conta apaga ativos e dados no prazo definido.

### F15 — Observabilidade, experimentos e analytics
- **Observado:** monitoramento de erros e desempenho, testes A/B, analytics, gravação de sessão, múltiplos pixels.
- **Próprio:** **logs estruturados + métricas + tracing** em todos os serviços; funil de produto (visita → prompt → login → geração → exportação); **feature flags e A/B** próprios; analytics com **consentimento prévio**; painel de custo por job.
- **Atribuição de anúncios:** o cliente guarda um identificador de clique de anúncio e usa links de instalação/atribuição para o app móvel. Próprio: captura de `utm_*`/click id no primeiro acesso (com consentimento), ligada à conversão e ao custo de aquisição.
- **Aceite:** cada job tem trilha completa (entrada, provedor, custo, tempo, resultado); nenhuma ferramenta de rastreio carrega antes do consentimento.

### F16 — Web, PWA e mobile
- **Observado:** manifesto PWA e interface responsiva.
- **Próprio:** PWA instalável; layout responsivo; envio de mídia pelo celular; notificação "seu vídeo ficou pronto".

---

## 4. Modelo de dados (entidades principais)
`User` · `Identity(provider)` · `Workspace` · `Member(role)` · `Project(timeline_json, version)` · `Asset(kind, hash, storage_key, owner, rights_declaration)` · `Template(schema, base_prompt, version)` · `Job(type, status, cost, provider, parent_id, idempotency_key)` · `JobEvent` · `CreditLedger(bucket, amount, expires_at, ref_job)` · `Plan` · `Subscription` · `Payment` · `Referral` · `SocialAccount(token_enc)` · `ScheduledPost` · `ModerationCase` · `ConsentRecord` · `AuditLog`.

## 5. API própria (proposta, nomes nossos)
| Método | Caminho | Uso |
|---|---|---|
| POST | `/v1/uploads` | URL assinada para envio de arquivo |
| POST | `/v1/video-jobs` · `/v1/image-jobs` · `/v1/voice-jobs` | criar geração (com `Idempotency-Key`) |
| GET | `/v1/jobs/{id}` | estado, progresso %, fila, estimativa, custo |
| POST | `/v1/jobs/{id}/cancel` | cancelar e estornar |
| GET/PATCH | `/v1/projects/{id}` | timeline versionada |
| POST | `/v1/projects/{id}/operations` | edição por conversa (operações) |
| POST | `/v1/projects/{id}/render` | render final |
| GET | `/v1/credits` | saldo por bucket |
| POST | `/v1/publish` | publicar/agendar |
| GET | `/v1/templates` | catálogo |
Eventos de progresso por **SSE ou WebSocket** (decisão nossa) em vez de *polling*.

## 6. Ciclo de vida do job (máquina de estados)
`criado → créditos reservados → na fila → ingestão/plano → gerando → pós-processando → pronto` · desvios: `falhou` (estorno) · `cancelado` (estorno parcial) · `bloqueado pela moderação` (estorno).
Regras: **idempotência** por chave; **reprocesso** seguro; **timeout** por etapa; custo e provedor registrados em cada `JobEvent`.

## 7. Camada de provedores de modelo
Interface única por categoria (`gerarVideo`, `gerarImagem`, `sintetizarVoz`, `animarRosto`, `transcrever`, `traduzir`, `roteirizar`). **Critérios de escolha [Decidir]:** qualidade, custo por segundo/imagem, latência, limites de uso, **licença comercial e direitos sobre a saída**, regiões, estabilidade da API e risco de descontinuação. Manter **2 provedores por categoria** (principal e reserva) e **matriz de testes** com o mesmo conjunto de prompts para comparar. Opção de **modelos abertos hospedados por nós** onde o custo compensar [Decidir].

## 8. Stack sugerida (opções, nada imposto) [Decidir]
- **Frontend:** React/Next ou equivalente com SSR; design system próprio.
- **Backend:** serviços em Node/TypeScript ou Python; fila (Redis/RabbitMQ/SQS); workers com GPU sob demanda para o que for hospedado.
- **Dados:** PostgreSQL (transacional e livro-razão), Redis (cache/limites), object storage + CDN, busca opcional.
- **Infra:** contêineres, IaC, ambientes dev/staging/prod, filas separadas por tipo, *autoscaling*.
- **Pagamentos:** gateway com suporte a Pix, cartão e boleto no Brasil [Decidir].

## 9. Segurança e privacidade
Mídia privada por padrão (URL assinada curta); criptografia em repouso para tokens e dados sensíveis; **limites de taxa** e antiabuso; auditoria de ações; segregação por workspace; backups e plano de recuperação; **sem chamar APIs de terceiros com dados do usuário sem base legal**.

## 10. Direcionadores de custo [Estimativa]
Custo dominante: **geração de vídeo** (por segundo), depois imagem/voz; mais armazenamento e saída de CDN. Defina cedo: **tabela de custo por operação**, **margem alvo por plano** e **limites diários do plano grátis** (é o maior risco de queima de caixa). Monitorar custo por job desde o primeiro dia (F15).

## 11. Roadmap por fases [Estimativa; ajustar à equipe]
| Fase | Entrega | Capacidades |
|---|---|---|
| 0 | Decisões, provedores testados, política de conteúdo, jurídico | — |
| 1 (MVP) | Login, créditos, fila, imagem e vídeo por prompt, resultado e download | F1 F2 F8 F9 F12 F14 |
| 2 | Edição por conversa, projetos, biblioteca, templates próprios | F3 F7 F11 |
| 3 | Estúdio de histórias (CineForma) e avatares/voz | F4 F5 |
| 4 | Publicação, e-commerce, afiliados, SEO e CMS | F6 F10 F13 |
| 5 | Equipe, observabilidade avançada, A/B, mobile | F11 F15 F16 |

## 12. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Custo de geração acima do esperado | tabela de custo, limites, fila por plano, cache de resultados |
| Dependência de um provedor | adaptadores + provedor reserva |
| Conteúdo proibido ou deepfake | moderação, consentimento, rótulo, bloqueio de rosto de terceiros |
| Direitos autorais da saída/entrada | declaração no upload, política, escolha de provedor com licença comercial |
| LGPD | base legal, retenção, exclusão real, revisão jurídica |
| Abuso do plano grátis | limites por conta/dispositivo, verificação, créditos diários baixos |
| Concorrente grande e gratuito (apoiado por big tech) | **nicho e diferencial** (ex.: narrativa longa, personagens consistentes, integração ao CRM) em vez de competir só em "gerar vídeo" |

## 13. Perguntas em aberto para o Dannilo
1. Qual projeto entra primeiro: **CineForma**, **Creators** ou **AI Image Studio**?
2. Público e idioma iniciais: Brasil em pt-BR apenas, ou já pt-BR + en?
3. Gerar com **APIs de terceiros** ou hospedar modelos próprios (custo de GPU)?
4. Quais **redes** publicar no MVP?
5. Orçamento mensal de geração e margem alvo?
6. Qual o **diferencial** que vocês querem, já que o Pippit é gratuito e apoiado por uma grande empresa?
7. Quem faz a **revisão jurídica** (LGPD, direitos autorais, termos)?
