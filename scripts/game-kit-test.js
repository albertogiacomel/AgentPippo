import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntegratedSettings } from '../dist/shared/videogames-kit/src/integration.js';
const gameId = 'agent-pippo';
const fixtures = {
  'agent-pippo': { agent_pippo_settings: JSON.stringify({language:'en',sounds:false,difficulty:'challenge'}) },
  battleship: { theme:'dark' }, 'f1-paper-circuit': {},
  hangman: { appLanguage:'en',theme:'dark',sfxEnabled:'false',italianHangmanState:JSON.stringify({currentDifficulty:'hard',totalStars:17}) },
  'ruota-del-tempo': {},
  'salti-magici': { salti_magici_v1:JSON.stringify({version:1,theme:'elsa',language:'en',sound:false,difficulty:'normal',worlds:{classic:{unlocked:2,best:[{score:10,stars:2},null,null],resume:null},elsa:{unlocked:1,best:[null,null,null],resume:null}}}) },
  'word-chain': {theme:'dark'},
};
function fixture() {
  const values = new Map(Object.entries(fixtures[gameId]));
  return { values, storage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)} };
}
test('integrated settings migrate legacy preferences without modifying game progress',()=>{
  const {storage,values}=fixture(),previous=new Map(values);
  const store=createIntegratedSettings(gameId,{storage});
  const snapshot=store.getSnapshot(); assert.ok(Object.isFrozen(snapshot));
  if(['agent-pippo','hangman','salti-magici'].includes(gameId))assert.equal(snapshot.language,'en');
  if(['battleship','hangman','word-chain'].includes(gameId))assert.equal(snapshot.theme,'dark');
  store.update({language:'it',theme:'light'});
  for(const [key,value]of previous)assert.equal(values.get(key),value,'Legacy state is preserved: '+key);
  store.reset();for(const [key,value]of previous)assert.equal(values.get(key),value,'Reset preferences preserves progress');
});
test('future preference versions are protected and corrupt preferences are recoverable',()=>{
  const {storage,values}=fixture(),key='ag-games:'+gameId+':settings:v1',errors=[];
  values.set(key,'{"version":2,"data":{}}');
  const future=createIntegratedSettings(gameId,{storage,onError:error=>errors.push(error)});
  assert.equal(future.status,'future');assert.throws(()=>future.reset(),/Future/);
  values.set(key,'{broken');
  const invalid=createIntegratedSettings(gameId,{storage,onError:error=>errors.push(error)});
  assert.equal(invalid.status,'invalid');invalid.update({language:'en'});assert.equal(invalid.status,'persistent');
  assert.equal(errors.length,2);
});
