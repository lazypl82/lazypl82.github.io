// Synthetic screenshots only. Never launch a browser on the founder's Mac.
if (process.platform !== 'linux' || process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true') throw new Error('REMOTE_LINUX_RENDER_ONLY');
const {readFile,writeFile,mkdir}=await import('node:fs/promises');
const {resolve,join}=await import('node:path');
const {pathToFileURL}=await import('node:url');
const {execFileSync}=await import('node:child_process');
const {createRequire}=await import('node:module');
const {createHash}=await import('node:crypto');
const {createServer}=await import('node:http');
const assert=(await import('node:assert/strict')).default;
const siteRoot=resolve(process.env.FORMBELL_HELP_SITE_ROOT||process.cwd()),productRoot=resolve(process.env.FORMBELL_HELP_PRODUCT_ROOT||join(siteRoot,'.render-product-v4')),output=resolve(siteRoot,'.artifacts/help-v4');
const productSource='012b78c3342a493aa4aa1712cd5f98b17cc0ae97',siteBase='0edf8eeee7a3d1ba3b482f9c78c565dfb0ad4d1e';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:productRoot,encoding:'utf8'}).trim(),productSource);
execFileSync('git',['diff','--exit-code',productSource,'--','src/','scripts/sidebar-ui.mjs'],{cwd:productRoot,stdio:'pipe'});
const sha=value=>createHash('sha256').update(value).digest('hex'),sourceHashes={};
for(const name of ['src/gas/Sidebar.html','src/ui/sidebar.css','src/ui/browser-model.ts','scripts/sidebar-ui.mjs','scripts/help-product-fixture.mjs','scripts/listing-product-fixture.mjs']){
 const bytes=await readFile(join(productRoot,name));assert.ok(bytes.equals(execFileSync('git',['show',productSource+':'+name],{cwd:productRoot})));sourceHashes[name]=sha(bytes);
}
await mkdir(output,{recursive:true});
const require=createRequire(join(productRoot,'package.json')),{build}=require('esbuild');
const result=await build({entryPoints:[join(productRoot,'src/core/index.ts')],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
await writeFile(join(output,'render-core.mjs'),result.outputFiles[0].text);const core=await import(pathToFileURL(join(output,'render-core.mjs')));
const {listingFixture,browserBridge,exampleNow}=await import(pathToFileURL(join(productRoot,'scripts/listing-product-fixture.mjs')));
const {helpFixture}=await import(pathToFileURL(join(productRoot,'scripts/help-product-fixture.mjs')));
const {buildSidebarHtml}=await import(pathToFileURL(join(productRoot,'scripts/sidebar-ui.mjs')));
const {openLocalBrowser}=await import(pathToFileURL(join(productRoot,'scripts/headless-local-render.mjs')));
process.chdir(productRoot);const html=await buildSidebarHtml();process.chdir(siteRoot);
const commerce={prices:{monthlyUsd:4,annualUsd:29,purchaseEnabled:true,monthlyUrl:'https://example.test/monthly',annualUrl:'https://example.test/yearly'},billingUrl:'https://example.test/portal'};
const listing=listingFixture(core,commerce),confirmation=helpFixture(core,commerce);
const frames=[
 {name:'rule-editor',filename:'891daf2-rule-editor.png',screen:'editor',mode:'editor',width:760,height:620},
 {name:'send-log',filename:'891daf2-send-log.png',screen:'send-log',mode:'sidebar',width:270,height:1260},
 {name:'confirmation-rule',filename:'confirmation-rule@2x.png',screen:'confirmation-rule',confirmation:true,mode:'editor',width:760,height:620},
 {name:'confirmation-template',filename:'confirmation-template@2x.png',screen:'confirmation-template',confirmation:true,mode:'editor',scrollEditor:true,width:760,height:620},
 {name:'test-preview',filename:'test-preview@2x.png',screen:'test-preview',confirmation:true,mode:'sidebar',testPreview:true,width:270,height:1100},
 {name:'test-response-selected',filename:'test-response-selected@2x.png',screen:'test-response-selected',confirmation:true,mode:'sidebar',testPreview:true,selectResponse:true,width:270,height:1100}
];
const requests=[];
const getFixture=frame=>frame.confirmation?confirmation:listing;
function reply(frame,request){
 requests.push({frame:frame.name,action:request.action});assert.ok(['state','previewDraft','previewSend'].includes(request.action),'No write action is permitted');
 const response=getFixture(frame).respond(frame.screen,request);
 if(request.action==='state'&&response.ok){Object.assign(response.value,{version:productSource.slice(0,12),development:false,emailCollection:{enabled:true}});response.value.diagnostics.version=productSource.slice(0,12)}
 return response;
}
function pageHtml(frame){const fixture=getFixture(frame),context=JSON.stringify({mode:frame.mode,ruleId:fixture.rule.id});return html.replace('<!--FORMBELL_UI_CONTEXT-->',`<script id="formbell-context" type="application/json">${context}</script>`).replace('<!--FORMBELL_PREVIEW_STUB-->',browserBridge(frame.name))}
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1'),frame=frames.find(f=>f.name===u.searchParams.get('screen'));assert.ok(frame);if(u.pathname==='/rpc'){let body='';for await(const chunk of req)body+=chunk;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(reply(frame,JSON.parse(body))));return}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(pageHtml(frame))}catch(e){res.statusCode=500;res.end('SYNTHETIC_RENDER_REQUEST_REJECTED')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const hostUrl='https://ssl.gstatic.com/docs/script/css/add-ons1.css',host=await readFile(join(productRoot,'test/fixtures/add-ons1.css'));
const resources=new Map([[hostUrl,{body:host,type:'text/css'}]]);
for(const url of ['https://ssl.gstatic.com/ui/v1/menu/checkmark_2x.png','https://ssl.gstatic.com/ui/v1/disclosure/grey-disclosure-arrow-up-down.png']){const response=await fetch(url);assert.equal(response.status,200);resources.set(url,{body:Buffer.from(await response.arrayBuffer()),type:response.headers.get('content-type')||'image/png'})}
const record={synthetic:true,purpose:'Help illustrations rendered in remote GitHub Actions Linux from unchanged v4 product HTML/CSS. Not Google-host, entitlement, sending or delivery evidence.',productSource,siteBase,renderCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:siteRoot,encoding:'utf8'}).trim(),capturedAt:new Date().toISOString(),exampleClockUtc:new Date(exampleNow).toISOString(),timezone:'UTC',deviceScaleFactor:2,sourceHashes,rendererSha256:sha(await readFile(join(siteRoot,'scripts/render-formbell-help-v4.mjs'))),compiledHtmlSha256:sha(html),hostStylesheet:{url:hostUrl,sha256:sha(host),servedByteForByte:true,resources:[...resources].map(([url,value])=>({url,sha256:sha(value.body)}))},liveVerifiedOnDisk:JSON.parse(await readFile(join(productRoot,'config/dodo-live.json'),'utf8')).verified,fixtureAdaptations:['Add v4 emailCollection.enabled=true for the same collected-email sample form','Set the displayed example version to productSource; synthetic rule/response scenes retained'],injections:['FORMBELL_UI_CONTEXT','FORMBELL_PREVIEW_STUB'],cssOverrides:false,domOrPixelRetouch:false,chromeHostFrame:false,legacyFilenameCompatibility:true,frames:[]};
let browser;
try{
 browser=await openLocalBrowser(origin,resources);record.browser=browser.version;
 for(const frame of frames){let page;try{
  page=await browser.page(origin+'/?screen='+frame.name,frame.width,frame.height,2);
  await page.wait("document.readyState==='complete'&&document.querySelector('#initialLoading')===null");
  if(frame.mode==='editor')await page.wait("!!document.querySelector('.preview-email iframe')&&document.querySelector('#preview-loading')?.hidden===true");
  if(frame.name==='send-log'){await page.evaluate("[...document.querySelectorAll('.navigation button')].find(b=>b.textContent==='Send log').click()");await page.wait("document.querySelector('.history-heading h2')?.textContent==='Send log'")}
  if(frame.scrollEditor)await page.evaluate("document.querySelector('#editor').scrollTop=document.querySelector('#editor').scrollHeight");
  if(frame.testPreview){await page.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Send me a test').click()");await page.wait("document.querySelector('dialog').open&&!!document.querySelector('#test-response')&&!document.querySelector('#confirmButton').disabled");if(frame.selectResponse){await page.evaluate("(()=>{const e=document.querySelector('#test-response');e.value='synthetic-confirmation-01';e.dispatchEvent(new Event('change',{bubbles:true}))})()");await page.wait("document.querySelector('#test-response')?.value==='synthetic-confirmation-01'&&!document.querySelector('#confirmButton').disabled")}}
  await page.evaluate('document.activeElement?.blur()');await page.paint();
  const audit=await page.evaluate(`(()=>{const visible=e=>e.getClientRects().length>0;return{width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText,developmentBanner:visible(document.querySelector('#developmentNote')),requests:window.__FORMBELL_EXAMPLE_RENDER__.requests,chips:[...document.querySelectorAll('.token-chip')].map(e=>e.textContent),previewBody:document.querySelector('.preview-email iframe')?new DOMParser().parseFromString(document.querySelector('.preview-email iframe').srcdoc,'text/html').body.textContent:null,testPreview:document.querySelector('dialog').open?{title:document.querySelector('#confirmTitle').textContent,selectedResponse:document.querySelector('#test-response')?.value,responseChoices:document.querySelector('#test-response')?.options.length,content:document.querySelector('#confirmContent').innerText,body:document.querySelector('.test-mail-preview')?new DOMParser().parseFromString(document.querySelector('.test-mail-preview').srcdoc,'text/html').body.textContent:null}:null}})()`);
  assert.equal(audit.width,frame.width);assert.equal(audit.height,frame.height);assert.equal(audit.scrollWidth<=frame.width,true);assert.equal(audit.developmentBanner,false);assert.equal(/Development only|Test portal sign-in|stored characters|runredteam|gmail\.com|[가-힣]/u.test(audit.text),false);
  assert.ok(audit.requests.every(action=>['state','previewDraft','previewSend'].includes(action)));
  if(frame.name==='rule-editor'){assert.ok(audit.chips.includes('{{Order number}}'));assert.ok(audit.previewBody.includes('ORD-1042'))}
  if(frame.name==='send-log'){for(const state of ['Sent','Failed','Unknown'])assert.ok(audit.text.includes(state));assert.ok(audit.text.includes("Inbox delivery isn't confirmed."));assert.ok(!audit.text.includes('Accepted'))}
  if(frame.confirmation&&frame.mode==='editor'){assert.ok(audit.chips.includes('{{Name}}'));assert.ok(audit.chips.includes('{{Session}}'));assert.ok(audit.previewBody.includes('Friday workshop'));assert.ok(audit.text.includes('Email collected by Google Forms'))}
  if(frame.testPreview){assert.equal(audit.testPreview.responseChoices,3);assert.ok(audit.testPreview.content.includes('reviewer@example.test'));assert.ok(audit.testPreview.content.includes('This test goes only to your own address.'));assert.ok(audit.testPreview.body.includes(frame.selectResponse?'Alex':'Sam'))}
  const png=await page.screenshot();assert.equal(png.readUInt32BE(16),frame.width*2);assert.equal(png.readUInt32BE(20),frame.height*2);
  await writeFile(join(output,frame.filename),png);record.frames.push({...frame,pngWidth:frame.width*2,pngHeight:frame.height*2,sha256:sha(png),audit});console.log(JSON.stringify({frame:frame.name,filename:frame.filename,png:[frame.width*2,frame.height*2]}));
 }finally{if(page)await page.close()}}
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));assert.equal(browser.blocked.length,0,JSON.stringify(browser.blocked));record.browserErrors=browser.errors;record.blockedExternal=browser.blocked;record.requests=requests;record.remoteMutations=0;
 await writeFile(join(output,'render-record.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({helpV4Render:'PASS',source:productSource,frames:record.frames.length,remoteMutations:0,output}));
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
