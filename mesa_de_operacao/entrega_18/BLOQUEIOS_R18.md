# BLOQUEIOS_R18 — registro e caminhos de implementação (rodada 18)

## 0. Revogação registrada (ordem substitutiva)

A ordem r18 anterior ("decisões do orquestrador", que fechava linhas como **decidido/fora do escopo**) foi **SUBSTITUÍDA e está revogada**: o commit `5559abb` (DECISOES_R18.md + estado "decidido" + régua de escopo reduzido 105/118) foi **desfeito** por `git revert` neste commit. Regra vigente: **bloqueio = pendência com CAMINHO de implementação — nunca remoção de escopo**. Nada sai do escopo sem autorização do usuário. As contagens continuam **x/122 (critério antigo)** e **x/423 (catálogo integral)**; não existe régua de escopo reduzido.

## 1. Linhas bloqueadas — cada uma com o CAMINHO de implementação (nunca remoção)

| # | Linha | Estado | CAMINHO de implementação (o que foi feito na r18 e o que falta) |
|---|---|---|---|
| 3 | Chat legado (agent-chat) somente leitura | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** leitor do formato conhecido (JSON de mensagens id/role/content/timestamp) + tela somente leitura, campos sem evidência marcados UNOBSERVED. **Falta:** captura de uma conversa real para validar o formato e o conteúdo |
| 6 | Vídeo em avatar (lip-sync) | implementada (conteúdo UNOBSERVED) | **Feito (r17/r18):** adaptadores `huggingface-space` e `local-command` completos, testados com servidor falso (upload/call/stream/download/erro/cancelamento). **Falta:** credencial de provedor/GPU do usuário + teste real controlado (`LIPSYNC_PROVIDERS.md` §5) |
| 7 | Voz personalizada (clonagem) | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** adaptadores `huggingface-space` e `local-command` de clonagem de voz, testados com servidor falso. **Falta:** provedor de clonagem + amostra de voz real |
| 9 | Vincular conta (OAuth TikTok/Facebook/Instagram/YouTube) | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** adaptadores OAuth completos com PKCE/state, callback em `127.0.0.1`, tokens cifrados no servidor (AES-256-GCM), credenciais só por ambiente (`.env.example`). **Falta:** app registrado em cada rede + credenciais no ambiente |
| 10 | Publicar / Agendado / Análise | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** fila de publicação + fluxo "gerar vídeo → publicar" ponta a ponta contra servidor falso. **Falta:** credenciais reais (#9) para envio de verdade; Análise depende de dados reais de conta |
| 14 | Integrações de marketplace/loja | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** tela de integrações, conexão, importação de produto e envio de vídeo, adaptador plugável + servidor falso. **Falta:** credencial da loja real + captura da tela original |
| 19 | Widget de ajuda de terceiros | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** widget local com a mesma interface (botão, painel, conversa) e respostas locais — sem copiar token de terceiro. **Falta:** captura do widget real para refinar textos (UNOBSERVED) |
| 27 | Portas de idade, aviso US, instalador PWA, painel dev | implementada (conteúdo UNOBSERVED) | **Caminho desta rodada (r18):** portas de idade e aviso US ativados por configuração, PWA (manifest + service worker + instalação) e painel dev; testes de rota/UI. **Falta:** captura das telas originais (textos UNOBSERVED) |
| 39 | Compra/assinatura real | implementada (estrutura) | **Caminho desta rodada (r18):** checkout/webhook/portal contra servidor falso (decisão antiga do usuário: pagamento só estrutura, sem gateway real). **Falta:** gateway real — **fora do que pode ser feito sem ação do usuário**, mas a LINHA permanece no escopo |

## 2. O que SÓ o usuário destrava (ver `PERGUNTAS_USUARIO.md`)

Capturas do Pippit real (menu "…" do avatar, presets de áudio, feed Inspiration, Omni, SSE, integrações, portas de idade), credenciais de cada rede no ambiente, provedor de lip-sync/voz. Cada pergunta diz o que muda no inventário se respondida.
