// Yandex.Metrika loader — static, CSP-friendly (no inline script), loaded only
// by the standalone converter page (app/pages/index.vue injects it via useHead
// when a counter id is configured).
//
// Two guards keep analytics off Bitrix24 portal users (analytics principle #4):
//   1. It self-mutes inside an iframe (window.self !== window.top) and returns
//      before loading anything — the converter is dual-mode (also opens as a B24
//      placement), and portal users must not be tracked, nor may Metrika's
//      CSP-blocked sync pixels fire in the portal.
//   2. The counter id comes from a <meta name="yandex-metrika-id"> tag and is
//      re-validated here (digits only) — a missing/invalid id → no-op.
(function () {
  try { if (window.self !== window.top) return } catch (e) { return }
  var meta = document.querySelector('meta[name="yandex-metrika-id"]')
  var id = meta && meta.getAttribute('content')
  if (!id || !/^\d+$/.test(id)) return
  ;(function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) }
    m[i].l = 1 * new Date()
    for (var j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) { return } }
    k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r
    a.parentNode.insertBefore(k, a)
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym')
  window.ym(Number(id), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true })
})()
