# TODO

Black-list пунктов на проработку для проекта. Ветка `todo` — буфер до планирования.

## Локализация
- [ ] Прогнать `pnpm translate-ui` на все 17 остальных локалей после финализации ключей
- [ ] Добавить новые i18n-ключи (из пунктов ниже) в `en.json` + `ru.json`
- [ ] Проверить RTL для `ar`

## Тёмный режим / мобилка
- [ ] Auto-detect темы B24 через JSSDK (вместо `htmlAttrs: { class: 'dark' }` хардкода в виджетах)
- [ ] Detect mobile через `placement.getInterface()`
- [ ] Прозрачный/наследуемый фон в моб-виджетах
- [ ] Решить: десктоп тоже слушает тему B24 или нет
- [ ] Print в моб-приложении B24 не работает — это нормально, скрывать кнопку Print в моб-режиме (не чинить)
- [ ] Подумать про PDF — возможно, делать его не через `window.print()`, а другим способом (не приоритет)

## Команды (быстрые кнопки в `im-keyboard`)
- [ ] Перенести из хардкода `/command1..4` в настройки
- [ ] Хранилище: `b24.options.set/get`
- [ ] Scope видимости — обсудить при планировании: админ / отдельные юзеры / отделы / все
- [ ] UI настроек (страница или модалка)
- [ ] Лимит количества команд

## Установка
- [ ] По умолчанию ставится только BBCode placement
- [ ] Quick commands — опциональный чекбокс на install-step
- [ ] При снятии галки на ре-инсталле — `placement.unbind`

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
- [ ] CI/CD: lint + typecheck + test + build на PR

## Тесты
- [ ] Не забыть `pnpm test` перед коммитом если трогаем `app/utils/bbcode-*` / `md-to-bbcode`
