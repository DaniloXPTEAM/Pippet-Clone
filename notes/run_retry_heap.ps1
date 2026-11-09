# Repete, com heap do processo-pai da CLI do REA ampliado (NODE_OPTIONS), as analises inteiras que truncaram. Saida: evidence_cli/recovered_retry/
$o = 'C:\w\PiperLine\evidence_cli\recovered_retry'; New-Item -ItemType Directory -Force $o | Out-Null
$pkg = 'C:\Users\Dannilo\AppData\Local\npm-cache\_npx\9b9809298fe40d2c\node_modules\rea-agents'
$R = 'C:\w\PiperLine\scripts'
$jobs = @(
  @{n='gtag_heap6144'; d="$R\stage_short\gtag"; f='gtag.js'},
  @{n='cookiebanner_heap6144'; d=(Get-ChildItem "$R\recovered\get" -Recurse -Filter 'default.no-tea.esm.js' | Select -First 1).DirectoryName; f='default.no-tea.esm.js'},
  @{n='cms_polyfill_heap6144'; d=(Get-ChildItem "$R\recovered\get" -Recurse -Filter 'lib-polyfill.ac9fc4ec.js' | Select -First 1).DirectoryName; f='lib-polyfill.ac9fc4ec.js'},
  @{n='cms_4017_heap6144'; d=(Get-ChildItem "$R\recovered\get" -Recurse -Filter '4017.b895d9bb.js' | Select -First 1).DirectoryName; f='4017.b895d9bb.js'}
)
$log = "$o\_run_log.tsv"
foreach ($j in $jobs) {
  $env:NODE_OPTIONS = '--max-old-space-size=6144'; $t = Get-Date
  Push-Location $pkg
  node scripts/rea.mjs analyze-javascript-application $j.d --source-path $j.f --max-semantic-nodes 1000000 --max-semantic-nodes-per-file 1000000 --max-heap-mb 6144 --analysis-timeout-ms 1800000 --integrity-policy record-and-continue --artifact-format directory --format json --full-output > "$o\$($j.n).json" 2> "$o\$($j.n).err"
  $rc = $LASTEXITCODE; Pop-Location; $env:NODE_OPTIONS = $null
  $sz = (Get-Item "$o\$($j.n).json").Length
  $tr = -1; $rcn = -1
  if ($sz -lt 900MB) { $txt = [IO.File]::ReadAllText("$o\$($j.n).json"); $tr = ([regex]::Matches($txt, '"truncated":\s*true')).Count; $rcn = ([regex]::Matches($txt, 'Resource constraint')).Count; $txt = $null }
  "$($j.n)`t$rc`t$([int]((Get-Date) - $t).TotalSeconds)`t$sz`t$tr`t$rcn" | Add-Content $log
  [GC]::Collect()
}
