param([string]$name,[string]$dest)
$d='\?\C:\Users\Dannilo\.claude\projects\C--Users-Dannilo-AppData-Local-Claude-Data-claude-pzs8sxrjxfjjc-scratch-workspaces-89e4551d-c901-4c2c-8348-ed9b81a95af0-a167d6e0-8432-4079-85d5-aeb7dbe5002c-scratch-2026-10-15-039b86\c4f509bb-5c0b-4107-9fd7-0f1b4dcd4831\tool-results'
[IO.File]::Copy("$d\$name",$dest,$true)
