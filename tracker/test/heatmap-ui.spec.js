const { test, expect } = require('@playwright/test')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

test.describe('heatmap management', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page, subAccount = false, configOverrides = {}) {
    const layout = { aggregation_key:'software', hostname: 'example.test', path: '/pricing', version: 'v1', variant: 'default', viewport_width: 800, viewport_height: 600, document_width: 800, document_height: 1600 }
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
    let fixtureConfig={ screenshot_available:true,groups:[{path:'/pricing',key:'software',example_url:'https://example.test/pricing'}], enabled:true,paths:['/pricing'],sample_rate:.1,max_clicks:100,raw_days:7,aggregate_days:90,timezone:'Asia/Shanghai',...configOverrides }
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      const method = route.request().method()
      if (method !== 'GET') writes.push({ path: url.pathname, body: route.request().postDataJSON() })
      if (url.pathname.endsWith('/image')) return route.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') })
      let data = {}
      if (url.pathname.endsWith('/config')) {if(method==='PUT')fixtureConfig={...fixtureConfig,...route.request().postDataJSON()};data=fixtureConfig}
      if (url.pathname.endsWith('/pages')) data = [{ ...layout, path:url.searchParams.get('scope')==='key'?'/':layout.path, clicks: 3 }, { ...layout, path:url.searchParams.get('scope')==='key'?'/':layout.path, version: 'v2', clicks: 1 }]
      if (url.pathname.endsWith('/pages') && url.searchParams.get('path')==='/docs/*') data=[]
      if (url.pathname.endsWith('/snapshots')) data = [{ ...layout, id: 7, image_width: 400, image_height: 800, created_at: '2026-11-09T00:00:00Z', expires_at: '2027-01-01T00:00:00Z' }]
      if (url.pathname.endsWith('/capture')) data={...layout,id:8,source_url:'https://example.test/pricing',created_at:new Date().toISOString()}
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
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await expect(page.locator('form')).toHaveCount(0)
    await page.getByRole('button',{name:'Collection settings',exact:true}).click()
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].body.paths).toEqual(['/pricing'])
    expect(writes[0].body.groups[0].key).toBe('software')
    await page.goto(webURL+'/sites/example.test/heatmap')
    await expect(page.locator('canvas')).toHaveCount(1)
    const options = await page.getByRole('combobox', { name: 'Page / version / viewport → document size (CSS pixels)' }).locator('option').all()
    await page.getByRole('combobox', { name: 'Page / version / viewport → document size (CSS pixels)' }).selectOption(await options[1].getAttribute('value'))
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByText('No matching background.', { exact: false })).toBeVisible()
    await page.screenshot({ path: '/tmp/zenstats-heatmap-ui.png', fullPage: true })
  })

  test('subaccounts can inspect data but cannot change settings or screenshots', async ({ page }) => {
    await install(page, true)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.locator('input[type=file]')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Capture background',exact:true})).toHaveCount(0)
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await expect(page.getByRole('button',{name:'New heatmap',exact:true})).toHaveCount(0)
    await page.getByRole('button',{name:'software',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Heatmap details',exact:true})).toBeVisible()
    await expect(page.getByRole('button',{name:'Edit heatmap',exact:true})).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Delete heatmap',exact:true})).toHaveCount(0)
    await page.getByRole('button',{name:'Back to list',exact:true}).click()
    await page.getByRole('button',{name:'Collection settings',exact:true}).click()
    await expect(page.getByRole('checkbox', { name: 'Enable click collection' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCount(0)
    await expect(page.locator('input[type=file]')).toHaveCount(0)
  })
  test('key mode uses the example URL and selects a captured background',async({page})=>{
    const {writes}=await install(page)
    await page.getByRole('combobox',{name:'View by',exact:true}).selectOption('key')
    await expect(page.getByRole('textbox',{name:'Example URL',exact:true})).toHaveValue('https://example.test/pricing')
    await expect(page.locator('canvas')).toHaveCount(1)
    await page.getByRole('button',{name:'Capture background',exact:true}).click()
    await expect.poll(()=>writes.length).toBe(1)
    expect(writes[0].body.scope).toBe('key');expect(writes[0].body.page.aggregation_key).toBe('software')
    expect(writes[0].body.url).toBe('https://example.test/pricing')
    await expect(page.getByText('Background source:',{exact:false})).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(1)
  })


  test('list is the default; creating and cancelling are separate from saved entries',async({page})=>{
    const {writes}=await install(page)
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
    await expect(page.locator('form')).toHaveCount(0)
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByRole('button',{name:'New heatmap',exact:true}).click()
    await expect(page.getByRole('table')).toHaveCount(0)
    await page.getByRole('textbox',{name:'Path pattern',exact:true}).fill('/discard')
    await page.getByRole('button',{name:'Cancel',exact:true}).click()
    expect(writes).toHaveLength(0)
    await page.getByRole('button',{name:'New heatmap',exact:true}).click()
    await expect(page.getByRole('textbox',{name:'Path pattern',exact:true})).toHaveValue('')
    await page.getByRole('textbox',{name:'Path pattern',exact:true}).fill('/docs/*')
    await page.getByRole('button',{name:'Save settings',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Heatmap details',exact:true})).toBeVisible()
    expect(writes[0].body.paths).toEqual(['/pricing','/docs/*'])
    expect(writes[0].body.groups[0].key).toBe('software')
    await page.reload()
    await expect(page.getByRole('heading',{name:'Heatmap details',exact:true})).toBeVisible()
    await expect(page.getByRole('link',{name:'View heatmap',exact:true})).toHaveAttribute('href','/sites/example.test/heatmap?scope=url&path=%2Fdocs%2F*')
    await page.getByRole('button',{name:'Back to list',exact:true}).click()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(3)
    await page.getByRole('table').getByRole('row').filter({hasText:'/docs/*'}).getByRole('link',{name:'View heatmap'}).click()
    await expect.poll(()=>new URL(page.url()).searchParams.get('path')).toBe('/docs/*')
    await expect(page.getByText('Current heatmap:',{exact:false})).toContainText('/docs/*')
  })

  test('clicking an entry shows only its details and editing preserves other heatmaps and rule order',async({page})=>{
    const other={path:'/landing',key:'landing',example_url:'https://example.test/landing'}
    const {writes}=await install(page,false,{paths:['/pricing','/landing','/docs/*'],groups:[{path:'/pricing',key:'software',example_url:'https://example.test/pricing'},other]})
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await page.getByRole('button',{name:'software',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Heatmap details',exact:true})).toBeVisible()
    await expect(page.getByText('landing',{exact:true})).toHaveCount(0)
    await expect(page.locator('form')).toHaveCount(0)
    await page.getByRole('button',{name:'Edit heatmap',exact:true}).click()
    await expect(page.getByRole('textbox',{name:'Path pattern',exact:true})).toHaveValue('/pricing')
    await page.getByRole('textbox',{name:'Aggregation key',exact:true}).fill('software-v2')
    await page.getByRole('button',{name:'Save settings',exact:true}).click()
    await expect(page.getByRole('heading',{name:'software-v2',exact:true})).toBeVisible()
    expect(writes[0].body.groups).toEqual([{path:'/pricing',key:'software-v2',example_url:'https://example.test/pricing'},other])
    expect(writes[0].body.paths).toEqual(['/pricing','/landing','/docs/*'])
    await page.getByRole('button',{name:'Back to list',exact:true}).click()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
  })

  test('new aggregation heatmap adds its allowlist rule and collection settings stay site-wide',async({page})=>{
    const {writes}=await install(page,false,{groups:[],paths:[],enabled:false})
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.locator('form')).toHaveCount(0)
    await page.getByRole('button',{name:'New heatmap',exact:true}).click()
    await page.getByRole('combobox',{name:'View by',exact:true}).selectOption('key')
    await page.getByRole('textbox',{name:'Path pattern',exact:true}).fill('/soft/*.html')
    await page.getByRole('textbox',{name:'Aggregation key',exact:true}).fill('software-detail')
    await page.getByRole('textbox',{name:'Example URL',exact:true}).fill('https://example.test/soft/a.html')
    await page.getByRole('button',{name:'Save settings',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Heatmap details',exact:true})).toBeVisible()
    expect(writes[0].body.paths).toEqual(['/soft/*.html'])
    expect(writes[0].body.enabled).toBe(false)
    expect(writes[0].body.groups).toEqual([{path:'/soft/*.html',key:'software-detail',example_url:'https://example.test/soft/a.html'}])
    await page.getByRole('button',{name:'Back to list',exact:true}).click()
    await page.getByRole('button',{name:'Collection settings',exact:true}).click()
    await page.getByRole('checkbox',{name:'Enable click collection'}).check()
    await page.getByRole('button',{name:'Save settings',exact:true}).click()
    await expect(page.getByRole('table')).toBeVisible()
    expect(writes[1].body.enabled).toBe(true)
    expect(writes[1].body.groups).toEqual(writes[0].body.groups)
  })

  test('deleting entries preserves remaining configurations and disables collection after the last path',async({page})=>{
    const {writes}=await install(page,false,{paths:['/pricing','/docs/*']})
    await page.getByRole('link',{name:'Heatmap settings',exact:true}).click()
    await page.getByRole('button',{name:'software',exact:true}).click()
    page.once('dialog',dialog=>dialog.accept())
    await page.getByRole('button',{name:'Delete heatmap',exact:true}).click()
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
    expect(writes[0].body.groups).toEqual([])
    expect(writes[0].body.paths).toEqual(['/docs/*'])
    expect(writes[0].body.enabled).toBe(true)
    await page.getByRole('button',{name:'/docs/*',exact:true}).click()
    page.once('dialog',dialog=>dialog.accept())
    await page.getByRole('button',{name:'Delete heatmap',exact:true}).click()
    await expect(page.getByRole('table')).toHaveCount(0)
    expect(writes[1].body.paths).toEqual([])
    expect(writes[1].body.enabled).toBe(false)
  })
})
