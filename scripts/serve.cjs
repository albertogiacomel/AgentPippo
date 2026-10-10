'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
const port=Number(process.env.PORT||3000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((request,response)=>{
 let filename;
 try{const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);filename=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));}catch(error){response.writeHead(400);response.end('Invalid URL');return;}
 if(!filename.startsWith(dist+path.sep)){response.writeHead(403);response.end('Forbidden');return;}
 fs.readFile(filename,(error,content)=>{if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end('Resource unavailable');if(error.code!=='ENOENT')console.error('Read failed:',error);return;}response.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});response.end(content);});
});
server.on('error',error=>{console.error('Server failed:',error);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('AgentePippo: http://127.0.0.1:'+port));
