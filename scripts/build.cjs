'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const resource=match[1];if(/^(https?:|data:)/.test(resource))continue;
 if(!fs.existsSync(path.join(dist,resource)))throw new Error('Missing resource: '+resource);
}
for(const asset of ['scenes.png','characters.png','pippo.png'])if(!fs.statSync(path.join(dist,'assets',asset)).size)throw new Error('Empty asset: '+asset);
for(const script of ['engine.js','en.js','en_ui.js','content.js','i18n.js','game.js','vehicles.js','cloud.js','settings.js']){
 const result=spawnSync(process.execPath,['--check',path.join(dist,script)],{stdio:'inherit'});
 if(result.error)throw new Error('Syntax check failed',{cause:result.error});
 if(result.status!==0)process.exit(result.status??1);
}
for(const config of ['package.json','vercel.json'])JSON.parse(fs.readFileSync(path.join(root,config),'utf8'));
console.log('Build verified: static website ready in dist/.');
