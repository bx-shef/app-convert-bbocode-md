#!/usr/bin/env bash
# Проверка корректности навыков (.claude/skills/).
# Запуск из корня репозитория: bash scripts/check-skills.sh
# Проверяет:
#   1a. frontmatter валиден: есть name и description; name == имя папки
#   1b. тело SKILL.md идентично разделу «Промпт» из docs/reports/*.md (защита от дрейфа)
#   1c. нет запрещённой эмодзи 🙏 (вне строки-запрета)
#   1d. нет маркеров конфликтов слияния
set -uo pipefail

ERRORS=0

echo "=== 1a/1b. Frontmatter навыков и идентичность телу промпта ==="
python3 - <<'PYEOF'
import re, sys

# навык → (ожидаемое имя, эталонный промпт)
items = [
    (".claude/skills/report-status/SKILL.md",    "report-status",    "docs/reports/project-status.md"),
    (".claude/skills/report-digest/SKILL.md",    "report-digest",    "docs/reports/engineering-digest.md"),
    (".claude/skills/report-questions/SKILL.md", "report-questions", "docs/reports/client-questions.md"),
]

def skill_parts(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    m = re.match(r'^---\n(.*?)\n---\n', text, re.DOTALL)
    if not m:
        return None, None
    return m.group(1), text[m.end():].strip()

def prompt_body(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    marker = "Скопируй всё ниже этой строки."
    i = text.find(marker)
    if i == -1:
        return None
    after = text[i + len(marker):]
    s = after.find("\n---\n")
    if s == -1:
        return None
    return after[s + 5:].strip()

errors = 0
for skill_path, name, ref_path in items:
    fm, body = skill_parts(skill_path)
    if fm is None:
        print(f"ОШИБКА: нет frontmatter — {skill_path}"); errors += 1; continue
    nm = re.search(r'^name:\s*(.+)$', fm, re.MULTILINE)
    if not nm or nm.group(1).strip() != name:
        print(f"ОШИБКА: name != '{name}' — {skill_path}"); errors += 1
    if not re.search(r'^description:\s*\S', fm, re.MULTILINE):
        print(f"ОШИБКА: нет description — {skill_path}"); errors += 1
    ref = prompt_body(ref_path)
    if ref is None:
        print(f"ОШИБКА: не найден промпт в {ref_path}"); errors += 1; continue
    if body == ref:
        print(f"OK  {name}: frontmatter ок, тело == {ref_path}")
    else:
        print(f"ОШИБКА: ДРЕЙФ — тело {skill_path} != {ref_path}")
        for i, (a, b) in enumerate(zip(body.splitlines(), ref.splitlines())):
            if a != b:
                print(f"  строка {i+1}:\n    SKILL: {a!r}\n    REF:   {b!r}"); break
        errors += 1
sys.exit(1 if errors else 0)
PYEOF
[ $? -ne 0 ] && ERRORS=$((ERRORS + 1))
echo ""

echo "=== 1c. Запрещённая эмодзи 🙏 (вне строки-запрета) ==="
PRAYER=$(grep -rn --include="*.md" "🙏" .claude/ 2>/dev/null | grep -v "Не используй эмодзи 🙏" || true)
if [ -n "$PRAYER" ]; then echo "ОШИБКА:"; echo "$PRAYER"; ERRORS=$((ERRORS + 1)); else echo "OK"; fi
echo ""

echo "=== 1d. Маркеры конфликтов слияния ==="
CONFLICTS=$(grep -rn --include="*.md" -E "^(<{7}|={7}|>{7})" .claude/ 2>/dev/null || true)
if [ -n "$CONFLICTS" ]; then echo "ОШИБКА:"; echo "$CONFLICTS"; ERRORS=$((ERRORS + 1)); else echo "OK"; fi
echo ""

if [ "$ERRORS" -gt 0 ]; then echo "ИТОГ: проблем — $ERRORS"; exit 1; fi
echo "ИТОГ: навыки — всё чисто"
