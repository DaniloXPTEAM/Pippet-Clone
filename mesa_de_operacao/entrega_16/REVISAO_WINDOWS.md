# Revisão do pacote r15 no Windows — 4 defeitos confirmados e corrigidos (r16)

O pacote `pippet-clone-r15` foi validado no Windows: íntegro (SHA256 batendo), bundle restaura (HEAD `e07f5b2`) e **os 56 testes de tela rodaram de verdade**. Isso revelou 4 defeitos reais que o sandbox Linux não pegava (aqui os UI dão SKIP). Correções feitas na r16, um commit por item:

| # | Teste/rota | Defeito encontrado no Windows | Correção (commit) |
|---|---|---|---|
| 1 | `settings_internal_ui` | O teste terminava conferindo a lista de notificações vazia, mas os 8 anúncios observados do Pippit são conteúdo sempre-presente | O teste filtra `kind !== 'ad'` e confere só os eventos do app (instalação limpa = nenhum evento). **Decisão:** anúncio é conteúdo observado, não evento — não cabe nem no app nem no teste; fica na seção própria de anúncios (`4dd9126`) |
| 2 | `features_ui` | `/Falha na geração/` sumiu da primeira `.note` — os 8 anúncios (empurrados antes dos eventos) escondiam os eventos reais do usuário | Notificações agora mostram **eventos reais primeiro** e os anúncios numa seção própria embaixo (`b8df76b`) |
| 3 | `pricing_faq_ui` | Falhava em 1 s na etapa "nota do FAQ": a nota usava `q.featureSections` (que virou array na r15) e quebrava o texto | Nota usa `featureSectionsContent` (conteúdo segue UNOBSERVED, como manda a evidência); os títulos observados seguem nos headings (`4640719`) |
| 4 | `browser_probe` | Escrevia e **apagava** o arquivo versionado `local_reconstruction/.deps-inspector.mjs` | O inspetor roda em **pasta temporária** do sistema; `git status` fica limpo após a suíte (`07a06d1`) |

## Réguas que a revisão deixou claras (itens 5-6)

- Linha cujo conteúdo é UNOBSERVED/inventado **não** é "verificada" só por ter teste: virou **"implementada (conteúdo UNOBSERVED)"** — o teste prova o mecanismo, não o conteúdo.
- Os **56 testes de tela não contam como verificados** até rodarem e passarem (no Windows). No sandbox Linux eles dão SKIP por falta de Chromium — a suíte da r16 rodou aqui com **79 ok / 56 skip explícito / 0 falhas de 135**, e o placar honesto é: **os 56 de tela não executaram nesta máquina** (lista no ENTREGA.md).
- Os 4 defeitos acima são a prova de que a validação real é a do Windows.
