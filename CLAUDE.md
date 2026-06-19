# CLAUDE.md

Nuxt 4 SPA placement for Bitrix24 that converts Bitrix24 BBCode ↔ Markdown.

## Stack
- Nuxt 4 (SPA inside Bitrix24 iframe), Vue 3
- `@bitrix24/b24ui-nuxt` (UI components — use these, do NOT bring other UI libs)
- `@bitrix24/b24jssdk-nuxt` + `@bitrix24/b24jssdk` (JS SDK; init only — REST calls are next phase)
- Custom BBCode parser at `app/utils/bbcode-parser.ts` (no external lib — full control over `[*]` and code-literal)
- `markdown-it` for Markdown tokens / rendering (built-in strikethrough is enabled by default in v14)
- `htmlparser2` for HTML → MD parsing and the allow-list HTML sanitizer (node-native, no DOM)
- **Three formats, Markdown is the pivot.** BBCode ↔ MD ↔ HTML; every conversion goes through MD (see `app/utils/convert.ts`)
- `@nuxtjs/i18n` (19 locales)
- vitest for tests
- Tailwind v4 (set up by b24ui-nuxt)
- pnpm 10

## Architecture
- `app/pages/index.vue` — two-pane editor (BBCode ⇄ Markdown).
- `app/pages/install.vue` — Bitrix24 placement install flow. Mock-mode when not in B24 frame. **Do not break** — needed for future deployment.
- `app/utils/bbcode-parser.ts` — pure recursive-descent parser → `BBNode[]` AST.
- `app/utils/bbcode-to-md.ts` — pure fn AST → Markdown string.
- `app/utils/md-to-bbcode.ts` — pure fn `markdown-it` tokens → BBCode string (also maps pasted raw HTML so it doesn't leak).
- `app/utils/md-to-html.ts` — pure fn MD → HTML fragment (`markdown-it`); shared by HTML pane, preview and print.
- `app/utils/html-to-md.ts` — pure fn HTML → MD (`htmlparser2`); forgiving, mirrors `bbcode-to-md` conventions.
- `app/utils/sanitize-html.ts` — allow-list HTML sanitizer; run before any HTML reaches the DOM (preview/print).
- `app/utils/convert.ts` — facade: `toMarkdown` / `fromMarkdown` / `convert(from,to)` over the MD pivot.
- `app/composables/useConverter.ts` — reactive bidirectional sync; uses `lastEdited` ('bb' | 'md' | null) guard to prevent infinite watch loops; `useDebounceFn` 150ms.
- `app/composables/useB24.ts` — JSSdk init wrapper (called from `app.vue` and `install.vue`). Module-level `$b24` singleton.
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
- BBCode tag set is **closed** — see `KNOWN_TAGS` in `app/utils/bbcode-parser.ts`. Unknown tags pass through as text. To support a new tag (e.g. `[USER=id]`), add it to `KNOWN_TAGS` and handle it in both `bbcode-to-md.ts` and `md-to-bbcode.ts`.

## What NOT to touch without need
- `app/pages/install.vue` — Bitrix24 placement contract.
- `app/composables/useB24.ts` — init flow + frame detection via `window.name`.
- `i18n/i18n.ts` — locales registry.
- `nuxt.config.ts` — `vite.server.allowedHosts` reads `NUXT_ALLOWED_HOSTS` for ngrok.

## Out of scope (current state)
- REST calls to Bitrix24 (next phase: load/save text from tasks, comments, posts via `useB24.get()`).
- Bitrix-specific BBCode tags (`[USER=id]`, `[DISK File=id]`, `[DEPARTMENT=id]`, `[color]`, `[size]`, `[font]`).
- Server-side handlers (`server/` deliberately absent).

## Conversion mapping
See `README.md` § Конвертация for the full table. Key rules:
- `[u]` ↔ `<u>` (Markdown has no native underline; HTML fallback).
- `[code]` content is **literal** — no nested parsing.
- `[*]` is self-closing; content of an item runs until next `[*]` or `[/list]`.
- Autolink `<https://x>` ↔ `[url]https://x[/url]`; named link `[X](url)` ↔ `[url=url]X[/url]`.
- Markdown `paragraph_close` emits `\n\n`; trailing `\n+` before block-close BBCode tags is stripped via post-process regex.

## Commands
```
pnpm dev          # http://localhost:3000
pnpm test         # run vitest once
pnpm test:watch   # watch mode
pnpm typecheck
pnpm lint
pnpm build
```
