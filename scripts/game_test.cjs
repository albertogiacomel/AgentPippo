const assert = require('node:assert/strict');
const { cases, initialState, validateState, completeCase, purchase, advance } = require('../dist/game.js');
const s = initialState();
assert.equal(validateState(s), true);
assert.equal(validateState({...s, stars:-1}), false);
assert.equal(validateState({...s, caseIndex:6}), false);
assert.equal(purchase(s,'vehicle',1), false);
assert.equal(advance(s),false);
assert.equal(completeCase(s),false);
for(let i=0;i<cases.length;i++){
 assert.equal(s.caseIndex,i);
 s.steps=['talk','clue','done'];
 assert.equal(completeCase(s),true);
 assert.equal(completeCase(s),false);
 if(i<5){
  assert.equal(advance(s),false);
  assert.equal(purchase(s,'vehicle',i+1),true);
  assert.equal(purchase(s,'vehicle',i+1),false);
  assert.equal(advance(s),false);
  assert.equal(purchase(s,'station',i+1),true);
  assert.equal(advance(s),true);
  assert.deepEqual(s.inventory,[]);
  assert.equal(validateState(JSON.parse(JSON.stringify(s))),true);
 }
}
assert.equal(s.completed.length,6);
assert.equal(s.stars,10);
assert.equal(s.vehicle,5);
assert.equal(s.station,5);
assert.equal(advance(s),false);
assert.equal(purchase(s,'station',6),false);
console.log('PASS: six-case campaign, upgrade gates, rewards, duplicate prevention, save roundtrip and invalid data.');
