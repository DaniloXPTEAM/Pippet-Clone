# STATUS — rodada 18 (ordem substitutiva), entrega_18

**Estado:** ordem r18 substitutiva EXECUTADA. A ordem anterior ("decisões fora do escopo") foi revogada e desfeita (`3c20390` reverte `5559abb`; registro em `BLOQUEIOS_R18.md` §0). Nada saiu do escopo; bloqueio = pendência com CAMINHO de implementação.

**Placar r18 no sandbox (com navegador, Linux):** **140 ok / 2 skip / 0 falhas (de 142)** — os mesmos 2 skip de evidência da r17 (`pageview`, `parity`), agora com 7 testes novos. "Verificada" = teste passou; skip nunca conta. Windows r17 (validado pelo usuário): 133 ok / 2 skip / 0 falhas (de 135) — os 7 testes novos da r18 seguem para validação no Windows.

**Réguas (as duas, lado a lado; % não comparáveis entre si):**
- critério antigo: **113/122 = 92,6%** (38 implementadas + 75 verificadas) — as 8 linhas bloqueadas implementadas na r18 sobem como "implementada (UNOBSERVED)"; UNOBSERVED nunca vira verificada;
- catálogo integral: **152/423 = 35,9%** (85 verificadas / 67 implementadas UNOBSERVED / 271 inventadas / 0 bloqueadas) — "Chat legado" saiu de inventada.

**Itens da ordem:** 1 (revogação) ✔ `3c20390` · 2a OAuth+publicação ✔ `cd39689` · 2b marketplace ✔ `2f219a8` · 2c widget ✔ `503dc97` · 2d idade/US/PWA/dev ✔ `5772711` · 2e chat legado ✔ `26e1942` · 2f voz ✔ `e1d9547` · 2g pagamento ✔ `92ecf95` · 3 perguntas ✔ `b204895` · 4 suíte+entrega ✔ este.

**O que só o usuário destrava:** `PERGUNTAS_USUARIO.md` (9 perguntas: capturas do Pippit real, provedor de lip-sync/voz, credenciais de cada rede no ambiente).

**Histórico:** SHAs originais preservados (`851a3b5`→`48ca7bb`→…→`ba09c73`; r17 → `443a435`→`73ffa17`). Sem push (push único só no fim do projeto, sem `--force`).
