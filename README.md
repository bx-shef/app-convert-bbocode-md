# BBCode ↔ Markdown ↔ HTML converter for Bitrix24

> Last reviewed: 2026-06-19

[![CI](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/ci.yml/badge.svg)](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy.yml/badge.svg)](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy.yml)
[![Deploy Docker](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy-docker.yml/badge.svg)](https://github.com/bx-shef/app-convert-bbocode-md/actions/workflows/deploy-docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bitrix24 UI](https://img.shields.io/badge/Made%20with-Bitrix24%20UI-2fc6f6?logo=bitrix24&labelColor=020420)](https://bitrix24.github.io/b24ui/)

Live-конвертер BBCode (диалект Bitrix24) ⇄ Markdown ⇄ HTML с живым превью. Запускается как placement-приложение в портале Bitrix24 либо как обычный SPA в браузере.

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Markdown   │    BBCode    │     HTML     │   Превью     │
│  **Hello**   │ [b]Hello[/b] │ <strong>…    │  Hello       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Возможности
- **Трёхсторонняя live-конвертация** — BBCode ⇄ Markdown ⇄ HTML; правка любого формата пересчитывает остальные (pivot = Markdown), с защитой от циклов.
- **Живое превью** — отрендеренный (и санитизированный) результат рядом с исходниками.
- **Поддерживаемые теги (базовый набор Bitrix24):** `b, i, u, s, url, img, list (+[*], [list=1]), code (+lang), quote, h1-h6, br, hr, p, table (tr/th/td)`.
- **Вставленный raw-HTML не протекает** — инлайн (`<b>/<i>/<s>/<u>/<br>`) и блочный (`<ul>`, `<table>`, …) HTML конвертируется в BBCode, а не вставляется как текст.
- **Печать** — Markdown → готовый к печати HTML-документ через скрытый iframe (`<u>` печатается, `<script>` вырезается санитайзером).
- **Bitrix24 REST (задачи)** — загрузка описания задачи в редактор и сохранение обратно (BBCode/HTML ↔ MD) прямо из тулбара (`useB24Rest`, `actions.v2`). Вне портала — демо-уведомление.
- **Bitrix24 UI Kit** — нативный вид внутри портала; виджет `IM_TEXTAREA` для вставки в чат.
- **Готовая install-страница** для регистрации приложения как placement (mock-flow без серверной части).
- **i18n** — 19 локалей (EN+RU поддерживаются вручную, остальные — fallback на EN + `pnpm translate-ui`).
- **Юнит-тесты** — 152 теста на vitest (обе стороны, HTML, санитайзер, roundtrip).
- **Развёртывание из коробки** — единый CLI `pnpm run deploy <gh-pages|docker>` плюс готовые GitHub Actions: статический хостинг на GitHub Pages и Docker-образ в GHCR (nginx + SPA-фоллбэк, `docker compose pull && up -d` на вашем сервере).

## Стек
- [Nuxt 4](https://nuxt.com)
- [Vue 3](https://vuejs.org)
- [@bitrix24/b24ui-nuxt](https://bitrix24.github.io/b24ui/) — компоненты
- [@bitrix24/b24jssdk-nuxt](https://bitrix24.github.io/b24jssdk/) — JS SDK Bitrix24 (инициализация + REST задач через `actions.v2`)
- [markdown-it](https://github.com/markdown-it/markdown-it) — парсер/рендер Markdown
- [htmlparser2](https://github.com/fb55/htmlparser2) — парсинг HTML→MD и алло-листный санитайзер (node-native, без DOM)
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
│   ├── index.vue               # converter UI
│   ├── install.vue             # Bitrix24 placement install flow
│   └── widget/im-textarea.vue  # IM_TEXTAREA placement widget
├── utils/
│   ├── bbcode-parser.ts        # BBCode → AST
│   ├── bbcode-to-md.ts         # AST → Markdown
│   ├── md-to-bbcode.ts         # markdown-it tokens → BBCode (+ raw-HTML maps)
│   ├── md-to-html.ts           # Markdown → HTML fragment
│   ├── html-to-md.ts           # HTML → Markdown (htmlparser2)
│   ├── sanitize-html.ts        # allow-list HTML sanitizer
│   ├── convert.ts              # facade over the Markdown pivot
│   ├── b24-entity.ts           # task description ↔ MD (pure)
│   └── md-to-print-html.ts     # Markdown → print-ready HTML
├── composables/
│   ├── useConverter.ts         # реактивная 3-сторонняя конвертация + превью
│   ├── usePrint.ts             # печать рендера через скрытый iframe
│   ├── useB24.ts               # JSSdk init wrapper
│   └── useB24Rest.ts           # REST задач (actions.v2): load/save
├── layouts/                    # clear (index/install) + widget
├── components/                 # AppLogo, ConverterPane
└── app.vue                     # init B24, SEO, locale
i18n/locales/                   # 19 локалей
tests/                          # vitest
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

**TL;DR.** Поддерживаются два таргета, оба обёрнуты в один CLI `tools/deploy.ts` и в один CI-pipeline:

| Таргет | Команда | Workflow | Где живёт |
| :--- | :--- | :--- | :--- |
| GitHub Pages | `pnpm run deploy gh-pages` | `.github/workflows/deploy.yml` (push в `main` / ручной) | `https://<owner>.github.io/<repo>/` |
| Docker | `pnpm run deploy docker [--push]` | `.github/workflows/deploy-docker.yml` (ручной) | образ в GHCR + `docker compose` на вашем сервере |

CLI и CI используют один и тот же код сборки — локальный `pnpm run deploy …` воспроизводит ровно то, что собирает Actions. (Команда называется `pnpm run deploy`, а не `pnpm deploy`, потому что у pnpm есть встроенная команда `deploy` для монорепо — её и перекрывает наш скрипт.)

```bash
pnpm run deploy gh-pages         # сборка под GitHub Pages (артефакт в dist/)
pnpm run deploy docker           # docker build → локальный образ
pnpm run deploy docker --push    # build + push в реестр
```

### GitHub Pages

Workflow: `.github/workflows/deploy.yml` (push в `main` или ручной `workflow_dispatch`).

Base URL подхватывается автоматически из контекста репозитория:
`https://<owner>.github.io/<repo>/`. Для форка ничего править не нужно — просто включите Pages с источником **GitHub Actions** в настройках репозитория.

### Docker

`Dockerfile` — multi-stage сборка: `pnpm generate` внутри `node:22-alpine`, статический `dist/` отдаёт `nginx:1.27-alpine` со SPA-фоллбэком на `index.html` (`docker/nginx.conf`).

Workflow: `.github/workflows/deploy-docker.yml`. Триггерится **автоматически** на push в `main`, если затронуты файлы, влияющие на образ (`app/`, `public/`, `i18n/`, `docker/`, `Dockerfile`, `package.json`, `pnpm-lock.yaml`, `nuxt.config.ts`, `tsconfig.json` и сам workflow). Чисто документационные коммиты сборку не вызывают. Можно также запустить руками: **Actions → Deploy Docker image → Run workflow** с переопределением `site_url`, `base_url`, `tag`.

Образ публикуется в **GHCR** под именем `ghcr.io/<owner>/<repo>` с тегами `latest` и `<sha>`. Отдельные секреты не нужны — аутентификация через `GITHUB_TOKEN`. `NUXT_PUBLIC_SITE_URL` берётся из **GitHub Variable** `NUXT_PUBLIC_SITE_URL` (см. шпаргалку ниже).

Локальная сборка:

```bash
NUXT_PUBLIC_SITE_URL=https://example.com \
NUXT_APP_BASE_URL=/ \
DOCKER_IMAGE=ghcr.io/bx-shef/app-convert-bbocode-md \
DOCKER_TAG=latest \
pnpm run deploy docker --push
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

#### Шпаргалка деплоя на сервер `bx-shef`

Реальные значения (домен, путь). Подразумевает, что `nginxproxy/nginx-proxy` + `acme-companion` уже подняты на сервере, а DNS A-записи `convert-bbocode-md.bx-shef.by` смотрит на IP сервера.

**Один раз — настройка GitHub Variable.**
**Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name | Value |
| :--- | :--- |
| `NUXT_PUBLIC_SITE_URL` | `https://convert-bbocode-md.bx-shef.by` |

Это публичная переменная (не секрет) — её значение запекается в JS-бандл и видно в браузере. Меняется при смене домена → следующий push в `main` пересоберёт образ с новым URL.

**Сборка образа.** Каждый push в `main`, затрагивающий код/конфиг сборки, автоматически собирает и пушит образ в GHCR (`:latest` + `:<sha>`). Первая сборка инициирует пакет — после неё **Code → Packages → app-convert-bbocode-md → Package settings → Change visibility → Public** (или оставить приватным и сделать `docker login ghcr.io` на сервере). Если в `main` ещё нет ни одного «кодового» коммита — запустить **Actions → Deploy Docker image → Run workflow** руками.

**Один раз — раскладка на сервере.** На хосте нужны ровно три файла: `docker-compose.prod.yml`, `Makefile`, `.env.prod.example`. Тянем их напрямую с `main`:

```bash
mkdir -p /home/bitrix/convert-bbocode-md && cd /home/bitrix/convert-bbocode-md
RAW=https://raw.githubusercontent.com/bx-shef/app-convert-bbocode-md/main
for f in docker-compose.prod.yml Makefile .env.prod.example; do
  curl -fsSL -o "$f" "$RAW/$f"
done
cp .env.prod.example .env.prod        # домен и почта уже подставлены под bx-shef
docker network inspect proxy-net >/dev/null 2>&1 || docker network create proxy-net
# для приватного образа (если visibility != Public):
# docker login ghcr.io                # username: GH login, password: PAT с read:packages
```

Обновить конфиг при изменениях в репо — тот же цикл `curl`-ом.

**Запуск / обновление.**
```bash
cd /home/bitrix/convert-bbocode-md
make up           # pull свежего образа + up -d
```

**Проверка.**
```bash
# 1) контейнер healthy
docker ps --filter name=app-convert-bbocode-md --format '{{.Names}}\t{{.Status}}'
#    ожидаем:  app-convert-bbocode-md   Up X (healthy)

# 2) nginx внутри отдаёт SPA
docker exec app-convert-bbocode-md wget -qO- http://127.0.0.1/ | head -c 100

# 3) nginx-proxy подхватил VIRTUAL_HOST
docker exec server nginx -T 2>/dev/null | grep -A2 "server_name convert-bbocode-md"

# 4) сертификат выписан
docker logs letsencrypt --tail 50 | grep convert-bbocode-md

# 5) HTTPS снаружи
curl -I https://convert-bbocode-md.bx-shef.by/
#    ожидаем HTTP/2 200
```

В браузере: <https://convert-bbocode-md.bx-shef.by/>.

**Откат к предыдущей версии.**
```bash
# в .env.prod заменить DOCKER_TAG=latest → DOCKER_TAG=<sha из GHCR>
make up
```

**Полезное.**
```bash
make logs    # tail логов prod-стека
make ps      # статус
make down    # остановить
make restart # down + up
```

## Развёртывание в Bitrix24

Приложение работает как placement-iframe. Регистрируется через **«Разработчикам → Иное → Локальное приложение»** в портале Bitrix24.

### Прод (`bx-shef`)

Образ уже задеплоен на `https://convert-bbocode-md.bx-shef.by` (см. шпаргалку выше). В Bitrix24 заполняем:

| Параметр | Значение |
| :--- | :--- |
| **Application URL** | `https://convert-bbocode-md.bx-shef.by` |
| **Installation URL** | `https://convert-bbocode-md.bx-shef.by/install` |
| **Назначение** | iframe-приложение |
| **Скоупы** | `user_brief`, `im`, `placement`, `task` (см. `getRequiredRights()` в `useB24.ts`) |

После сохранения нажать **«Установить»** — портал откроет страницу `/install`, она:
1. инициализирует JSSDK,
2. через `placement.bind` регистрирует виджет на `IM_TEXTAREA` (handler `https://convert-bbocode-md.bx-shef.by/widget/im-textarea`, контекст `USER;CHAT`, размер `480×320`).

После этого в правом нижнем углу панели ввода чата появится иконка `BBCode ↔ MD` — клик открывает конвертер.

> **Сменили домен / пересобрали с другим `NUXT_PUBLIC_SITE_URL`?** В `placement.list` остаётся старый handler. Откройте `/install` ещё раз — `makePlacement` сделает `unbind` старого и `bind` нового.

### Локальная разработка

Dev-сервер `pnpm dev` крутится на `:3000` — порту нужен HTTPS-туннель, чтобы Bitrix24 пустил его в iframe. Поднимите ngrok / cloudflared, добавьте хост в `.env`:

```env
NUXT_PUBLIC_SITE_URL=https://your-tunnel.ngrok.app
NUXT_ALLOWED_HOSTS=your-tunnel.ngrok.app
```

Зарегистрируйте отдельное локальное приложение в портале (рядом с прод-инсталляцией, чтобы не мешало):

| Параметр | URL |
| :--- | :--- |
| **Application URL** | `https://your-tunnel.ngrok.app` |
| **Installation URL** | `https://your-tunnel.ngrok.app/install` |

Скоупы те же. Дальше — тот же поток: «Установить» → `/install` → `placement.bind`.

## Аналитика посетителей (опционально)

Поддержан **Cloudflare Web Analytics** — без кук, без баннера согласия GDPR, бесплатно. Один env-флаг:

```env
NUXT_PUBLIC_CF_ANALYTICS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Если переменная пустая — никакой скрипт не подключается. Токен берётся в Cloudflare → Analytics & Logs → Web Analytics → Add a site (для GitHub Pages выбирать «manual installation»). Значение запекается в бандл при сборке (через `--build-arg` для Docker / `vars` для GitHub Actions), как и `NUXT_PUBLIC_SITE_URL`.

## Roadmap
- [x] Задачи: загрузка/сохранение описания через REST (`useB24Rest`, `actions.v2`). **Требуется ручной QA в портале.**
- [ ] CRM-комментарии и посты Живой ленты по REST (нужен owner-контекст: `ownerTypeId`/`ownerId`).
- [ ] Bitrix-специфичные теги: `[USER=id]`, `[DISK File=id]`, `[DEPARTMENT=id]`, `[color]`, `[size]`, `[font]`.
- [ ] Полные переводы новых i18n-ключей на 19 локалей через `pnpm translate-ui`.

## Локализация

Скрипт автоперевода UI:
```
pnpm translate-ui
```

## CI / автоматизация

- **`ci.yml`** — на каждый PR в `main`: `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` → `build`.
- **`deploy.yml`** — на push в `main` собирает SPA и публикует на GitHub Pages.
- **`deploy-docker.yml`** — на push в `main` (если затронуты файлы образа) пересобирает Docker-образ и пушит в GHCR.
- **`dependabot.yml`** — еженедельно (понедельник) проверяет обновления npm и GitHub Actions. Bitrix24-, Nuxt-, Vue-пакеты сгруппированы; dev-зависимости (minor/patch) — в общую группу.

### Branch protection для `main` (настроить разово через Settings → Branches)
- Require pull request before merging
- Require status checks to pass → `ci`
- Require branches to be up to date before merging
- Запретить force-push и удаление ветки
- Включить «Require linear history» (по желанию)

## Лицензия

MIT — см. `LICENSE`. Шаблон взят из [bitrix24/templates-dashboard](https://github.com/bitrix24/templates-dashboard).
