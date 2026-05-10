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
pnpm deploy gh-pages         # сборка под GitHub Pages (артефакт в dist/)
pnpm deploy docker           # docker build → локальный образ
pnpm deploy docker --push    # build + push в реестр
```

Те же команды вызываются из CI — ниже только настройка окружения.

### GitHub Pages

Workflow: `.github/workflows/deploy.yml` (push в `main` или ручной `workflow_dispatch`).

Base URL подхватывается автоматически из контекста репозитория:
`https://<owner>.github.io/<repo>/`. Для форка ничего править не нужно — просто включите Pages с источником **GitHub Actions** в настройках репозитория.

### Docker

`Dockerfile` — multi-stage сборка: `pnpm generate` внутри `node:22-alpine`, статический `dist/` отдаёт `nginx:1.27-alpine` со SPA-фоллбэком на `index.html` (`docker/nginx.conf`).

Workflow: `.github/workflows/deploy-docker.yml` (ручной запуск **Actions → Deploy Docker image → Run workflow**, можно переопределить `site_url`, `base_url`, `tag`). Образ публикуется в **GHCR** под именем `ghcr.io/<owner>/<repo>` с тегами `<tag>` и `<sha>` — отдельные секреты не нужны, аутентификация через `GITHUB_TOKEN`.

Локальная сборка:

```bash
NUXT_PUBLIC_SITE_URL=https://example.com \
NUXT_APP_BASE_URL=/ \
DOCKER_IMAGE=ghcr.io/bx-shef/app-convert-bbocode-md \
DOCKER_TAG=latest \
pnpm deploy docker --push
```

`NUXT_PUBLIC_SITE_URL` / `NUXT_APP_BASE_URL` запекаются в бандл на этапе `docker build` через `--build-arg` — поменять их без пересборки нельзя.

Запуск из готового образа — два профиля:

**Локально / standalone** (`docker-compose.yml`) — открывает порт наружу, удобно проверить артефакт CI:

```bash
docker login ghcr.io
docker compose pull
HTTP_PORT=8080 docker compose up -d   # http://localhost:8080
```

**На сервере с nginx-proxy + acme-companion** (`docker-compose.prod.yml`) — контейнер сидит во внешней сети `proxy-net`, не открывает портов наружу, домен и SSL подхватывает [`nginxproxy/nginx-proxy`](https://github.com/nginx-proxy/nginx-proxy) через `VIRTUAL_HOST`/`LETSENCRYPT_HOST`. Готовые таргеты в `Makefile`:

```bash
cp .env.prod.example .env.prod   # заполнить VIRTUAL_HOST, LETSENCRYPT_*, DOCKER_TAG
make init-network                # один раз: создать сеть proxy-net (если её ещё нет)
# nginx-proxy + acme-companion поднимаются отдельно (ваш собственный compose).
make up                          # pull + up -d
make logs / make ps / make down
```

Контейнер имеет встроенный `HEALTHCHECK` (curl `/` через nginx), `restart: unless-stopped` и мягкие лимиты `0.5 CPU / 128 MB` — для статики этого хватает с запасом.

`NUXT_PUBLIC_SITE_URL` / `NUXT_APP_BASE_URL` запекаются в бандл на этапе `docker build` через `--build-arg` — менять их через `.env.prod` бесполезно, нужно пересобирать образ (передать новые значения в workflow `Deploy Docker image → Run workflow`).

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
