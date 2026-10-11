'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist'),output=path.join(root,'artifacts','floppy','game');
async function build(){
 const files=[],images=JSON.parse(await fs.readFile(path.join(root,'docs','assets-manifest.json'),'utf8'));
 const text=new Map();
 for(const entry of await fs.readdir(source,{withFileTypes:true}))if(entry.isFile()){
  const content=(await fs.readFile(path.join(source,entry.name),'utf8')).replace(/assets\/([a-z]+)\.png/g,'assets/$1.webp');
  text.set(entry.name,Buffer.from(content,'utf8'));
 }
 text.set('LEGGIMI.txt',Buffer.from('Agent Pippo - Edizione floppy\nEstrai tutto e apri index.html in un browser moderno.\nSei casi completi, italiano/inglese e salvataggi locali.\nLe voci dipendono dal dispositivo; alcune richiedono Internet.\nI salvataggi cloud richiedono il sito online: agentpippo.giacomel.info.\n','utf8'));
 const fixed=[...text.values()].reduce((sum,data)=>sum+Math.ceil(data.length/512)*512,1024);
 let chosen;
 for(const quality of [82,76,70,64,58,50,42,34]){
  const encoded=[];
  for(const asset of images){const data=await sharp(path.join(source,'assets',asset.file)).webp({quality,effort:4}).toBuffer();encoded.push({name:'assets/'+asset.file.replace('.png','.webp'),data});}
  const allocated=fixed+encoded.reduce((sum,file)=>sum+Math.ceil(file.data.length/512)*512,0);
  process.stderr.write(`WebP quality ${quality}: ${allocated} allocated bytes\n`);
  if(allocated<=1400000){chosen={quality,encoded,allocated};break;}
 }
 if(!chosen)throw new Error('Cannot fit the complete game within 1,400,000 allocated bytes');
 await fs.mkdir(path.join(output,'assets'),{recursive:true});
 for(const [name,data] of text){await fs.writeFile(path.join(output,name),data);files.push({name,bytes:data.length});}
 for(const file of chosen.encoded){await fs.writeFile(path.join(output,file.name),file.data);files.push({name:file.name,bytes:file.data.length});}
 process.stdout.write(JSON.stringify({quality:chosen.quality,allocatedBytes:chosen.allocated,files}));
}
module.exports={build};
