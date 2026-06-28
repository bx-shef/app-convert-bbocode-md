# Проверка scripts/tg-send.sh на Windows.
# tg-send.sh — bash-скрипт (отправщик работает через bash/WSL/Git Bash),
# поэтому и проверка делегируется в bash-версию check-tg.sh.
#   Запуск: powershell -ExecutionPolicy Bypass -File scripts\check-tg.ps1
$ErrorActionPreference = "Stop"
& bash scripts/check-tg.sh
exit $LASTEXITCODE
