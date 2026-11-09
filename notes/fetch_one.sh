#!/bin/bash
# GET publico de uma URL ja observada nas capturas; registra metadados em notes/get_log.tsv
cd /c/w/PiperLine
url="$1"; tipo="$2"; pagina="$3"; cap="$4"
LOG=notes/get_log.tsv; OUT=scripts/recovered/get
rest="${url#*://}"; host="${rest%%/*}"; path="/${rest#*/}"
if [ -n "$(find scripts/recovered -type f -path "*${path}" 2>/dev/null | head -1)" ]; then
  printf '%s\t%s\t%s\tJA-RECUPERADO-PELO-REA\t\t\t\t\t\t\t\t%s\t%s\n' "$url" "$host" "$tipo" "$pagina" "$cap" >> $LOG; exit 0; fi
dest="$OUT/$host$path"; mkdir -p "$(dirname "$dest")"
hdr=$(mktemp)
res=$(curl -sS -L --max-time 900 -D "$hdr" -o "$dest" -w '%{http_code}\t%{content_type}\t%{size_download}' "$url" 2>/tmp/curl_err_$$) || res="ERRO\t\t0"
code=$(echo -e "$res" | cut -f1); ctype=$(echo -e "$res" | cut -f2); bytes=$(echo -e "$res" | cut -f3)
clen=$(grep -i '^content-length:' "$hdr" | tail -1 | tr -d '\r' | cut -d' ' -f2)
etag=$(grep -i '^etag:' "$hdr" | tail -1 | tr -d '\r' | cut -d' ' -f2-)
lmod=$(grep -i '^last-modified:' "$hdr" | tail -1 | tr -d '\r' | cut -d' ' -f2-)
if [ "$code" == "200" ] && [ -s "$dest" ]; then sha=$(sha256sum "$dest" | cut -d' ' -f1); loc="$dest"; else sha=""; loc=""; rm -f "$dest"; fi
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$url" "$host" "$tipo" "$code" "$ctype" "$clen" "$bytes" "$etag" "$lmod" "$sha" "$loc" "$pagina" "$cap" >> $LOG
rm -f "$hdr" /tmp/curl_err_$$
