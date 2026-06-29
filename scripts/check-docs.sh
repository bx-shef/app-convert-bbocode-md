#!/usr/bin/env bash
# Проверка документации перед коммитом/мержем.
# Запуск из корня репозитория: bash scripts/check-docs.sh
# Делает три проверки: битые ссылки, маркеры конфликтов, запрещённая эмодзи.
set -uo pipefail

ERRORS=0

echo "=== 1. Битые ссылки в документации ==="
if python3 .github/scripts/check_doc_links.py; then
    echo "OK"
else
    echo "ОШИБКА — есть битые ссылки"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "=== 2. Маркеры конфликтов слияния ==="
CONFLICTS=$(grep -rn --include="*.md" -E "^(<{7}|={7}|>{7})" docs .claude scripts README.md CLAUDE.md 2>/dev/null || true)
if [ -n "$CONFLICTS" ]; then
    echo "ОШИБКА — найдены маркеры конфликтов:"
    echo "$CONFLICTS"
    ERRORS=$((ERRORS + 1))
else
    echo "OK"
fi
echo ""

echo "=== 3. Запрещённая эмодзи 🙏 (вне строки-запрета) ==="
PRAYER=$(grep -rn --include="*.md" "🙏" docs .claude scripts README.md CLAUDE.md 2>/dev/null | grep -v "Не используй эмодзи 🙏" || true)
if [ -n "$PRAYER" ]; then
    echo "ОШИБКА — найдена запрещённая эмодзи вне инструкции-запрета:"
    echo "$PRAYER"
    ERRORS=$((ERRORS + 1))
else
    echo "OK"
fi
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo "ИТОГ: найдено проблем — $ERRORS"
    exit 1
fi
echo "ИТОГ: всё чисто"
