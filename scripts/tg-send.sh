#!/usr/bin/env bash
# Отправка текста в Telegram.
#   Вход: $1 — текст ИЛИ stdin (для многострочного предпочтительно stdin/heredoc).
#   chat_id: $2 ИЛИ TG_CHAT_ID. Без него — отказ (чтобы не отправить не в тот чат).
# БЕЗОПАСНОСТЬ: не включать set -x и не вызывать через bash -x — токен виден в URL.
set -euo pipefail

: "${TG_BOT_TOKEN:?TG_BOT_TOKEN не задан}"

# Текст: из непустого аргумента или из stdin.
if [ "$#" -ge 1 ] && [ -n "${1:-}" ]; then
  TEXT="$1"
else
  TEXT="$(cat)"
fi

# Пустой текст — отправлять нечего (защита от пустого сообщения и зависания).
if [ -z "${TEXT//[$'\n\r\t ']/}" ]; then
  echo "Ошибка: пустой текст — отправлять нечего." >&2
  exit 1
fi

CHAT="${2:-${TG_CHAT_ID:-}}"
if [ -z "$CHAT" ]; then
  echo "Ошибка: не указан chat_id (вторым аргументом или TG_CHAT_ID)." >&2
  exit 1
fi

# Telegram режет сообщения длиннее 4096. Нормализуем длину по СИМВОЛАМ через
# python3 — срез по байтам в bash может разрезать UTF-8 (кириллица/эмодзи) и
# тогда Telegram вернёт 400.
MAX=4000
TEXT="$(printf '%s' "$TEXT" | MAX="$MAX" python3 -c '
import os, sys
t = sys.stdin.read()
m = int(os.environ["MAX"])
if len(t) > m:
    sys.stderr.write("warn: текст усечён до %d символов\n" % m)
    sys.stdout.write(t[:m] + "\n…(обрезано)")
else:
    sys.stdout.write(t)
')"

# Без parse_mode: plain text не падает на спецсимволах Telegram.
# Все значения — через --data-urlencode (защита от инъекции параметров & и =).
# Токен (в URL) не передаём в argv — иначе он виден в `ps aux`. Отдаём URL curl
# через --config из process substitution; printf — встроенная команда bash, в
# списке процессов не светится. chat_id/text остаются в argv (секретов там нет).
RESP="$(curl -sS \
  --config <(printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "${TG_BOT_TOKEN}") \
  --data-urlencode "chat_id=${CHAT}" \
  --data-urlencode "text=${TEXT}" \
  --data-urlencode "disable_web_page_preview=true" 2>&1)" || {
    echo "Ошибка сети при отправке в Telegram: ${RESP}" >&2
    exit 1
  }
case "$RESP" in
  *'"ok":true'*) echo "sent -> ${CHAT}" ;;
  *) echo "Telegram отклонил отправку: ${RESP}" >&2; exit 1 ;;
esac
