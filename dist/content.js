'use strict';
// Two complete content catalogs selected by shared language state, as on giacomel.info.
(function(root){
 const E=root.PortoBuffo,V=root.PortoVehicles,en={...root.PippoEnglish};
 const tr=value=>en[value]??value,add=(it,english)=>{en[it]=english;};
 add('Agente Pippo — Il segreto di Porto Buffo','Officer Pippo — The secret of Porto Buffo');
 add('Italiano','Italian');add('Passa a inglese','Switch to English');add('Passa a italiano','Switch to Italian');
 add('Pippo','Pippo');add('Non hai ancora trovato lo spartito in piazza.','You have not found the sheet music in the square yet.');
 E.cases.forEach(c=>{
  add(c.intro+' '+c.brief,tr(c.intro)+' '+tr(c.brief));
  add(c.ending+' Hai guadagnato 5 stelle!',tr(c.ending)+' You earned 5 stars!');
  add('Camion caricato: Pippo consegna i pacchi al festival! '+c.ending+' Hai guadagnato 5 stelle!','Truck loaded: Pippo delivers the parcels to the festival! '+tr(c.ending)+' You earned 5 stars!');
  for(const mark of ['✓ ','◆ ','◇ '])add(mark+c.title,mark+tr(c.title));
 });
 for(const title of [...E.vehicles,...E.stations]){
  add('Usa '+title,'Use '+tr(title));add(title+' sbloccato!',tr(title)+' unlocked!');
  add(title+' pronto! Toccalo nella scena per usarlo.',tr(title)+' ready! Tap it in the scene to use it.');
 }
 V.info.forEach((entry,i)=>{
  add(entry[1],`Reach case ${i+1}.`);
  for(const place of E.places)add('Con '+E.vehicles[i]+' raggiungo '+place+'.','With '+tr(E.vehicles[i])+' I reach '+tr(place)+'.');
 });
 for(const place of E.places){add('↪ '+place,'↪ '+tr(place));add('Parti: '+place,'Travel: '+tr(place));}
 const names=Object.values(E.items).map(item=>item[0]);
 for(const name of names){
  add('Usa '+name+' con…','Use '+tr(name)+' with…');add('Nelle tasche: '+name,'In my pockets: '+tr(name));
  add(name+' nelle tasche! Seleziona un oggetto, poi un altro per combinarli, oppure usalo nella scena.',tr(name)+' in my pockets! Select it, then another item to combine them, or use it in the scene.');
  add(name+' selezionato. Tocca un altro oggetto nelle tasche per combinarli, oppure un oggetto nella scena per usarlo.',tr(name)+' selected. Tap another item in your pockets to combine them, or an object in the scene to use it.');
 }
 for(const chapter of E.props)for(const prop of chapter){
  for(const [it,english]of [['Guarda ','Look at '],['Parla con ','Talk to '],['Prendi ','Take '],['Usa ','Use ']])add(it+prop.name,english+tr(prop.name));
  for(const name of names)add('Usa '+name+' con '+prop.name,'Use '+tr(name)+' with '+tr(prop.name));
 }
 for(const [a,b,result]of [['red','yellow','orange'],['yellow','red','orange'],['blue','red','purple'],['red','blue','purple'],['blue','yellow','green'],['yellow','blue','green']])add(`${E.items[a][0]} e ${E.items[b][0]} diventano ${E.items[result][0].toLowerCase()}! Le bottiglie originali restano disponibili.`,`${tr(E.items[a][0])} and ${tr(E.items[b][0])} become ${tr(E.items[result][0]).toLowerCase()}! The original bottles remain available.`);
 for(const size of ['Piccolo','Medio','Grande'])add(size+' ←',tr(size)+' ←');
 for(const gloves of ['rossi','indizio da cercare'])for(const boots of ['infangati','indizio da cercare'])add('Guanti: '+gloves+' · Stivali: '+boots,'Gloves: '+tr(gloves)+' · Boots: '+tr(boots));
 const puzzleClues=['','Cartello: piccolo → medio → grande.','Il cartello al festival spiega l’ordine dei pacchi.'];
 for(const cloth of ['guanto rosso','da cercare nel teatro'])for(const boots of ['stivali infangati','da cercare al molo']){const text=`Stoffa: ${cloth}. Impronte: ${boots}.`;add(text,`Cloth: ${tr(cloth)}. Footprints: ${tr(boots)}.`);puzzleClues.push(text);}
 const notes=['nessuna','☀','☀ · ☾','☀ · ☾ · ☀','☀ · ☾ · ☀ · ★'];
 for(const score of ['Spartito: Sole → Luna → Sole → Stella. ','Non hai ancora trovato lo spartito in piazza. '])for(const played of notes){const text=score+'Note suonate: '+played;add(text,tr(score.trimEnd())+' Notes played: '+tr(played));puzzleClues.push(text);}
 for(const clue of puzzleClues)for(const c of E.cases)for(const hint of c.hints)add(clue+' '+hint,tr(clue)+' '+tr(hint));
 // Stable full-text lookup keys: no substring replacement or reverse translation.
 root.CONTENT_IT=Object.freeze(Object.fromEntries(Object.keys(en).map(key=>[key,key])));
 root.CONTENT_EN=Object.freeze(en);
 root.PippoTemplates={stars:{it:n=>`★ ${n} stelle`,en:n=>`★ ${n} stars`},chapter:{it:n=>`CAPITOLO ${n} / 6`,en:n=>`CHAPTER ${n} / 6`},locked:{it:n=>`Risolvi prima ${n} casi`,en:n=>`Solve ${n} cases first`}};
})(globalThis);
