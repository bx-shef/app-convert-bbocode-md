# Навыки отчётов

Три Claude Code навыка для регулярных отчётов. Каждый — папка с `SKILL.md`.
Команды-обёртки лежат в `.claude/commands/`.

| Навык | Команда | Что делает |
|---|---|---|
| report-status | `/report-status` | срез состояния проекта по `docs/project-map.md` |
| report-digest | `/report-digest` | дайджест по репозиториям за период (кратко + подробно) |
| report-questions | `/report-questions` | вопросник заказчику по открытым вопросам карты |

## Отправка в Telegram

Навыки только генерируют текст. Отправляет команда-обёртка через
`scripts/tg-send.sh` — и только по твоему слову «шли», не раньше.

Шлём всё в **один канал** (`TG_CHAT_ID`). Переменные — в `.env` (шаблон —
`.env.example`, реальный `.env` в `.gitignore`):

| Переменная | Что это |
|---|---|
| `TG_BOT_TOKEN` | токен бота (@BotFather → /newbot) |
| `TG_CHAT_ID` | id канала назначения (приватный — `-100...`, публичный — `@username`) |

Настройка:

1. Создай бота у @BotFather, токен → `TG_BOT_TOKEN`.
2. Добавь бота в канал админом с правом публикации. Узнать `chat_id`: отправь
   сообщение в канал и открой `https://api.telegram.org/bot<TOKEN>/getUpdates` —
   `chat.id` будет в ответе.
3. Куда положить переменные:
   - облако (web): Environment variables окружения и **добавить `api.telegram.org`
     в сетевой allowlist окружения** — иначе curl не уйдёт;
   - локально: `cp .env.example .env && chmod 600 .env`, затем заполни значения
     (права `600` — чтобы токен не читался другими пользователями).
4. `tg-send.sh` без токена или без `chat_id` намеренно отказывает — случайно
   «в пустоту» не отправит.

> Windows: отдельного `.ps1`-отправщика нет — скрипт работает через bash
> (WSL / Git Bash): `bash scripts/tg-send.sh`. Проверка — `scripts/check-tg.sh`
> (linux) / `scripts/check-tg.ps1` (windows, через bash).

## Источник правды и синхронизация

Тело каждого `SKILL.md` — **зеркало** промпта из `docs/reports/`:

| Навык | Эталон промпта |
|---|---|
| report-status | `docs/reports/project-status.md` |
| report-digest | `docs/reports/engineering-digest.md` |
| report-questions | `docs/reports/client-questions.md` |

Канон — файлы в `docs/reports/`. При правке промпта обновляй **оба** места.
Идентичность проверяется скриптом `scripts/check-skills.sh` (linux) /
`scripts/check-skills.ps1` (windows) и в CI (`docs-links`).

## Приёмочный smoke-тест (после мержа, в новой сессии)

1. `/report-status` — должен прочитать `docs/project-map.md` и выдать срез по 8 разделам.
2. `/report-digest` — должен спросить `since` и список репозиториев, затем выдать две версии через разделитель `═══`.
3. `/report-questions` — должен взять открытые вопросы (статус «ждём») и выдать 1—3 вопроса с вариантами/рисками/рекомендацией.

Критерии для всех: plain text без markdown, заголовки КАПСОМ с эмодзи, маркер `•`, русский, без эмодзи «сложенные ладони».
