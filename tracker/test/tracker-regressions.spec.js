const { test, expect } = require('@playwright/test')
const path = require('path')

async function install(page, { attributes = {}, pathname = '/', beacon = 'accept', noResizeObserver = false } = {}) {
  const requests = []
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.route('https://tracker.test/**', route => {
    const request = route.request()
    if (new URL(request.url()).pathname === '/js/script.js') {
      return route.fulfill({ contentType: 'application/javascript', path: path.join(__dirname, '../dist/script.js') })
    }
    if (request.method() === 'POST') {
      requests.push(request.postDataJSON())
      return route.fulfill({ status: 202, body: '' })
    }
    return route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0;height:1600px">Tracker fixture</body></html>' })
  })
  await page.goto('https://tracker.test' + pathname)
  const start = new Date('2026-11-04T00:00:00Z')
  await page.clock.install({ time: start })
  await page.clock.pauseAt(start)
  await page.evaluate(({ beacon, noResizeObserver }) => {
    window.__zenstats = true
    window.transports = []
    window.callbacks = []
    window.regexes = []
    window.intervals = []
    window.scrollOptions = []
    const fetch = window.fetch
    window.fetch = (url, options) => {
      window.transports.push({ type: 'fetch', payload: JSON.parse(options.body), keepalive: options.keepalive })
      return fetch(url, options)
    }
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon === 'unavailable' ? undefined : (url, body) => {
      window.transports.push({ type: 'beacon', payload: JSON.parse(body) })
      if (beacon === 'throw') throw new Error('Beacon refused')
      return beacon !== 'reject'
    } })
    const RegExp = window.RegExp
    window.RegExp = new Proxy(RegExp, { construct(target, args) {
      window.regexes.push(args[0])
      return Reflect.construct(target, args)
    } })
    const interval = window.setInterval
    window.setInterval = (fn, delay) => { window.intervals.push(delay); return interval(fn, delay) }
    const listen = document.addEventListener.bind(document)
    document.addEventListener = (type, fn, options) => {
      if (type === 'scroll') window.scrollOptions.push(options)
      return listen(type, fn, options)
    }
    if (noResizeObserver) window.ResizeObserver = undefined
  }, { beacon, noResizeObserver })
  await page.evaluate(attributes => new Promise(resolve => {
    const script = document.createElement('script')
    script.src = '/js/script.js'
    script.setAttribute('data-domain', 'tracker.test')
    for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value)
    script.onload = resolve
    document.head.appendChild(script)
  }), attributes)
  return requests
}

async function depart(page, event) {
  await page.evaluate(event => {
    if (event === 'pagehide') window.dispatchEvent(new PageTransitionEvent('pagehide'))
    else {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    }
  }, event)
}

test('initial pageview sends before any clock advance; ordinary events retain the two-second batch', async ({ page }) => {
  const requests = await install(page)
  expect(await page.evaluate(() => window.transports.map(t => t.payload.n))).toEqual(['pageview'])
  await page.evaluate(() => { zenstats('First'); zenstats('Second') })
  await page.clock.runFor(1999)
  expect(await page.evaluate(() => window.transports.length)).toBe(1)
  await page.clock.runFor(1)
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[1].n).toBe('batch')
  expect(requests[1].e.map(e => e.n)).toEqual(['First', 'Second'])
})

test('revenue passes through single and batched events, including zero amounts', async ({ page }) => {
  const requests = await install(page)
  await page.evaluate(() => zenstats('Purchase', { revenue: { amount: 12.5, currency: 'USD' } }))
  await page.clock.runFor(2000)
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[1].revenue).toEqual({ amount: 12.5, currency: 'USD' })
  await page.evaluate(() => {
    zenstats('Free order', { revenue: { amount: 0, currency: 'CNY' } })
    zenstats('Ordinary event')
  })
  await page.clock.runFor(2000)
  await expect.poll(() => requests.length).toBe(3)
  expect(requests[2].e[0].revenue).toEqual({ amount: 0, currency: 'CNY' })
  expect(requests[2].e[1]).not.toHaveProperty('revenue')
})

for (const attributes of [{}, { 'data-file-types': ' PDF , ZiP ' }]) {
  test(`downloads recognize uppercase extensions with ${JSON.stringify(attributes)}`, async ({ page }) => {
    const requests = await install(page, { attributes })
    await page.evaluate(() => {
      for (const href of ['/guide.PDF?token=private#part', '/archive.ZIP', '/pdf', '/folder.pdf/no-extension']) {
        const link = document.createElement('a')
        link.href = href
        link.onclick = event => event.preventDefault()
        document.body.appendChild(link)
        link.click()
      }
    })
    await page.clock.runFor(2000)
    await expect.poll(() => requests.length).toBe(2)
    expect(requests[1].e.map(e => [e.n, e.p.url])).toEqual([
      ['File Download', 'https://tracker.test/guide.PDF'],
      ['File Download', 'https://tracker.test/archive.ZIP'],
    ])
  })
}

test('include/exclude rules filter SPA views and reuse regexes across events', async ({ page }) => {
  const requests = await install(page, { pathname: '/allowed/start', attributes: {
    'data-include': '/allowed/**', 'data-exclude': '/allowed/private/**',
  } })
  await page.evaluate(() => {
    for (const route of ['/outside', '/allowed/private/secret', '/allowed/next', '/allowed/deep/page']) {
      history.pushState(null, '', route)
    }
  })
  await expect.poll(() => requests.flatMap(p => p.e || [p]).filter(p => p.n === 'pageview').length).toBe(3)
  expect(requests.flatMap(p => p.e || [p]).filter(p => p.n === 'pageview').map(p => new URL(p.u).pathname))
    .toEqual(['/allowed/start', '/allowed/next', '/allowed/deep/page'])
  expect(await page.evaluate(() => window.regexes.filter(r => r.includes('/allowed/')).length)).toBe(2)
})

test('an excluded initial view emits no engagement and reports ignored callbacks', async ({ page }) => {
  await install(page, { pathname: '/private/secret', attributes: { 'data-exclude': '/private/**' } })
  await page.evaluate(() => zenstats('pageview', { callback: result => window.callbacks.push(result) }))
  await page.clock.runFor(1000)
  await depart(page, 'pagehide')
  expect(await page.evaluate(() => window.transports)).toEqual([])
  expect(await page.evaluate(() => window.callbacks)).toEqual([{ status: 0, ignored: true }])
})

for (const event of ['pagehide', 'hidden']) {
  test(`${event} prefers beacon for a callback-free batch and does not send it twice`, async ({ page }) => {
    await install(page)
    await page.evaluate(() => { zenstats('First'); zenstats('Second') })
    await depart(page, event)
    await depart(page, event)
    const transports = await page.evaluate(() => window.transports)
    expect(transports.map(t => t.type)).toEqual(['fetch', 'beacon'])
    expect(transports[1].payload.e.map(e => e.n)).toEqual(['First', 'Second', 'engagement'])
  })
}

for (const beacon of ['reject', 'unavailable', 'throw']) {
  test(`beacon ${beacon} falls back to a keepalive fetch`, async ({ page }) => {
    const requests = await install(page, { beacon })
    await page.evaluate(() => zenstats('Exit event'))
    await depart(page, 'pagehide')
    await expect.poll(() => requests.length).toBe(2)
    const transports = await page.evaluate(() => window.transports)
    expect(transports.map(t => t.type)).toEqual(beacon === 'unavailable' ? ['fetch', 'fetch'] : ['fetch', 'beacon', 'fetch'])
    expect(transports.at(-1).keepalive).toBe(true)
    expect(requests[1].e[0].n).toBe('Exit event')
  })
}

for (const event of ['pagehide', 'hidden']) {
  test(`${event} retains response callbacks for every event in a batch`, async ({ page }) => {
    await install(page)
    await page.evaluate(() => {
      zenstats('First', { callback: result => window.callbacks.push(['First', result.status]) })
      zenstats('Second', { callback: result => window.callbacks.push(['Second', result.status]) })
    })
    await depart(page, event)
    await expect.poll(() => page.evaluate(() => window.callbacks)).toEqual([['First', 202], ['Second', 202]])
    expect(await page.evaluate(() => window.transports.map(t => t.type))).toEqual(['fetch', 'fetch'])
  })
}

test('single pageview callback stays immediate and batches flush at ten items', async ({ page }) => {
  await install(page)
  await page.evaluate(() => zenstats('pageview', { callback: result => window.callbacks.push(result.status) }))
  await expect.poll(() => page.evaluate(() => window.callbacks)).toEqual([202])
  await page.evaluate(() => { for (let i = 0; i < 10; i++) zenstats('Event ' + i) })
  expect(await page.evaluate(() => window.transports.at(-1).payload.e.length)).toBe(10)
  await page.clock.runFor(2000)
  expect(await page.evaluate(() => window.transports.length)).toBe(3)
})

for (const noResizeObserver of [false, true]) {
  test(`scroll depth includes dynamic height and pending scroll at exit (ResizeObserver: ${!noResizeObserver})`, async ({ page }) => {
    await install(page, { noResizeObserver })
    await page.evaluate(() => {
      document.body.style.height = '3200px'
      window.scrollTo(0, 800)
      window.dispatchEvent(new PageTransitionEvent('pagehide'))
    })
    const transports = await page.evaluate(() => window.transports)
    expect(transports.at(-1).payload).toMatchObject({ n: 'engagement', sd: 50 })
    expect(await page.evaluate(() => window.intervals)).not.toContain(200)
    expect(await page.evaluate(() => window.scrollOptions)).toContainEqual({ passive: true })
  })
}
