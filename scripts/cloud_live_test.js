// Explicit remote verification: creates one synthetic save and deletes only that row.
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import E from '../dist/engine.js';
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw new Error('CLOUDFLARE_API_TOKEN is required to clean up the synthetic test save.');
const site=process.env.AGENT_PIPPO_URL||'https://agent-pippo.pages.dev';
const account='291702df5c8eef8684918f4f92ca4c4d',database='82f87023-a583-4e66-ac43-fdde44b1a07e';
const code=randomBytes(32).toString('hex'),id=createHash('sha256').update(code).digest('hex');
const api=(method,body,key=code,origin)=>fetch(site+'/api/save',{method,headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
try{
 assert.equal((await fetch(site,{signal:AbortSignal.timeout(15000)})).status,200);
 assert.equal((await api('GET')).status,404);
 const response=await api('PUT',{state:E.initialState(),revision:0});assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 const loaded=await api('GET');assert.equal(loaded.headers.get('Cache-Control'),'no-store');const data=await loaded.json();assert.deepEqual(data.state,E.initialState());assert.equal(data.revision,1);
 assert.equal((await api('GET',undefined,randomBytes(32).toString('hex'))).status,404);
 assert.equal((await api('PUT',{state:E.initialState(),revision:0})).status,409);
 assert.equal((await api('PUT',{state:{},revision:1})).status,400);
 assert.equal((await api('GET',undefined,code,'https://other.example')).status,403);
 const state={...E.initialState(),voice:false};const results=await Promise.all([api('PUT',{state,revision:1}),api('PUT',{state,revision:1})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const final=await (await api('GET')).json();assert.equal(final.revision,2);assert.equal(final.state.voice,false);
 console.log('PASS: production Pages + D1, save/recovery, isolation, validation, origin checks and concurrent-write protection.');
}finally{
 const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/'+database+'/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({sql:'DELETE FROM saves WHERE id = ?',params:[id]}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok||!result.success)throw new Error('Synthetic save cleanup failed; inspect D1 before running again.');
 console.log('PASS: synthetic production test save removed.');
}
