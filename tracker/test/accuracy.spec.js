const { test, expect } = require('@playwright/test')
const path = require('path')

async function install(page, variant = 'script.js', pathname = '/') {
  const events = []
  await page.route('https://example.com/**', async route => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON()
      events.push(...(payload.n === 'batch' ? payload.e : [payload]))
      await route.fulfill({ status: 202, body: 'ok' })
    } else {
      await route.fulfill({ contentType: 'text/html', body: '<html><body style="height:2000px">Analytics fixture</body></html>' })
    }
  })
  await page.goto('https://example.com' + pathname)
  const start = new Date('2026-11-04T00:00:00Z')
  await page.clock.install({ time: start })
  await page.clock.pauseAt(start)
  await page.evaluate(() => { window.__zenstats = true })
  await page.addScriptTag({ path: path.join(__dirname, '../dist', variant) })
  return events
}

async function leave(page) {
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
}

test('continuous engagement sums every interval and flushes the final short interval once', async ({ page }) => {
  const events = await install(page)
  await page.clock.runFor(25000)
  await leave(page)
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'engagement').reduce((sum, e) => sum + e.e, 0)).toBe(25000)
  expect(events.filter(e => e.n === 'pageview')).toHaveLength(1)
  expect(events.filter(e => e.n === 'engagement')).toHaveLength(3)
})

test('a short visit flushes its pageview and engagement on pagehide', async ({ page }) => {
  const events = await install(page)
  await page.clock.runFor(500)
  await leave(page)
  await expect.poll(() => events.length).toBe(2)
  expect(events.map(e => e.n)).toEqual(['pageview', 'engagement'])
  expect(events[1].e).toBe(500)
})

test('background time is excluded and visibility hiding flushes the queue', async ({ page }) => {
  const events = await install(page)
  await page.clock.runFor(1000)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => events.length).toBe(2)
  await page.clock.runFor(30000)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(2000)
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'engagement').reduce((sum, e) => sum + e.e, 0)).toBe(3000)
})

test('hash pageviews and engagement carry the routing flag and ignore query-only navigation', async ({ page }) => {
  const events = await install(page, 'script.hash.js', '/#/home?tab=one')
  await page.clock.runFor(1000)
  await page.evaluate(() => {
    history.replaceState(null, '', '/#/home?tab=two')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  await page.clock.runFor(1000)
  await page.evaluate(() => {
    history.replaceState(null, '', '/#/pricing')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  await page.clock.runFor(1000)
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'pageview').length).toBe(2)
  expect(events.every(e => e.h === 1)).toBe(true)
  expect(events.filter(e => e.n === 'engagement').map(e => new URL(e.u).hash)).toEqual(['#/home?tab=one', '#/pricing'])
})

test('history replaceState counts a new page once without counting query-only updates', async ({ page }) => {
  const events = await install(page)
  await page.evaluate(() => {
    history.replaceState(null, '', '/pricing')
    history.pushState(null, '', '/pricing?plan=pro')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'pageview').length).toBe(2)
  expect(events.filter(e => e.n === 'pageview').map(e => new URL(e.u).pathname)).toEqual(['/', '/pricing'])
})

test('BFCache restore starts a fresh view and does not include time away', async ({ page }) => {
  const events = await install(page)
  await page.clock.runFor(1000)
  await leave(page)
  await page.clock.runFor(30000)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await page.clock.runFor(1000)
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'pageview').length).toBe(2)
  expect(events.filter(e => e.n === 'engagement').reduce((sum, e) => sum + e.e, 0)).toBe(2000)
})

test('loading the tracker twice keeps one set of counters', async ({ page }) => {
  const events = await install(page)
  await page.addScriptTag({ path: path.join(__dirname, '../dist/script.js') })
  await page.clock.runFor(11000)
  await leave(page)
  await expect.poll(() => events.filter(e => e.n === 'engagement').reduce((sum, e) => sum + e.e, 0)).toBe(11000)
  expect(events.filter(e => e.n === 'pageview')).toHaveLength(1)
})
