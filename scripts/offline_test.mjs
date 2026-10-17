import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { openBrowser, delay } from './game-kit-cdp.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const page=await openBrowser(join(root,'dist'),{entry:'/index.html',artifactsPath:join(root,'artifacts/offline'),blockRemoteAI:true});
const checked=[];
try{
 for(const edition of ['dist/index.html','artifacts/floppy/game/index.html']){
  if(!existsSync(join(root,edition)))continue;
  const url=pathToFileURL(join(root,edition)).href;
  await page.command('Page.navigate',{url});
  let ready=false;
  for(let i=0;i<100;i++){
   ready=await page.evaluate(`location.href===${JSON.stringify(url)}&&Boolean(window.__gameKit)&&Boolean(window.PippoGame)`);
   if(ready)break;await delay(50);
  }
  assert.ok(ready,'Offline edition loads: '+edition);
  await page.evaluate('window.__gameKit.settings.update({language:"en",muted:true})');
  assert.equal(await page.evaluate('window.PippoI18n.settings.language'),'en');
  await page.evaluate('document.querySelector("[data-kit-settings]").click()');
  assert.equal(await page.evaluate('window.__gameKit.dialog.element.open'),true);
  await page.evaluate('window.__gameKit.dialog.close()');checked.push(edition);
 }
 assert.deepEqual(page.errors,[]);
 await writeFile(join(page.artifacts,'verification.json'),JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checked},null,2),'utf8');
 console.log('PASS file:// offline settings, localization and game startup:',checked.join(', '));
}finally{await page.close();}
