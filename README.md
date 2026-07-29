# Конвертер BBCode ↔ Markdown ↔ HTML для Bitrix24

> Last reviewed: 2026-07-28

[![CI](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/ci.yml/badge.svg)](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/ci.yml)
[![Deploy Docker](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy-docker.yml/badge.svg)](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy-docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bitrix24 UI](https://img.shields.io/badge/Made%20with-Bitrix24%20UI-2fc6f6?logo=bitrix24&labelColor=020420)](https://bitrix24.github.io/b24ui/)

Переводит текст между форматом Bitrix24 (BBCode), Markdown и HTML — с живым
предпросмотром. Работает как обычный сайт и как приложение внутри портала
Bitrix24: кнопка у поля ввода чата плюс загрузка и сохранение описаний задач,
комментариев CRM и постов Ленты.

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Markdown   │    BBCode    │     HTML     │  Предпросмотр│
│  **Привет**  │ [b]Привет[/b]│ <strong>…    │  Привет      │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Документация

Три файла, всё остальное — вспомогательное:

| Файл | О чём |
|---|---|
| [**docs/PROCESS.md**](docs/PROCESS.md) | Как запустить: настройки → сборка и выкладка → регистрация в Bitrix24 → установка → работа с данными портала. Плюс что делать, если сломалось. |
| [**docs/project-map.md**](docs/project-map.md) | Что уже есть в приложении и в каком состоянии: готово · не проверено · отложено · заблокировано. |
| [**docs/ROADMAP.md**](docs/ROADMAP.md) | Что можно сделать потом. |

Устройство кода и правила разработки — в [CLAUDE.md](CLAUDE.md).

## Что умеет

- **Три формата сразу** — правка в любом поле пересчитывает остальные (опорный формат — Markdown).
- **Живой предпросмотр** — сразу видно, как текст будет выглядеть.
- **Теги Bitrix24** — оформление (цвет, размер, шрифт), упоминания сотрудников и отделов, кнопки чат-бота.
- **Вставленный HTML не ломается** — превращается в разметку, а не в набор символов.
- **Печать** — Markdown → готовый к печати документ.
- **Работа с порталом** — загрузить текст задачи, комментария CRM или поста Ленты, отредактировать и сохранить обратно.
- **Кнопка в чате** — забрать текст из поля ввода, отредактировать, вернуть обратно.
- **19 языков интерфейса** (русский и английский переведены полностью, остальные пока показывают английский).

## Быстрый старт

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm check        # проверки перед отправкой изменений: линтер + типы + тесты
pnpm build        # сборка
```

Полная последовательность запуска в продакшене и подключения к Bitrix24 —
в [docs/PROCESS.md](docs/PROCESS.md).

## Таблица соответствия форматов

| BBCode | Markdown |
|---|---|
| `[b]x[/b]` | `**x**` |
| `[i]x[/i]` | `*x*` |
| `[u]x[/u]` | `<u>x</u>` |
| `[s]x[/s]` | `~~x~~` |
| `[url=L]T[/url]` | `[T](L)` |
| `[url]L[/url]` | `<L>` |
| `[img]S[/img]` | `![](S)` |
| `[code]x[/code]` | `` `x` `` |
| `[code lang=js]…[/code]` | ```` ```js … ``` ```` |
| `[quote]x[/quote]` | `> x` |
| `[list][*]a[*]b[/list]` | `- a` / `- b` |
| `[list=1][*]a[*]b[/list]` | `1. a` / `2. b` |
| `[h1..6]x[/h1..6]` | `#` … `######` |
| `[br]` | перенос строки |
| `[hr]` | `---` |
| `[p]x[/p]` | абзац |
| `[color=c]` · `[size=n]` · `[font=f]` | `<span style="…">x</span>` |
| `[USER=id]` · `[DEPARTMENT=id]` | `<span data-bb-user\|dept="id">…</span>` |
| `[SEND=v]` · `[PUT=v]` · `[CALL=num]` | `<span data-bb-send\|put\|call="v">…</span>` |

У Markdown нет подчёркивания и цвета — для них используется HTML, чтобы текст
проходил в обе стороны без потерь. Теги `[SEND]`, `[PUT]`, `[CALL]` — из
[официального формата сообщений бота Bitrix24](https://vibecode.bitrix24.tech/docs/bots/messages/formatting):
по нажатию отправляют сообщение, подставляют текст в поле ввода или звонят.

Для чата таблицы автоматически превращаются в списки — чат Bitrix24 таблиц не
поддерживает.

## Стек

[Nuxt 4](https://nuxt.com) · [Vue 3](https://vuejs.org) ·
[Bitrix24 UI](https://bitrix24.github.io/b24ui/) ·
[Bitrix24 JS SDK](https://bitrix24.github.io/b24jssdk/) ·
[markdown-it](https://github.com/markdown-it/markdown-it) ·
[htmlparser2](https://github.com/fb55/htmlparser2) · собственный разбор BBCode ·
[vitest](https://vitest.dev) · [Playwright](https://playwright.dev) · pnpm 10.

Приложение полностью статическое — своей серверной части нет, все обращения к
порталу идут из браузера.

## Лицензия

MIT — см. [LICENSE](LICENSE).
