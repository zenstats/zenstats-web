const { test, expect } = require('@playwright/test')
const webURL = process.env.ZENSTATS_WEB_TEST_URL

test.describe('heatmap management', () => {
  test.skip(!webURL, 'set ZENSTATS_WEB_TEST_URL to a running frontend')

  async function install(page, subAccount = false, configOverrides = {}, normalized = true) {
    const layout = { aggregation_key:'software', hostname: 'example.test', path: '/pricing', version: 'v1', variant: 'default', viewport_width: 800, viewport_height: 600, document_width: 800, document_height: 1600 }
    const representative = { ...layout, viewport_width: 768, viewport_height: 1024, document_width: 768, document_height: 1024 }
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
      if (url.pathname.endsWith('/pages')) data = [{ ...(normalized ? representative : layout), path:url.searchParams.get('scope')==='key'?'/':layout.path, clicks: 3 }, { ...(normalized ? representative : layout), path:url.searchParams.get('scope')==='key'?'/':layout.path, version: 'v2', clicks: 1 }]
      if (url.pathname.endsWith('/pages') && url.searchParams.get('path')==='/docs/*') data=[]
      if (url.pathname.endsWith('/snapshots')) data = [{ ...layout, id: 7, image_width: 400, image_height: 800, created_at: '2026-11-09T00:00:00Z', expires_at: '2027-01-01T00:00:00Z' }]
      if (url.pathname.endsWith('/capture')) data={...layout,image_width:400,image_height:800,id:8,source_url:'https://example.test/pricing',created_at:new Date().toISOString()}
      if (url.pathname.endsWith('/data')) data = { ...(normalized ? {coordinate_space:'normalized',grid_columns:40,grid_rows:80} : {}), points: [normalized ? {x:29,y:64,count:2} : { x: 192, y: 992, count: 2 }], elements: [{ element: 'signup', count: 3 }], clicks: 3, unmapped: 1, truncated: false, grid_size: 16 }
      return route.fulfill({ json: { code: 200, message: 'success', data } })
    })
    await page.goto(webURL + '/sites/example.test/heatmap')
    await expect(page.getByText('Click heatmap', { exact: true })).toBeVisible()
    return { layout, writes }
  }

  async function installScroll(page, subAccount = false, background = true) {
    const fixture = await install(page, subAccount, { clicks_enabled: false, scroll_enabled: true })
    const requests = []
    const scrollData = {
      sampled_views: 40, valid_views: 30, dynamic_views: 5, clipped_views: 2,
      unsupported_views: 3, late_init_views: 4, average_max_depth: 65,
      average_fold: 37.5, mixed_sampling: false, raw_days: 7,
      regions: Array.from({ length: 80 }, (_, i) => ({ depth: (i + 1) * 1.25, views: i < 40 ? 30 : 15, rate: i < 40 ? 100 : 50 })),
    }
    await page.route('**/heatmap/scroll/**', route => {
      const url = new URL(route.request().url()); requests.push(url)
      const data = url.pathname.endsWith('/pages')
        ? [{ ...fixture.layout, path: url.searchParams.get('scope') === 'key' ? '/' : '/pricing', sampled_views: 40 }]
        : scrollData
      return route.fulfill({ json: { code: 200, data } })
    })
    if (!background) await page.route('**/heatmap/snapshots', route => route.fulfill({ json: { code: 200, data: [] } }))
    await page.getByRole('button', { name: 'Scroll depth', exact: true }).click()
    await expect(page.getByText('Valid sampled page views', { exact: true })).toBeVisible()
    return { ...fixture, requests }
  }

  test('scroll uses independent page views, eighty bands and aggregation backgrounds', async ({ page }) => {
    const { requests } = await installScroll(page)
    await expect(page.getByTestId('scroll-band')).toHaveCount(80)
    await expect(page.getByRole('button', { name: 'Reached 50% depth' })).toContainText('100.0%')
    await expect(page.getByRole('button', { name: 'Reached 100% depth' })).toContainText('50.0%')
    await expect(page.getByText('Average initial fold 37.5%', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Page / version / device' })).toContainText('40 sampled page views')
    await page.getByRole('slider', { name: 'Depth to inspect' }).fill('79')
    await expect(page.getByText('Depth 100.00%: 15 / 30 valid sampled views (50.0%).', { exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'View by' }).selectOption('key')
    await expect.poll(() => requests.some(u => u.pathname.endsWith('/data') && u.searchParams.get('scope') === 'key')).toBe(true)
    await expect(page.getByTestId('scroll-band')).toHaveCount(80)
    await expect(page.getByRole('textbox', { name: 'Example URL' })).toHaveValue('https://example.test/pricing')
    await expect(page).toHaveURL(/mode=scroll/)
    await page.screenshot({ path: '/tmp/zenstats-scroll-ui.png', fullPage: true })
  })

  test('scroll remains inspectable without a screenshot and respects read-only access', async ({ page }) => {
    const { writes } = await installScroll(page, true, false)
    await expect(page.getByText('Sampled page views', { exact: true })).toBeVisible()
    await expect(page.getByText('No matching background.', { exact: false })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Depth to inspect' })).toBeVisible()
    await expect(page.getByTestId('scroll-band')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Capture screenshot', exact: true })).toHaveCount(0)
    expect(writes).toEqual([])
  })

  test('click and scroll collection switches are saved independently', async ({ page }) => {
    const { writes } = await install(page)
    await page.getByRole('link', { name: 'Heatmap settings', exact: true }).click()
    await page.getByRole('button', { name: 'Collection settings', exact: true }).click()
    await expect(page.getByRole('checkbox', { name: 'Collect clicks', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Collect scroll depth', exact: true })).not.toBeChecked()
    await page.getByRole('checkbox', { name: 'Collect clicks', exact: true }).uncheck()
    await page.getByRole('checkbox', { name: 'Collect scroll depth', exact: true }).check()
    await page.getByRole('button', { name: 'Save settings', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].body.clicks_enabled).toBe(false)
    expect(writes[0].body.scroll_enabled).toBe(true)
    await expect(page.getByText('Click collection: Disabled · Scroll collection: Enabled', { exact: true })).toBeVisible()
  })

  test('renders percentage regions on a different sized background, saves settings, and separates versions', async ({ page }) => {
    const { writes } = await install(page)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.getByText('signup', { exact: true })).toBeVisible()
    await expect.poll(() => page.locator('canvas').evaluate(canvas => {
      const x = Math.round(29.5 / 40 * canvas.width), y = Math.round(64.5 / 80 * canvas.height)
      return canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]
    })).toBeGreaterThan(0)
    const geometry = await page.locator('canvas').evaluate(canvas => {
      const r = canvas.getBoundingClientRect(), image = canvas.previousElementSibling.getBoundingClientRect()
      const x = Math.round(29.5 / 40 * canvas.width), y = Math.round(64.5 / 80 * canvas.height)
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
    const options = await page.getByRole('combobox', { name: 'Page / version / device' }).locator('option').all()
    await page.getByRole('combobox', { name: 'Page / version / device' }).selectOption(await options[1].getAttribute('value'))
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByText('No matching background.', { exact: false })).toBeVisible()
    await page.screenshot({ path: '/tmp/zenstats-heatmap-ui.png', fullPage: true })
  })

  test('keeps legacy CSS point responses usable', async ({page})=>{
    await install(page,false,{},false)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect.poll(()=>page.locator('canvas').evaluate(canvas=>{
      const x=Math.round(200/800*canvas.width), y=Math.round(1000/1600*canvas.height)
      return canvas.getContext('2d').getImageData(x,y,1,1).data[3]
    })).toBeGreaterThan(0)
  })

  test('a screenshot from a different device cannot be used for the selected page',async({page})=>{
    await install(page)
    await page.route('**/heatmap/snapshots',route=>route.fulfill({json:{code:200,data:[{
      aggregation_key:'software',hostname:'example.test',path:'/pricing',version:'v1',variant:'default',
      viewport_width:390,viewport_height:844,document_width:390,document_height:1600,
      id:9,image_width:390,image_height:1600,created_at:'2026-11-09T00:00:00Z'
    }]}}))
    await page.reload()
    await expect(page.getByText('No matching background.',{exact:false})).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)
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
    await expect(page.getByRole('checkbox', { name: 'Enable heatmap collection' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCount(0)
    await expect(page.locator('input[type=file]')).toHaveCount(0)
  })
  test('key mode uses the example URL and selects a captured background',async({page})=>{
    const {writes}=await install(page)
    await page.getByRole('button',{name:'Aggregation key',exact:true}).click()
    await expect(page.locator('canvas')).toHaveCount(1)
    await page.getByRole('button',{name:'Capture background',exact:true}).click()
    await expect(page.locator('form input[type=url]')).toHaveValue('https://example.test/pricing')
    await page.locator('form').getByRole('button',{name:'Capture background',exact:true}).click()
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
    await expect(page.getByText('Current heatmap:',{exact:true}).locator('..')).toContainText('/docs/*')
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
    await page.getByRole('checkbox',{name:'Enable heatmap collection'}).check()
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
