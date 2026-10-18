import engine from '../dist/engine.js';

const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
const maxBytes=16384;
async function readBody(request){
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid_body');
 let length=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>maxBytes){await reader.cancel();throw new Error('too_large');}chunks.push(value);}
 const buffer=new Uint8Array(length);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(buffer));}catch(error){throw new Error('invalid_body',{cause:error});}
}
export async function handleSave(request,env){
 if(!['GET','PUT'].includes(request.method))return reply(405,{error:'method_not_allowed'});
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return reply(403,{error:'foreign_origin'});
 if(!env.DB)return reply(503,{error:'cloud_not_configured'});
 const match=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization')||'');
 if(!match)return reply(401,{error:'invalid_code'});
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
 const id=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 try{
  if(request.method==='GET'){
   const row=await env.DB.prepare('SELECT state, revision, updated_at FROM saves WHERE id = ?').bind(id).first();
   if(!row)return reply(404,{error:'save_not_found'});
   return reply(200,{state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updated_at});
  }
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'json_required'});
  let body;try{body=await readBody(request);}catch(error){return reply(error.message==='too_large'?413:400,{error:error.message});}
  if(!Number.isSafeInteger(body?.revision)||body.revision<0||!engine.validateState(body?.state))return reply(400,{error:'invalid_save'});
  // Keep only documented game fields; do not persist arbitrary client properties.
  const normalized=engine.migrateState(body.state);
  const state=Object.fromEntries(Object.keys(engine.initialState()).map(key=>[key,normalized[key]]));
  const encoded=JSON.stringify(state),now=new Date().toISOString();
  let result;
  if(body.revision===0){
   result=await env.DB.prepare('INSERT OR IGNORE INTO saves (id,state,revision,updated_at) VALUES (?,?,1,?)').bind(id,encoded,now).run();
  }else{
   result=await env.DB.prepare('UPDATE saves SET state = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?').bind(encoded,now,id,body.revision).run();
  }
  if(result.meta.changes!==1)return reply(409,{error:'revision_conflict'});
  return reply(200,{revision:body.revision+1,updatedAt:now});
 }catch(error){
  // Never log request bodies or the recovery capability.
  console.error('Cloud save database operation failed:',error.message);
  return reply(503,{error:'cloud_unavailable'});
 }
}
