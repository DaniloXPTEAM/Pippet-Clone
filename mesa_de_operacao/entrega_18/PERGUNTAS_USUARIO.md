# PERGUNTAS_USUARIO — rodada 18 (ordem substitutiva)

Só o que **apenas o usuário** destrava. Uma linha pergunta; a coluna diz o que muda no inventário se respondida. Nada aqui é bloqueio removido: tudo continua no escopo como pendência com caminho de implementação (ver `BLOQUEIOS_R18.md`). A revogação da ordem anterior de "decisões" está registrada em `BLOQUEIOS_R18.md` §0.

| # | Pergunta (o que só o usuário destrava) | O que muda no inventário se respondida | Passo de verificação |
|---|---|---|---|
| 1 | Me envie captura do menu "…" do avatar (comandos por item) | Linha 50 sai de UNOBSERVED: itens em pt-BR + "Traduzir" passam a CONFIRMED no conteúdo | Abrir menu do avatar e comparar |
| 2 | Me envie captura do modo Áudio do composer (presets e corpo) | Presets/valores do modo Áudio saem de UNOBSERVED (linhas 53 e 62) | Abrir composer → Áudio e comparar |
| 3 | Me envie captura do feed Inspiration (abas e detalhe) | Conteúdo das abas Publicados/Templates/Em alta sai de UNOBSERVED (linhas 72–87) | Abrir Inspiration e comparar |
| 4 | Me envie captura do fluxo Omni (modo Padrão/Direto, até o resultado) | Campos e ordem do form (linhas 63–68) e o rótulo do resultado (linha 69) saem de UNOBSERVED | Reproduzir o fluxo no app real e comparar |
| 5 | Me envie captura de como o Pippit mostra o progresso (SSE) | Formato do progresso (linha 61) sai de UNOBSERVED | Gerar no app real com a rede aberta e comparar |
| 6 | Qual provedor/servidor de lip-sync e voz personalizada você quer usar (Space dono/nome + apiName, ou comando local)? | Linhas #6 e #7 saem de UNOBSERVED para CONFIRMADO no provedor escolhido (adaptadores prontos em `LIPSYNC_PROVIDERS.md` §5 e `/api/voiceclone/contract`) | Configurar e rodar uma tarefa real |
| 7 | Me envie captura da tela de integrações/loja do Pippit real (conexão, importação de produto, envio de vídeo) | Linha #14: o layout/texto da tela real sai de UNOBSERVED (a tela local já existe em `#/integrations`) | Abrir Integrações no app real e comparar |
| 8 | Me envie captura das portas de idade, aviso US, instalador PWA e painel dev do Pippit real | Linha #27: textos/layout reais saem de UNOBSERVED (as telas já existem, ativadas por `PIPPIT_AGE_GATE`/`PIPPIT_US_NOTICE`/`PIPPIT_PWA`/`PIPPIT_DEV_PANEL`) | Ativar as flags e comparar com as capturas |
| 9 | Coloque as credenciais de cada rede no AMBIENTE (TIKTOK_CLIENT_KEY/SECRET, META_APP_ID/SECRET, GOOGLE_CLIENT_ID/SECRET) e registre os apps | Linhas #9 e #10 saem de UNOBSERVED para CONECTADO de verdade: o fluxo "gerar vídeo → publicar" passa a ir para a rede real (fila e adaptadores já prontos) | `POST /api/oauth/social/start` por rede e publicar um vídeo |
