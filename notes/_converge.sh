#!/bin/bash
cd /c/w/PiperLine
prev=""
for i in 1 2 3 4; do
  PYTHONIOENCODING=utf-8 python notes/build_validation_report.py > notes/_rep.out 2>&1
  (cd notes && python build_manifest.py > _manifest_loop.out 2>&1)
  cur=$(cat notes/_manifest_loop.out)
  echo "iter $i: $cur"
  [ "$cur" == "$prev" ] && echo CONVERGIU && break
  prev="$cur"
done
echo FIM
