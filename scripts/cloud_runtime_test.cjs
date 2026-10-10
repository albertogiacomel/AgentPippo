'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
const E=require('../dist/engine.js');
const root=path.resolve(__dirname,'..'),cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
const persist=path.join(root,'artifacts','cloud_runtime_'+Date.now());
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let processHandle;
async function run(){
 fs.mkdirSync(persist,{recursive:true});
 const migration=spawnSync(process.execPath,[cli,'d1','execute','DB','--local','--config','wrangler.local.toml','--persist-to',persist,'--file','migrations/0001_saves.sql'],{cwd:root,encoding:'utf8'});
 if(migration.error)throw migration.error;if(migration.status!==0)throw new Error(migration.stderr+ migration.stdout);
 const port=await new Promise(resolve=>{const probe=http.createServer();probe.listen(0,'127.0.0.1',()=>{const value=probe.address().port;probe.close(()=>resolve(value));});});
 let output='';processHandle=spawn(process.execPath,[cli,'pages','dev','dist','--d1','DB','--port',String(port),'--persist-to',persist,'--show-interactive-dev-session=false'],{cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe']});
 processHandle.stdout.on('data',chunk=>output+=chunk);processHandle.stderr.on('data',chunk=>output+=chunk);
 const url='http://127.0.0.1:'+port,code=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch(error){if(i===99)throw new Error('Cloud runtime did not start: '+output,{cause:error});}await wait(200);}
 const api=(method,body,key=code)=>fetch(url+'/api/save',{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal((await api('GET')).status,404);
 let response=await api('PUT',{state:{...E.initialState(),unwanted:'omit'},revision:0});assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 const loaded=await (await api('GET')).json();assert.deepEqual(loaded.state,E.initialState());assert.equal(loaded.revision,1);
 assert.equal((await api('GET',undefined,'b'.repeat(64))).status,404);
 assert.equal((await api('PUT',{state:E.initialState(),revision:0})).status,409);
 const state={...E.initialState(),voice:false};response=await api('PUT',{state,revision:1});assert.equal(response.status,200);assert.equal((await response.json()).revision,2);
 const simultaneous=await Promise.all([api('PUT',{state,revision:2}),api('PUT',{state,revision:2})]);assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
 const final=await (await api('GET')).json();assert.equal(final.revision,3);assert.equal(final.state.voice,false);assert.ok(final.updatedAt.endsWith('Z'));
 assert.equal((await api('PUT',{state:{bad:true},revision:3})).status,400);assert.equal((await api('GET',undefined,'bad')).status,401);
 fs.writeFileSync(path.join(root,'artifacts','cloud_verification.json'),JSON.stringify({status:'PASS',runtime:'Cloudflare workerd + local D1',timestamp:new Date().toISOString(),checks:['create','load','isolated saves','invalid auth/state','stale revision','concurrent writers','UTC timestamp']},null,2),'utf8');
 console.log('PASS: real Cloudflare Pages runtime and D1 database, saves, recovery, isolation, validation and concurrent revision conflicts.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{if(processHandle){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(processHandle.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else processHandle.kill('SIGTERM');}});
