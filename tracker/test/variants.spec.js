const { test, expect } = require('@playwright/test')
const fs = require('fs'), path = require('path')
const { features, aliases } = require('../variants.json')
const dist = path.join(__dirname, '../dist')

test('every compiled variant includes only its selected optional loaders', () => {
  const files = fs.readdirSync(dist).filter(file => /^script\.(?:bare|(?:ex|fd|ha|hm|ma|ol|pf|te)(?:\.(?:ex|fd|ha|hm|ma|ol|pf|te))*)\.js$/.test(file))
  expect(files).toHaveLength(2 ** features.length)
  for (const file of files) {
    const ids = file.split('.').slice(1, -1)
    const source = fs.readFileSync(path.join(dist, file), 'utf8')
    expect(source.includes('data-heatmap'), file).toBe(ids.includes('hm'))
    expect(source.includes('__zenstatsHeatmap'), file).toBe(ids.includes('hm'))
    expect(source.includes('data-performance'), file).toBe(ids.includes('pf'))
    expect(source.includes('__zenstatsVitals'), file).toBe(ids.includes('pf'))
  }
  for (const [canonical, alias] of Object.entries(aliases)) {
    expect(fs.readFileSync(path.join(dist, alias + '.js'), 'utf8')).toBe(fs.readFileSync(path.join(dist, canonical + '.js'), 'utf8'))
  }
})

for (const variant of ['script.js', 'script.hash.js', 'script.bare.js', 'script.heatmap.js', 'script.performance.js', 'script.heatmap.performance.js']) {
  test(`${variant} honors build capabilities even when both runtime attributes are set`, async ({ page }) => {
    const resources = [], events = [], errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://variants.test/**', route => {
      const request = route.request(), url = new URL(request.url())
      resources.push(url.pathname)
      if (url.pathname === '/js/' + variant) return route.fulfill({ contentType: 'application/javascript', path: path.join(dist, variant) })
      if (url.pathname === '/js/heatmap.js') return route.fulfill({ contentType: 'application/javascript', body: 'window.__zenstatsHeatmap={start:function(){},page:function(){}}' })
      if (url.pathname === '/js/vitals.js') return route.fulfill({ contentType: 'application/javascript', body: 'window.__zenstatsVitals={start:function(){}}' })
      if (url.pathname === '/api/performance/config') return route.fulfill({ json: { enabled: true, protocol_version: 1, paths: ['/*'], sample_rate: 1, config_version: 1 } })
      if (url.pathname === '/api/event') {
        const payload = request.postDataJSON()
        events.push(...(payload.n === 'batch' ? payload.e : [payload]))
        return route.fulfill({ status: 202, body: '' })
      }
      return route.fulfill({ contentType: 'text/html', body: `<html><body><h1>Variant check</h1><script>window.__zenstats=true</script><script defer src="/js/${variant}" data-domain="variants.test" data-heatmap="true" data-performance="true"></script></body></html>` })
    })
    await page.goto('https://variants.test/')
    // Ordinary pageviews must still work when optional capabilities are absent.
    await expect.poll(() => events.some(event => event.n === 'pageview')).toBe(true)
    expect(resources.includes('/js/heatmap.js')).toBe(variant.includes('heatmap'))
    expect(resources.includes('/api/performance/config')).toBe(variant.includes('performance'))
    expect(resources.includes('/js/vitals.js')).toBe(variant.includes('performance'))
    expect(errors).toEqual([])
  })
}
