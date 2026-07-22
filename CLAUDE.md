# CLAUDE.md

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
- pnpm 10

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
- `app/layouts/clear.vue` — barebones full-height panel (used by index + install).
- `app/layouts/widget.vue` — barebones wrapper for the placement widget.

## Conventions
- **Tests are required** for any change to the converter utils (`app/utils/{bbcode-parser,bbcode-to-md,md-to-bbcode,md-to-html,html-to-md,sanitize-html,convert}.ts`). Run `pnpm test` before commit. Tests live in `tests/`:
  - `bbcode-to-md.test.ts`, `md-to-bbcode.test.ts`, `md-to-html.test.ts`, `html-to-md.test.ts`, `sanitize-html.test.ts`, `convert.test.ts`, `roundtrip.test.ts`, `md-to-print-html.test.ts`, `table.test.ts`.
- **i18n** — when adding a new UI string, add the key to `i18n/locales/en.json` and `i18n/locales/ru.json`. Other 17 locales fall back to `en` (defaultLocale). User runs `pnpm translate-ui` later for full translation.
- **B24 UI components only**: `B24Textarea`, `B24DashboardPanel`, `B24Button`, `B24DashboardNavbar`, `B24Progress`, etc. Auto-imported via `@bitrix24/b24ui-nuxt`.
- **No server code.** `server/` folder was intentionally removed. No SSR API endpoints. App is pure SPA (runtime fetches go through `useB24` → Bitrix24 REST).
- **Analytics/telemetry** — client-side only, opt-in via env-gate (`NUXT_PUBLIC_CF_ANALYTICS_TOKEN`, empty = off). No server-side OTel (pure SPA). Principles (mirroring `ai-price-import`, see `docs/IMPROVEMENT_PLAN.md` § Телеметрия): (1) collect **shape/counters only, never content** — the user's textarea text must never leave the browser **via analytics/telemetry** (explicit REST save / insert-to-chat are separate, user-initiated); (2) if an event is ever tagged by portal, **hash (salted)** `member_id`/domain, never raw; (3) errors = **class, not message text**; (4) analytics must be kept **OFF inside the B24 iframe** — forward-principle, **not yet wired** (the CF beacon is third-party and injected unconditionally; needs a client-side inject-guard before enabling the token). Precedent: `currency-converter/public/metrika.js`.
- BBCode tag set is **closed** — see `KNOWN_TAGS` in `app/utils/bbcode-parser.ts`. Unknown tags pass through as text. To support a new tag (e.g. `[USER=id]`), add it to `KNOWN_TAGS` and handle it in both `bbcode-to-md.ts` and `md-to-bbcode.ts`.

## What NOT to touch without need
- `app/pages/install.vue` — Bitrix24 placement contract.
- `app/composables/useB24.ts` — init flow + frame detection via `window.name`.
- `i18n/i18n.ts` — locales registry.
- `nuxt.config.ts` — `vite.server.allowedHosts` reads `NUXT_ALLOWED_HOSTS` for ngrok.

## Out of scope (current state)
- REST load/save **done** for task / CRM comment / Feed post (`useB24Rest` + the index toolbar bar; scopes `task`, `crm`, `log`). Live behaviour needs hands-on portal QA.
- Entity mentions `[USER=id]`/`[DEPARTMENT=id]` are **done** (round-trip via `<span data-bb-*>` carrier; preview renders a chip; name comes from the tag — no REST resolve). `[DISK File=id]` still passes through as literal text (special format). Styling tags `[color]`/`[size]`/`[font]` are **done** (via `<span style>` carrier).
- Server-side handlers (`server/` deliberately absent).

## Conversion mapping
See `README.md` § Конвертация for the full table. Key rules:
- `[u]` ↔ `<u>` (Markdown has no native underline; HTML fallback).
- `[color]`/`[size]`/`[font]` ↔ `<span style="color:… | font-size:…px | font-family:…">` (MD carries the span; `md-to-bbcode` parses the style back, `sanitize-html` allow-lists a few safe CSS props).
- `[USER=id]`/`[DEPARTMENT=id]` ↔ `<span data-bb-user|data-bb-dept="id">Name</span>` (round-trip carrier; preview renders a chip via `.preview-html [data-bb-*]`).
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

## Операционная дисциплина и отчётность (reporting-kit)

Набор перенесён из базы знаний `bx-shef/ai-agent` (`reporting-kit`). Полное
описание — [`docs/reports/README.md`](docs/reports/README.md) и
[`docs/project-map.md`](docs/project-map.md).

### Отчёты в Telegram
- Навыки/команды готовят текст отчёта: `/report-status` (срез по `docs/project-map.md`),
  `/report-digest` (дайджест по репозиториям за период), `/report-questions` (вопросник заказчику).
- Отправляет **только** `scripts/tg-send.sh` и **только по явной команде «шли»** — не раньше.
  Без `TG_BOT_TOKEN`/`TG_CHAT_ID` скрипт намеренно отказывает. Секреты — в `.env` (в git не коммитим).
- Промпты в `docs/reports/` — **канон**; тела `.claude/skills/*/SKILL.md` — их зеркало.
  При правке промпта синхронно обновляй `SKILL.md` (и наоборот). Идентичность проверяет
  `scripts/check-skills.sh` и CI (`docs-links.yml`). Перед коммитом доков:
  `bash scripts/check-tg.sh && bash scripts/check-skills.sh && bash scripts/check-docs.sh`.

### Ветки, PR, merge
- В `main` напрямую не пушим. Работа — в ветке, изменения через Pull Request (описание на русском: что/зачем/на что влияет).
- В один PR — одна логическая задача. **Мержит владелец сам** (автомерж/force-merge не используем); PR не мержится без явного сигнала владельца.
- После смерженного PR синхронно обновляем `docs/` — документация не отстаёт от состояния.

### Review — 5 проверяющих
Перед правками привлекаем `/review` + параллельно 5 ролей (модель Sonnet; предупреждаем, что проект большой — не падать по таймауту):
1. **Документация / Skill** — оценка доков и файлов навыков.
2. **Программист** — адекватность решений, JSDoc, типизация TS и пр.
3. **Тестировщик** — покрытие тестами и сами тесты.
4. **Безопасность** — отдел ИБ.
5. **Тех-директор** — общая инженерная оценка.

Отчёт о проверке — на русском, кратко: кто · что · почему · как исправить. Правки вносим в этом же PR; вынос в отдельный issue/PR — только по согласованию.

### Связанные репозитории
| Репо | Роль |
|---|---|
| `bx-shef/app-convert-bbocode-md` | это приложение (конвертер BBCode ↔ MD ↔ HTML) |
| `bx-shef/ai-agent` | база знаний и `reporting-kit` (источник этого набора) |
| `bx-shef/currency-converter` | соседнее приложение (единый бренд-стиль) |

### Bitrix24 через хук
Для setup/проверки портала используем входящий вебхук `B24_HOOK___SUFFIX` (свой суффикс под портал).
Хук с максимальными правами — секрет: храним в окружении/секретах, не в git/логах; для рантайма — отдельный хук с минимальными правами.
