# STATUS DA RECONSTRUÇÃO LOCAL DO PIPPIT — RODADA 17 REVISADA (ENTREGA 17)

## 1. Os 3 pontos da revisão (e o que foi feito)

1. **Denominadores lado a lado** (o % novo não era comparável com 68%/86%): `FEATURE_INVENTORY.md` agora mostra **as duas réguas lado a lado** — **105/122 = 86,1%** (critério r15: escopo reproduzível, 122 linhas) e **151/423 = 35,7%** (critério r16/r17: catálogo integral, 85 verificadas / 66 implementadas UNOBSERVED / 272 inventadas). Também corrigido o texto errado de "229 linhas".
2. **Histórico: SHAs dos bundles preservados** (os commits da r16 tinham sido recriados): agora a **costura r15+r16** (commit de merge) une os dois ramos dos bundles **sem reescrever nenhum SHA** — os 53 commits de `piperline_rodada15.bundle` + `pippet-clone-r16.bundle` entram com os SHAs originais. Só ganham SHA novo os commits que nunca estiveram em bundle (mapa lado a lado em `PROVA_HISTORICO.md`).
3. **Os 56 testes de tela contam — e agora rodam no sandbox**: a suíte inteira passa **neste ambiente com navegador**: **133 ok / 2 skip explícitos / 0 falhas (de 135)**. Os 2 skips são de evidência local ausente (`pageview`, `parity`), não de navegador. `features_ui` (a instável do Windows, 1 em 3) passou **4/4 aqui** (suíte + 3 seguidas).

## 2. Como rodar a suíte completa aqui (com navegador)

O sandbox não traz navegador pronto; o Chromium 153 headless vem do pacote npm `@sparticuz/chromium` (binário dentro do pacote — sem download de CDN):

```bash
cd local_reconstruction
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install          # playwright (devDependency)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save @sparticuz/chromium
node -e "require('@sparticuz/chromium').default.executablePath().then(console.log)"   # extrai /tmp/chromium
# libs do pacote (NSPR/NSS): descompactar bin/al2023.tar.br e apontar LD_LIBRARY_PATH
cd .. && \
PIPERLINE_CHROMIUM_EXECUTABLE=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023lib/lib \
PIPPIT_FFMPEG=/home/user/.tools/iof/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2 \
PIPPIT_FFPROBE=/home/user/.tools/ffprobe-pkg/ffprobe \
node local_reconstruction/test/run-all.mjs
```

ffmpeg 9.0.2 estático = wheel `imageio-ffmpeg` (PyPI); ffprobe 4.0.2 estático = tarball `ffprobe-static` (npm) — em `/home/user/.tools/` (essa pasta **é apagada entre sessões**; reinstale antes de rodar).

## 3. Contagens — as duas réguas, lado a lado

| régua | base | prontas (impl. + verif.) | % | composição |
|---|---|---|---|---|
| **r15 (critério antigo)** | 122 | **105** | **86,1%** | 30 implementadas + 75 verificadas |
| **r16/r17 (catálogo integral)** | 423 | **151** | **35,7%** | 66 implementadas (UNOBSERVED) + 85 verificadas; 272 inventadas não contam |

A régua antiga hoje dá o mesmo número da r15 (a linha da central de notificações valeu 104/122 = 85,2% enquanto `features_ui` esteve instável; a correção da r17 devolveu 105/122). Os denominadores são diferentes: a régua nova inclui as 272 linhas inventadas e separa UNOBSERVED de verificada. Cobertura de linhas, **não** paridade com o Pippit.

## 4. Placares

| ronda | sandbox | Windows |
|---|---|---|
| r16 | 79 ok / 56 skip (sem navegador) / 0 falhas (135) | **133 ok / 2 skip / 1 falha instável (135)** — validado |
| **r17 revisada** | **133 ok / 2 skip / 0 falhas (135)** — com Chromium headless | aguardando a suíte do usuário |

## 5. Commits da r17

`443a435` (item 1: ordem determinística + `hasText`, prova 10/10), `29ded87` (item 2: histórico), `c7ff946` (item 3: docs), `06b9072` (revisão ponto 2: costura), `ab9b8d2` (ponto 1: réguas lado a lado), este (ponto 3) e o de pacote. Todos com teste (suíte 133/2/0). **Sem push** (só no fim do projeto), **nenhuma chave** em lugar nenhum.
