import assert from 'node:assert/strict';
import { delay } from './game-kit-cdp.js';
export async function verifyGameplay(page, gameId) {
 const {evaluate,command}=page;
 const wait=async expression=>{for(let i=0;i<160;i++){if(await evaluate(expression))return;await delay(50);}throw new Error('Gameplay: '+gameId+' '+expression);};
 const clickText=async expression=>evaluate(`(()=>{const pattern=new RegExp(${JSON.stringify(expression)},'i');const button=[...document.querySelectorAll('button')].find(e=>!e.disabled&&pattern.test(e.textContent.trim()));if(!button)throw new Error('Missing gameplay action: '+pattern);button.click();})()`);
 await evaluate('window.__gameKit.dialog.close();window.__gameKit.settings.update({language:"en",muted:true})');
 await delay(50);
 if(gameId==='battleship'){
  await clickText('^Random$');await clickText('START BATTLE');
  await wait("document.querySelectorAll('[role=button][aria-disabled=false]').length>0");
  await evaluate("document.querySelector('[role=button][aria-disabled=false][aria-label*=Sconosciuta]').click()");
  await wait("localStorage.getItem('battleship_save_v1')&&JSON.parse(localStorage.getItem('battleship_save_v1')).gameState.logs.length>1");
 } else if(gameId==='f1-paper-circuit'){
  await clickText('1 VS 1 LOCAL');
  await wait("Boolean(document.querySelector('button[aria-label^=\"Roll Dice\"],button[aria-label^=\"Enter Dice\"]'))");
  const before=await evaluate("JSON.parse(localStorage.getItem('f1_paper_save_v3')).logs.length");
  await evaluate("document.querySelector('button[aria-label^=\"Roll Dice\"],button[aria-label^=\"Enter Dice\"]').click()");
  if(await evaluate("Array.from(document.querySelectorAll('button')).some(e=>e.textContent.trim()==='4')"))await clickText('^4$');
  await wait(`JSON.parse(localStorage.getItem('f1_paper_save_v3')).logs.length>${before}`);
 } else if(gameId==='hangman'){
  const guessed=await evaluate("(()=>{const e=[...document.querySelectorAll('button')].find(e=>/^[A-Z]$/.test(e.textContent.trim())&&!e.disabled);if(!e)throw new Error('Missing keyboard');const letter=e.textContent.trim();e.click();return letter;})()");
  await wait(`Array.from(document.querySelectorAll('button')).some(e=>e.textContent.trim()===${JSON.stringify(guessed)}&&e.disabled)`);
 } else if(gameId==='ruota-del-tempo'){
  await clickText('^PLAY!$');await wait("Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('SPIN IT!'))");
  await clickText('SPIN IT!');await wait("!Array.from(document.querySelectorAll('button')).some(e=>e.textContent.includes('SPIN IT!'))");
 } else if(gameId==='word-chain'){
  await clickText('1 vs 1 \\(local\\)');
  await evaluate("document.querySelector('input[type=text]').focus()");
  await command('Input.insertText',{text:'a'});await delay(50);await clickText('^SEND$');
  await wait("document.body.textContent.includes('The word is too short.')");
  await evaluate("window.__gameKit.settings.update({language:'it'})");
  await wait("document.body.textContent.includes('Parola troppo corta.')");
  await evaluate("window.__gameKit.settings.update({language:'en'})");
  await wait("document.body.textContent.includes('The word is too short.')");
 } else if(gameId==='salti-magici'){
  await wait('window.SaltiMagici?.getState().ready');await evaluate("document.getElementById('play').click()");
  await wait('window.SaltiMagici.getState().playing');
  const x=await evaluate('window.SaltiMagici.getState().player.x');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await delay(200);
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.ok(await evaluate('window.SaltiMagici.getState().player.x')>x);
 } else if(gameId==='agent-pippo'){
  assert.ok(await evaluate('window.PippoGame.getState().caseIndex===0'));
  await evaluate("document.getElementById('help').click()");
  assert.ok(await evaluate('window.PippoGame.getState().hintLevel')>0);
 }
 console.log('PASS native gameplay:',gameId);
}
