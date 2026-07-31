# CLAUDE.md

> Last reviewed: 2026-07-31

Nuxt 4 SPA placement for Bitrix24 that converts Bitrix24 BBCode ↔ Markdown.

## Stack
- Nuxt 4 (SPA inside Bitrix24 iframe), Vue 3
- `@bitrix24/b24ui-nuxt` (UI components — use these, do NOT bring other UI libs)
- `@bitrix24/b24jssdk-nuxt` + `@bitrix24/b24jssdk` (JS SDK; init + REST via `actions.v2` — see `useB24Rest`)
- Custom BBCode parser at `app/utils/bbcode-parser.ts` (no external lib — full control over `[*]` and code-literal)
- `markdown-it` for Markdown tokens / rendering (built-in strikethrough is enabled by default in v14)
- `htmlparser2` for HTML → MD parsing and the allow-list HTML sanitizer (node-native, no DOM)
- **Three formats, Markdown is the pivot.** BBCode ↔ MD ↔ HTML; every conversion goes through MD (see `app/utils/convert.ts`)
- `@nuxtjs/i18n` (19 locales)
- vitest for tests
- Tailwind v4 (set up by b24ui-nuxt)
- pnpm 10. **`pnpm.overrides` in `package.json`** is the sanctioned way to pin patched versions of **transitive** deps flagged by Dependabot security alerts, until upstream parents catch up (a temporary security-floor — remove the pin once the parent bump lands). Scope by major (`"pkg@2": "^2.1.2"`) when two majors of the same package coexist in the tree — a blanket override would force one API onto both and break resolution. Keep the current version/trigger detail in `docs/project-map.md`, not here.

## Architecture
- `app/pages/index.vue` — three-format editor (Markdown / BBCode / HTML) + live preview; 2×2 panes on desktop (md+), tabs on mobile. Theme toggle + credits footer only standalone.
- `app/components/ConverterPane.vue` — pane shell (label row + action-button slot + content slot).
- `app/pages/install.vue` — Bitrix24 placement install flow. Mock-mode when not in B24 frame. **Do not break** — needed for future deployment.
- `app/utils/bbcode-parser.ts` — pure recursive-descent parser → `BBNode[]` AST.
- `app/utils/bbcode-to-md.ts` — pure fn AST → Markdown string.
- `app/utils/md-to-bbcode.ts` — pure fn `markdown-it` tokens → BBCode string (also maps pasted raw HTML so it doesn't leak).
- `app/utils/md-to-html.ts` — pure fn MD → HTML fragment (`markdown-it`); shared by HTML pane, preview and print.
- `app/utils/html-to-md.ts` — pure fn HTML → MD (`htmlparser2`); forgiving, mirrors `bbcode-to-md` conventions.
- `app/utils/sanitize-html.ts` — allow-list HTML sanitizer; run before any HTML reaches the DOM (preview/print).
- `app/utils/convert.ts` — facade: `toMarkdown` / `fromMarkdown` / `convert(from,to)` over the MD pivot.
- `app/composables/useConverter.ts` — reactive three-way sync (bb/md/html) over the MD pivot; `preview` = sanitized rendered HTML; `lastEdited` ('bb' | 'md' | 'html' | null) guard prevents watch loops; `useDebounceFn` 150ms.
- `app/composables/useB24.ts` — JSSdk init wrapper (called from `app.vue` and `install.vue`). Module-level `$b24` singleton.
- `app/composables/useB24Rest.ts` — REST wrappers (`actions.v2.call.make`): `loadMarkdown`/`saveMarkdown(kind, id)` for task / CRM comment / Feed post.
- `app/utils/b24-entity.ts` — pure entity mapping (task `DESCRIPTION` ±BBCode flag, CRM `COMMENT`, Feed `DETAIL_TEXT`/`POST_MESSAGE`) ↔ MD; tolerant to field casing/envelope shape.
- `app/pages/widget/im-textarea.vue` — `IM_TEXTAREA` placement widget: load chat text → MD, edit, send MD→BBCode back to the chat input.
- `app/composables/usePrint.ts` + `app/utils/md-to-print-html.ts` — render Markdown to a print-ready HTML document (hidden iframe → `window.print()`).
- `app/utils/metrika.ts` (pure `reachMetrikaGoal` core) + `app/composables/useMetrikaGoal.ts` (thin Vue wrapper) + `public/metrika.js` (static loader, iframe self-mute). Yandex.Metrika, **standalone-only**: injected by `index.vue` (not app-wide) when `NUXT_PUBLIC_YANDEX_COUNTER_ID` is set; goals `copy`/`print`. See Analytics convention below.
- `app/utils/feedback.ts` (pure `buildFeedbackIssue` + `sanitizeReportText` + `isFeedbackEnabled`) + `app/composables/useFeedback.ts` (POSTs to worker, `AbortSignal.timeout`) + `app/components/FeedbackReport.vue` (single `B24Modal`, `v-model:open`, opened from the Preview pane toolbar in either layout).
- `app/utils/app-rating.ts` (pure `shouldPromptRating` policy + state transitions + `parseRatingState`) + `app/composables/useAppRating.ts` (module-level singleton state, localStorage, opens the Marketplace slider) + `app/components/AppRatingModal.vue`. "Rate this app" prompt: **portal-only**, gated on `NUXT_PUBLIC_MARKETPLACE_SLUG` (empty/invalid = off); **in-portal** uses counted on copy/save, shown once the frame is ready (`watch(isUseB24)`, not bare `onMounted`) when the engagement policy allows. Opens `$b24.slider.openPath($b24.slider.getUrl('/marketplace/detail/<slug>/'))`. See Rating convention below. "Report a bad conversion": builds a GitHub-issue payload, sends it to an external worker (`NUXT_PUBLIC_FEEDBACK_URL`, empty = hidden) that opens the issue in a PRIVATE bucket repo — **the token lives in the worker, never in this SPA bundle**. Source markup attached only on explicit consent; content sanitised (Trojan-Source/bidi/zero-width). See Feedback convention below.
- `app/layouts/clear.vue` — barebones full-height panel (used by index + install).
- `app/layouts/widget.vue` — barebones wrapper for the placement widget.

## Conventions
- **Tests are required** for any change to the converter utils (`app/utils/{bbcode-parser,bbcode-to-md,md-to-bbcode,md-to-html,html-to-md,sanitize-html,convert,md-to-print-html}.ts`). Run `pnpm test` before commit. Tests live in `tests/`:
  - `bbcode-to-md.test.ts`, `md-to-bbcode.test.ts`, `md-to-html.test.ts`, `html-to-md.test.ts`, `sanitize-html.test.ts`, `convert.test.ts`, `roundtrip.test.ts`, `md-to-print-html.test.ts`, `table.test.ts`.
- **i18n** — when adding a new UI string, add the key to `i18n/locales/en.json` and `i18n/locales/ru.json`. The other 17 locales fall back to `en`: `i18n/i18n.config.ts` sets `fallbackLocale: 'en'` (wired via `vueI18n: './i18n.config.ts'` in `nuxt.config.ts`), so a key missing from the active locale renders the English text — not the raw key path. Those 17 locales ship empty (`{}`) today: they show English until translated (`pnpm translate-ui`) — an untranslated UI, not a broken one. (Before the config existed, `fallbackLocale` defaulted to `false` and missing keys rendered as `page.index.ui.title`; that was fixed in #128.)
- **B24 UI components only**: `B24Textarea`, `B24DashboardPanel`, `B24Button`, `B24DashboardNavbar`, `B24Progress`, etc. Auto-imported via `@bitrix24/b24ui-nuxt`.
- **No server code.** `server/` folder was intentionally removed. No SSR API endpoints. App is pure SPA (runtime fetches go through `useB24` → Bitrix24 REST).
- **Analytics/telemetry** — client-side only, opt-in via env-gate, empty = off. No server-side OTel (pure SPA). **Wired analytics = Yandex.Metrika** (`NUXT_PUBLIC_YANDEX_COUNTER_ID`), the iframe-safe option: injected only on the standalone converter page and self-muting inside the portal iframe (see the metrika files above). A dormant Cloudflare beacon (`NUXT_PUBLIC_CF_ANALYTICS_TOKEN`) also exists in `nuxt.config.ts` but is **unguarded** (injects unconditionally) — leave it off; prefer Metrika. Enable at most one. Principles (mirroring `ai-price-import`): (1) collect **shape/counters only, never content** — the user's textarea text must never leave the browser **via analytics/telemetry** (explicit REST save / insert-to-chat are separate, user-initiated); (2) if an event is ever tagged by portal, **hash (salted)** `member_id`/domain, never raw; (3) errors = **class, not message text**; (4) analytics must be kept **OFF inside the B24 iframe** — **realized** for Metrika via `public/metrika.js`'s `window.self !== window.top` self-mute (goals therefore fire only on the standalone `/`; portal users are never tracked). Precedent: `currency-converter/public/metrika.js`.
- **Feedback** — the "report a bad conversion" flow is **opt-in and privacy-first**: gated on `NUXT_PUBLIC_FEEDBACK_URL` (empty = button hidden); the user's source markup is attached **only on an explicit consent tick** (default off); all embedded text is sanitised (`sanitizeReportText` — Trojan-Source/bidi/zero-width/control codes) before it reaches an issue a human/agent reads; free-text never goes in the issue title. The SPA only knows a **public worker URL** — the GitHub token that opens the issue lives in that external worker (private bucket repo `app-convert-bbocode-md-feedback`), **never in the bundle**. Pure builder is `app/utils/feedback.ts` (channel-agnostic, tested); keep it server-agnostic.
- **Rating** — the Marketplace "rate this app" prompt is **portal-only, opt-in by config, and unobtrusive**: gated on `NUXT_PUBLIC_MARKETPLACE_SLUG` (empty = never shown); only fires inside the B24 frame; heavily throttled by the pure `shouldPromptRating` policy (min uses, snooze cooldown, give-up after N snoozes, never after rated/dismissed). State lives in `localStorage` (no REST). Keep the policy pure/tested in `app/utils/app-rating.ts`; the composable is a thin singleton.
- BBCode tag set is **closed** — see `KNOWN_TAGS` in `app/utils/bbcode-parser.ts`. Unknown tags pass through as text. To support a new tag (e.g. `[USER=id]`), add it to `KNOWN_TAGS` and handle it in both `bbcode-to-md.ts` and `md-to-bbcode.ts`.
- **Review stamp** — every tracked `.md` in the repo root and `docs/` carries `> Last reviewed: YYYY-MM-DD` (ISO date) as a blockquote under its H1; bump it on substantive review. Enforced by `tests/mdReviewStamp.test.ts`; the reporting-kit bundle (`docs/reports/`, `.claude/`) and `tests/` fixtures are exempt.

## What NOT to touch without need
- `app/pages/install.vue` — Bitrix24 placement contract.
- `app/composables/useB24.ts` — init flow + frame detection via `window.name`.
- `i18n/i18n.ts` — locales registry.
- `nuxt.config.ts` — `vite.server.allowedHosts` reads `NUXT_ALLOWED_HOSTS` for ngrok.

## Out of scope (current state)
- REST load/save **done** for task / CRM comment / Feed post (`useB24Rest` + the index toolbar bar; scopes `task`, `crm`, `log`). Live behaviour needs hands-on portal QA.
- Entity mentions `[USER=id]`/`[DEPARTMENT=id]` are **done** (round-trip via `<span data-bb-*>` carrier; preview renders a chip; name comes from the tag — no REST resolve). Interactive IM-bot tags `[SEND]`/`[PUT]`/`[CALL]` are **done** (same carrier; official Bitrix24 chat format — issue #88). `[DISK File=id]` still passes through as literal text (special format). Styling tags `[color]`/`[size]`/`[font]` are **done** (via `<span style>` carrier).
- Server-side handlers (`server/` deliberately absent).

## Conversion mapping
See `README.md` § «Таблица соответствия форматов» for the full table. Key rules:
- `[u]` ↔ `<u>` (Markdown has no native underline; HTML fallback).
- `[color]`/`[size]`/`[font]` ↔ `<span style="color:… | font-size:…px | font-family:…">` (MD carries the span; `md-to-bbcode` parses the style back, `sanitize-html` allow-lists a few safe CSS props).
- `[USER=id]`/`[DEPARTMENT=id]` ↔ `<span data-bb-user|data-bb-dept="id">Name</span>` (round-trip carrier; preview renders a chip via `.preview-html [data-bb-*]`).
- `[SEND=v]`/`[PUT=v]`/`[CALL=num]` (interactive IM-bot tags — official Bitrix24 chat format) ↔ `<span data-bb-send|put|call="v">text</span>` (same carrier; values may contain spaces → quoted in BBCode; preview renders a bordered button-chip). The official bot-message tag set is a **subset** — our `KNOWN_TAGS` is a superset that also serves task/CRM/Feed formatting; `chatMode` adapts (tables→lists).
- `[code]` content is **literal** — no nested parsing.
- `[*]` is self-closing; content of an item runs until next `[*]` or `[/list]`.
- Autolink `<https://x>` ↔ `[url]https://x[/url]`; named link `[X](url)` ↔ `[url=url]X[/url]`.
- Markdown `paragraph_close` emits `\n\n`; trailing `\n+` before block-close BBCode tags is stripped via post-process regex.

## Commands
```
pnpm dev          # http://localhost:3000
pnpm test         # run vitest once (unit; tests/**/*.test.ts only)
pnpm test:watch   # watch mode
pnpm test:e2e     # Playwright visual/e2e (e2e/*.spec.ts) — run `pnpm build` first
pnpm typecheck
pnpm lint
pnpm check        # lint + typecheck + test — full gate before push (also `make check`)
pnpm build
```

**Web sessions**: `.claude/hooks/session-start.sh` (via `.claude/settings.json`) installs deps + runs `nuxt prepare` on start, so the commands above work from the first turn. No-op in local sessions.

**Visual/e2e**: `e2e/` holds Playwright specs run against the built server. Assertions are functional + a dark-mode contrast guard (no flaky pixel baselines); screenshots land in `e2e/output/` (gitignored) and upload as CI artifacts. Runs in CI after `build`.

**DoD for UI changes**: after any UI change, run the e2e and **look at** `e2e/output/` before calling it done — don't trust "built without errors". When building interfaces, cross-check the Bitrix24 UI docs: https://bitrix24.github.io/b24ui/. Portal QA checklist + local check commands: `docs/project-map.md` § «Проверка в портале» / § «Как проверить сборку у себя».

## Процесс разработки

How the work is run (this is the dev-side process; the owner-facing docs are listed below).

**Ветки и PR**
- В `main` **не пушим напрямую.** Любая работа — в отдельной ветке, вливается через Pull Request с описанием на русском: что / зачем / на что влияет.
- **Один PR — одна задача.** Не смешиваем несвязанные изменения.
- **Мержит владелец** по явному сигналу. Автомерж/force-merge не используем.
- **Не трогаем без сигнала владельца:** триггеры деплоя (`on:` в workflow), прод-образ, **канонический контур деплоя** (решение владельца от 2026-07-24: Docker/nginx — основной, GitHub Pages — только витрина), выдачу секретов.
- **Защита ветки `main` — техническая, а не договорная.** Зелёный CI сам по себе merge не блокирует: это делает branch protection в GitHub Settings. Чек-лист обязательных галочек — в [`docs/PROCESS.md`](docs/PROCESS.md), шаг 0.
- После мержа — синхронно обновляем `docs/` (в первую очередь [`docs/project-map.md`](docs/project-map.md)).

**Ревью — 5 ролей.** Перед мержем содержательных изменений: (1) документация и навыки, (2) программист (решения, типы, корректность), (3) тестировщик (покрытие и сами тесты), (4) безопасность (уязвимости, санитайзер, CSP, секреты), (5) тех-директор (скоуп, инженерная оценка, вердикт). Отчёт на русском по формату **кто · что · почему · как исправить** с важностью (blocker/major/minor/nit). Замечания устраняем **в этом же PR**.

**Пропорциональность.** Полный проход 5 ролей — на содержательные/рисковые изменения (код, поведение конвертера, деплой-пайплайн, security). Для рутинных бампов зависимостей, которые CI-гейт проверяет целиком, достаточно тщательного само-ревью + зелёного CI.

**Перед коммитом**
- `pnpm check` (lint + typecheck + test) — обязательно; для UI-правок ещё `pnpm build && pnpm test:e2e`.
- Правки доков: `bash scripts/check-docs.sh && bash scripts/check-skills.sh && bash scripts/check-tg.sh`.
- Штамп `> Last reviewed: YYYY-MM-DD` бампим только при содержательном изменении дока.

**Отчётность (reporting-kit).** Вендорный бандл в `docs/reports/` (зеркалит `.claude/skills/*`) — держим **как есть**, он исключён из наших проверок. Отправляет только `scripts/tg-send.sh` и **только по явной команде «шли»**; без `TG_BOT_TOKEN`/`TG_CHAT_ID` намеренно отказывает.

**Bitrix24 через хук.** Для setup/проверки портала — входящий вебхук `B24_HOOK___SUFFIX`. Хук с максимальными правами — **секрет**: в окружении, не в git/логах; **для рантайма/регулярных проверок заводим отдельный хук с минимальными правами** (утечка ограниченного хука стоит кратно дешевле).

**Связанные репозитории:** `bx-shef/ai-agent` (база знаний + reporting-kit), `bx-shef/currency-converter` (соседнее приложение, единый стиль).

## Документация для владельца

Технический гайд выше — про **устройство кода**. Всё остальное — три файла:

- [`docs/PROCESS.md`](docs/PROCESS.md) — процесс от настроек до данных в Bitrix24 (настройка → деплой → установка → работа с порталом).
- [`docs/project-map.md`](docs/project-map.md) — карта частей проекта с метками готово / не проверено / отложено / заблокировано.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — планы на будущее.

[`README.md`](README.md) — короткая витрина репозитория со ссылками на эти три файла.
