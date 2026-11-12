# STATUS DA RECONSTRUÇÃO LOCAL DO PIPPIT — RODADA 16 (ENTREGA 16)

## 1. O que esta rodada fez

A validação do pacote r15 no **Windows** rodou os 56 testes de tela e apontou 4 defeitos reais. A r16 corrigiu os 4, um commit por item, e endureceu a régua de contagem:

1. `settings_internal_ui`: teste filtra `kind !== 'ad'` (anúncios observados são conteúdo sempre-presente, não eventos do app) — `4dd9126`.
2. `features_ui`: eventos reais do usuário voltam a vir **primeiro**, anúncios na seção própria embaixo — `b8df76b`.
3. `pricing_faq_ui`: nota do FAQ usa `featureSectionsContent` (conteúdo segue UNOBSERVED) — `4640719`.
4. `browser_probe`: inspetor em pasta temporária; teste não apaga mais arquivo versionado (`git status` limpo) — `07a06d1`.
5. **Régua honesta**: teste sobre conteúdo UNOBSERVED/inventado prova *implementação*, não verificação. Os 56 testes de tela **não contam como verificados** até passarem — `399e129` (FEATURE_INVENTORY regenerado, recapitulação calculada pelo gerador).
6. **Placar honesto** (item 6): a suíte completa rodou nesta máquina (Linux, sem Chromium) = **79 passaram, 56 skip explícito, 0 falharam de 135**. Os 56 **não executaram aqui** — são exatamente os de tela (lista no ENTREGA.md) que só rodam no Windows. **Não se declara "0 falhas" como validação dos 56**: eles seguem sem execução nesta máquina; a última execução deles (Windows, r15) reprova 4, todos corrigidos acima.

## 2. Regras de verificação (r16)

- **verificada**: teste roda aqui e prova conteúdo observado/local.
- **implementada (conteúdo UNOBSERVED)**: teste prova o mecanismo, mas o conteúdo é inventado (títulos/datas/textos dos 8 anúncios, preços/ratings, HTML dos cards, CTA, anúncios dos andamentos). Não conta como verificada.
- **não verificada**: todo teste de tela (56), até passarem no Windows.
- **inventada**: apagada/não documentada. **bloqueada**: licença/monetização externa (compra real, OAuth, avatar com voz personalizada, integrações de marketplace, widget kefu, age-gate/PWA — detalhes em `BLOQUEIOS_R15.md`).

## 3. Contagens (FEATURE_INVENTORY, 423 linhas granulares)

| Estado | Linhas | % |
|---|---|---|
| verificada (teste que roda aqui, conteúdo observado/local) | 83 | 20% |
| implementada (conteúdo UNOBSERVED) | 66 | 16% |
| não verificada (56 de tela + 2) | 2 | 0,5% |
| inventada (conteúdo apagado/não documentado) | 272 | 64% |
| bloqueada (por licença; detalhada em BLOQUEIOS_R15.md) | 0 na granular | — |
| **Total** | **423** | 100% |

- **Implementação**: 149 de 423 = 35%. **Verificação**: 83 de 423 = 20%.
- Leitura agrupada antiga (catálogo 134 = 122 reproduzíveis): 105/122 na régua antiga; com a régua r16 o número honesto é o da granular.
- O inventário de 229 linhas da r15 foi **regenerado** nesta rodada (o histórico do branch não continha o arquivo gerado); a granularidade nova tem 423 linhas e a recapitulação é calculada pelo gerador (`/home/user/gerar_inventario.py`), nunca escrita à mão.

## 4. Pendências e riscos

1. Rodar os 56 testes de tela no Windows após a r16 (as 4 correções) — é o que falta para os 56 voltarem a contar.
2. Conteúdo inventado/apagado (272 linhas): irreproduzível sem evidência nova do Pippit.
3. Bloqueios de licença/monetização: documentados, não simulados.
4. Push pendente desde a r14 (`PREPARO_PUSH.md`): aguarda "PUSH AUTORIZADO".

## 5. Linha do tempo

r14 (11/11): ~83/122 · entregas 1-27 · pacote r14 (56 UI rodaram no Windows = 2 falhas) · push `arena/a14d8a49-pippet-clone-r14` autorizado/executado.  
r15 (11/11): 105/122 na régua antiga · entregas 1-5 + revisão · pacote r15 validado no Windows (4 defeitos).  
**r16 (12/11): os 4 defeitos corrigidos (um commit por item) · régua honesta (UNOBSERVED ≠ verificada; UI não conta até passar) · suíte: 79 ok / 56 skip / 0 falhas de 135 · entrega_16.**
