import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals'

// The official standard build owns metric measurement and BFCache reset. This
// adapter only assigns document context, revisions, and bounded transport.
if (!window.__zenstatsVitals) {
  window.__zenstatsVitals = { start }
}
let started = false
function start(settings) {
  if (document.prerendering) {
    document.addEventListener('prerenderingchange', () => start(settings), { once: true }); return
  }
  if (started || !settings.config?.enabled || settings.config.protocol_version !== 1) return
  started = true
  const config = settings.config
  const label = /^[a-zA-Z0-9_.:/@-]{1,120}$/
  const release = settings.script.getAttribute('data-performance-version') || 'unknown'
  if (!label.test(release)) return
  let stopped = false, current, pending = null, timer = null
  let queue = []
  const lifecycles = new Map(), metrics = new Map()
  const now = () => Date.now()
  const origin = performance.timeOrigin || now() - performance.now()
  const id = () => {
    if (crypto.randomUUID) return crypto.randomUUID()
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
  }
  function ignored() {
    if (stopped) return true
    try { return localStorage.zenstats_ignore === 'true' } catch { return false }
  }
  function canonical(raw) {
    const url = new URL(raw, settings.url)
    return { hostname: url.hostname.toLowerCase(), path: (url.pathname || '/') + (settings.hash ? url.hash.split('?')[0] : '') }
  }
  const frozen = canonical(settings.url)
  const entryTypes = window.PerformanceObserver?.supportedEntryTypes || []
  const nav = performance.getEntriesByType('navigation')[0]
  const capabilities = [['LCP','largest-contentful-paint'],['INP','event'],['CLS','layout-shift'],['FCP','paint']]
    .filter(([, type]) => entryTypes.includes(type)).map(([name]) => name)
  // TTFB uses NavigationTiming directly, even without PerformanceObserver.
  if (nav) capabilities.push('TTFB')
  const activation = nav?.activationStart || 0
  const initialType = activation || document.prerendering ? 'prerender' : document.wasDiscarded ? 'restore' : (nav?.type || 'navigate').replace('_', '-')
  function lifecycle(type, relativeStart, background) {
    if (ignored() || lifecycles.size >= 16) return
    current = { ...frozen, release, navigation_type: type, lifecycle_id: id(),
      navigation_started_at: new Date(origin + relativeStart).toISOString(),
      init_delay_ms: Math.min(172800000, Math.max(0, Math.round(performance.now() - relativeStart))), background_init: !!background }
    lifecycles.set(relativeStart, current)
    enqueue({ ...current, record_kind: 'context', revision: 1, id: id(), reported_at: new Date().toISOString(), supported_metrics: capabilities, clipped: false })
  }
  function enqueue(report) {
    if (ignored() || queue.length >= 200) return
    queue.push(report)
    if (!timer) timer = setTimeout(() => flush(false), 2000)
  }
  // Register before the library's capture listeners so a restoration has one
  // new context before official BFCache metric callbacks run.
  window.addEventListener('pageshow', event => {
    if (event.persisted) lifecycle('back-forward-cache', event.timeStamp, false)
  }, true)
  lifecycle(initialType, activation, settings.backgroundInit)

  function report(metric) {
    if (ignored() || metric.navigationType === 'soft-navigation' || !Number.isFinite(metric.value) || metric.value < 0) return
    let instance = metrics.get(metric.id)
    if (!instance) {
      if (metrics.size >= 80) return
      // Official navigationStartTime is 0 for the original document and the
      // pageshow timestamp for BFCache. Never read the current SPA URL here.
      const context = metric.navigationType === 'back-forward-cache'
        ? lifecycles.get(metric.navigationStartTime) : lifecycles.get(activation)
      if (!context) return
      if (metric.navigationURL) {
        let url
        try { url = new URL(metric.navigationURL, settings.url) } catch { return }
        // NavigationTiming URLs may omit the hash. Keep the document's frozen
        // initial hash route while checking the library's document pathname.
        if (url.hostname !== frozen.hostname || url.pathname !== new URL(settings.url).pathname) return
      }
      instance = { context, revision: 0 }; metrics.set(metric.id, instance)
    }
    if (instance.revision >= 32) return
    instance.revision++
    enqueue({ ...instance.context, record_kind: 'metric', metric_name: metric.name, metric_id: metric.id,
      value: metric.value, id: id(), revision: instance.revision, reported_at: new Date().toISOString(), clipped: instance.revision === 32 })
    // A callback after our visibility handler still needs a final beacon. In
    // particular the library may finish processing EventTiming while hidden.
    if (document.visibilityState === 'hidden') flush(true)
  }
  // Register once per document; production deliberately uses standard defaults,
  // with no attribution, reportAllChanges, or soft-navigation instrumentation.
  for (const observe of [onLCP, onINP, onCLS, onTTFB, onFCP]) {
    try { observe(report) } catch { /* A missing browser API leaves a missing sample. */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true) })
  window.addEventListener('pagehide', () => flush(true))

  function flush(beacon) {
    clearTimeout(timer); timer = null
    if (ignored()) { queue = []; return }
    if (beacon && pending && !pending.beaconSent && navigator.sendBeacon) pending.beaconSent = navigator.sendBeacon(settings.api + '/reports', pending.body)
    if (!beacon && pending) return
    while (queue.length) {
      const reports = queue.splice(0, 20)
      const payload = { version: 1, domain: settings.domain, batch_id: id(), sample_rate: config.sample_rate, config_version: config.config_version, reports }
      let body = JSON.stringify(payload)
      while (new Blob([body]).size > 16384 && reports.length > 1) {
        queue.unshift(reports.pop()); body = JSON.stringify(payload)
      }
      if (new Blob([body]).size > 16384) continue
      if (beacon && navigator.sendBeacon && navigator.sendBeacon(settings.api + '/reports', body)) continue
      if (pending) { queue.unshift(...reports); return }
      pending = { body, attempts: 0 }; send(); return
    }
  }
  function retry(batch, delay) {
    if (pending !== batch || ignored()) return
    if (batch.attempts >= 3) { pending = null; flush(false); return }
    setTimeout(() => { if (pending === batch) send() }, Math.min(30000, Math.max(500, delay || 500 * 2 ** (batch.attempts - 1))))
  }
  function send() {
    const batch = pending
    if (!batch || ignored()) return
    batch.attempts++
    fetch(settings.api + '/reports', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, credentials: 'omit', keepalive: true, body: batch.body })
      .then(res => {
        if (pending !== batch) return
        if (res.status === 429 || res.status >= 500) { retry(batch, Number(res.headers.get('Retry-After')) * 1000); return }
        pending = null
        if (res.status === 403) { stopped = true; queue = []; return }
        flush(false)
      }).catch(() => retry(batch))
  }
}
