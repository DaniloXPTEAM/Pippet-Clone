#!/bin/bash
cd /c/w/PiperLine
printf 'url\thost\ttipo\thttp\tcontent_type\tcontent_length_header\tbytes\tetag\tlast_modified\tsha256\tcaminho_local\tpagina\tcaptura\n' > notes/get_log.tsv
# scripts primeiro, depois css, fontes, documentos, imagens, midia
for t in script stylesheet font document image media other; do
  grep -P "^[^\t]+\t$t\t" notes/_get_list.tsv | while IFS=$'\t' read -r url tipo pag cap; do
    bash notes/fetch_one.sh "$url" "$tipo" "$pag" "$cap" &
    while [ "$(jobs -rp | wc -l)" -ge 6 ]; do wait -n; done
  done
  wait
done
echo FIM >> notes/_get_done.out
