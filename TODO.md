# TODO

> Last reviewed: 2026-07-22

Black-list пунктов на проработку для проекта. Ветка `todo` — буфер до планирования.

## Локализация
- [ ] Прогнать `pnpm translate-ui` на все 17 остальных локалей после финализации ключей
- [x] Новые i18n-ключи (preview / previewEmpty / htmlPlaceholder) в `en.json` + `ru.json`; паритет EN↔RU зелёный
- [ ] Проверить RTL для `ar`

## Тёмный режим / мобилка
- [x] Убран хардкод `htmlAttrs: { class: 'dark' }` (вместе с удалённым `im-keyboard`). `colorMode: 'auto'` следует за ОС.
- [ ] Auto-detect темы B24 через JSSDK — **заблокировано**: `@bitrix24/b24jssdk` 1.1.0 не экспонирует тему портала (нет `theme`/`colorScheme` в API). Нужен иной сигнал (placement options / postMessage) — отдельная задача.
- [x] Detect mobile — через `useDevice().isBitrixMobile` (b24ui).
- [ ] Прозрачный/наследуемый фон в моб-виджетах
- [ ] Решить: десктоп тоже слушает тему B24 или нет
- [x] Print в моб-приложении B24 не работает — кнопка Print скрыта в `im-textarea` при `isBitrixMobile`.
- [ ] Скрывать Print и в `index.vue` (моб-вкладки) при `isBitrixMobile` — мелочь, не приоритет.
- [ ] Подумать про PDF — возможно, делать его не через `window.print()`, а другим способом (не приоритет)

## UX
- [ ] Отложено — обсудить отдельно

## Демо/пример для разработчиков
- [ ] README: позиционировать как reference-проект для B24 placement'ов
- [ ] Описание проекта — что это, зачем, какие паттерны демонстрирует
- [ ] Комментарии на все экспортируемые функции / composables / utils (JSDoc-style)
- [ ] Раздел «Архитектура» — пройтись по слоям (`useB24`, парсер, конвертеры, i18n, install flow)
- [ ] Комментарии-маркеры в ключевых местах кода («так делается init JSSDK», «так регистрируется placement», «так слушается тема»)
- [ ] Примеры использования b24jssdk: `placement.bind/unbind`, `placement.getInterface`, `options.set/get`, `parent.message.send`, auth, scopes
- [ ] Mock-режим вне B24 фрейма — подчеркнуть как паттерн локальной разработки

## Skills (Claude Code skills для типовых сценариев B24-разработки)
Цель: каждое типовое поведение оформить как skill, чтобы переиспользовать в других B24-проектах. По мере готовности — переносить из этого репо в основное хранилище скилов.
- [ ] `b24-localization` — как добавить i18n с 19 локалями, `pnpm translate-ui`, fallback на `en`
- [ ] `b24-jssdk-init` — как инициализировать `@bitrix24/b24jssdk-nuxt`, frame detection, mock-режим
- [ ] `b24-options` — работа со свойствами портала (`b24.options.set/get`), scope админ/юзер
- [ ] `b24-placement-install` — install flow, `placement.bind/unbind`, обработка ре-инсталла
- [ ] `b24-placement-runtime` — `placement.getInterface`, `parent.message.send`, detect mobile
- [ ] `b24-theme` — auto-detect темы B24, listen на смену темы, dark/light mode
- [ ] `b24-rest-calls` — типовая отправка REST через JSSDK, обработка ошибок, batch
- [ ] `b24-deploy` — деплой как Local Application (GitHub Pages / Docker / self-host) + ngrok для dev
- [ ] Правило: skill готов → перенести в `~/.claude/skills/` (или общий репо скилов), оставить здесь только ссылку

## Деплой
- [ ] README раздел «Deploy» — расширить:
  - GitHub Pages workflow (что уже есть в `.github/workflows/`)
  - Docker / GHCR + docker compose + nginx + SPA fallback
  - ngrok для локального dev внутри B24 (`NUXT_ALLOWED_HOSTS`)
  - Self-host на своём домене
  - Настройка Local Application в B24 (URL, install URL, scopes)
- [ ] Чек-лист «from zero to installed placement»

## Автоматизация репо (обязательные требования)
- [ ] Авто-деплой: push в `main` → GitHub Pages (Actions workflow) + Docker-образ в GHCR
- [ ] CI на каждый PR: `pnpm install` (frozen lockfile) → `lint` → `typecheck` → `test` → `build`. PR красится если что-то падает.
- [ ] Тесты обязательны: на любой PR, который трогает `app/utils/{bbcode-parser,bbcode-to-md,md-to-bbcode}.ts`, прогон `pnpm test` зелёный — иначе merge запрещён (branch protection)
- [ ] Авто-обновление пакетов: Dependabot или Renovate, weekly, отдельный PR на каждый minor/patch, авто-мерж при зелёном CI
- [ ] Major bump'ы — ручной ревью (особенно `nuxt`, `@bitrix24/*`, `vue`, `vite`)
- [ ] Бейджи в README: build / test / deploy / coverage

## Тесты
- [ ] Не забыть `pnpm test` перед коммитом если трогаем `app/utils/bbcode-*` / `md-to-bbcode`

## Ручная проверка на практике (обязательно)
ВАЖНО: каждый пункт из бэклога после реализации обязательно проверять руками в реальном Bitrix24 портале — юнит-тестов и моков недостаточно для placement'ов, темы, мобильного, install-flow.
- [ ] Использовать одну выделенную ветку для hands-on QA (имя ветки уточнить — `qa` / `staging` / ?)
- [ ] Workflow: фичевая ветка → мерж в QA-ветку → деплой QA-ветки на отдельный URL/портал → ручная проверка → только потом PR в `main`
- [ ] Чек-лист проверок: desktop B24, мобильное приложение B24 (iOS + Android), light/dark тема, разные локали, mock-режим вне фрейма
- [ ] QA-портал не путать с прод-порталом (отдельный URL в `placement.bind`)

## JSSDK миграция (technical debt после bump @bitrix24/b24jssdk 1.0.5 → 1.1.0)
В v1.1.0 помечены deprecated и удаляются в 2.0.0:
- `AbstractB24` низкоуровневые: `callMethod`, `callBatch`, `callBatchByChunk`, `callListMethod`, `fetchListMethod`
- `AjaxResult` paging-хелперы: `isMore`, `hasMore`, `getNext`, `fetchNext`, `getTotal`

Заменить на `b24.actions.v{2,3}.{callList,fetchList}.make` — они скрывают пагинацию для обеих версий API.

- [x] `install.vue` makeInit — `callBatch({…})` → `actions.v2.batch.make({ calls: {…} })`
- [x] `install.vue` makePlacement — `callBatch(calls, false)` → `actions.v2.batch.make({ calls, options: { isHaltOnError: false } })`
- [x] `install.vue` makePlacement — `callMethod('placement.get')` → `actions.v2.call.make({ method })`, читаем `getData().result`
- [ ] Низкоуровневые/paging-хелперы в другом коде (если появятся) — на `actions.v{2,3}` по мере необходимости
- [ ] `as`-касты в `install.vue` оставлены намеренно (типы `getData()` дженерик-`unknown`); сузить при типизации batch-ответов
