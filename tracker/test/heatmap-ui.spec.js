const { test, expect } = require('@playwright/test')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

test.describe('heatmap management', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page, subAccount = false) {
    const layout = { hostname: 'example.test', path: '/pricing', version: 'v1', variant: 'default', viewport_width: 800, viewport_height: 600, document_width: 800, document_height: 1600 }
    const writes = []
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 400; c.height = 800
      const ctx = c.getContext('2d'); ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 400, 800)
      ctx.fillStyle = '#6366f1'; ctx.fillRect(70, 480, 140, 60)
      return c.toDataURL('image/png').split(',')[1]
    })
    await page.addInitScript(sub => {
      localStorage.setItem('token', 'fixture-token'); localStorage.setItem('email_verified', 'true')
      localStorage.setItem('user_type', sub ? 'sub_account' : 'user')
      localStorage.setItem('zenstats-language', 'en')
    }, subAccount)
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      const method = route.request().method()
      if (method !== 'GET') writes.push({ path: url.pathname, body: route.request().postDataJSON() })
      if (url.pathname.endsWith('/image')) return route.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') })
      let data = {}
      if (url.pathname.endsWith('/config')) data = { enabled: true, paths: ['/pricing'], sample_rate: .1, max_clicks: 100, raw_days: 7, aggregate_days: 90, timezone: 'Asia/Shanghai' }
      if (url.pathname.endsWith('/pages')) data = [{ ...layout, clicks: 3 }, { ...layout, version: 'v2', clicks: 1 }]
      if (url.pathname.endsWith('/snapshots')) data = [{ ...layout, id: 7, image_width: 400, image_height: 800, created_at: '2026-11-09T00:00:00Z', expires_at: '2027-01-01T00:00:00Z' }]
      if (url.pathname.endsWith('/data')) data = { points: [{ x: 192, y: 992, count: 2 }], elements: [{ element: 'signup', count: 3 }], clicks: 3, unmapped: 1, truncated: false, grid_size: 16 }
      return route.fulfill({ json: { code: 200, message: 'success', data } })
    })
    await page.goto(webURL + '/sites/example.test/heatmap')
    await expect(page.getByRole('heading', { name: 'Click heatmap', exact: true })).toBeVisible()
    return { layout, writes }
  }

  test('renders a correctly scaled overlay, saves settings, and never reuses a mismatched screenshot', async ({ page }) => {
    const { writes } = await install(page)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.getByText('signup', { exact: true })).toBeVisible()
    await expect.poll(() => page.locator('canvas').evaluate(canvas => {
      const x = Math.round(200 / 800 * canvas.width), y = Math.round(1000 / 1600 * canvas.height)
      return canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]
    })).toBeGreaterThan(0)
    const geometry = await page.locator('canvas').evaluate(canvas => {
      const r = canvas.getBoundingClientRect(), image = canvas.previousElementSibling.getBoundingClientRect()
      const x = Math.round(200 / 800 * canvas.width), y = Math.round(1000 / 1600 * canvas.height)
      return { width: r.width, height: r.height, imageWidth: image.width, imageHeight: image.height, alpha: canvas.getContext('2d').getImageData(x, y, 1, 1).data[3] }
    })
    expect(Math.abs(geometry.height / geometry.width - 2)).toBeLessThan(.01)
    expect(geometry.imageWidth).toBe(geometry.width); expect(Math.abs(geometry.imageHeight - geometry.height)).toBeLessThan(1)
    expect(geometry.alpha).toBeGreaterThan(0)
    await page.locator('summary').click()
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].body.paths).toEqual(['/pricing'])
    const options = await page.getByRole('combobox', { name: 'Page / version / viewport → document size (CSS pixels)' }).locator('option').all()
    await page.getByRole('combobox', { name: 'Page / version / viewport → document size (CSS pixels)' }).selectOption(await options[1].getAttribute('value'))
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByText('No screenshot matches this layout.', { exact: false })).toBeVisible()
    await page.screenshot({ path: '/tmp/zenstats-heatmap-ui.png', fullPage: true })
  })

  test('subaccounts can inspect data but cannot change settings or screenshots', async ({ page }) => {
    await install(page, true)
    await expect(page.locator('canvas')).toHaveCount(1)
    await page.locator('summary').click()
    await expect(page.getByRole('checkbox', { name: 'Enable click collection' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCount(0)
    await expect(page.locator('input[type=file]')).toHaveCount(0)
  })
})
