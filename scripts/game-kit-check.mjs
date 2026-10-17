import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../dist/shared/videogames-kit/',import.meta.url));
const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
for(const file of manifest.files){const data=await readFile(join(root,file.path));if(data.length!==file.bytes||createHash('sha256').update(data).digest('hex')!==file.sha256)throw new Error('Vendored kit drift: '+file.path);}
for(const file of manifest.classicArtifacts||[]){const data=await readFile(join(root,'../../',file.path));if(data.length!==file.bytes||createHash('sha256').update(data).digest('hex')!==file.sha256)throw new Error('Classic kit drift: '+file.path);}
console.log('PASS videogames-kit '+manifest.version+': '+manifest.files.length+' verified files');
