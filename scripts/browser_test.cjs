// Deterministic browser checks via Chrome/Edge's native DevTools protocol.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const project=path.resolve(__dirname,'..'),artifacts=path.join(project,'artifacts');
const dist=path.resolve(project,process.env.AGENT_PIPPO_DIST||'dist');
const errors=[];let browser,connection,server,cleanupCommand,browserClosed=false;
const language=process.env.PIPPO_LANGUAGE||'it';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(){
 fs.mkdirSync(artifacts,{recursive:true});
 server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const filename=path.join(dist,pathname==='/'?'index.html':pathname);
  if(!filename.startsWith(dist+path.sep)){response.writeHead(403);response.end();return;}
  try{const extension=path.extname(filename);const content=fs.readFileSync(filename,['.png','.webp'].includes(extension)?undefined:'utf8');response.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[extension]||'application/octet-stream'});response.end(content);}catch(error){response.writeHead(404);response.end('Not found');errors.push('HTTP '+filename+': '+error.message);}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=process.env.AGENT_PIPPO_URL||'http://127.0.0.1:'+server.address().port;
 const binary=[process.env.BROWSER_BINARY,
  path.join(process.env['ProgramFiles(x86)']||'','Microsoft','Edge','Application','msedge.exe'),
  '/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean).find(fs.existsSync);
 if(!binary)throw new Error('Set BROWSER_BINARY to an installed Chrome or Edge executable');
 const debugPort=await new Promise(resolve=>{const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const port=probe.address().port;probe.close(()=>resolve(port));});});
 browser=spawn(binary,['--headless','--disable-gpu','--no-first-run','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(artifacts,'edge_v2_qa_'+Date.now()),url],{windowsHide:true,stdio:'ignore'});
 let pages;
 for(let i=0;i<60;i++){try{pages=await(await fetch('http://127.0.0.1:'+debugPort+'/json')).json();if(pages.some(p=>p.url.startsWith(url)))break;}catch(error){if(i===59)throw new Error('Edge DevTools unavailable',{cause:error});}await delay(200);}
 const page=pages.find(p=>p.url.startsWith(url));assert.ok(page,'Edge opened the local game');
 connection=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{connection.onopen=resolve;connection.onerror=reject;});
 let id=0;const pending=new Map();
 connection.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);if(task){clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;const timer=setTimeout(()=>{pending.delete(current);reject(new Error('CDP timeout '+method));},10000);pending.set(current,{resolve,reject,timer});connection.send(JSON.stringify({id:current,method,params}));});
 cleanupCommand=command;await command('Runtime.enable');await command('Page.enable');
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 for(let i=0;i<40;i++){if(await evaluate("Boolean(document.getElementById('message')?.textContent)"))break;await delay(100);}
 const ready=async()=>{for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'&&Boolean(window.PippoI18n)&&Boolean(window.PippoGame)"))return;await delay(100);}throw new Error('Game did not finish loading');};
 const click=async selector=>{await ready();await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw new Error('Missing or disabled: '+${JSON.stringify(selector)});e.click();return true})()`);await catalog();};
 const clickText=(selector,text)=>evaluate(`(()=>{const expected=window.PippoI18n.t(${JSON.stringify(text)});const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(x=>x.textContent.includes(expected));if(!e||e.disabled)throw new Error('No enabled button: '+expected);e.click();return true})()`);
 const state=()=>evaluate("JSON.parse(localStorage.getItem('porto_buffo_v2'))");
 const catalog=async()=>{for(let i=0;i<100;i++){const missing=await evaluate('window.PippoI18n?.missing()??null');if(missing!==null){assert.deepEqual(missing,[],'All current labels have full catalog entries');return;}await delay(100);}throw new Error('Translation catalog did not load after navigation');};
 async function roundTrip(){const result=await evaluate("(()=>{const I=window.PippoI18n,language=I.settings.language,state=window.PippoGame.getState(),before=JSON.stringify(state),dialog=document.querySelector('dialog[open]'),original=document.getElementById('message').textContent;I.update({language:language==='it'?'en':'it'});const open=dialog?.open??true;I.update({language});return {open,sameState:state===window.PippoGame.getState()&&before===JSON.stringify(state),sameMessage:original===document.getElementById('message').textContent}})()");assert.deepEqual(result,{open:true,sameState:true,sameMessage:true});await catalog();}
 const verb=name=>click('[data-verb="'+name+'"]');
 const prop=name=>click('[data-id="'+name+'"]');
 const room=number=>click('[data-room="'+number+'"]');
 const inventory=name=>clickText('#inventory button',name);
 const answer=async name=>{await roundTrip();await clickText('#puzzleOptions button',name);await catalog();};
 const screenshot=async name=>{await delay(700);const result=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(artifacts,name),Buffer.from(result.data,'base64'));};
 async function verifyWalking(){
  const settle=async()=>{for(let i=0;i<30;i++){if(await evaluate("document.getElementById('pippo')?.classList.contains('walking')??null")===false)return;await delay(100);}throw new Error('Walking did not stop after arrival');};
  const move=x=>evaluate(`(()=>{const s=document.getElementById('scene'),r=s.getBoundingClientRect();s.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*${x}/100,clientY:r.bottom-8}));return getComputedStyle(document.getElementById('pippo')).transform;})()`);
  await move(85);await delay(200);
  assert.match(await move(5),/matrix\(-1,/,'Pippo faces left on a reversal during movement');
  await delay(100);assert.doesNotMatch(await move(98),/matrix\(-1,/,'Pippo turns right when moving right');
  await settle();
  assert.equal(await evaluate("document.getElementById('pippo')?.classList.contains('walking')??null"),false,'Walking stops on arrival');
  await move(0);await settle();
  await ready();const bounds=await evaluate("(()=>{const p=document.getElementById('pippo').getBoundingClientRect(),s=document.getElementById('scene').getBoundingClientRect();return {left:p.left>=s.left-3,right:p.right<=s.right+3};})()");
  assert.deepEqual(bounds,{left:true,right:true},'Pippo remains inside the scene');
 }
 await command('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:1,mobile:false});
 await evaluate(`window.PippoI18n.update({language:${JSON.stringify(language)}})`);
 assert.equal(await evaluate('document.documentElement.lang'),language);
 for(let i=0;i<20;i++){if(await evaluate("speechSynthesis.getVoices().some(v=>v.lang.startsWith('it'))"))break;await delay(100);}
 const voiceReport=await evaluate("(()=>{const S=window.PippoSpeech;return {available:speechSynthesis.getVoices().map(v=>({name:v.name,language:v.lang,gender:S.genderOf(v)})),characters:['Pippo','Berto il guardiano','Ada la fornaia','Barone Sottosopra'].map(name=>{const voice=S.voiceFor('it',undefined,name);return {name,wanted:S.character(name).gender,selected:voice?.name,gender:voice?S.genderOf(voice):'unavailable'};})};})()");
 fs.writeFileSync(path.join(artifacts,'voice_verification.json'),JSON.stringify(voiceReport,null,2),'utf8');
 const manualSpeech=await evaluate("(()=>{const original=window.PippoSpeech.speak;let captured;window.PippoSpeech.speak=(...args)=>captured=args;window.PippoGame.setVoice(false);document.getElementById('read').click();window.PippoSpeech.speak=original;return {language:captured?.[1],text:captured?.[0],automatic:window.PippoGame.getState().voice};})()");
 assert.equal(manualSpeech.language,language);assert.ok(manualSpeech.text.length>0);assert.equal(manualSpeech.automatic,false,'Manual read works with automatic narration disabled');
 const target=await evaluate("(()=>{const r=document.getElementById('settingsButton').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
 await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...target});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...target});
 assert.equal(await evaluate("document.getElementById('settingsDialog').open"),true,'Settings opens with a real pointer');
 const settingsTypography=async()=>{const controls=await evaluate("[...document.querySelectorAll('#settingsDialog select')].map(e=>{const r=e.getBoundingClientRect();return {size:parseFloat(getComputedStyle(e).fontSize),width:r.width,x:r.x};})");assert.ok(controls.length);assert.ok(controls.every(e=>e.size>=16),'Shared settings selects use readable 16px text');assert.ok(Math.max(...controls.map(e=>e.width))-Math.min(...controls.map(e=>e.width))<=1,'Shared settings widths match');assert.ok(Math.max(...controls.map(e=>e.x))-Math.min(...controls.map(e=>e.x))<=1,'Shared settings columns align');};
 await settingsTypography();
 const languageChecks=await evaluate(`(()=>{window.languageTestMarker={};const marker=window.languageTestMarker,state=window.PippoGame.getState();const results=[];for(const lang of ['en','it','en','it']){const select=document.getElementById('settingLanguage');select.value=lang;select.dispatchEvent(new Event('change'));results.push({lang:document.documentElement.lang,settings:document.querySelector('#settingsDialog h2').textContent,verb:document.querySelector('[data-verb="look"]').textContent,save:document.getElementById('cloudButton').textContent,option:document.querySelector('#settingDifficulty [value="easy"]').textContent,aria:document.getElementById('read').getAttribute('aria-label'),open:document.getElementById('settingsDialog').open,sameMarker:marker===window.languageTestMarker,sameState:state===window.PippoGame.getState(),title:document.title});}const select=document.getElementById('settingLanguage');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change'));return results})()`);
 for(const check of languageChecks){const en=check.lang==='en';assert.equal(check.settings,en?'Settings':'Impostazioni');assert.equal(check.verb,en?'Look':'Guarda');assert.equal(check.save,en?'Saves':'Salvataggi');assert.equal(check.option,en?'Guided':'Guidata');assert.equal(check.aria,en?'Read the dialogue':'Leggi il dialogo');assert.equal(check.open,true);assert.equal(check.sameMarker,true);assert.equal(check.sameState,true);assert.equal(check.title,en?'Officer Pippo — The secret of Porto Buffo':'Agente Pippo — Il segreto di Porto Buffo');}
 await evaluate("(()=>{const s=document.getElementById('settingSounds');s.checked=false;s.dispatchEvent(new Event('change'));const v=document.getElementById('settingVoice');v.checked=false;v.dispatchEvent(new Event('change'));const d=document.getElementById('settingDifficulty');d.value='challenge';d.dispatchEvent(new Event('change'));})()");
 assert.equal(await evaluate('window.PippoI18n.settings.sounds'),false);
 assert.equal(await evaluate('window.PippoI18n.settings.difficulty'),'challenge');
 assert.equal((await state()).voice,false);
 await evaluate("(()=>{const s=document.getElementById('settingSounds');s.checked=true;s.dispatchEvent(new Event('change'));const d=document.getElementById('settingDifficulty');d.value='normal';d.dispatchEvent(new Event('change'));})()");await click('#closeSettings');
 await click('#reset');await click('#confirmReset');await click('#voice');
 await verifyWalking();
 await screenshot('v2_desktop.png');
 await catalog();
 const cover=await command('Page.captureScreenshot',{format:'png',clip:await evaluate("(()=>{const r=document.querySelector('.scene').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()")});fs.writeFileSync(path.join(artifacts,'pippo_cover.png'),Buffer.from(cover.data,'base64'));
 await verb('take');await prop('chest');assert.equal((await state()).completed.length,0);
 await room(1);await screenshot('v2_harbor.png');await verb('talk');await prop('berto');await clickText('#dialogChoices button','Hai la chiave del baule?');await screenshot('v2_riddle.png');await answer('Pettine');assert.equal((await state()).inventory.length,0);await answer('Chiave');await room(0);await inventory('Chiave di ottone');await prop('chest');assert.equal((await state()).completed.length,1);
 async function next(){await catalog();const s=await state(),index=s.caseIndex+1;await click('#hubButton');await click('#vehicles .card:nth-child('+(index+1)+') button');await click('#stations .card:nth-child('+(index+1)+') button');await click('#back');await click('#next');assert.equal((await state()).caseIndex,index);await catalog();}
 await next();await room(0);await verb('look');await prop('score');await room(1);await verb('use');await prop('organ');await answer('Luna');assert.equal((await state()).sequence.length,0);for(const note of ['Sole','Luna','Sole','Stella'])await answer(note);assert.equal((await state()).completed.length,2);
 await next();await verb('take');await prop('yellow');await prop('blue');await room(0);await prop('red');await inventory('Blu');await inventory('Rosso');await room(2);await inventory('Viola');await prop('machine');assert.equal((await state()).completed.length,2);await inventory('Viola');await inventory('Rosso');await inventory('Giallo');await inventory('Arancione');await prop('machine');assert.equal((await state()).completed.length,3);
 await next();await verb('talk');await prop('baron');await clickText('#dialogChoices button','Confrontiamo i sospettati');await answer('Pirata');assert.equal((await state()).completed.length,3);await click('#closePuzzle');await verb('look');await prop('clothClue');await room(1);await prop('footprints');await room(3);await verb('talk');await prop('baron');await clickText('#dialogChoices button','Confrontiamo i sospettati');await answer('Giullare');assert.equal((await state()).completed.length,3);await answer('Pirata');assert.equal((await state()).completed.length,4);
 await next();await room(2);await verb('look');await prop('sign');await room(4);await verb('use');await prop('sorter');await answer('Consegna →');assert.equal((await state()).completed.length,4);await answer('Piccolo');await answer('Medio');await answer('Consegna →');assert.equal((await state()).completed.length,5);
 await next();await verb('take');await prop('rope');await room(4);await prop('cloth');await inventory('Corda');await inventory('Telo leggero');await room(5);await inventory('Aquilone');await prop('cloudMachine');await answer('Barca');assert.equal((await state()).completed.length,5);await answer('Aquilone');await answer('Porto delle barche');assert.equal((await state()).completed.length,5);await answer('Mare aperto');const final=await state();assert.equal(final.completed.length,6);assert.equal(final.stars,10);assert.equal(final.vehicle,5);assert.equal(final.station,5);
 await click('#hubButton');await click('#vehicles .card:nth-child(3) button');assert.equal((await state()).activeVehicle,2);assert.equal((await state()).stars,final.stars);await screenshot('v3_garage.png');
 for(let i=0;i<6;i++){await click('#stations .card:nth-child('+(i+1)+') button');assert.equal(await evaluate("document.getElementById('stationDialog').open"),true);await catalog();const before=await evaluate("document.getElementById('stationVisual').querySelectorAll('svg').length");await evaluate("window.PippoI18n.update({language:window.PippoI18n.settings.language==='it'?'en':'it'})");assert.equal(await evaluate("document.getElementById('stationVisual').querySelectorAll('svg').length"),before);await evaluate("window.PippoI18n.update({language:window.PippoI18n.settings.language==='it'?'en':'it'})");await click('#closeStation');}
 await click('#languageToggle');await delay(700);assert.equal(await evaluate('document.documentElement.lang'),language==='it'?'en':'it');assert.equal((await state()).completed.length,6);await click('#languageToggle');await delay(700);
 await command('Page.reload');await delay(700);assert.equal((await state()).completed.length,6);assert.equal((await state()).activeVehicle,2);assert.match(await evaluate("document.getElementById('rank').textContent"),/Eroe|Hero/);
 const fixture={...final,caseIndex:2,completed:[0,1],room:2,inventory:['red','yellow','blue'],flags:[],activeVehicle:2};
 await evaluate('localStorage.setItem("porto_buffo_v2",'+JSON.stringify(JSON.stringify(fixture))+')');await command('Page.reload');await delay(100);await ready();await click('#hubButton');await click('#stations .card:nth-child(3) button');await clickText('#stationControls button','Rosso');await clickText('#stationControls button','Giallo');assert.ok((await state()).inventory.includes('orange'));await screenshot('v3_laboratory.png');await click('#closeStation');
 await evaluate('localStorage.setItem("porto_buffo_v2",'+JSON.stringify(JSON.stringify(final))+')');await command('Page.reload');await delay(100);await ready();
 await click('#reset');await click('#cancelReset');assert.equal((await state()).completed.length,6);
 await click('#journalButton');await roundTrip();await click('#closeJournal');
 // Test the cloud controls independently of the real D1 runtime test.
 await evaluate(`(()=>{let saved=null,revision=0;window.confirm=()=>true;window.fetch=async(url,options)=>{if(options.method==='PUT'){const body=JSON.parse(options.body);if(body.revision!==revision)return new Response(JSON.stringify({error:'revision_conflict'}),{status:409});saved=body.state;revision++;return new Response(JSON.stringify({revision}));}return new Response(JSON.stringify({state:saved,revision}));};})()`);
 await click('#cloudButton');await click('#cloudCreate');await delay(150);assert.match(await evaluate("document.getElementById('cloudFeedback').textContent"),/creata|created/);assert.equal(await evaluate("JSON.parse(localStorage.getItem('agent_pippo_cloud')).revision"),1);
 await click('#cloudSave');await delay(150);assert.equal(await evaluate("JSON.parse(localStorage.getItem('agent_pippo_cloud')).revision"),2);await screenshot('v4_cloud.png');await evaluate('window.pippoNavigationMarker=true');await click('#cloudLoad');
 for(let i=0;i<150;i++){if(await evaluate("window.pippoNavigationMarker!==true&&document.readyState==='complete'&&Boolean(window.PippoGame)"))break;if(i===149)throw new Error('Cloud restore did not finish navigation');await delay(100);}
 assert.equal((await state()).completed.length,6);assert.ok(await evaluate("localStorage.getItem('porto_buffo_cloud_backup')"));
 await delay(1000);for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'&&Boolean(window.PippoGame)&&document.querySelectorAll('[data-id]').length>0"))break;await delay(100);}
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await click('#reset');await click('#confirmReset');await delay(1000);for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'&&Boolean(window.PippoGame)&&document.querySelectorAll('[data-id]').length>0"))break;await delay(100);}await verifyWalking();await screenshot('v2_mobile.png');assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
 const dimensions=await evaluate("[...document.querySelectorAll('[data-id]')].map(e=>({id:e.dataset.id,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))");assert.ok(dimensions.length>0&&dimensions.every(d=>d.w>=44&&d.h>=44),'Visible touch targets at least 44px');
 const extension=fs.existsSync(path.join(dist,'assets','scenes.webp'))?'webp':'png';
 const imageCheck=await evaluate(`Promise.all(${JSON.stringify(['scenes','characters','pippo','vehicles','props'].map(name=>'assets/'+name+'.'+extension))}.map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=src})))`);assert.ok(imageCheck.every(Boolean));
 const settingsTarget=await evaluate("(()=>{const r=document.getElementById('settingsButton').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...settingsTarget});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...settingsTarget});assert.equal(await evaluate("document.getElementById('settingsDialog').open"),true,'Mobile settings opens with a pointer');await settingsTypography();await roundTrip();await screenshot('settings_mobile.png');await click('#closeSettings');
 assert.deepEqual(errors,[],'No browser errors or missing resources');
 fs.writeFileSync(path.join(artifacts,'browser_verification.json'),JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',campaign:'six chapters completed through UI',negativeCases:'wrong riddle, wrong melody, wrong mixture, incomplete evidence, wrong suspect, wrong parcel order, wrong final directions',saveReload:true,resetCancel:true,mobileWidth:390,mobileOverflow:false,touchTargets:dimensions,errors},null,2),'utf8');
 console.log('PASS: '+language+' campaign, instant language changes, settings with desktop/mobile pointer, complete catalogs, open puzzles/departments, SVG preservation, save persistence and touch targets.');
 await command('Browser.close');browserClosed=true;
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(cleanupCommand&&!browserClosed&&connection?.readyState===WebSocket.OPEN){try{await cleanupCommand('Browser.close');}catch(error){console.error('Browser cleanup:',error);}}connection?.close();if(browser&&!browser.killed)browser.kill();server?.close();});
