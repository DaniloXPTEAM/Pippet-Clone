# DECISOES_R18 — decisões do orquestrador (2026-11-12)

Regra: estas decisões fecham o bloqueio como **decidido**, **NÃO** como feito. Nenhuma linha sobe a "pronta" por decisão, nenhum dado observado é inventado, e nada é implementado sem evidência. As linhas são as da régua r15 (numeradas como em `entrega_15/BLOQUEIOS_R15.md`).

| # | Linha | Decisão | Motivo | Rótulo da linha |
|---|---|---|---|---|
| 39 | Compra/assinatura real | **NÃO** integrar gateway. O produto é gratuito: fica a estrutura (`PAGAMENTO_ESTRUTURA.md`) e a tela diz "Não há pagamento" | decisão do usuário (produto gratuito; sem gateway) | **decidido** — "estrutura, fora do escopo atual" |
| 19 | Widget de ajuda de terceiros (kefu) | **NÃO** reproduzir. Fica a central de ajuda local | widget hospedado em terceiro com token na URL (valor não registrado) | **decidido** — "equivalente local" |
| 27 | Portas de idade, aviso US, instalador PWA, painel dev | **NÃO** implementar nada | sem evidência no repositório e sem uso no clone | **decidido** — "fora do escopo atual (sem evidência)" |
| 14 | Integrações de marketplace/loja | **NÃO** implementar nada | idem | **decidido** — "fora do escopo atual (sem evidência)" |
| 3 | Chat legado (agent-chat) | **NÃO** implementar nada | idem | **decidido** — "fora do escopo atual (sem evidência)" |
| 9 | Vincular conta (OAuth TikTok/Facebook/Instagram/YouTube) | continua **estrutura** até o fim do projeto (nada a fazer agora) | requer app OAuth registrado + segredos do usuário | **decidido** — "estrutura" |
| 10 | Publicar / Agendado / Análise (envio real) | continua **estrutura** até o fim do projeto (nada a fazer agora) | depende da #9 | **decidido** — "estrutura" |
| 17 | Promoções variáveis | data de referência = os valores observados de **20/10 e 21/10** (já registrados em `promotions_route`) | dado volátil; valor atual nunca observado | **decidido** — "histórico observado, valor atual desconhecido" |
| 12 | Botão de ajuda (?) | a central de ajuda local é o **equivalente aceito** | no original o clique não teve efeito observável (2 tentativas) | **decidido** — "equivalente aceito" |

## Contas (sem inflar)

- **(a) Critério antigo (r15, 122 linhas): 105/122 = 86,1%** — **igual ao anterior.** "decidido" não é "pronta".
- **(b) Escopo reduzido por decisão (r18): 105/118 = 89,0%** — o denominador tira as 4 linhas fechadas como "fora do escopo atual" (**#3, #14, #27, #39**); nenhuma era pronta, então o numerador **não** muda.

**A diferença em 3 linhas:** (1) a conta (a) mantém as 122 linhas porque decisão do orquestrador não é trabalho feito — nada foi promovido; (2) a conta (b) retira só as 4 linhas "fora do escopo atual", que o orquestrador mandou fechar — como nenhuma era pronta, tirá-las do denominador não infla o numerador; (3) 86,1% → 89,0% é **escopo menor por decisão política**, não progresso — as outras 5 decididas (#19, #12, #17, #9, #10) continuam no denominador, com rótulo.

## O que NÃO foi decidido (segue aberto — ver `PERGUNTAS_USUARIO.md`)

#6 (vídeo em avatar) e #16 (ferramentas): caminho de desbloqueio documentado (`LIPSYNC_PROVIDERS.md` §5, adaptador `huggingface-space`), mas **exige configuração do usuário** (Space + provedor/GPU). #7 (voz personalizada), #8 (menu "…"), #24 (Inspiration), #25 (Omni), #37 (SSE), #38 (presets de áudio): dependem de captura/prova do usuário.
