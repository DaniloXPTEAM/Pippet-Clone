# PERGUNTAS_USUARIO — o que SÓ o usuário pode destravar (rodada 18)

Regra: cada pergunta tem 1 linha e diz o que muda no inventário se for respondida. Nada aqui é bloqueio interno — tudo depende de captura do Pippit real, de provedor/credencial do usuário ou de observação humana. Nenhuma resposta = a linha continua no estado atual (nada é inventado).

| # | Pergunta (1 linha) | O que muda no inventário se respondida |
|---|---|---|
| 8 | Pode abrir o menu "…" de um avatar **seu** no Pippit e descrever/printar as opções? | Linha #8 (menu "…") sai de parcial/UNOBSERVED: as opções viram conteúdo observado e a linha pode ser verificada |
| 38 | Há captura do menu de **presets de áudio** (handoff ao Canvas) e do corpo da requisição? | Linha #38 (Modo Áudio) completa o contrato observado (presets, custo, chunk 565447) e sai de parcial |
| 24 | Há captura do **feed Inspiration** (cartões, abas, likes/remix)? | Linha #24 sai de UNOBSERVED (conteúdo dos cartões/likes/remix vira observado) |
| 25 | Há captura das telas de **personalização de humano digital / Omni**? | Linha #25 sai de UNOBSERVED (corpos/estados das telas viram observados) |
| 37 | Há um **HAR ou log de um stream SSE completo ao vivo** (blocos incrementais, `enable_chunk_stream`, `stream_cur`)? | Linha #37 (SSE) sai de parcial: o formato incremental ao vivo vira observado e testável |
| 6/16 | Qual **provedor de lip-sync** devo configurar para vídeo em avatar/ferramentas — um Space do Hugging Face (`dono/nome-do-space` + `HF_TOKEN` no ambiente, ver `LIPSYNC_PROVIDERS.md` §5) ou outro com GPU? | Linhas #6 (vídeo em avatar) e #16 (ferramentas) saem de "bloqueada: provedor/GPU" para implementada/testada com execução real controlada |
| 7 | Qual **provedor de clonagem de voz** devo usar para voz personalizada (e com qual credencial só no ambiente)? | Linha #7 (voz personalizada) sai de "bloqueada: provedor/paywall" |
| 9 | Consegue registrar um **app OAuth** em cada rede (TikTok/Facebook/Instagram/YouTube) e injetar as variáveis **só no ambiente**? | Linhas #9 (OAuth) e #10 (envio/Análise) saem de "estrutura" e podem ser testadas contra o provedor real |
