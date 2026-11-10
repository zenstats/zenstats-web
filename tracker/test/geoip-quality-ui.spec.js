const { test, expect } = require('@playwright/test')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

test.describe('geolocation quality', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page, geoip) {
    await page.addInitScript(() => {
      for (const [key, value] of Object.entries({ token: 'fixture-token', email_verified: 'true', is_admin: 'true', user_type: 'user', 'zenstats-language': 'en' })) localStorage.setItem(key, value)
    })
    await page.route('**/api/**', route => {
      const now = '2026-11-10T00:00:00Z'
      const counters = { received: 10, accepted: 10, persisted: 10, filtered: 0, rejected: 0, failed: 0, requests: 10, invalid_requests: 0 }
      const heatmap = { instance_id: 'fixture', started_at: now, ...counters, pending: 0, retries: 0, oldest_age_seconds: 0, last_success: null, last_failure: null }
      const quality = { instance_id: 'fixture', started_at: now, timestamp: now, counters, pending: { events: 0, oldest_age_seconds: 0, stages: {} }, reasons: [], writers: {}, history: [], geoip }
      return route.fulfill({ json: { code: 200, data: route.request().url().includes('heatmap-quality') ? heatmap : quality } })
    })
    await page.goto(webURL + '/admin/ingestion-quality')
  }

  const status = { ready: true, database_type: 'GeoLite2-Country', built_at: '2026-11-01T00:00:00Z', city_available: false, stale: false, country_fallback_built_at: null, lookups: 120, country_found: 100, city_found: 0, not_public: 10, invalid: 5, not_found: 4, errors: 1 }

  test('country-only coverage explains missing cities', async ({ page }) => {
    await install(page, status)
    await expect(page.getByText('IP geolocation quality', { exact: true })).toBeVisible()
    await expect(page.getByText('This database provides countries only.', { exact: false })).toBeVisible()
    await expect(page.locator('dt').filter({ hasText: 'Country identified' }).locator('..').locator('dd')).toHaveText('100')
  })

  test('stale City database and supplemental date are visible', async ({ page }) => {
    await install(page, { ...status, database_type: 'GeoLite2-City', city_available: true, stale: true, built_at: '2025-04-22T09:09:52Z', country_fallback_built_at: '2026-11-05T00:00:00Z' })
    await expect(page.getByText('This database is over 45 days old.', { exact: false })).toBeVisible()
    await expect(page.getByText('Country fallback build date:', { exact: false })).toBeVisible()
    await expect(page.getByText('This database provides countries only.', { exact: false })).toHaveCount(0)
  })

  test('older API without GeoIP metadata remains usable', async ({ page }) => {
    await install(page, undefined)
    await expect(page.getByText('fixture', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('IP geolocation quality', { exact: true })).toHaveCount(0)
  })
})
