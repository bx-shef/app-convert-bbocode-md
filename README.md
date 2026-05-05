# BBCode ↔ Markdown converter for Bitrix24

[![Bitrix24 UI](https://img.shields.io/badge/Made%20with-Bitrix24%20UI-2fc6f6?logo=bitrix24&labelColor=020420)](https://bitrix24.github.io/b24ui/)

Двусторонний live-конвертер BBCode (диалект Bitrix24) ↔ Markdown. Запускается как placement-приложение в портале Bitrix24 либо как обычный SPA в браузере.

```
┌─────────────────────────────┬─────────────────────────────┐
│           BBCode            │           Markdown           │
│  [b]Hello[/b]               │  **Hello**                   │
│  [list][*]a[*]b[/list]      │  - a                         │
│                             │  - b                         │
└─────────────────────────────┴─────────────────────────────┘
```

## Возможности
- **Двунаправленная live-конвертация** — правка слева пересчитывает справа и наоборот, с защитой от циклов.
- **Поддерживаемые теги (базовый набор Bitrix24):** `b, i, u, s, url, img, list (+[*], [list=1]), code (+lang), quote, h1-h6, br, hr, p`.
- **Bitrix24 UI Kit** — нативный вид внутри портала.
- **Готовая install-страница** для регистрации приложения как placement (сейчас mock-flow без серверной части — расширим позже).
- **i18n** — 19 локалей унаследованы из шаблона `bitrix24/templates-dashboard`.
- **Юнит-тесты** на vitest для конвертера в обе стороны и roundtrip.

## Стек
- [Nuxt 4](https://nuxt.com)
- [Vue 3](https://vuejs.org)
- [@bitrix24/b24ui-nuxt](https://bitrix24.github.io/b24ui/) — компоненты
- [@bitrix24/b24jssdk-nuxt](https://bitrix24.github.io/b24jssdk/) — JS SDK Bitrix24 (инициализация; REST-вызовы — следующий этап)
- [markdown-it](https://github.com/markdown-it/markdown-it) — парсер Markdown
- Собственный парсер BBCode (`app/utils/bbcode-parser.ts`) — лёгкий, без зависимостей
- [vitest](https://vitest.dev) — тесты
- [@nuxtjs/i18n](https://i18n.nuxtjs.org) — локализация
- pnpm 10

## Запуск

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # юнит-тесты конвертера
pnpm test:watch   # тесты в watch-режиме
pnpm build        # production-сборка
pnpm preview      # локальный preview production
pnpm typecheck    # проверка типов
pnpm lint         # eslint
```

## Структура

```
app/
├── pages/
│   ├── index.vue        # two-pane converter UI
│   └── install.vue      # Bitrix24 placement install flow
├── utils/
│   ├── bbcode-parser.ts # parser → AST
│   ├── bbcode-to-md.ts  # AST → Markdown
│   └── md-to-bbcode.ts  # markdown-it tokens → BBCode
├── composables/
│   ├── useConverter.ts  # реактивная двусторонняя конвертация
│   └── useB24.ts        # JSSdk init wrapper
├── layouts/             # default + clear (для install)
├── components/          # AppLogo, AppTitle, UserMenu
└── app.vue              # init B24, SEO, locale
i18n/locales/            # 19 локалей
tests/                   # vitest
```

## Конвертация — таблица маппинга

| BBCode | Markdown |
|--------|----------|
| `[b]x[/b]` | `**x**` |
| `[i]x[/i]` | `*x*` |
| `[u]x[/u]` | `<u>x</u>` |
| `[s]x[/s]` | `~~x~~` |
| `[url=L]T[/url]` | `[T](L)` |
| `[url]L[/url]` | `<L>` |
| `[img]S[/img]` | `![](S)` |
| `[code]x[/code]` | `` `x` `` (inline, без `\n`) |
| `[code]x\ny[/code]` | ```` ```\nx\ny\n``` ```` |
| `[code lang=js]…[/code]` | ```` ```js\n…\n``` ```` |
| `[quote]x[/quote]` | `> x` |
| `[list][*]a[*]b[/list]` | `- a\n- b` |
| `[list=1][*]a[*]b[/list]` | `1. a\n2. b` |
| `[h1..6]x[/h1..6]` | `#…######` |
| `[br]` | `\n` |
| `[hr]` | `---` |
| `[p]x[/p]` | `\n\nx\n\n` |

## Развёртывание

Сборка статического SPA и публикация выполняется единым CLI `tools/deploy.ts`:

```bash
pnpm deploy gh-pages    # сборка под GitHub Pages (артефакт в dist/)
pnpm deploy joker       # сборка + rsync на ваш сервер по SSH
```

Те же команды вызываются из CI — ниже только настройка окружения.

### GitHub Pages

Workflow: `.github/workflows/deploy.yml` (push в `main` или ручной `workflow_dispatch`).

Base URL подхватывается автоматически из контекста репозитория:
`https://<owner>.github.io/<repo>/`. Для форка ничего править не нужно — просто включите Pages с источником **GitHub Actions** в настройках репозитория.

### Joker (или любой SSH-хост)

Workflow: `.github/workflows/deploy-joker.yml` (ручной запуск через **Actions → Deploy to Joker → Run workflow**, опционально с переопределением `site_url` / `base_url`).

Секреты репозитория, которые нужно задать (`Settings → Secrets and variables → Actions`):

| Secret | Назначение |
| :--- | :--- |
| `JOKER_SSH_HOST` | хост SSH |
| `JOKER_SSH_USER` | пользователь |
| `JOKER_SSH_PORT` | порт (например, `22`) |
| `JOKER_REMOTE_PATH` | абсолютный путь, например `/var/www/app-convert-bbocode-md` |
| `JOKER_SSH_KEY` | приватный SSH-ключ целиком (PEM) |
| `NUXT_PUBLIC_SITE_URL` | публичный URL приложения |

Локально те же переменные читаются из `.env` (см. `.env.example`), для ключа — `JOKER_SSH_KEY_PATH` с путём к файлу. Под капотом — `nuxt generate` + `rsync -avz --delete -e ssh dist/ user@host:path`.

## Развёртывание в Bitrix24

Приложение работает как placement-iframe. Для локальной разработки прокиньте dev-сервер через ngrok / cloudflared и добавьте хост в `.env`:

```env
NUXT_PUBLIC_SITE_URL=https://your-tunnel.ngrok.app
NUXT_ALLOWED_HOSTS=your-tunnel.ngrok.app
```

Затем зарегистрируйте локальное приложение в Bitrix24:

| Параметр | URL |
| :--- | :--- |
| **Application URL** | `https://your-tunnel.ngrok.app` |
| **Installation URL** | `https://your-tunnel.ngrok.app/install` |

Обязательные скоупы (на текущем этапе — задел на будущее): `user_brief`, `crm`, `tasks`, `entity`.

## Roadmap
- [ ] Подтягивать тексты задач/комментариев/постов из Bitrix24 REST и сохранять обратно (`useB24` уже инициализирован).
- [ ] Bitrix-специфичные теги: `[USER=id]`, `[DISK File=id]`, `[DEPARTMENT=id]`, `[color]`, `[size]`, `[font]`.
- [ ] Полные переводы новых i18n-ключей на 19 локалей через `pnpm translate-ui`.

## Локализация

Скрипт автоперевода UI:
```
pnpm translate-ui
```

## Лицензия

MIT — см. `LICENSE`. Шаблон взят из [bitrix24/templates-dashboard](https://github.com/bitrix24/templates-dashboard).
