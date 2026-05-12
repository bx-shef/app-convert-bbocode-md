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
- [ ] Раздел «Архитектура» — пройтись по слоям (`useB24`, парсер, конвертеры, i18n, install flow)
- [ ] Комментарии-маркеры в ключевых местах кода («так делается init JSSDK», «так регистрируется placement», «так слушается тема»)
- [ ] Примеры использования b24jssdk: `placement.bind/unbind`, `placement.getInterface`, `options.set/get`, `parent.message.send`, auth, scopes
- [ ] Mock-режим вне B24 фрейма — подчеркнуть как паттерн локальной разработки

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
