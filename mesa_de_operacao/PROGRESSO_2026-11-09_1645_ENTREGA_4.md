# PROGRESSO 2026-11-09 16:45 — fechamento da entrega 4

Branch: `arena/a14d8a49-pippet-clone`. Sem push, sem chave real, sem crédito Pippit.
Este arquivo cobre a **segunda metade** da entrega 4 (linhas 22, 78, 92 + dois defeitos reais); o lote original (56, 74, 76, 77, 79, 80, 81, 90, 91) está em `PROGRESSO_2026-11-09_1222.md` e em `entrega_3/RELATORIO_ENTREGA_4.md`.

## Itens da tabela fechados nesta rodada

| Linha | Rota | Tela | Testes | Commit |
|---|---|---|---|---|
| 22 — CLI / wishlist / atendimento | `GET /api/account/unobserved` — 3 itens, todos `UNOBSERVED`, `openedDestinations:0`, `externalCalls:false` | menu More → "Lacunas da conta" (modal) | `account_unobserved_route`, `account_more_language_ui` | `66b415f` |
| 78 — FAQ de preços | `GET /api/pricing/faq` — 6 perguntas preservadas; `answers`/`ratings`/`featureSections` `UNOBSERVED`; `planComparison:'local'` | `#faqEvidence` na página de preços | `pricing_faq_route`, `pricing_faq_ui` | `a47a1ca` |
| 92 — omni / digital_human | `GET /api/capabilities/omni` — 11 endpoints nomeados nos bundles; corpos/tela/execução `UNOBSERVED`; `createsRealAvatar:false` | `#omniEvidence` na página Omni | `omni_capabilities_route`, `omni_ui` | `f1bac4c` |

Detalhes que valem registro:

- A rota do item 92 nasceu como `/api/omni/capabilities` e **colidiu** com a regra do próprio teste `omni_ui`, que proíbe qualquer request a `/api/omni/…`. Renomeada para `/api/capabilities/omni` no servidor, no cliente e nos dois testes — o guard ficou intacto, sem afrouxar asserção.
- As três rotas devolvem `externalCalls:false` e nenhum campo além do que está no checkout: nada de resposta inventada para FAQ, nada de corpo de request/response para o Omni, nenhum destino de conta aberto de mentira.
- As três linhas seguem **`parcial`** na tabela, com o motivo escrito (respostas reais ausentes / corpos não capturados). O padrão da entrega é expor o observado e declarar o resto, não fechar a linha no papel.

## Dois defeitos reais corrigidos (`88a72db`)

1. **`#ttl` revertendo o título salvo.** Um re-render antes do blur podia disparar o `change` com um valor **já visto**, sobrescrevendo o título recém-salvo. O handler passou a manter `TTL_SEEN`/`TTL_LAST`/`TTL_AT` e a ignorar a repetição de um valor visto há menos de 3 s. É **mitigação**, não a solução ideal (o ideal é o input ficar não-controlado durante a edição) — está registrada como tal.
2. **Flake real no teste, não "instabilidade".** `canvas_existing_project_ui` usava `page.waitForFunction` com função `async`; o Playwright (≥1.35) **não espera a promise**, o valor devolvido é sempre *truthy*, então o teste passava por acidente e falhava em carga (timeout de 60 s). Trocado por um helper `poll(fn,label)` com `await` explícito a cada 500 ms, 120 tentativas. Não voltar a usar `waitForFunction(async …)`.

## Suíte completa

```
96 passaram, 2 skip explícito, 0 falharam (de 98)
```

Saída integral: `entrega_3/suite_final.txt`. Skips legítimos: `pageview` (falta `captures/scenario_video-agent_bodies.json`) e `parity` (faltam dois arquivos de CDP).

## Histórico local (sem push)

`5b3e1d8` (STATUS) → `66b415f` (22) → `a47a1ca` (78) → `f1bac4c` (92) → `88a72db` (título/flake) → `d65a4fd` (STATUS) → `6efc2bb` (log/suíte no Git) → `2777792` (relatório aponta o histórico publicado) → `39c1c49` (log atualizado) → commits desta atualização de documentos.

## Pacote publicado

Pasta do Drive `entrega_3` (`1G8et7Ms2C5iD4dWOLjbqXJ2Gmh1mQfwH`), 6 arquivos, sem duplicata (os anteriores foram para a lixeira antes de cada envio):

- `lote4_full_<hash>.bundle` — autossuficiente, `git bundle verify` → *complete history*.
- `estado_progresso_2.zip` — arquivos alterados em `48ca7bb..HEAD` + `log.txt`, `suite_final.txt` e `RELATORIO_ENTREGA_4.md`.
- `RELATORIO_ENTREGA_4.md`, `suite_final.txt`, `log.txt` e `RELATORIO_ENTREGA_3.md` (mantido).

Os IDs do Drive mudam a cada reenvio, por isso não ficam escritos aqui: a listagem da pasta é a fonte de verdade.

## O que sobrou na tabela

18 `parcial` (todas dependem de evidência capturada, não de código), 9 `bloqueada` (serviço/OAuth/pagamento do Pippit) e 26 `investigada`, das quais 13 fora de escopo (140, 141, 143, 145–153) e 14 que só avançam com captura nova (35, 39, 75, 84, 94, 95, 101–108).

Pendência de infraestrutura ainda aberta: `node_modules` está **dentro** da árvore do repositório; o plano é movê-lo para `/home/user/.deps` com `NODE_PATH`, para sobreviver a reset de sandbox sem sujar o Git.
