# Bloqueios da rodada 15 — o que não foi possível implementar e por quê

Regra: nada foi inventado. Cada pendência diz o motivo exato (falta evidência / GPU / provedor / OAuth / decisão do usuário / serviço externo) e a pergunta objetiva que a desbloqueia. Fontes permitidas: `PIPPIT_*.md`, `notes/`, `app/lib/*.json`, testes e código deste repositório — sem evidência nova do site real.

## A) Linhas bloqueadas (8) — não reproduzíveis sem ação do usuário

| # | Linha | Motivo exato | Pergunta objetiva |
|---|-------|--------------|-------------------|
| 3 | Chat legado (agent-chat) somente leitura | **Falta evidência**: formato antigo; nenhuma tela/conteúdo do chat legado foi capturado em `PIPPIT_*.md`/`notes/`/`app/lib/*.json`. | Existe alguma captura (imagem/JSON) do chat legado para eu registrar no repositório? |
| 6 | Vídeo em avatar (1999 créditos) | **Provedor + assinatura**: exige serviço de lip-sync (nenhum provedor configurado nem observado) e a cota do plano gratuito é bloqueada por paywall. | Qual provedor de lip-sync devo configurar (e com qual chave no ambiente)? |
| 7 | Voz personalizada (180 créditos) | **Provedor + paywall**: clonagem de voz exige serviço; o paywall "uso ilimitado de Voz personalizada" é do serviço. Voz sintética local (melotts/SAPI) já existe. | Qual provedor de clonagem de voz devo usar? |
| 9 | Vincular conta (OAuth TikTok/Facebook/Instagram/YouTube) | **OAuth**: requer app OAuth registrado em cada rede + segredos do usuário (proibidos neste ambiente; nunca armazenados). | Você consegue registrar um app OAuth em cada rede e injetar as variáveis só no ambiente? |
| 14 | Integrações de marketplace/loja | **Falta evidência**: só existe texto de marketing na página de preços; nenhuma tela de integração foi capturada. | Há captura da tela de integrações do app? |
| 19 | Widget de ajuda (kefu-im-i18n.byteintl.com) | **Serviço externo**: widget hospedado em terceiros (byteintl.com) com identificação por token na URL (valor NÃO registrado); conteúdo não lido. | Autoriza reproduzir um widget de terceiros, ou mantenho a central de ajuda local? |
| 27 | Portas de idade, aviso US, instalador PWA, painel dev | **Falta evidência**: módulos condicionais só no código (`lv/v1/sc/age_gate/*`); condições de ativação desconhecidas, nenhuma captura. | Há captura dos portões de idade / aviso US / instalação PWA? |
| 39 | Compra/assinatura real | **Gateway de pagamento + decisão do usuário**: exige gateway real (checkout/webhook/portal) e ambiente de produção. | Qual gateway (e sandbox/produção) devo integrar? |

## B) Linhas parciais (9) — fechadas no que era reproduzível; o resto depende de evidência/provedor

| # | Linha | O que já está (com teste) | O que falta (motivo) | Pergunta objetiva |
|---|-------|---------------------------|----------------------|-------------------|
| 8 | Menu "…" do avatar | "Aplicar" = @menção local; aviso UNOBSERVED em avatar próprio (avatar_menu_ui/route). | **Observação humana**: o conteúdo do menu nunca foi visto (em exemplo não há menu). | Pode abrir o menu "…" de um avatar seu e descrever/printar as opções? |
| 10 | Publicar / Agendado / Análise | Diálogo "Programar publicação" (conta, data/hora, 0/2200), rascunhos e fila locais (publishing, publish_queue). | **OAuth**: envio real e Análise dependem de conta vinculada (ver #9). | Depende da #9. |
| 12 | Botão de ajuda (?) | Central de ajuda local (help_center_route com `notes/pages/13_resource_help-center.json`). | **Falta evidência**: no original o clique não teve efeito visível (2 tentativas) e a central pública nunca foi aberta. | Há captura da central de ajuda do Pippit (/pt-br/resource/help-center)? |
| 16 | Gerador de vídeos / ferramentas | Assistente 3 passos do AI talking photo (talkingphoto_ui) e ferramentas locais por nó. | **Serviço/GPU**: Remove background, Quick cut e Avatar video exigem serviço (GPU). | Qual provedor/GPU devo usar para essas ferramentas? |
| 17 | Promoções variáveis | Histórico observado registrado (90% em 20/10 vs 40% em 21/10; Seedance 2.5 R$0,18/s — promotions_route). | **Dado volátil**: promoção varia por dia; valor atual nunca foi observado. | Qual data de referência devo usar nas tabelas de preços? |
| 24 | Feed Inspiration / desafios | Áreas nomeadas pelos endpoints observados dos bundles (feed/curtir/remix/publicados/atividades — inspiration_route). | **Falta evidência**: nenhuma tela/feed capturada; likes/remix/conteúdo não observados. | Há captura do feed Inspiration (cartões/abas)? |
| 25 | Omni / humano digital | Página documenta os nomes de endpoints (omni/*, digital_human/*) com UNOBSERVED (omni_capabilities_route). | **Observação humana**: corpos, estados e tela nunca capturados. | Há captura das telas de personalização de humano digital? |
| 37 | Fluxos SSE | Formato lido implementado (ping/AssetJsonUpdate com patches; subscribe_thread com run_list — route_single_render). | **Falta evidência**: blocos incrementais ao vivo, `enable_chunk_stream`, `stream_cur` nunca vistos. | Há captura (HAR/log) de um stream SSE completo ao vivo? |
| 38 | Modo Áudio (presets) | Voz local SAPI padrão + opção cloud testadas (audio_mode_ui, composer_audio_mode). | **Falta evidência**: presets de áudio, corpo da requisição, custo por geração e contrato do chunk 565447 nunca capturados. | Há captura do menu de presets de áudio (handoff ao Canvas)? |

## C) Fora das linhas do inventário

- **Pinça (zoom de trackpad)** do canvas: depende de gesto de hardware (sem API confiável no browser); único atalho da referência não implementado (19/20 locais).
- **Conteúdo editorial dos 8 anúncios**: os TEMAS foram reproduzidos (notificações, rodada 15) a partir do relatório; títulos, datas e textos individuais seguem **UNOBSERVED** (não inventados). Divisão tema→anúncio segue a enumeração do relatório.
- **Tradução da interface para os 18 idiomas**: só a escolha persiste (como observado); traduções nunca foram capturadas.
- **Teste do site real (Pippit)**: proibido nesta rodada; nenhuma evidência nova foi coletada.

## D) O que NÃO é bloqueio (para evitar reclamação)

- Itens marcados UNOBSERVED nos testes são decisões honestas, não falhas: o dado nunca foi observado e inventá-lo violaria a regra do projeto.
- Dependências de provedor gratuito configurável (imagem/vídeo/voz) funcionam de verdade quando configuradas — ver `provider_smoke`, `flow_e2e_providers`; sem provedor, 501 com motivo explícito.
