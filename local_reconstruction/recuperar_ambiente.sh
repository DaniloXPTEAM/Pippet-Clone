#!/usr/bin/env bash
# Recupera o ambiente do PiperLine (reconstrução local do Pippit) em UM comando.
#
#   ./recuperar_ambiente.sh                 # instala dependências fora da árvore, acha ffmpeg/ffprobe/chromium e roda a suíte
#   ./recuperar_ambiente.sh --sem-suite     # só prepara o ambiente
#   ./recuperar_ambiente.sh --bundle X.bundle  # antes de tudo, restaura o código a partir de um bundle do Drive
#
# O que fica fora da árvore versionada:
#   .deps/node_modules  dependências do npm (playwright, @sparticuz/chromium, @ffprobe-installer)
#   .deps/env.sh        variáveis para você "sourcear" em qualquer shell
#   node_modules        atalho (symlink) para .deps/node_modules — o ESM não lê NODE_PATH, então o link é o que faz
#                       `import 'playwright'` funcionar sem colocar dependências dentro do código versionado
# Tudo isso está no .gitignore: um reset do sandbox apaga, e este script refaz.
#
# Depois de rodar, em qualquer shell novo:
#   source local_reconstruction/.deps/env.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPS="$HERE/.deps"
BUNDLE=""
RUN_SUITE=1
for arg in "$@"; do
  case "$arg" in
    --sem-suite|--no-suite) RUN_SUITE=0 ;;
    --bundle) shift || true ;;
    --bundle=*) BUNDLE="${arg#--bundle=}" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) if [ -f "$arg" ]; then BUNDLE="$arg"; else echo "argumento desconhecido: $arg" >&2; exit 2; fi ;;
  esac
done
# suporte a "--bundle arquivo.bundle"
prev=""; for arg in "$@"; do if [ "$prev" = "--bundle" ]; then BUNDLE="$arg"; fi; prev="$arg"; done

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*"; }

say "1/5 conferindo o Node"
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<20) { console.error("Node 20+ é necessário (achei "+process.versions.node+")"); process.exit(1);} console.log("node "+process.versions.node)'

say "2/5 restaurando o código (opcional)"
if [ -n "$BUNDLE" ]; then
  [ -f "$BUNDLE" ] || { echo "bundle não encontrado: $BUNDLE" >&2; exit 1; }
  git -C "$HERE" fetch --quiet "$BUNDLE" 'refs/heads/*:refs/remotes/bundle/*' || true
  echo "bundle importado de $BUNDLE (refs em refs/remotes/bundle/*; escolha a branch e faça checkout)."
else
  echo "sem --bundle: usando o código já presente em $HERE"
  echo "para restaurar do Drive: baixe o bundle da pasta 1FKoC6t1gcXjI4zSc4vqC_M_dx_bMDZT6 e rode"
  echo "  ./recuperar_ambiente.sh --bundle caminho/para/rodada6.bundle"
fi

say "3/5 instalando dependências em .deps (fora da árvore versionada)"
mkdir -p "$DEPS"
# Se existe um node_modules "de verdade" (instalação antiga), ele vira .deps/node_modules em vez de ser apagado.
if [ -d "$HERE/node_modules" ] && [ ! -L "$HERE/node_modules" ]; then
  if [ ! -d "$DEPS/node_modules" ]; then
    echo "movendo node_modules existente para .deps/node_modules"
    mv "$HERE/node_modules" "$DEPS/node_modules"
  else
    rm -rf "$HERE/node_modules"
  fi
fi
# Uma única chamada: `npm i --no-save` de um pacote apaga os outros.
# .deps com package.json próprio: sem ele o npm sobe a árvore e instala em local_reconstruction/node_modules.
[ -f "$DEPS/package.json" ] || printf '{"name":"piperline-deps","private":true,"version":"1.0.0"}\n' > "$DEPS/package.json"
if [ ! -d "$DEPS/node_modules/playwright" ] || [ ! -d "$DEPS/node_modules/@ffprobe-installer" ] || [ ! -d "$DEPS/node_modules/@sparticuz" ]; then
  npm install --prefix "$DEPS" --no-save --no-fund --no-audit playwright@1.65.0 @sparticuz/chromium @ffprobe-installer/ffprobe
else
  echo "dependências já instaladas"
fi
[ -d "$DEPS/node_modules/playwright" ] || { echo "a instalação não criou .deps/node_modules/playwright" >&2; exit 1; }
ln -sfn .deps/node_modules "$HERE/node_modules"
export NODE_PATH="$DEPS/node_modules"

say "4/5 localizando ffmpeg, ffprobe e Chromium"
ENVFILE="$DEPS/env.sh"
: > "$ENVFILE"
FOUND_FFMPEG="${PIPPIT_FFMPEG:-}"
if [ -z "$FOUND_FFMPEG" ]; then
  for c in "$(command -v ffmpeg || true)" /tmp/pyff/imageio_ffmpeg/binaries/ffmpeg-linux-*; do
    [ -n "$c" ] && [ -x "$c" ] && FOUND_FFMPEG="$c" && break
  done
fi
if [ -z "$FOUND_FFMPEG" ]; then
  # imageio-ffmpeg é a forma mais leve de ter um ffmpeg com filtros (inclusive whisper) sem root.
  ( python3 -m pip install --quiet --target "$DEPS/pyff" imageio-ffmpeg >/dev/null 2>&1 || true )
  FOUND_FFMPEG="$(ls "$DEPS"/pyff/imageio_ffmpeg/binaries/ffmpeg-linux-* 2>/dev/null | head -1 || true)"
fi
[ -n "$FOUND_FFMPEG" ] && echo "export PIPPIT_FFMPEG=$FOUND_FFMPEG" >> "$ENVFILE" || warn "ffmpeg não encontrado: a exportação de vídeo e a transcrição ficam indisponíveis (o resto funciona)"

FOUND_FFPROBE="${PIPPIT_FFPROBE:-}"
[ -z "$FOUND_FFPROBE" ] && [ -x "$DEPS/node_modules/@ffprobe-installer/linux-x64/ffprobe" ] && FOUND_FFPROBE="$DEPS/node_modules/@ffprobe-installer/linux-x64/ffprobe"
[ -n "$FOUND_FFPROBE" ] && echo "export PIPPIT_FFPROBE=$FOUND_FFPROBE" >> "$ENVFILE" || warn "ffprobe não encontrado (só a leitura de duração/resolução fica limitada)"

CHROMIUM_BIN="${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-${PIPERLINE_CHROMIUM_EXECUTABLE:-}}"
if [ -z "$CHROMIUM_BIN" ]; then
  for c in /tmp/chromium "$(command -v chromium || true)" "$(command -v chromium-browser || true)" "$(command -v google-chrome || true)"; do
    [ -n "$c" ] && [ -x "$c" ] && CHROMIUM_BIN="$c" && break
  done
fi
if [ -z "$CHROMIUM_BIN" ]; then
  # @sparticuz/chromium entrega o binário comprimido; extrai sem precisar de npx playwright install.
  node -e 'const m=require("@sparticuz/chromium"); const c=m.default||m; c.executablePath().then(p=>console.log(p)).catch(e=>{console.error(e.message);process.exit(1)})' > "$DEPS/chromium.path" 2>/dev/null || true
  [ -s "$DEPS/chromium.path" ] && CHROMIUM_BIN="$(tail -1 "$DEPS/chromium.path")"
fi
[ -n "$CHROMIUM_BIN" ] && echo "export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$CHROMIUM_BIN" >> "$ENVFILE" || warn "Chromium não encontrado: os testes de interface são pulados (o resto da suíte roda)"
# Bibliotecas e fontes que o Chromium do sandbox precisa (quando existirem). O pacote serverless entrega
# al2023.tar.br/swiftshader.tar.br/fonts.tar.br; extraímos uma vez em .deps/chromium-libs (não versionado).
LIBS="$DEPS/chromium-libs"
if [ ! -d "$LIBS/lib" ] && command -v node >/dev/null; then
  node - "$LIBS" <<'NODE' >/dev/null 2>&1 || true
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const bin = path.join(process.cwd(), '.deps/node_modules/@sparticuz/chromium/bin');
const out = process.argv[2];
for (const [file, sub] of [['al2023.tar.br', '.'], ['swiftshader.tar.br', 'swiftshader'], ['fonts.tar.br', 'fonts']]) {
  const src = path.join(bin, file); if (!fs.existsSync(src)) continue;
  const tar = zlib.brotliDecompressSync(fs.readFileSync(src));
  const dest = path.join(out, sub === '.' ? '' : 'tmp/' + sub); fs.mkdirSync(dest, { recursive: true });
  // extração mínima de tar (ustar): 512 bytes de cabeçalho por entrada
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512); const name = header.subarray(0, 100).toString().replace(/\0.*$/, '');
    if (!name) break;
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim() || '0', 8) || 0;
    const type = header.subarray(156, 157).toString();
    const rel = name.replace(/^\.\//, '');
    if (type === '0' || type === '') { const target = path.join(dest, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, tar.subarray(off + 512, off + 512 + size)); }
    off += 512 + Math.ceil(size / 512) * 512;
  }
}
NODE
fi
[ -d "$LIBS/lib" ] && echo "export LD_LIBRARY_PATH=$LIBS/lib${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}" >> "$ENVFILE"
[ -d "$LIBS/tmp/fonts" ] && echo "export FONTCONFIG_PATH=$LIBS/tmp/fonts" >> "$ENVFILE"
echo "export NODE_PATH=$DEPS/node_modules" >> "$ENVFILE"
echo "variáveis gravadas em $ENVFILE"

say "5/5 rodando a suíte"
# shellcheck disable=SC1090
. "$ENVFILE"
if [ "$RUN_SUITE" = "1" ]; then
  cd "$HERE"
  node test/run-all.mjs
else
  echo "ambiente pronto; para rodar a suíte: cd $HERE && . .deps/env.sh && node test/run-all.mjs"
fi
