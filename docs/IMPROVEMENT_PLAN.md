# План улучшения репозитория (по образцу `ai-price-import`)

> Last reviewed: 2026-07-22

Документ — итог сравнения нашего репозитория (`bx-shef/app-convert-bbocode-md`,
далее **bbcode**) с примером `bx-shef/ai-price-import` («Procure AI») по осям
**деплой · «чёрная дыра» · структура · телеметрия · очереди · рейтинги ·
обратная связь · прочие фишки**. Цель — перенести полезное, честно отсекая
серверную сложность, неприменимую к нашему SPA.

## Легенда статусов

- ✅ **live** — сделано и проверено вживую
- 🧪 **код+тесты** — реализовано и покрыто тестами, но вживую (в портале) не гоняли
- 📝 **спроектировано** — только план/дизайн, кода нет
- ⛔ **блокер** — заблокировано внешним условием (ждём чего-то)
- 🚫 **skip** — сознательно не переносим (серверное/избыточное для SPA; см. «Сознательно НЕ переносим»)
- ⬜ **не начато**

В статусах допустимы уточнения в скобках (напр. `📝 (решение)`) и переходы `A→B` (напр. `🧪→⬜`).

## TL;DR

`ai-price-import` — **full-stack монолит**: Nuxt-фронт + Nitro-бэкенд + Postgres +
Redis + BullMQ + OCR-тулчейн + OpenTelemetry. **bbcode** — **чистый статический
SPA без сервера** (`nuxt generate` → nginx; правило «No server code» в `CLAUDE.md`
осознанное). Поэтому **~70 % «мяса» примера** (очереди, БД, серверная телеметрия,
edge-security, токен-стор) к нам **неприменимо в принципе** — и это честно
отсекается ниже. Реальная ценность для нас — не серверная архитектура, а
**дисциплина деплоя/процесса** и **продуктовые фишки** (обратная связь по качеству
конвертации, рейтинг в Маркете Б24).

По ряду вещей **bbcode уже впереди примера**: сгруппированный `dependabot.yml`,
CI-проверка доков (`docs-links.yml` + `check-docs.sh`/`check-skills.sh`),
функциональный e2e с dark-mode contrast-guard, зеркалирование `check_run` в
legacy commit-status. Их переносить не нужно.

## «Деплой в чёрную дыру» — что это

Это **не** shadow/canary/«деплой в никуда». Это конкретный продукт —
**Bitrix24 Vibecode Black Hole**: изолированная облачная VM, управляемая по REST,
**без публичного IP и открытых портов**. Исходящий интернет открыт, а входящий
трафик идёт **только через авторизованный туннель Битрикс24** (всегда порт
`:3000`). Снаружи сервер «не виден» — отсюда имя. Даёт zero-admin хостинг **внутри
облака Б24**: HTTPS, встраивание, бэкапы-снимки, авто-сон — без SSH и обслуживания ОS.

Механика (в примере — `docs/DEPLOY_VIBECODE.md`, `deploy/vibecode-deploy.sh`,
`.github/workflows/deploy-vibecode.yml`):

- Управление по REST без SSH: `POST /v1/infra/servers/:id/deploy`.
- Готовность = `status=running` **и** `blackholeStatus=CONNECTED` (туннель поднят).
- Managed-БД нет — Postgres/Redis ставятся на ту же VM в `preStart`.
- Сборка на VM из исходников (`codeload.github.com/<repo>/tar.gz/<sha>`).
- `accessPolicy=PUBLIC` обязателен для само-OAuth (вебхук + cross-portal iframe).
- Нет nginx → приложение **само** вешает CSP/HSTS/анти-брутфорс через
  `server/*/edgeSecurity.ts` под флагом `APP_EDGE_SECURITY=1`.
- Биллинг «вайбами», нужен коммерческий облачный ru-Битрикс24 с подпиской.

**Вердикт для bbcode:** для статического SPA **избыточно** — «дыра» спроектирована
под серверное приложение на :3000 + БД, а наш образ+nginx+GitHub Pages уже всё
покрывают. **Документируем как опцию; внедряем только по требованию клиента**
(«хочу хостинг внутри своего облака Б24»). Тогда порт = отдать `dist`
статик-сервером на :3000 + opt-in-скрипт по образцу `deploy/vibecode-deploy.sh`
(с `pnpm generate`, без preStart/БД). Статус: 📝 / P2.

## Что уже сделано (сессия июль 2026)

- ✅ `nginx -t` валидирует `docker/nginx.conf` в CI на каждом PR (#78).
- 🧪 Security-заголовки (`server_tokens off`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS) + CSP под iframe Б24 в режиме **Report-Only** (#78).
- ✅ `absolute_redirect off` (фикс Mixed-Content виджета) + группировка Actions в
  dependabot + docker-экосистема dependabot (#74).
- ✅ npm-зависимости и GitHub Actions до latest (#72); reporting-kit (#73).

---

## План по темам

### 1. Деплой

> **Важно — два прод-контура.** Репозиторий деплоится в **два** места: `deploy.yml` →
> GitHub Pages и `deploy-docker.yml` → Docker-образ (nginx) в GHCR. Пункты про
> security-заголовки/CSP/`nginx -t`/smoke относятся **только к Docker/nginx-контуру** —
> на GitHub Pages нет nginx (заголовки задаются лишь через `<meta>`, CSP ограничена).
> **Какой контур канонический для пользователей — открытый вопрос №0 (см. ниже).**
> CI-гейт «деплой только после зелёного CI» нужен **обоим** workflow.

| Пункт | Приоритет | Сложн. | Статус |
|---|---|---|---|
| Публиковать **оба деплоя** (`deploy-docker.yml` образ + `deploy.yml` Pages) **только после зелёного CI** (`workflow_run:[ci]` + гейт `conclusion==success`; образец — `deploy.yml` job `verify-ci` в примере). Сейчас **оба** пушат независимо от `ci.yml` | **P0** | M | ⬜ |
| **`make prod-rollback TAG=sha-<sha>` + `make prod-smoke`** по образцу `currency-converter/Makefile` — `deploy-docker.yml` уже пушит immutable-тег `:${sha}`, база для отката готова | **P1** | S | ⬜ |
| **SHA-пины** GitHub Actions (`uses: …@<sha> # v7.0.0`) вместо плавающих `@v7` во всех workflow | **P1** | S | ⬜ |
| Пост-деплойный **smoke-скрипт** (`scripts/smoke.sh`: `GET / →200`, ассет →200, наличие security-заголовков) | **P1** | S | ⬜ |
| Флип **CSP Report-Only → enforce** после портального QA (сменить имя заголовка в `docker/nginx.conf`) | **P1** | S | 🧪→⬜ |
| CSP: **hash-based `script-src`** (убрать `'unsafe-inline'`; образец — `currency-converter/scripts/csp-hashes.mjs`) | P1–P2 | M | ⬜ |
| `make prod-redeploy` + `docker image prune`; оживить мёртвую цель `init-proxy` (пинованные `server`/`watchtower` compose) | P2 | S–M | ⬜ |
| Тримминг `.dockerignore` (`docs`, `*.md`, `e2e`) — быстрее build-context | P2 | S | ⬜ |
| `RUN nginx -t` как шаг сборки в `Dockerfile` (пояс+подтяжки к CI-проверке) | P2 | S | ⬜ |
| **Vibecode Black Hole** — задокументировать как опцию | P2 | doc | 📝 |

### 2. Телеметрия

Серверный OTel-стек примера (`otel.instrument.mjs` → collector → ClickHouse →
Grafana в `telemetry-station/`) — **к SPA неприменим** (нечего инструментировать,
Node-рантайма нет). Браузерного RUM в примере нет вовсе. Свой bearer-токен
коллектора в браузерном бандле = утечка секрета. Значит переносим **принципы**, не код.

| Пункт | Приоритет | Сложн. | Статус |
|---|---|---|---|
| **Аналитика уже частично есть:** CF Web Analytics beacon подключён в `nuxt.config.ts` (gated на `NUXT_PUBLIC_CF_ANALYTICS_TOKEN`, cookieless). Довести — добавить токен в `.env.example`. **Согласовать со экосистемой:** сосед `currency-converter` на Яндекс.Метрике → два приложения на разных счётчиках без причины (открытый вопрос ниже) | **P0** | S | ⬜ |
| Записать в `CLAUDE.md` **принципы**: default-off env-gate · allowlist «форма/счётчики, не содержимое» (текст textarea **никогда** не покидает браузер) · хеш portal-id · класс ошибки, не текст · аналитика **OFF внутри iframe** (прецедент `currency-converter/public/metrika.js`) | **P1** | S | ⬜ |
| Продуктовые события (входной формат, copy/print, save-to-B24, insert-chat) — **только** при заведённом приёмнике (Plausible/Umami/свой воркер) | P2 | M | 📝 (решение) |
| Свой collector/ClickHouse/Grafana для статики | — | — | 🚫 skip (избыточно) |

### 3. Очереди

Полноценная очередь примера (BullMQ поверх Redis: `server/queue/{topology,connection,producers,worker,handlers}.ts`, идемпотентные `jobId`, ретраи с backoff, per-queue concurrency, роли инстансов) — **для bbcode не нужна**: нет backend, нет долгих задач, конвертация мгновенная в браузере.

| Пункт | Приоритет | Сложн. | Статус |
|---|---|---|---|
| Держать как есть: чистое ядро + DI + тесты (`app/utils/*` + тонкие композаблы), fail-closed `B24NotReadyError` — это уже наш стиль, пример подтверждает | P1 (сохранять) | — | ✅ |
| Мягкий retry/backoff на чистый сетевой обрыв в `useB24Rest` — **выгода маргинальна** (`@bitrix24/b24jssdk` уже ретраит `QUERY_LIMIT_EXCEEDED`/`429`/`5xx` через RestrictionManager). Сначала проверить, что SDK покрывает — возможно, не делать | P2 | S | ⬜ |
| Клиентский bulk-прогон REST (throttle + `B24Progress` + сводка ошибок, per-item изоляция) — **только если продукт закажет** массовую миграцию («сконвертировать все комментарии сущности») | P2 | M | 📝 (спекулятивно) |
| Полноценная серверная очередь (Redis/BullMQ/воркеры) | — | — | 🚫 skip (нет backend) |

### 4. Рейтинги и метрики

В примере меряется **не «качество в звёздах», а продуктовая польза**:
пер-портальные счётчики (`server/utils/metricsStore.ts`: docs/created/lines/
unmatched/errors/…) + производные метрики (`app/utils/savings.ts`,
`metricsView.ts`: minutesSaved/moneySaved/successRate) + дашборд `app/pages/metrics.vue`.
Всё держится на Postgres — у нас без backend воспроизводимо лишь частично.

| Пункт | Приоритет | Сложн. | Хранение без backend | Статус |
|---|---|---|---|---|
| **Рейтинг в Маркете Б24**: порт `AppRatingModal.vue` + `useAppRating.ts` (ненавязчивый попап «Оцените» → `frame.slider.openPath('/marketplace/detail/<code>/')`). Чистая политика `shouldPrompt` (`server/utils/appRatingPolicy.ts`) переносится **дословно** | **P1** | M | `b24.options`/`localStorage` вместо Postgres | ⛔ блокер: нужен листинг в Маркете |
| Метрики использования (конвертации по направлениям, insert-chat, save, print, copy) | P2 | S–M | Яндекс.Метрика-цели на standalone (паттерн `currency-converter/useMetrikaGoal.ts`); in-portal → внешний приёмник или личный счётчик в `b24.options` («вы конвертировали N раз») | ⬜ |
| Пер-портальный серверный дашборд метрик | — | — | 🚫 skip (некому персистить) |

### 5. Обратная связь

Механика примера: `POST /api/feedback` (фрейм-токен-аутентификация, `kind` up/down +
comment + context) → **GitHub issue** в **приватном** репо-бакете
`bx-shef/ai-price-import-feedback` (это просто «ведро для issue»: код-репо
публичный, а фидбэк может нести данные клиента → в приватный). Чистый билдер
`app/utils/feedback.ts` (`buildFeedbackIssue` с санитизацией Trojan-Source/bidi/
zero-width) — **server-agnostic, переносится как есть**. UI — `FeedbackWidget.vue`
(👍/👎), `useFeedback.ts`. Триаж issue — ИИ-агентом в бэклог.

| Пункт | Приоритет | Сложн. | Канал без backend | Статус |
|---|---|---|---|---|
| **Репорт «конвертация неверна»**: кнопка под превью ловит **точный сбойный ввод** (исходный BBCode/MD/HTML + направление) = идеальный репро (конвертер детерминирован). Переиспользуем `buildFeedbackIssue` + санитизацию | **P1** | S–M | *решение:* **Formspree** (S, без токенов) **или** свой воркер (Cloudflare/Vercel) → приватный репо-бакет `app-convert-bbocode-md-feedback` (M, GitHub-issue-native, ровно паттерн примера). Токен **нельзя** в SPA-бандл | ⬜ |
| Согласие-чекбокс «приложить исходную разметку» (контент пользователя — приватность) | P1 | S | — | ⬜ |
| B24 REST как канал фидбэка | — | — | 🚫 skip (пишет в портал клиента, не к нам; наш вебхук — секрет) |

### 6. Структура и процесс («другие фишки»)

| Пункт | Приоритет | Сложн. | Статус |
|---|---|---|---|
| **SessionStart-хук** (`.claude/hooks/session-start.sh` + `.claude/settings.json`): в веб-сессии Claude Code сразу `corepack enable` + `pnpm install --frozen-lockfile` + `nuxt prepare` → lint/typecheck/test/build работают с первого хода. Образец — `ai-price-import/.claude/hooks/session-start.sh`; в окружении есть навык `session-start-hook` | **P0** | S | ⬜ |
| Честная **легенда статусов** (эта, ✅/🧪/📝/⛔) в `docs/project-map.md` вместо `✅/🟨/⬜` — у нас реальный зазор «сделано vs проверено в портале» (REST Load/Save) | **P1** | S | ⬜ |
| Штамп **`> Last reviewed: YYYY-MM-DD`** под H1 во всех `docs/*.md` (сейчас только `README.md`) + тест-энфорсер по образцу `currency-converter/tests/mdReviewStamp.test.ts` | **P1** | S | ⬜ |
| Агрегат **`pnpm check`** (= lint+typecheck+test) в `package.json` + цели `make dev/check` (сейчас `Makefile` только прод-докер) | **P1** | S | ⬜ |
| Мини-методология тестов (L1 smoke / L2 happy / L3 со всех сторон) + **чек-лист портального QA** (install, Load/Save, IM_TEXTAREA) — образец `docs/redesign/07-testing.md`, `10-qa-checklist.md` | P2 | M | ⬜ |
| Норма «посмотри на пиксели» (DoD после UI-правки) в `CLAUDE.md` — образец `docs/redesign/VISUAL_VERIFICATION.md` | P2 | S | ⬜ |

### Сознательно НЕ переносим (серверное — в SPA не имеет смысла)

`server/` целиком (Nitro API/middleware/plugins), health/readiness-эндпоинты,
session-auth оператора, `envCheck`, `edgeSecurity` middleware, BullMQ/Redis/
Postgres, OAuth-токен-стор, OpenTelemetry + `telemetry-station/`, OCR-Dockerfile,
`proxy-tune`-«танец» с `deploy/vhost.d/*` (нужен под загрузки/OCR — у нас их нет),
механика `legacy/` (у нас нет легаси), `scripts/lib/alias-loader.mjs` (у нас `tsx`),
`scripts/screenshot.mjs` (покрыто нашим e2e).

---

## Дорожная карта (фазы)

**Фаза 0 — быстрые победы** (все S, ноль риска, каждый пункт — отдельный мелкий PR):
SessionStart-хук · `pnpm check` + `make dev/check` · SHA-пины Actions ·
`NUXT_PUBLIC_CF_ANALYTICS_TOKEN` в `.env.example` · легенда статусов в project-map ·
штампы `Last reviewed:` + тест-энфорсер · принципы аналитики в `CLAUDE.md`.
**+ флип CSP на enforce** (после портального QA).

**Фаза 1 — гигиена деплоя** (после решения по контуру — вопрос №0): гейт «деплой
только после зелёного CI» для **обоих** workflow · smoke-скрипт ·
`prod-rollback`/`prod-smoke` · CSP-хеши вместо `unsafe-inline`.

**Фаза 2 — продукт:** рейтинг в Маркете (нужен листинг) · репорт «неверная
конвертация» (нужно решение канала) · метрики использования.

**Фаза 3 — по запросу:** клиентский bulk-прогон REST · документ по Black Hole ·
мини-методология тестов + QA-чек-лист.

## Открытые решения (нужны от владельца)

0. **Прод-контур — Pages или Docker/nginx?** Какой деплой канонический для реальных
   пользователей: **GitHub Pages** (`deploy.yml`) или **Docker-образ + nginx** в GHCR
   (`deploy-docker.yml`)? От этого зависит вся секция «Деплой» — security-заголовки/CSP/
   `nginx -t`/smoke живут только на nginx-контуре; на Pages их нет.
1. **Канал обратной связи:** быстрый **Formspree** (S, без токенов) или **свой
   воркер + приватный репо-бакет** `app-convert-bbocode-md-feedback` (M, как
   `ai-price-import-feedback`, GitHub-issue-native, триаж агентом)?
2. **Листинг в Маркете Б24** для bbcode — планируется? Блокирует попап-рейтинг
   (у `currency-converter` уже есть слаг `shef.currencyconverter`).
3. **Продуктовые метрики** — заводим внешний приёмник, или пока Яндекс.Метрика
   только на standalone?
4. **Black Hole** — только задокументировать, или есть клиент, которому нужен
   хостинг внутри его облака Б24?
5. **Единый счётчик аналитики:** оставляем Cloudflare (уже в `nuxt.config.ts`) или
   переходим на Яндекс.Метрику ради единообразия с `currency-converter`?

## Источники (файлы примера `ai-price-import`)

- Деплой: `Makefile`, `docker-compose.{prod,server,watchtower}.yml`, `nginx.conf`,
  `.github/workflows/{ci,deploy}.yml`, `deploy/vibecode-deploy.sh`,
  `docs/DEPLOY_VIBECODE.md`, `scripts/proxy-healthcheck.sh`.
- Телеметрия: `otel.instrument.mjs`, `telemetry-station/`,
  `server/utils/telemetryAttributes.ts`, `docs/OBSERVABILITY.md`.
- Очереди: `server/queue/`, `server/agent/retry.ts`.
- Рейтинги/фидбэк: `server/utils/metricsStore.ts`, `app/utils/{savings,feedback}.ts`,
  `app/components/{FeedbackWidget,AppRatingModal}.vue`, `app/composables/{useFeedback,useAppRating}.ts`,
  `docs/FEEDBACK.md`, `docs/redesign/12-app-rating.md`, репо `bx-shef/ai-price-import-feedback`.
- Структура/процесс: `.claude/hooks/session-start.sh`, `docs/redesign/`, `Makefile`.
