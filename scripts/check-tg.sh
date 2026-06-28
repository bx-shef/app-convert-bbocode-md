#!/usr/bin/env bash
# Проверка scripts/tg-send.sh без сети и без реальных кредов.
# Запуск из корня репозитория: bash scripts/check-tg.sh
# Проверяет: синтаксис, отказы (нет токена / нет chat_id / пустой текст),
# усечение длинного текста и его отсутствие на коротком (через мок curl),
# что реальный .env не закоммичен.
set -uo pipefail

ERRORS=0
SCRIPT="scripts/tg-send.sh"
pass() { echo "OK: $1"; }
fail() { echo "ОШИБКА: $1"; ERRORS=$((ERRORS + 1)); }

# Мок curl: пишет аргументы в $CURL_LOG, отдаёт заданный ответ Telegram.
# Режим (аргумент): ok (по умолчанию) | notok (ответ "ok":false) | fail (сбой сети, exit 1).
# Путь лога и тело/код «запекаются» в мок при создании (heredoc <<M).
mk_mock() {
  MOCK_DIR=$(mktemp -d)
  CURL_LOG="$MOCK_DIR/args"
  local body rc
  case "${1:-ok}" in
    ok)    body='{"ok":true}';                              rc=0 ;;
    notok) body='{"ok":false,"description":"bad request"}'; rc=0 ;;
    fail)  body='';                                         rc=1 ;;
  esac
  cat > "$MOCK_DIR/curl" <<M
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$CURL_LOG"
printf '%s' '$body'
exit $rc
M
  chmod +x "$MOCK_DIR/curl"
}

echo "=== 1. Синтаксис ==="
if bash -n "$SCRIPT"; then pass "синтаксис"; else fail "синтаксис"; fi
echo ""

echo "=== 2. Отказ без TG_BOT_TOKEN ==="
OUT=$(env -i PATH="$PATH" bash "$SCRIPT" "test" "-100x" 2>&1 || true)
echo "$OUT" | grep -qi "TG_BOT_TOKEN" && pass "отказ без токена" || fail "не отказал: $OUT"
echo ""

echo "=== 3. Отказ без chat_id ==="
OUT=$(env -i PATH="$PATH" TG_BOT_TOKEN=dummy bash "$SCRIPT" "test" 2>&1 || true)
echo "$OUT" | grep -qi "chat_id" && pass "отказ без chat_id" || fail "не отказал: $OUT"
echo ""

echo "=== 4. Отказ на пустой текст ==="
OUT=$(printf '' | env -i PATH="$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x bash "$SCRIPT" 2>&1 || true)
echo "$OUT" | grep -qi "пустой текст" && pass "отказ на пустой текст" || fail "не отказал: $OUT"
echo ""

echo "=== 5. Длинный текст усекается ==="
mk_mock
LONG=$(python3 -c "print('я'*4100, end='')")
CURL_LOG="$CURL_LOG" PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x \
  bash "$SCRIPT" "$LONG" >/dev/null 2>&1 || true
grep -qF "обрезано" "$CURL_LOG" 2>/dev/null && pass "длинный усечён" || fail "усечение не сработало"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 6. Короткий текст не усекается ==="
mk_mock
CURL_LOG="$CURL_LOG" PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x \
  bash "$SCRIPT" "привет, это короткий отчёт" >/dev/null 2>&1 || true
grep -qF "обрезано" "$CURL_LOG" 2>/dev/null && fail "короткий ошибочно усечён" || pass "короткий не усечён"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 7. Успешная отправка (верный chat_id) ==="
mk_mock ok
OUT=$(PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy bash "$SCRIPT" "привет" "-100777" 2>&1 || true)
echo "$OUT" | grep -qi "sent" && pass "успешная отправка" || fail "нет 'sent': $OUT"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 8. Сетевая ошибка curl ==="
mk_mock fail
OUT=$(PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x bash "$SCRIPT" "привет" 2>&1 || true)
echo "$OUT" | grep -qi "сети" && pass "поймана сетевая ошибка" || fail "не поймана: $OUT"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 9. Telegram ответил ok:false ==="
mk_mock notok
OUT=$(PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x bash "$SCRIPT" "привет" 2>&1 || true)
echo "$OUT" | grep -qi "отклонил" && pass "обработан ok:false" || fail "не обработан: $OUT"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 10. Текст из stdin ==="
mk_mock ok
OUT=$(printf 'отчёт из stdin' | PATH="$MOCK_DIR:$PATH" TG_BOT_TOKEN=dummy TG_CHAT_ID=-100x bash "$SCRIPT" 2>&1 || true)
echo "$OUT" | grep -qi "sent" && pass "stdin принят" || fail "stdin не принят: $OUT"
rm -rf "$MOCK_DIR"
echo ""

echo "=== 11. .env не отслеживается git ==="
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env в git! Удали: git rm --cached .env"
else
  pass ".env не в git"
fi
echo ""

if [ "$ERRORS" -gt 0 ]; then echo "ИТОГ: проблем — $ERRORS"; exit 1; fi
echo "ИТОГ: tg-send.sh — всё чисто"
