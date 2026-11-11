const { test, expect } = require('@playwright/test')
const path = require('path')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

test.describe('Tracker installation', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page) {
    const writes = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      for (const [key, value] of Object.entries({ token: 'fixture-token', email_verified: 'true', user_type: 'user', 'zenstats-language': 'en' })) localStorage.setItem(key, value)
    })
    await page.route('**/api/**', route => {
      if (/\/(?:sites|performance|heatmap)\//.test(new URL(route.request().url()).pathname) && route.request().method() !== 'GET') writes.push(route.request().method())
      return route.fulfill({ json: { code: 200, data: {} } })
    })
    await page.goto(webURL + '/sites/example.test/settings/install')
    await expect(page.getByText('Install tracking code', { exact: true })).toBeVisible()
    return { writes, errors }
  }
  const heatmap = page => page.getByRole('checkbox', { name: 'Click / scroll heatmaps', exact: true })
  const performance = page => page.getByRole('checkbox', { name: 'Core Web Vitals performance monitoring', exact: true })

  test('optional modules default off and invalid labels cannot be copied', async ({ page, context }) => {
    const state = await install(page)
    await expect(heatmap(page)).not.toBeChecked()
    await expect(performance(page)).not.toBeChecked()
    await expect(page.locator('pre')).not.toContainText('data-heatmap')
    await expect(page.locator('pre')).not.toContainText('data-performance')
    await expect(page.locator('pre')).toContainText('/js/script.js')
    await performance(page).check()
    await expect(page.locator('pre')).toContainText('data-performance="true"')
    await expect(page.locator('pre')).not.toContainText('data-heatmap')
    await page.getByLabel('Release version', { exact: true }).fill('invalid release')
    await expect(page.getByRole('button', { name: 'Copy Code', exact: true })).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText('Release and variant are required')
    await page.getByLabel('Release version', { exact: true }).fill('release-2')
    await heatmap(page).check()
    await page.getByLabel('Heatmap aggregation key (optional)', { exact: true }).fill('product-detail')
    await page.getByLabel('Heatmap variant', { exact: true }).fill('variant-b')
    await expect(page.getByRole('link', { name: 'Configure heatmap collection', exact: true })).toHaveAttribute('href', '/sites/example.test/settings/heatmap')
    await expect(page.getByRole('link', { name: 'Configure performance collection', exact: true })).toHaveAttribute('href', '/sites/example.test/settings/performance')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(webURL).origin })
    await page.getByRole('button', { name: 'Copy Code', exact: true }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.locator('pre').innerText())
    await performance(page).uncheck()
    await expect(page.locator('pre')).not.toContainText('data-performance')
    await expect(page.locator('pre')).toContainText('data-heatmap-key="product-detail"')
    await heatmap(page).uncheck()
    await expect(page.getByLabel('Release version', { exact: true })).toHaveCount(0)
    await expect(page.locator('pre')).not.toContainText('data-heatmap')
    expect(state.writes).toEqual([])
    expect(state.errors).toEqual([])
  })

  test('the generated Hash snippet loads real modules and reports matching dimensions', async ({ page, context }) => {
    const state = await install(page)
    await heatmap(page).check()
    await performance(page).check()
    await page.getByRole('checkbox', { name: 'Hash-based Routing', exact: true }).check()
    await page.getByLabel('Release version', { exact: true }).fill('release-acceptance')
    await page.getByLabel('Heatmap aggregation key (optional)', { exact: true }).fill('product-detail')
    await page.getByLabel('Heatmap variant', { exact: true }).fill('variant-b')
    const snippet = await page.locator('pre').innerText()
    expect(snippet).toContain('/js/script.hash.js')
    const live = await context.newPage(), requests = [], reports = [], clicks = [], scroll = []
    live.on('pageerror', error => state.errors.push(error.message))
    await live.route('https://install.test/**', route => {
      const req = route.request(), url = new URL(req.url())
      requests.push(url.pathname)
      if (url.pathname.startsWith('/js/')) return route.fulfill({ contentType: 'application/javascript', path: path.join(__dirname, '../dist', path.basename(url.pathname)) })
      if (url.pathname === '/api/performance/config') return route.fulfill({ json: { enabled: true, protocol_version: 1, paths: ['/#/*'], sample_rate: 1, config_version: 1 } })
      if (url.pathname === '/api/heatmap/config') return route.fulfill({ json: { enabled: true, protocol_version: 1, scroll_protocol_version: 1, clicks_enabled: true, scroll_enabled: true, paths: ['/#/*'], sample_rate: 1, max_clicks: 100, groups: [] } })
      if (url.pathname === '/api/performance/reports') { reports.push(...req.postDataJSON().reports); return route.fulfill({ status: 202, body: '' }) }
      if (url.pathname === '/api/heatmap/clicks') { clicks.push(...req.postDataJSON().clicks); return route.fulfill({ status: 202, body: '' }) }
      if (url.pathname === '/api/heatmap/scroll') { scroll.push(...req.postDataJSON().reports); return route.fulfill({ status: 202, body: '' }) }
      if (url.pathname === '/api/event') return route.fulfill({ status: 202, body: '' })
      return route.fulfill({ contentType: 'text/html', body: `<html><head><title>Install acceptance</title></head><body><h1>Page paint candidate</h1><button data-zs-id="signup.submit">Interact</button><script>window.__zenstats=true</script>${snippet.replace(new URL(webURL).origin, 'https://install.test')}</body></html>` })
    })
    await live.goto('https://install.test/#/product')
    await expect.poll(() => requests.includes('/js/vitals.js') && scroll.length > 0).toBe(true)
    await live.getByRole('button', { name: 'Interact', exact: true }).click()
    await expect.poll(() => clicks.length).toBeGreaterThan(0)
    await expect.poll(() => reports.some(r => r.record_kind === 'context')).toBe(true)
    expect(clicks[0].page).toMatchObject({ path: '/#/product', version: 'release-acceptance', aggregation_key: 'product-detail', variant: 'variant-b' })
    expect(scroll[0].page).toMatchObject({ path: '/#/product', version: 'release-acceptance', aggregation_key: 'product-detail', variant: 'variant-b' })
    await live.goto('about:blank')
    await expect.poll(() => reports.some(r => r.metric_name === 'LCP')).toBe(true)
    expect(reports.every(r => r.path === '/#/product' && r.release === 'release-acceptance')).toBe(true)
    expect(reports.some(r => r.metric_name === 'INP')).toBe(true)
    expect(state.writes).toEqual([])
    expect(state.errors).toEqual([])
  })

  test('public docs include combined installation and valid script attributes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('zenstats-language', 'en'))
    await page.goto(webURL + '/docs')
    const section = page.locator('#trackingScript')
    await expect(section).toContainText('Optional analytics modules')
    await expect(section).toContainText('data-performance="true"')
    await expect(section).toContainText('do not change site collection settings')
    await expect(section).toContainText('/js/script.js')
    await expect(section).not.toContainText('/js/zenstats.js')
    await expect(page.locator('#heatmap')).toContainText('data-domain="demo.site"')
    await expect(page.locator('#heatmap')).not.toContainText('data-site-id')
  })
})
