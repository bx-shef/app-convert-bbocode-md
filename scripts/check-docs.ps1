# Проверка документации перед коммитом/мержем.
# Запуск из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File scripts\check-docs.ps1
# Делает три проверки: битые ссылки, маркеры конфликтов, запрещённая эмодзи.
$ErrorActionPreference = "Continue"
$errors = 0

Write-Host "=== 1. Битые ссылки в документации ===" -ForegroundColor Cyan
# Python 3: на Windows обычно `py -3` или `python`, на Linux/macOS — `python3`.
# Берём первый доступный из (py -3 / python3 / python), чтобы скрипт работал везде.
$pyExe = $null; $pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue)          { $pyExe = 'py';      $pyArgs = @('-3') }
elseif (Get-Command python3 -ErrorAction SilentlyContinue) { $pyExe = 'python3' }
elseif (Get-Command python  -ErrorAction SilentlyContinue) { $pyExe = 'python' }
else { Write-Host "ОШИБКА — Python 3 не найден (py -3 / python3 / python)" -ForegroundColor Red; exit 2 }
& $pyExe @pyArgs .github\scripts\check_doc_links.py
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "ОШИБКА — есть битые ссылки" -ForegroundColor Red
    $errors++
}
Write-Host ""

Write-Host "=== 2. Маркеры конфликтов слияния ===" -ForegroundColor Cyan
$mdTargets = @('docs', '.claude', 'scripts', 'README.md', 'CLAUDE.md') | Where-Object { Test-Path $_ }
$conflicts = Get-ChildItem -Path $mdTargets -Recurse -Filter "*.md" -ErrorAction SilentlyContinue |
    Select-String -Pattern "^(<{7}|={7}|>{7})"
if ($conflicts) {
    Write-Host "ОШИБКА — найдены маркеры конфликтов:" -ForegroundColor Red
    $conflicts | ForEach-Object { Write-Host $_.ToString() }
    $errors++
} else {
    Write-Host "OK" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== 3. Запрещённая эмодзи (вне строки-запрета) ===" -ForegroundColor Cyan
$prayer = Get-ChildItem -Path $mdTargets -Recurse -Filter "*.md" -ErrorAction SilentlyContinue |
    Select-String -Pattern ([char]0xD83D + [char]0xDE4F) |
    Where-Object { $_.Line -notmatch "Не используй эмодзи" }
if ($prayer) {
    Write-Host "ОШИБКА — найдена запрещённая эмодзи вне инструкции-запрета:" -ForegroundColor Red
    $prayer | ForEach-Object { Write-Host $_.ToString() }
    $errors++
} else {
    Write-Host "OK" -ForegroundColor Green
}
Write-Host ""

if ($errors -gt 0) {
    Write-Host "ИТОГ: найдено проблем — $errors" -ForegroundColor Red
    exit 1
}
Write-Host "ИТОГ: всё чисто" -ForegroundColor Green
