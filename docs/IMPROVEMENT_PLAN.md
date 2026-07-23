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
| **SHA-пины** GitHub Actions (`uses: …@<sha> # v7.0.0`) вместо плавающих `@v7` во всех workflow. ⚠️ **Заблокировано в текущей среде**: внешние SHA не резолвятся (GitHub MCP — только scope `bx-shef`, `api.github.com` → 403 через прокси). Нужен сеанс с `gh`/неограниченным GitHub **или** SHA-pin через Dependabot. Часть SHA есть у соседей (`ai-price-import`/`currency-converter`), но Pages-экшены (`configure-pages`/`upload-pages-artifact`/`deploy-pages`) нигде не запинены и deploy-only (промах не ловится CI пиара) | **P1** | S | ⬜ |
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
| **Аналитика уже частично есть:** CF Web Analytics beacon подключён в `nuxt.config.ts` (gated на `NUXT_PUBLIC_CF_ANALYTICS_TOKEN`, cookieless). Довести — добавить токен в `.env.example`. **Согласовать с экосистемой:** сосед `currency-converter` на Яндекс.Метрике → два приложения на разных счётчиках без причины (открытый вопрос ниже) | **P0** | S | ✅ #97 |
| Записать в `CLAUDE.md` **принципы**: default-off env-gate · allowlist «форма/счётчики, не содержимое» (текст textarea **никогда** не покидает браузер) · хеш portal-id · класс ошибки, не текст · аналитика **OFF внутри iframe** (прецедент `currency-converter/public/metrika.js`) | **P1** | S | ✅ #97 |
| **Яндекс.Метрика на standalone** (решение владельца #3/#5): `app/utils/metrika.ts` (чистое ядро) + `app/composables/useMetrikaGoal.ts` + `public/metrika.js` (self-mute в iframe) + цели `copy`/`print`. Инжектится **только** на странице конвертера (`index.vue`), не app-wide → на портальных `/install`/`/widget` не грузится; в iframe глушит себя сам (принцип №4). Gated на `NUXT_PUBLIC_YANDEX_COUNTER_ID` (пусто = off). CSP `mc.yandex.ru` разрешён. Env проброшен по всему деплой-пайплайну (`Dockerfile` `ARG`/`ENV` + `tools/deploy.ts` `--build-arg` + оба workflow `deploy.yml`/`deploy-docker.yml`), поэтому владельцу достаточно задать `vars.NUXT_PUBLIC_YANDEX_COUNTER_ID` и пересобрать. `<noscript>`-пиксель намеренно НЕ ставим (он бы стрелял в iframe при выключенном JS в обход self-mute). **Это и есть iframe-safe аналитика** — снимает нужду в CF-guard ниже | **P0** | S | 🧪 код+тесты+пайплайн, ждём боевой счётчик |
| **Runtime iframe-guard аналитики** (client-plugin: не инжектить CF-beacon при `window.self !== window.top`) — принцип №4 в коде. CF-beacon сторонний, сам себя не глушит → гейт на инъекции. **Нужен ДО включения токена.** ⚠️ Приоритет снят: Яндекс.Метрика (выше) уже iframe-safe → CF-beacon включать не нужно; чинить его гард только если владелец захочет именно CF | P3 | S | 🚫 (не требуется, есть Метрика) |
| Продуктовые события (входной формат, copy/print, save-to-B24, insert-chat) — **только** при заведённом приёмнике (Plausible/Umami/свой воркер) | P2 | M | 🧪 `copy`/`print` сделаны (Метрика, standalone); `save`/`insert-chat` — в портале муты, снимем через `b24.options`-счётчик |
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
| **Рейтинг в Маркете Б24**: `AppRatingModal.vue` + `useAppRating.ts` (ненавязчивый попап «Оцените» → `slider.openPath(slider.getUrl('/marketplace/detail/<slug>/'))`). Чистая политика `shouldPromptRating` | **P1** | M | `localStorage` вместо Postgres | 🧪 код+тесты (14): чистая политика + переходы + `parseRatingState`; попап portal-only, gated `NUXT_PUBLIC_MARKETPLACE_SLUG`, троттлинг (min uses/snooze cooldown/give-up). Проброшен по пайплайну. Ждём слаг листинга от владельца |
| Метрики использования (конвертации по направлениям, insert-chat, save, print, copy) | P2 | S–M | Яндекс.Метрика-цели на standalone (паттерн `currency-converter/useMetrikaGoal.ts`); in-portal → внешний приёмник или личный счётчик в `b24.options` («вы конвертировали N раз») | 🧪 плумбинг + цели `copy`/`print` на standalone; ждём боевой счётчик. **В портале аналитика заглушена намеренно** (принцип №4) → цели `save`/`insert-chat`/`load` там не срабатывают (муты) и на standalone упираются в демо/REST — их снимаем позже через `b24.options`-счётчик, не через Метрику |
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
| **Репорт «конвертация неверна»**: кнопка под превью ловит **точный сбойный ввод** (исходный BBCode/MD/HTML) = идеальный репро (конвертер детерминирован). `buildFeedbackIssue` + санитизация | **P1** | S–M | Свой воркер → приватный репо-бакет `app-convert-bbocode-md-feedback`. Токен **в воркере**, не в SPA-бандле | 🧪 код+тесты (26: ядро+`useFeedback`) + одиночная `B24Modal` (`v-model:open`) из тулбара превью + gated `NUXT_PUBLIC_FEEDBACK_URL` (проброшен по пайплайну). Прошло ревью 5 ролей (усилена санитизация: anti-smuggling диапазоны, комментарий во fenced-блоке, `sanitizeLine`, таймаут fetch). Ждём боевой воркер+бакет от владельца. Фаст-фоллоу: e2e-сценарий модалки; лимит тела issue (сейчас `MAX_ATTACH_LEN` на поле, не на весь body); CORS+CSP-`connect-src` для origin воркера — при активации |
| Согласие-чекбокс «приложить исходную разметку» (контент пользователя — приватность) | P1 | S | — | ✅ opt-in по умолчанию OFF; `includeSource` в `buildFeedbackIssue`; текст покидает браузер только по галочке |
| B24 REST как канал фидбэка | — | — | 🚫 skip (пишет в портал клиента, не к нам; наш вебхук — секрет) |

### 6. Структура и процесс («другие фишки»)

| Пункт | Приоритет | Сложн. | Статус |
|---|---|---|---|
| **SessionStart-хук** (`.claude/hooks/session-start.sh` + `.claude/settings.json`): в веб-сессии Claude Code сразу `corepack enable` + `pnpm install --frozen-lockfile` + `nuxt prepare` → lint/typecheck/test/build работают с первого хода. Образец — `ai-price-import/.claude/hooks/session-start.sh`; в окружении есть навык `session-start-hook` | **P0** | S | ✅ #95 |
| Честная **легенда статусов** (эта, ✅/🧪/📝/⛔) в `docs/project-map.md` вместо `✅/🟨/⬜` — у нас реальный зазор «сделано vs проверено в портале» (REST Load/Save) | **P1** | S | ✅ #96 |
| Штамп **`> Last reviewed: YYYY-MM-DD`** под H1 во всех `docs/*.md` (сейчас только `README.md`) + тест-энфорсер по образцу `currency-converter/tests/mdReviewStamp.test.ts` | **P1** | S | ✅ #98 |
| Агрегат **`pnpm check`** (= lint+typecheck+test) в `package.json` + цели `make dev/check` (сейчас `Makefile` только прод-докер; сделано в #95) | **P1** | S | ✅ #95 |
| Мини-методология тестов (L1 smoke / L2 happy / L3 со всех сторон) + **чек-лист портального QA** (install, Load/Save, IM_TEXTAREA) — образец `docs/redesign/07-testing.md`, `10-qa-checklist.md` | P2 | M | ✅ #99 (`docs/TESTING.md`) |
| Норма «посмотри на пиксели» (DoD после UI-правки) в `CLAUDE.md` — образец `docs/redesign/VISUAL_VERIFICATION.md` | P2 | S | ✅ #99 |

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

### Ещё открыто

0. **Прод-контур — Pages или Docker/nginx?** Какой деплой канонический для реальных
   пользователей: **GitHub Pages** (`deploy.yml`) или **Docker-образ + nginx** в GHCR
   (`deploy-docker.yml`)? От этого зависит вся секция «Деплой» — security-заголовки/CSP/
   `nginx -t`/smoke живут только на nginx-контуре; на Pages их нет.

### Решено владельцем (2026-07-22)

1. **Канал обратной связи** → ✅ **свой воркер + приватный репо-бакет**
   `app-convert-bbocode-md-feedback` (как `ai-price-import-feedback`,
   GitHub-issue-native, триаж агентом). Не Formspree. **Код-часть готова** (ядро +
   `useFeedback` + UI-модалка, gated `NUXT_PUBLIC_FEEDBACK_URL`, проброшен по
   пайплайну). *Со стороны владельца:* создать приватный репо-бакет + задеплоить
   воркер с токеном (токен **в воркере**, не в SPA-бандл) + дать его URL.
2. **Листинг в Маркете Б24** → ✅ **будем публиковать** — разблокирует попап-рейтинг.
   **Код-часть рейтинга готова** (политика + модалка, gated `NUXT_PUBLIC_MARKETPLACE_SLUG`).
   *Со стороны владельца:* опубликовать листинг и дать слаг (как `shef.currencyconverter`).
3. **Продуктовые метрики** → ✅ **«заводи, предлагай сам»** → выбрана **Яндекс.Метрика
   на standalone** (реализовано этим PR: плумбинг + цели `copy`/`print`). В портале —
   аналитика заглушена намеренно; портальные счётчики позже через `b24.options`.
   *Со стороны владельца:* задать `vars.NUXT_PUBLIC_YANDEX_COUNTER_ID` в GitHub
   Actions и пересобрать (проброс env по деплой-пайплайну уже сделан) — код готов.
4. **Black Hole** → ✅ **будем делать** (по образцу примера). Пока — документируем как
   опцию; активируем под конкретного клиента. *Со стороны владельца:* доступ/ключ Vibecode.
5. **Единый счётчик аналитики** → ✅ **Яндекс.Метрика** (единообразие с
   `currency-converter`; в отличие от CF Web Analytics поддерживает цели и имеет
   iframe-self-mute). CF-beacon остаётся в коде выключенным (пустой токен), включать не нужно.

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
