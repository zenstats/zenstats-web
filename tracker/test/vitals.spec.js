const { test, expect } = require('@playwright/test')
const fs = require('fs'), path = require('path'), esbuild = require('esbuild')
const realAsset = path.join(__dirname, '../dist/vitals.js')
// The adapter is unchanged; only official callbacks are controlled for revision
// and lifecycle cases. Other tests execute the real bundled official library.
const adapter = esbuild.buildSync({ stdin: { contents: fs.readFileSync(path.join(__dirname,'../src/vitals.js'),'utf8').replace("import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals'", `const observers = window.__vitalsObservers = {}; const [onLCP,onINP,onCLS,onTTFB,onFCP] = ['LCP','INP','CLS','TTFB','FCP'].map(n => cb => { observers[n] = cb; window.__registrationCount = (window.__registrationCount || 0) + 1 })`), resolveDir:__dirname }, write:false, bundle:true, format:'iife', target:'es2020' }).outputFiles[0].text
async function install(page, options={}) {
 const reports=[],errors=[],resources=[];page.on('pageerror',e=>errors.push(e.message))
 const config={enabled:options.enabled!==false,protocol_version:1,paths:['/*','/#/*'],sample_rate:1,config_version:1}
 await page.route('https://vitals.test/**',async route=>{
  const req=route.request(),url=new URL(req.url());resources.push(url.pathname)
  if(url.pathname==='/api/performance/config')return route.fulfill({json:config})
  if(url.pathname==='/api/performance/reports'){reports.push({body:req.postData(),payload:req.postDataJSON()});return route.fulfill({status:options.retry&&reports.length===1?503:202,headers:{'Retry-After':'1'},body:''})}
  if(url.pathname==='/api/event')return route.fulfill({status:202,body:''})
  if(url.pathname==='/js/vitals.js')return route.fulfill(options.real?{contentType:'application/javascript',path:realAsset}:{contentType:'application/javascript',body:adapter})
  if(url.pathname.startsWith('/js/'))return route.fulfill({contentType:'application/javascript',path:path.join(__dirname,'../dist',path.basename(url.pathname))})
  return route.fulfill({contentType:'text/html',body:`<html><head><title>Vitals test</title></head><body><h1>Paint candidate</h1><button id="interaction">Interact</button><script>window.__zenstats=true</script><script defer src="/js/${options.hash ? "script.hash.js" : "script.js"}" data-domain="vitals.test" ${options.optOut?'':'data-performance="true"'} data-performance-version="v1"></script></body></html>`})
 })
 await page.goto('https://vitals.test/?private=secret'+(options.hash?'#/home':''))
 if(!options.optOut&&options.enabled!==false)await expect.poll(()=>resources.includes('/js/vitals.js')).toBe(true)
 if(!options.real&&!options.optOut&&options.enabled!==false)await page.waitForFunction(()=>window.__vitalsObservers?.LCP)
 return {reports,errors,resources}
}
async function emit(page,name,value,extra={}) {
 await page.evaluate(({name,value,extra})=>window.__vitalsObservers[name]({name,value,id:'v6-'+name,navigationType:'navigate',navigationStartTime:0,navigationURL:'https://vitals.test/?secret=private',...extra}),{name,value,extra})
}
test('performance stays unloaded without both opt-ins',async({page})=>{
 const state=await install(page,{optOut:true});expect(state.resources.some(p=>p.includes('performance')||p.includes('vitals.js'))).toBe(false)
 const other=await install(page,{enabled:false});expect(other.resources.includes('/js/vitals.js')).toBe(false);expect(other.reports).toEqual([])
})
test('adapter freezes document path, registers once and keeps retries immutable',async({page})=>{
 const state=await install(page,{retry:true})
 await page.evaluate(()=>history.pushState(null,'','/new-route?token=private'))
 await emit(page,'LCP',5000);await emit(page,'LCP',1500);await emit(page,'CLS',0)
 await expect.poll(()=>state.reports.length).toBe(2)
 expect(state.reports[1].body).toBe(state.reports[0].body)
 const records=state.reports[0].payload.reports,context=records.find(r=>r.record_kind==='context'),lcp=records.filter(r=>r.metric_name==='LCP')
 expect(context.value).toBeUndefined();expect(lcp.map(r=>r.revision)).toEqual([1,2]);expect(lcp.map(r=>r.value)).toEqual([5000,1500])
 expect(records.every(r=>r.path==='/'&&r.lifecycle_id===context.lifecycle_id)).toBe(true)
 expect(records.some(r=>r.metric_name==='INP')).toBe(false)
 expect(state.reports[0].body).not.toMatch(/secret|private|new-route|user_id|session_id/)
 expect(await page.evaluate(()=>window.__registrationCount)).toBe(5);expect(state.errors).toEqual([])
})
test('BFCache has a new context and instance updates stay within it',async({page})=>{
 const state=await install(page);await emit(page,'LCP',1000)
 const stamp=await page.evaluate(()=>{const event=new PageTransitionEvent('pageshow',{persisted:true});window.dispatchEvent(event);return event.timeStamp})
 await emit(page,'LCP',1200,{id:'v6-LCP-restored',navigationType:'back-forward-cache',navigationStartTime:stamp})
 await expect.poll(()=>state.reports.length).toBeGreaterThan(0)
 const records=state.reports.flatMap(b=>b.payload.reports),contexts=records.filter(r=>r.record_kind==='context')
 expect(contexts).toHaveLength(2);expect(contexts[1].lifecycle_id).not.toBe(contexts[0].lifecycle_id)
 const restored=records.find(r=>r.metric_id==='v6-LCP-restored');expect(restored.lifecycle_id).toBe(contexts[1].lifecycle_id)
 expect(restored.navigation_started_at).toBe(contexts[1].navigation_started_at)
 expect(await page.evaluate(()=>window.__registrationCount)).toBe(5)
})
test('metric update budget is bounded and marks the final snapshot as clipped',async({page})=>{
 const state=await install(page);for(let i=0;i<40;i++)await emit(page,'INP',100+i)
 await expect.poll(()=>state.reports.flatMap(b=>b.payload.reports).filter(r=>r.metric_name==='INP').length).toBe(32)
 const inp=state.reports.flatMap(b=>b.payload.reports).filter(r=>r.metric_name==='INP')
 expect(inp.at(-1).clipped).toBe(true);expect(inp.at(-1).revision).toBe(32)
 expect(state.reports.every(b=>Buffer.byteLength(b.body)<=16384)).toBe(true)
})
test('official library reports real paint and zero CLS without inventing INP',async({page})=>{
 const state=await install(page,{real:true});await page.waitForTimeout(400)
 // LCP deliberately ignores synthetic visibility events; navigate to produce
 // the browser's trusted visibilitychange and verify the real exit transport.
 await page.goto('about:blank')
 await expect.poll(()=>state.reports.flatMap(b=>b.payload.reports).some(r=>r.metric_name==='CLS')).toBe(true)
 await expect.poll(()=>state.reports.flatMap(b=>b.payload.reports).some(r=>r.metric_name==='LCP'&&r.value>0)).toBe(true)
 const metrics=state.reports.flatMap(b=>b.payload.reports).filter(r=>r.record_kind==='metric')
 expect(metrics.some(r=>r.metric_name==='INP')).toBe(false);expect(metrics.find(r=>r.metric_name==='CLS').value).toBe(0)
 expect(metrics.some(r=>r.metric_name==='LCP'&&r.value>0)).toBe(true);expect(state.errors).toEqual([])
})
test('official library reports interaction with document URL after SPA changes',async({page})=>{
 const state=await install(page,{real:true});await page.evaluate(()=>history.pushState(null,'','/route-after-load?token=secret'))
 await page.locator('#interaction').click();await page.waitForTimeout(400)
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}))})
 await expect.poll(()=>state.reports.flatMap(b=>b.payload.reports).some(r=>r.metric_name==='INP')).toBe(true)
 const metrics=state.reports.flatMap(b=>b.payload.reports).filter(r=>r.record_kind==='metric')
 expect(metrics.every(r=>r.path==='/')).toBe(true);expect(state.errors).toEqual([])
})

 test('hash routes retain the initial document hash when NavigationTiming omits it',async({page})=>{
 const state=await install(page,{hash:true});await emit(page,'LCP',1200)
 await expect.poll(()=>state.reports.flatMap(b=>b.payload.reports).some(r=>r.metric_name==='LCP'&&r.path==='/#/home')).toBe(true)
 expect(state.errors).toEqual([])
})
 test('unsupported paint and interaction APIs retain context and independent TTFB',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(PerformanceObserver,'supportedEntryTypes',{get:()=>[]}))
 const state=await install(page,{real:true})
 await expect.poll(()=>state.reports.length).toBeGreaterThan(0)
 const reports=state.reports.flatMap(b=>b.payload.reports)
 expect(reports.find(r=>r.record_kind==='context').supported_metrics).toEqual(['TTFB'])
 expect(reports.filter(r=>r.record_kind==='metric').every(r=>r.metric_name==='TTFB')).toBe(true)
 expect(state.errors).toEqual([])
})
