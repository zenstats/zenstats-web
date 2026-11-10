const { test, expect } = require('@playwright/test')
const path = require('path')

async function install(page, options = {}) {
  const batches = [], events = [], errors = [], resources = []
  let config = { groups:options.groups||[], enabled: true, protocol_version: 1, paths: ['/*', '/#/*'], sample_rate: 1, max_clicks: 100 }
  if (options.legacy) delete config.groups
  const html = `<html><head><style>body{margin:0;height:2400px}button{width:120px;height:60px}#normal{position:absolute;left:200px;top:1100px}#fixed{position:fixed;right:0;top:0}#sticky{position:sticky;top:0;left:0}#scroll{position:absolute;top:100px;left:400px;height:100px;width:160px;overflow:auto}#scroll div{height:400px}</style></head><body>
    <button id="fixed" data-zs-id="fixed">Fixed</button><button id="sticky" data-zs-id="sticky">Sticky</button>
    <div id="scroll"><div><button data-zs-id="nested">Nested</button></div></div>
    <button id="normal" data-zs-id="signup"><span>Private text</span></button>
    <div data-zs-ignore><button id="ignore">Secret</button></div><form><button id="form" type="button">Submit</button></form><button id="safe" style="position:absolute;top:350px">Safe</button>
    <script>window.__zenstats=true</script><script defer data-domain="example.com" ${options.optOut ? '' : 'data-heatmap="true"'} data-heatmap-version="v1" data-heatmap-key="${options.key||''}" src="/js/${options.hash ? 'script.hash.js' : 'script.js'}"></script></body></html>`
  page.on('pageerror', error => errors.push(error.message))
  await page.route('https://example.com/**', async route => {
    const req = route.request(), url = new URL(req.url())
    resources.push(url.pathname)
    if (url.pathname === '/api/heatmap/config') return route.fulfill({ json: config })
    if (url.pathname === '/api/heatmap/clicks') {
      batches.push({ body: req.postData(), payload: req.postDataJSON() })
      return route.fulfill({ status: options.failFirst && batches.length === 1 ? 503 : 202, headers: { 'Retry-After': '1' }, body: '' })
    }
    if (url.pathname === '/api/event') {
      const payload = req.postDataJSON(); events.push(...(payload.n === 'batch' ? payload.e : [payload]))
      return route.fulfill({ status: 202, body: '' })
    }
    if (url.pathname.startsWith('/js/')) return route.fulfill({ contentType: 'application/javascript', path: path.join(__dirname, '../dist', path.basename(url.pathname)) })
    return route.fulfill({ contentType: 'text/html', body: html })
  })
  const time = new Date('2026-11-09T00:00:00Z')
  await page.clock.install({ time }); await page.clock.pauseAt(time)
  await page.goto('https://example.com/' + (options.hash ? '#/home?secret=private' : '?secret=private'))
  if (!options.optOut) {
    await expect.poll(() => resources.filter(p => p === '/api/heatmap/config').length).toBe(1)
    await page.evaluate(() => Promise.resolve())
  }
  return { batches, events, errors, resources, setConfig: patch => { config = { ...config, ...patch } } }
}
async function flush(page) { await page.clock.runFor(2100) }

test('heatmap stays unloaded without explicit opt-in', async ({ page }) => {
  const state = await install(page, { optOut: true })
  await page.locator('#safe').click(); await flush(page)
  expect(state.resources.some(p => p.includes('heatmap'))).toBe(false)
  expect(state.events.filter(e => e.n === 'pageview')).toHaveLength(1)
  expect(state.errors).toEqual([])
})

test('CSS coordinates survive scrolling and DPR, with only stable labels and no private content', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 })
  const page = await context.newPage(), state = await install(page)
  await page.locator('#normal').click()
  const expected = await page.locator('#normal').evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2 } })
  await flush(page)
  await expect.poll(() => state.batches.length).toBe(1)
  const click = state.batches[0].payload.clicks[0]
  expect(click.page.viewport_width).toBe(1000)
  expect(click.page.path).toBe('/')
  expect(click.x).toBeCloseTo(expected.x, 0); expect(click.y).toBeCloseTo(expected.y, 0)
  expect(click.relative_x).toBeCloseTo(.5, 1); expect(click.relative_y).toBeCloseTo(.5, 1)
  expect(click.element).toBe('signup'); expect(click.position).toBe('document')
  expect(state.batches[0].body).not.toMatch(/secret|private|Private|textContent|selector|user_id|session_id|user_agent/)
  expect(state.events.filter(e => !['pageview', 'engagement'].includes(e.n))).toEqual([])
  expect(state.errors).toEqual([])
  await context.close()
})

test('forms, ignored regions, keyboard and synthetic clicks are excluded; special positioning stays unmapped', async ({ page }) => {
  const state = await install(page)
  await page.locator('#ignore').click(); await page.locator('#form').click()
  await page.locator('#safe').focus(); await page.keyboard.press('Enter')
  await page.locator('#safe').evaluate(el => el.click())
  await page.locator('#fixed').click(); await page.locator('#sticky').click(); await page.locator('#scroll button').click()
  await flush(page)
  await expect.poll(() => state.batches.length).toBe(1)
  expect(state.batches[0].payload.clicks.map(c => c.position)).toEqual(['fixed', 'sticky', 'scroll'])
  expect(state.errors).toEqual([])
})

test('hash navigation preserves queued page identity and strips query values', async ({ page }) => {
  const state = await install(page, { hash: true })
  await page.locator('#safe').click()
  await page.evaluate(() => { history.pushState(null, '', '/#/pricing?secret=other'); dispatchEvent(new HashChangeEvent('hashchange')) })
  await page.locator('#safe').click(); await flush(page); await flush(page)
  await expect.poll(() => state.batches.flatMap(b => b.payload.clicks).length).toBe(2)
  expect(state.batches.flatMap(b => b.payload.clicks).map(c => c.page.path)).toEqual(['/#/home', '/#/pricing'])
  expect(state.events.filter(e => e.n === 'pageview')).toHaveLength(2)
  expect(state.errors).toEqual([])
})

test('retry keeps the body and click IDs stable and page limit bounds new clicks', async ({ page }) => {
  const state = await install(page, { failFirst: true })
  state.setConfig({ max_clicks: 2 }); await page.clock.runFor(30100)
  await page.locator('#safe').click(); await page.locator('#safe').click(); await page.locator('#safe').click()
  await flush(page); await expect.poll(() => state.batches.length).toBe(1)
  await page.clock.runFor(1100); await expect.poll(() => state.batches.length).toBe(2)
  expect(state.batches[0].body).toBe(state.batches[1].body)
  expect(state.batches[0].payload.clicks).toHaveLength(2)
  expect(Buffer.byteLength(state.batches[0].body)).toBeLessThanOrEqual(16384)
  expect(state.errors).toEqual([])
})

test('configuration disable and recovery retain the original per-page sampling rate', async ({ page }) => {
  const state = await install(page)
  state.setConfig({ enabled: false }); await page.clock.runFor(30100)
  await page.locator('#safe').click(); await flush(page); expect(state.batches).toHaveLength(0)
  state.setConfig({ enabled: true, sample_rate: .01 }); await page.clock.runFor(30100)
  await page.locator('#safe').click(); await flush(page)
  await expect.poll(() => state.batches.length).toBe(1)
  expect(state.batches[0].payload.sample_rate).toBe(1)
  expect(state.errors).toEqual([])
})


test('aggregation key uses the first configured path rule over the script key',async({page})=>{
  const state=await install(page,{key:'script-key',groups:[{path:'/*',key:'template-key'},{path:'/*',key:'later'}]})
  await page.locator('#safe').click();await flush(page)
  await expect.poll(()=>state.batches.length).toBe(1)
  expect(state.batches[0].payload.clicks[0].page.aggregation_key).toBe('template-key')
  expect(state.batches[0].payload.clicks[0].page.path).toBe('/')
})
test('tracker supplied aggregation key works without a path mapping',async({page})=>{
  const state=await install(page,{key:'script-key'})
  await page.locator('#safe').click();await flush(page)
  await expect.poll(()=>state.batches.length).toBe(1)
  expect(state.batches[0].payload.clicks[0].page.aggregation_key).toBe('script-key')
})

test('new tracker omits aggregation fields when an older API lacks the capability',async({page})=>{
  const state=await install(page,{key:'script-key',legacy:true})
  await page.locator('#safe').click();await flush(page)
  await expect.poll(()=>state.batches.length).toBe(1)
  expect(state.batches[0].payload.clicks[0].page).not.toHaveProperty('aggregation_key')
  expect(state.errors).toEqual([])
})
