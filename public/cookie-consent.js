/*!
 * cookie-consent.js — баннер согласия на cookie для посадочных bx-shef.
 * Источник: bx-shef/Lp, public/cookie-consent.js. В другие репозитории — копия без правок;
 * при правке — поднять VERSION и разнести копии.
 *
 * Подключение (до кода аналитики, без async/defer):
 *   <script src="/cookie-consent.js" data-policy="https://offer.bx-shef.by/privacy"
 *           data-services="Яндекс Метрику (статистика и запись действий на странице) и метки формы Битрикс24"></script>
 *   <script>BxConsent.onAnalytics(function () { ...код Яндекс Метрики... })</script>
 * Ссылка «Настройки cookie»: любой элемент с атрибутом data-cookie-settings.
 * Внутри фрейма (приложение в портале Битрикс24) баннера нет и аналитика не запускается.
 * data-exclude — регулярное выражение пути, где баннера нет (служебные страницы).
 *
 * Выбор хранится в cookie `cookie_consent` (granted | denied) на 1 год; на *.bx-shef.by —
 * общий для всех поддоменов. До согласия аналитика не загружается.
 */
(function (w, d) {
  'use strict'
  var VERSION = '1.2.0'
  if (w.BxConsent) return

  var NAME = 'cookie_consent'
  var YEAR = 365 * 24 * 3600
  var me = d.currentScript
  var policy = (me && me.getAttribute('data-policy')) || 'https://offer.bx-shef.by/privacy'
  var services = (me && me.getAttribute('data-services'))
    || 'Яндекс Метрику (статистика и запись действий на странице) и метки формы Битрикс24'
  var exclude = me && me.getAttribute('data-exclude')
  var queue = []
  var box = null

  function read() {
    var m = d.cookie.match(/(?:^|;\s*)cookie_consent=(granted|denied)/)
    return m ? m[1] : null
  }

  function domainAttr() {
    var h = w.location.hostname
    return /(^|\.)bx-shef\.by$/.test(h) ? '; domain=.bx-shef.by' : ''
  }

  function write(v) {
    d.cookie = NAME + '=' + v + '; max-age=' + YEAR + '; path=/; SameSite=Lax'
      + (w.location.protocol === 'https:' ? '; Secure' : '') + domainAttr()
  }

  // Отказ после согласия: убрать cookie Метрики первой стороны (на доменах Яндекса — не достать).
  function wipe() {
    var names = d.cookie.split(';').map(function (c) { return c.split('=')[0].trim() })
    var dom = domainAttr()
    names.forEach(function (n) {
      if (/^_ym/.test(n)) {
        d.cookie = n + '=; max-age=0; path=/'
        d.cookie = n + '=; max-age=0; path=/; domain=.' + w.location.hostname
        if (dom) d.cookie = n + '=; max-age=0; path=/' + dom
      }
    })
    try {
      Object.keys(w.localStorage).forEach(function (k) {
        if (/^_ym|^b24_crm_guest/.test(k)) w.localStorage.removeItem(k)
      })
    } catch (e) { /* хранилище недоступно */ }
  }

  function run() {
    while (queue.length) {
      try { queue.shift()() } catch (e) { if (w.console) w.console.error(e) }
    }
  }

  function choose(v) {
    var before = read()
    write(v)
    hide()
    if (v === 'granted') run()
    else if (before === 'granted') { wipe(); w.location.reload() }
    else wipe()
  }

  function css() {
    var s = d.createElement('style')
    s.textContent = '.bxcc{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:560px;'
      + 'margin:0 auto;padding:16px 18px;border-radius:14px;background:#1e2226;color:#e8eaec;'
      + 'font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.35)}'
      + '.bxcc p{margin:0 0 12px}.bxcc a{color:#5fb3ff}.bxcc__row{display:flex;gap:8px;flex-wrap:wrap}'
      + '.bxcc button{flex:1 1 auto;min-height:44px;padding:8px 14px;border-radius:10px;border:1px solid #4a5157;'
      + 'background:transparent;color:inherit;font:inherit;cursor:pointer}'
      + '@media (max-width:600px){.bxcc{left:0;right:0;bottom:0;max-width:none;border-radius:14px 14px 0 0;'
      + 'padding:14px 16px calc(14px + env(safe-area-inset-bottom));font-size:13px;max-height:60vh;overflow:auto}'
      + '.bxcc__row{flex-direction:column-reverse}.bxcc button{width:100%}}'
      + '.bxcc button.bxcc__yes{background:#2fc6f6;border-color:#2fc6f6;color:#0b1a22;font-weight:600}'
      + '.bxcc button:focus-visible{outline:2px solid #5fb3ff;outline-offset:2px}'
    d.head.appendChild(s)
  }

  function show() {
    if (box) { box.hidden = false; return }
    css()
    box = d.createElement('div')
    box.className = 'bxcc'
    box.setAttribute('role', 'dialog')
    box.setAttribute('aria-live', 'polite')
    box.setAttribute('aria-label', 'Согласие на cookie')
    box.innerHTML = '<p>Обязательные cookie нужны для работы сайта. С вашего согласия включим '
      + '<span class="bxcc__svc"></span>. Подробнее — <a target="_blank" rel="noopener"></a>.</p>'
      + '<div class="bxcc__row"><button type="button" class="bxcc__no">Только обязательные</button>'
      + '<button type="button" class="bxcc__yes">Принять все</button></div>'
    box.querySelector('.bxcc__svc').textContent = services
    var a = box.querySelector('a')
    a.href = policy
    a.textContent = 'в политике конфиденциальности'
    box.querySelector('.bxcc__yes').onclick = function () { choose('granted') }
    box.querySelector('.bxcc__no').onclick = function () { choose('denied') }
    d.body.appendChild(box)
  }

  function hide() { if (box) box.hidden = true }

  function ready(fn) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn)
    else fn()
  }

  w.BxConsent = {
    version: VERSION,
    /** granted | denied | null (ещё не выбирал) */
    state: read,
    granted: function () { return read() === 'granted' },
    /** fn — сразу, если согласие уже есть, иначе — после «Принять все». */
    onAnalytics: function (fn) {
      queue.push(fn)
      if (read() === 'granted') run()
    },
    open: function () { ready(show) }
  }

  d.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-cookie-settings]')
    if (t) { e.preventDefault(); w.BxConsent.open() }
  })

  var framed = false
  try { framed = w.self !== w.top } catch (e) { framed = true }
  var excluded = false
  try { excluded = !!exclude && new RegExp(exclude).test(w.location.pathname) } catch (e) { /* кривое выражение — баннер показываем */ }
  if (framed || excluded) {
    // Здесь согласия не спрашиваем — значит, и аналитику не запускаем никогда.
    w.BxConsent.onAnalytics = function () {}
    return
  }
  if (!read()) ready(show)
})(window, document)
