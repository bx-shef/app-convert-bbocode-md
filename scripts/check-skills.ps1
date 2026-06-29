# Проверка корректности навыков (.claude/skills/).
# Запуск из корня репозитория:
#   powershell -ExecutionPolicy Bypass -File scripts\check-skills.ps1
# Проверяет: frontmatter (name==папка, есть description), идентичность тела
# навыка эталону docs/reports/, запрещённую эмодзи, маркеры конфликтов.
$ErrorActionPreference = "Continue"
$errors = 0

$items = @(
    @{ Skill = ".claude\skills\report-status\SKILL.md";    Name = "report-status";    Ref = "docs\reports\project-status.md" },
    @{ Skill = ".claude\skills\report-digest\SKILL.md";    Name = "report-digest";    Ref = "docs\reports\engineering-digest.md" },
    @{ Skill = ".claude\skills\report-questions\SKILL.md"; Name = "report-questions"; Ref = "docs\reports\client-questions.md" }
)

Write-Host "=== Frontmatter и идентичность телу промпта ===" -ForegroundColor Cyan
foreach ($it in $items) {
    if (-not (Test-Path $it.Skill)) { Write-Host "ОШИБКА: нет файла $($it.Skill)" -ForegroundColor Red; $errors++; continue }
    $text = (Get-Content $it.Skill -Raw -Encoding UTF8) -replace "`r`n", "`n"
    if ($text -notmatch '(?s)^---\n(.*?)\n---\n(.*)$') { Write-Host "ОШИБКА: нет frontmatter $($it.Skill)" -ForegroundColor Red; $errors++; continue }
    $fm = $Matches[1]; $body = $Matches[2].Trim()
    if ($fm -match 'name:\s*(.+)') {
        if ($Matches[1].Trim() -ne $it.Name) { Write-Host "ОШИБКА: name != $($it.Name) в $($it.Skill)" -ForegroundColor Red; $errors++ }
    } else { Write-Host "ОШИБКА: нет name в $($it.Skill)" -ForegroundColor Red; $errors++ }
    if ($fm -notmatch 'description:\s*\S') { Write-Host "ОШИБКА: нет description в $($it.Skill)" -ForegroundColor Red; $errors++ }

    $refText = (Get-Content $it.Ref -Raw -Encoding UTF8) -replace "`r`n", "`n"
    $marker = "Скопируй всё ниже этой строки."
    $i = $refText.IndexOf($marker)
    if ($i -lt 0) { Write-Host "ОШИБКА: нет промпта в $($it.Ref)" -ForegroundColor Red; $errors++; continue }
    $after = $refText.Substring($i + $marker.Length)
    $s = $after.IndexOf("`n---`n")
    if ($s -lt 0) { Write-Host "ОШИБКА: нет разделителя в $($it.Ref)" -ForegroundColor Red; $errors++; continue }
    $refBody = $after.Substring($s + 5).Trim()
    if ($body -eq $refBody) {
        Write-Host "OK  $($it.Name): тело == $($it.Ref)" -ForegroundColor Green
    } else {
        Write-Host "ОШИБКА: ДРЕЙФ — тело $($it.Skill) != $($it.Ref)" -ForegroundColor Red; $errors++
    }
}
Write-Host ""

Write-Host "=== Запрещённая эмодзи (вне строки-запрета) ===" -ForegroundColor Cyan
$prayer = Get-ChildItem -Path ".claude" -Recurse -Filter "*.md" |
    Select-String -Pattern ([char]0xD83D + [char]0xDE4F) |
    Where-Object { $_.Line -notmatch "Не используй эмодзи" }
if ($prayer) { Write-Host "ОШИБКА:" -ForegroundColor Red; $prayer | ForEach-Object { Write-Host $_ }; $errors++ } else { Write-Host "OK" -ForegroundColor Green }
Write-Host ""

Write-Host "=== Маркеры конфликтов ===" -ForegroundColor Cyan
$conflicts = Get-ChildItem -Path ".claude" -Recurse -Filter "*.md" | Select-String -Pattern "^(<{7}|={7}|>{7})"
if ($conflicts) { Write-Host "ОШИБКА:" -ForegroundColor Red; $conflicts | ForEach-Object { Write-Host $_ }; $errors++ } else { Write-Host "OK" -ForegroundColor Green }
Write-Host ""

if ($errors -gt 0) { Write-Host "ИТОГ: проблем — $errors" -ForegroundColor Red; exit 1 }
Write-Host "ИТОГ: навыки — всё чисто" -ForegroundColor Green
