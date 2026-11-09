# Projetos existentes da conta e organização dos workflows — observação via REA
Fonte: `captures/auth/scenario_project1.json`, `scenario_projects2to5.json`, textos `step_*.txt` (árvore de acessibilidade das telas; leitura só, nada foi gerado/alterado). Os textos dos prompts do usuário são conteúdo pessoal e ficam apenas nas capturas locais; aqui há só estrutura. **[V]** observado; **[I]** inferido; **[?]** desconhecido.

## 1. Tipos de projeto encontrados [V]
| projeto (histórico) | rota | tipo |
|---|---|---|
| Cena de Desjejum… (2026-10-07) | `/nest-agent-project?projectId=…&entranceFrom=history` | **Tela/canvas + agente** (nós, arestas, chat do agente) |
| Vídeo 3D Viral Infantil… (2026-09-14) | idem (`&canvasId=…`) | Tela/canvas + agente, multi-etapas |
| Vídeo selfie Stories (2026-03-09) | `/agent-chat?threadId=<uuid>&tabName=home&editType=smart_ad_…` | **chat legado "smart ad"** |
| Vídeo apresentação, video de apresentação (2026-02-27) | idem | chat legado "smart ad" (até 5 imagens anexadas) |
| "PROJECT" (2026-10-20) | `/nest-agent-project?…` | canvas vazio criado ao clicar em "Tela" |
O app mostra nos chats legados: "Atualizamos o agente. Inicie um novo chat para gerar conte… " + botão "Nova conversa" (chat legado fica somente leitura) [V].

## 2. Chat legado (`agent-chat`) [V]
Sequência por mensagem: (1) mensagem do usuário (texto, imagens anexadas, horário) com "Copiar como prompt"; (2) **resposta curta do agente** em PT-BR que reafirma o pedido em 1 frase e avisa que pode demorar ("Compreendi! Vou criar um vídeo de …"; "Ótimo! Vou criar um vídeo de apresentação …"); (3) cartão do vídeo com duração (0:04, 0:21, 0:24); (4) "Relatar um problema". Não há lista de etapas, prompt expandido nem workflow visível nesse modo. Quando o usuário já escreve um prompt estruturado (campos Prompt/Enquadramento/Estética/Áudio/Restrições), o texto aparece como "Prompt: …" sem reescrita visível [V]; a reformulação interna, se houver, é [?].

## 3. Canvas + agente (`nest-agent-project`) [V]
**Layout**: título editável ("Salvo" = autosave), proporção global (9:16), "Biblioteca de estilos", compartilhar tela, avatar; canvas com barra: Carregar, Selecionar na biblioteca de ativos, Adicionar nó, Ajuda, Ajustar à tela, Ocultar conexões, Ocultar variações geradas, Mostrar minimapa, Mover canvas, Encaixar na grade, Modo trackpad/mouse, Zoom; painel lateral "Conversas do agente" (abas de chats, Novo chat, Histórico de chats, Mostrar à esquerda, Compartilhar, Fechar). Compositor: Carregar material de referência, Marcar (@), Habilidades, Modelos, indicador de custo "N /s" e "Regras de créditos" [V].
**Nós do canvas** (rótulo "Título do nó"): imagem (`bible.png`, `shot_01_lastframe.png`), documento (`creative_design.md`, `storyboard.md`), vídeo (`shot_01.mp4` … `shot_03.mp4`, vídeo final `…_final.mp4`; 8 arestas "Edge from A to B" entre nós) [V]. Há caminho de workspace do agente: `/workspace/assets/<pasta>/shot_01.mp4` [V] → o agente roda em sandbox com sistema de arquivos próprio.
**Documento `creative_design.md`** (gerado automaticamente a partir do pedido; estrutura observada): *Design Criativo* → Estilo Geral · **Restrições Rígidas do Usuário** (duração total, idioma, legendas, BGM, proporção, uso de ativos) com valores "Unspecified" quando o usuário não definiu · Requisitos Adicionais (tema escolhido, público, enredo resumido, narração, estrutura gancho/progressão/clímax/final, **modelo escolhido**, **limite por chamada = 15 s**) · Linha da História · Elementos do Roteiro (Personagens com descrição e voz, …) [V].

## 4. Workflow observado no projeto de 45 s (ordem real) [V]
1. Pedido do usuário (texto curto + imagem de referência + duração).
2. Resposta do agente com plano em prosa (segmentar em cenas, manter consistência de personagem).
3. Passos rotulados: **Habilidades carregadas** → **Arquivo lido** (lê a referência).
4. **Pergunta de esclarecimento** com 3 opções + "Outro tema" (o usuário escolheu a opção 3). Resposta do usuário reentra no chat.
5. **Planos criados** → **Solicitação executada** (chamadas de ferramenta) → **sub-agentes** nomeados `creative_agent` e (depois) `storyboard_agent`; vários **Arquivo lido/editado**.
6. Decisão de segmentação: "o gerador permite no máximo 15 s por trecho" ⇒ **3 segmentos de 15 s** com continuidade pelo **último quadro** do segmento anterior (nó `shot_01_lastframe.png`).
7. Direção visual fixada (animação 3D infantil…) e geração de imagens de apoio; três falhas "Não foi possível gerar a imagem"; falha de ferramenta `sandbox_generate_audio`.
8. **Storyboard** salvo como artefato (`storyboard.md`, botão "Ver").
9. **Formulário de confirmação de produção** ("Confirmar produção do vídeo"): 1) paralelo / em sequência usando o último quadro / revisar storyboard; 2) continuar automaticamente? sim / confirmar cada segmento. Estado final do botão: **Confirmado** (desabilitado).
10. Geração dos vídeos: **falhou** com o modelo `seedance_2.0_fast`: "Não foi possível gerar o vídeo. Assine para continuar usando este recurso." + cartão "Você está usando um recurso Starter … Assinar agora". O agente não consegue trocar de modelo sozinho nesse ambiente (afirma isso na conversa) [V]; o usuário trocou o modelo/"correspondência inteligente" na UI (modelos do compositor) e o agente passou a usar **Seedance 2.0 mini lite, limite 15 s**.
11. Segmentos gerados: "Vídeo gerado" 0:15 ×3, cada um com "Localizar na tela"; passo "Vídeo renderizado" 0:45 (concatenação); verificação final do arquivo (duração 45,5 s, 1080×1920).
12. Resumo final em lista (duração, formato, história, referência, segmentos, legendas desativadas, resultado) + "Gerar novamente".
Custo exibido no compositor: "7 /s" (créditos por segundo do modelo selecionado, [V] como texto; interpretação [I]). Histórico de créditos mostra −105 por geração de 15 s "Seedance 2.0 Mini (teste)": 15 s × 7 = 105 [I, conferido aritmeticamente com o ledger].

## 5. Projeto de uma cena (Desjejum) [V]
Entrada: vídeo do usuário/enviado como nó (`…Desjejum.mp4`) + prompt longo em inglês com restrições; passos: Habilidades carregadas → Ideias criativas geradas → Vídeo gerado (0:09). O agente reporta que o serviço devolveu 9 s embora pedidos 8 s e que pode ajustar em nova etapa; formato 1080×1920 [V]. ⇒ a duração final **não é exata** (o serviço arredonda/estende) [V].

## 6. Comparação entre projetos
- Comuns: resposta curta de reconhecimento em PT-BR antes de agir; resultado sempre com duração; vertical 9:16 (1080×1920); "Copiar como prompt" por mensagem do usuário; botão "Relatar um problema".
- Diferem: modo legado (sem etapas) vs agente (etapas, nós, sub-agentes); pedido curto (45 s) dispara esclarecimento + design doc + storyboard + confirmação; pedido já detalhado (Desjejum) vai direto a "Ideias criativas geradas" → vídeo.
- Seleção de modelo: configurada no compositor (Modelos / "correspondência inteligente"); o agente reporta o id (`seedance_2.0_fast`) e é bloqueado por plano ⇒ **modelo × plano é regra do backend** [V].
## 7. Observável × desconhecido
Observável: sequência e rótulos das etapas, tipos de nó/aresta, estrutura do design doc, regra de segmentação (≤15 s), formulário de confirmação, estados (completed/failed/warning/Confirmado), gating por plano, custo por segundo. **Desconhecido [?]**: o prompt do sistema/regras do agente, como as habilidades são escolhidas/carregadas, o prompt final enviado a cada modelo (a UI mostra o prompt do usuário e o resumo do agente, não o prompt de modelo), a API/protocolo de streaming do chat (requisições do chat não foram retidas na captura: os pedidos feitos após o clique não aparecem), o formato JSON dos nós/arestas e a persistência (`create_creative_project`, autosave "Salvo").
