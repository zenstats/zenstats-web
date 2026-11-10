(function () {
  'use strict';
  if (window.__zenstatsHeatmap) return

  var settings, config, current, sampled = false, pageClicks = 0
  var queue = [], pending = null, timer = null, refreshTimer = null
  var MAX_BATCH = 20, MAX_BODY = 16384, MAX_QUEUE = 200
  var label = /^[a-zA-Z0-9_.:/@-]{1,120}$/

  function id() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
    var bytes = new Uint8Array(16)
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes)
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
    var hex = []
    for (var j = 0; j < bytes.length; j++) hex.push(('0' + bytes[j].toString(16)).slice(-2))
    return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' + hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('')
  }

  function random() {
    if (window.crypto && window.crypto.getRandomValues) {
      var value = new Uint32Array(1); window.crypto.getRandomValues(value); return value[0] / 4294967296
    }
    return Math.random()
  }

  function canonical(raw) {
    var u = new URL(raw, window.location.href)
    return { hostname: u.hostname.toLowerCase(), path: (u.pathname || '/') + (settings.hash ? u.hash.split('?')[0] : '') }
  }

  function matches(path, rule) {
    // Rules use a one-segment '*'. The API rejects query
    // values; hash routes have the same canonical representation as pageviews.
    var regex = '^' + rule.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'
    try { return new RegExp(regex).test(path) } catch (e) { return false }
  }

  function reset(raw, ignored) {
    flush()
    var next
    try { next = canonical(raw) } catch (e) { current = null; sampled = false; return }
    current = next; current.ignored = ignored; current.draw = random(); current.rate = null; pageClicks = 0
    evaluate()
  }

  function evaluate() {
    sampled = false
    if (!current || !config || !config.enabled || config.protocol_version !== 1 || !Array.isArray(config.paths) || current.ignored) return
    if (!config.paths.some(function (rule) { return matches(current.path, rule) })) return
    // Freeze the probability and random draw for this page visit. Refreshing
    // settings must never resample a page or mislabel previously sampled clicks.
    if (current.rate === null) current.rate = config.sample_rate
    sampled = current.draw < current.rate
  }

  function refresh() {
    if (!window.fetch) return
    fetch(settings.api + '/config?domain=' + encodeURIComponent(settings.domain), { credentials: 'omit', cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('Heatmap config unavailable'); return r.json() })
      .then(function (value) {
        config = value
        if (!config.enabled || config.protocol_version !== 1 || !Array.isArray(config.paths)) { sampled = false; queue = []; return }
        evaluate()
      }).catch(function () { sampled = false })
    clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 30000)
  }

  function positioning(target) {
    if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) return 'unsupported'
    for (var el = target; el && el !== document.documentElement; el = el.parentElement) {
      var style = window.getComputedStyle(el)
      if (style.position === 'fixed') return 'fixed'
      if (style.position === 'sticky') return 'sticky'
      if (el !== document.body && ((/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) || (/(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth))) return 'scroll'
    }
    return 'document'
  }

  function click(event) {
    if (!sampled || !config || !current || event.isTrusted !== true || event.button !== 0 || event.detail === 0 || document.visibilityState === 'hidden') return
    try { if (window.localStorage.zenstats_ignore === 'true') return } catch (e) {}
    if (pageClicks >= config.max_clicks || queue.length >= MAX_QUEUE) return
    var actual
    try { actual = canonical(window.location.href) } catch (e) { return }
    if (actual.path !== current.path || actual.hostname !== current.hostname) return
    var target = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement
    if (!target || target.closest('[data-zs-ignore],input,textarea,select,form,[contenteditable]')) return
    var root = document.documentElement, body = document.body || root
    var vw = Math.round(window.innerWidth), vh = Math.round(window.innerHeight)
    var dw = Math.max(vw, root.scrollWidth, body.scrollWidth), dh = Math.max(vh, root.scrollHeight, body.scrollHeight)
    if (vw < 100 || vh < 100 || vw > 8192 || vh > 8192 || dw > 100000 || dh > 100000) return
    var version = settings.script.getAttribute('data-heatmap-version') || 'unknown'
    var variant = settings.script.getAttribute('data-heatmap-variant') || 'default'
    var aggregationKey = settings.script.getAttribute('data-heatmap-key') || ''
    if (config.groups) { config.groups.some(function (g) { if (matches(current.path,g.path)) { aggregationKey=g.key; return true } return false }) }
    if (aggregationKey && !label.test(aggregationKey)) return
    if (!label.test(version) || !label.test(variant)) return
    var element = target.closest('[data-zs-id]'), key = element && element.getAttribute('data-zs-id') || ''
    var rx = 0, ry = 0
    if (key && label.test(key)) {
      var rect = element.getBoundingClientRect()
      if (rect.width && rect.height) {
        rx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        ry = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
      }
    } else key = ''
    var x = event.pageX, y = event.pageY
    if (!isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x >= dw || y >= dh) return
    var page = { hostname: current.hostname, path: current.path, version: version, variant: variant,
      viewport_width: vw, viewport_height: vh, document_width: dw, document_height: dh }
    // Old APIs reject unknown fields. Public groups is the capability signal
    // that lets this optional addition work through rolling deployments.
    if (Array.isArray(config.groups)) page.aggregation_key = aggregationKey
    queue.push({ rate: current.rate, click: {
      id: id(), timestamp: new Date().toISOString(),
      page: page,
      x: x, y: y, element: key, relative_x: rx, relative_y: ry, position: positioning(target)
    } })
    pageClicks++
    if (queue.length >= MAX_BATCH) flush()
    else schedule()
  }

  function schedule() { if (!timer && !pending && queue.length) timer = setTimeout(flush, 2000) }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    if (pending || !queue.length || !window.fetch) return
    var rate = queue[0].rate, items = []
    while (queue.length && items.length < MAX_BATCH && queue[0].rate === rate) items.push(queue.shift().click)
    var payload = { version: 1, domain: settings.domain, batch_id: id(), sample_rate: rate, clicks: items }
    var body = JSON.stringify(payload)
    while (new Blob([body]).size > MAX_BODY && items.length > 1) {
      queue.unshift({ click: items.pop(), rate: rate }); body = JSON.stringify(payload)
    }
    if (new Blob([body]).size > MAX_BODY) { schedule(); return }
    pending = { body: body, attempts: 0 }; send()
  }

  function send() {
    var batch = pending
    if (!batch) return
    batch.attempts++
    // Retried bodies and IDs remain byte-for-byte identical.
    fetch(settings.api + '/clicks', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain' }, keepalive: true, body: batch.body })
      .then(function (r) {
        if (r.status === 429 || r.status === 503) { retry(batch, Number(r.headers.get('Retry-After')) * 1000); return }
        if (!r.ok && r.status >= 500) { retry(batch); return }
        pending = null
        if (r.status === 403) { sampled = false; queue = []; refresh() }
        schedule()
      }).catch(function () { retry(batch) })
  }

  function retry(batch, delay) {
    if (pending !== batch) return
    if (batch.attempts >= 3) { pending = null; schedule(); return }
    setTimeout(send, Math.min(30000, Math.max(500, delay || Math.pow(2, batch.attempts - 1) * 500)))
  }

  window.__zenstatsHeatmap = {
    start: function (value) {
      if (settings) return
      settings = value
      if (!settings.domain) return
      document.addEventListener('click', click, true)
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush() })
      window.addEventListener('pagehide', flush)
      reset(settings.url || window.location.href, settings.ignored)
      refresh()
    },
    page: function (raw, ignored) {
      if (!settings) return
      settings.url = raw; settings.ignored = ignored; reset(raw, ignored)
    }
  }
})();
