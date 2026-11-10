const { test, expect } = require('@playwright/test')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

const graph = {
  total_sessions: 10, drop_off_sessions: 4, drop_off_rate: 40,
  nodes: [
    { id: 'a', name: '/landing', depth: 0 },
    { id: 'b', name: '/docs', depth: 1 },
    { id: 'end', name: '(exit)', depth: 1, is_dropoff: true },
    { id: 'c', name: '/pricing', depth: 2 },
    { id: 'other', name: '(other)', depth: 2, is_other: true },
  ],
  links: [{ source: 0, target: 1, value: 6 }, { source: 0, target: 2, value: 4 }, { source: 1, target: 3, value: 5 }, { source: 1, target: 4, value: 1 }],
}

test.describe('user flows', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page, respond) {
    const errors = [], requests = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      for (const [key, value] of Object.entries({ token: 'fixture', email_verified: 'true', user_type: 'user', 'zenstats-language': 'en' })) localStorage.setItem(key, value)
    })
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/user-flows')) {
        requests.push(url)
        if (respond) return respond(route, url)
        return route.fulfill({ json: { code: 200, data: graph } })
      }
      let data = []
      if (url.pathname === '/api/sites') data = [{ id: 1, domain: 'example.test', is_verified: true }]
      if (url.pathname.endsWith('/aggregate')) data = { results: {} }
      if (url.pathname.endsWith('/breakdown')) data = { data: [], total_rows: 0 }
      if (url.pathname.endsWith('/current-visitors')) data = { total: 0 }
      return route.fulfill({ json: { code: 200, data } })
    })
    const filters = JSON.stringify([['is', 'visit:country', ['CN']]])
    await page.goto(webURL + '/sites/example.test/stats?period=p30&filters=' + encodeURIComponent(filters))
    await page.getByRole('button', { name: 'User Flows', exact: true }).click()
    return { errors, requests, filters }
  }

  test('keeps filter scope, a common flow scale and readable mobile geometry', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { errors, requests, filters } = await install(page)
    const chart = page.getByRole('img', { name: 'Page Navigation Paths', exact: true })
    await expect(chart).toBeVisible()
    expect(requests.at(-1).searchParams.get('filters')).toBe(filters)
    expect(requests.at(-1).searchParams.get('period')).toBe('p30')
    const geometry = await chart.evaluate(svg => {
      const links = [...svg.querySelectorAll('.links-layer path')].map(path => Number(path.getAttribute('stroke-width')))
      const boxes = [...svg.querySelectorAll('.nodes-layer > g')].map(g => {
        const rect = g.querySelector('rect'), position = g.transform.baseVal.getItem(0).matrix
        return { x: position.e, y: position.f, w: Number(rect.getAttribute('width')), h: Number(rect.getAttribute('height')) }
      })
      return { links, boxes, w: Number(svg.getAttribute('width')), h: Number(svg.getAttribute('height')) }
    })
    expect(geometry.links[0] / geometry.links[1]).toBeCloseTo(6 / 4)
    for (const box of geometry.boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(geometry.w)
      expect(box.y + box.h).toBeLessThanOrEqual(geometry.h)
    }
    await expect(page.getByRole('button', { name: 'Use as First Page: (other)', exact: true })).toHaveCount(0)
    await page.getByRole('textbox', { name: 'First observed page', exact: true }).fill('/docs')
    await page.getByRole('textbox', { name: 'First observed page', exact: true }).press('Enter')
    await expect.poll(() => requests.at(-1).searchParams.get('entry_path')).toBe('/docs')
    expect(errors).toEqual([])
  })

  test('resource errors remain errors and retry can recover', async ({ page }) => {
    let fail = true
    const { errors } = await install(page, route => route.fulfill({ json: fail ? { code: 503, message: 'busy' } : { code: 200, data: graph } }))
    await expect(page.getByRole('alert')).toContainText('Unable to load page flows')
    await expect(page.getByText('No Flow Data', { exact: true })).toHaveCount(0)
    fail = false
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Page Navigation Paths', exact: true })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a late response cannot overwrite a newer step selection', async ({ page }) => {
    let finishOld, oldArrived
    const oldReady = new Promise(resolve => { oldArrived = resolve })
    const pending = new Promise(resolve => { finishOld = resolve })
    await install(page, async (route, url) => {
      if (url.searchParams.get('steps') === '3') {
        oldArrived()
        await pending
        return route.fulfill({ json: { code: 200, data: { ...graph, nodes: [{ id: 'late', name: '/late', depth: 0 }], links: [] } } }).catch(() => {})
      }
      return route.fulfill({ json: { code: 200, data: graph } })
    })
    await oldReady
    await page.getByRole('button', { name: '2 Steps', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Page Navigation Paths', exact: true })).toBeVisible()
    finishOld()
    await expect(page.getByRole('button', { name: 'Use as First Page: /late', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Use as First Page: /landing', exact: true })).toBeVisible()
  })
})
