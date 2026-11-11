const { test, expect } = require('@playwright/test')
const webURL=process.env.ZENSTATS_WEB_TEST_URL
function data() {
 return {sampled_navigations:120,eligible_navigations:118,late_init_navigations:3,background_init_navigations:2,mixed_sampling:false,mixed_config:false,overall:'insufficient',raw_days:7,timezone:'Asia/Shanghai',generated_at:'2026-11-10T08:00:00Z',
 metrics:['LCP','INP','CLS','TTFB','FCP'].map(name=>({name,unit:name==='CLS'?'score':'ms',p75:name==='INP'?null:name==='CLS'?0:1200,samples:name==='INP'?0:110,supported_navigations:118,missing_navigations:name==='INP'?118:8,coverage:name==='INP'?0:93.2,good:110,needs_improvement:0,poor:0,clipped:0,small_sample:name==='INP',rating:name==='INP'?'insufficient':'good'})),
 trend:[{day:'2026-11-09',samples:100,p75:1200}],pages:[{hostname:'example.test',path:'/pricing',samples:110,p75:1200,good:110,needs_improvement:0,poor:0}]}
}
test.describe('performance workspace',()=>{
 test.skip(!webURL,'set ZENSTATS_WEB_TEST_URL to a running frontend')
 async function install(page,sub=false) {
  const requests=[],writes=[],errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(sub=>{for(const[k,v]of Object.entries({token:'fixture-token',email_verified:'true',user_type:sub?'sub_account':'user','zenstats-language':'en'}))localStorage.setItem(k,v)},sub)
  let config={enabled:true,paths:['/*','/docs/*'],sample_rate:.1,raw_days:7,timezone:'Asia/Shanghai',config_version:1,can_write:!sub}
  await page.route('**/api/**',route=>{
   const url=new URL(route.request().url());requests.push(url)
   if(route.request().method()==='PUT'){writes.push(route.request().postDataJSON());config={...config,...writes.at(-1),config_version:2}}
   return route.fulfill({json:{code:200,data:url.pathname.endsWith('/config')?config:data()}})
  })
  await page.goto(webURL+'/sites/example.test/performance')
  await expect(page.getByRole('heading',{name:'Core Web Vitals',exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'INP',exact:true})).toBeVisible()
  return {requests,writes,errors}
 }
 test('missing INP remains missing, zero CLS is visible, and the settings entry is usable',async({page})=>{
  const state=await install(page)
  await expect(page.getByRole('region',{name:'INP',exact:true})).toContainText('—')
  await expect(page.getByRole('region',{name:'INP',exact:true})).toContainText('Insufficient data')
  await expect(page.getByRole('region',{name:'CLS',exact:true})).toContainText('0.000')
  await expect(page.getByText('Core Web Vitals status: Insufficient data',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Performance settings',exact:true}).click()
  await expect(page.getByRole('checkbox',{name:'Enable performance collection'})).toBeChecked()
  await page.getByRole('checkbox',{name:'Enable performance collection'}).uncheck()
  await page.getByRole('button',{name:'Save settings',exact:true}).click()
  await expect.poll(()=>state.writes.length).toBe(1)
  expect(state.writes[0].enabled).toBe(false);expect(state.writes[0].paths).toEqual(['/*','/docs/*'])
  await expect(page.locator('pre')).toContainText('data-performance="true"')
  expect(state.errors).toEqual([])
 })
 test('metric, device and page filters reach the dedicated API; read-only members cannot edit',async({page})=>{
  const state=await install(page,true)
  await page.getByRole('combobox',{name:'Trend / ranking metric'}).selectOption('CLS')
  await page.getByRole('combobox',{name:'Device',exact:true}).selectOption('mobile')
  await page.getByRole('textbox',{name:'Page path / pattern'}).fill('/docs/*')
  await page.getByRole('button',{name:'Apply filters',exact:true}).click()
  await expect.poll(()=>state.requests.some(u=>u.pathname.endsWith('/performance/data')&&u.searchParams.get('metric')==='CLS'&&u.searchParams.get('device')==='mobile'&&u.searchParams.get('path')==='/docs/*')).toBe(true)
  await page.getByRole('link',{name:'Performance settings',exact:true}).click()
  await expect(page.getByRole('checkbox',{name:'Enable performance collection'})).toBeDisabled()
  await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeDisabled()
  expect(state.writes).toEqual([])
 })
 test('resource failures remain errors and a retry can recover',async({page})=>{
  await install(page)
  await page.route('**/performance/data?**',route=>route.fulfill({status:503,json:{code:503,message:'service unavailable'}}))
  await page.getByRole('button',{name:'Refresh',exact:true}).click()
  await expect(page.getByRole('alert').filter({hasText:'Performance data is unavailable'})).toBeVisible()
  await page.unroute('**/performance/data?**')
  await page.getByRole('button',{name:'Retry',exact:true}).click()
  await expect(page.getByRole('region',{name:'INP',exact:true})).toBeVisible()
 })
})
