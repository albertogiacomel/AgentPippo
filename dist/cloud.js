'use strict';
(function(){
 const I=window.PippoI18n;
 const $=id=>document.getElementById(id),storageKey='agent_pippo_cloud';
 const button=document.createElement('button');button.id='cloudButton';button.textContent=I.t('Salvataggi');document.querySelector('.tools').append(button);
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='cloud.css';document.head.append(stylesheet);
 let connection=null,busy=false;
 try{connection=JSON.parse(localStorage.getItem(storageKey));if(!/^[a-f0-9]{64}$/.test(connection?.code)||!Number.isSafeInteger(connection?.revision)||connection.revision<0)connection=null;}catch(error){console.warn('Impostazioni cloud non disponibili:',error.message);}
 function status(text){$('cloudFeedback').textContent=I.t(text);}
 function store(){localStorage.setItem(storageKey,JSON.stringify(connection));}
 function refresh(){for(const id of ['cloudCreate','cloudSave','cloudLoad','cloudConnect'])$(id).disabled=busy;$('cloudSave').disabled=busy||!connection;$('cloudLoad').disabled=busy||!connection;$('cloudCode').value=connection?.code||'';}
 async function request(method,code,payload){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch('/api/save',{method,headers:{Authorization:'Bearer '+code,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,signal:controller.signal});let result;try{result=await response.json();}catch(error){throw new Error('Il salvataggio cloud non è attivo su questo sito.',{cause:error});}if(!response.ok){const messages={revision_conflict:'La partita cloud è cambiata su un altro dispositivo. Riprendila prima di salvare di nuovo.',save_not_found:'Nessuna partita trovata con questo codice.',cloud_not_configured:'Cloud non ancora configurato. Puoi continuare a giocare su questo dispositivo.',cloud_unavailable:'Cloud momentaneamente non disponibile. La partita locale è conservata.',invalid_code:'Il codice deve contenere 64 lettere e numeri.',invalid_save:'Partita non valida: il salvataggio locale è conservato.'};throw new Error(messages[result.error]||'Salvataggio cloud non disponibile. Puoi continuare offline.');}return result;}finally{clearTimeout(timeout);}
 }
 async function action(task){busy=true;refresh();status('Un momento…');try{await task();}catch(error){status(error.name==='AbortError'?'Connessione lenta. La partita locale è conservata.':error.message);}finally{busy=false;refresh();}}
 function snapshot(){const saved=localStorage.getItem('porto_buffo_v2'),state=saved?JSON.parse(saved):window.PortoBuffo.initialState();if(!window.PortoBuffo.validateState(state))throw new Error('La partita locale non è valida.');return state;}
 function replaceLocal(result,code){if(!window.PortoBuffo.validateState(result.state))throw new Error('Il salvataggio ricevuto non è valido.');localStorage.setItem('porto_buffo_cloud_backup',localStorage.getItem('porto_buffo_v2')||'');localStorage.setItem('porto_buffo_v2',JSON.stringify(window.PortoBuffo.migrateState(result.state)));connection={code,revision:result.revision};store();window.location.reload();}
 $('cloudButton').onclick=()=>{refresh();status(connection?'Partita collegata. Salva o riprendi quando vuoi.':'Puoi continuare offline o conservare una copia cloud.');$('cloudDialog').showModal();};
 $('closeCloud').onclick=()=>$('cloudDialog').close();
 $('cloudCreate').onclick=()=>action(async()=>{const bytes=crypto.getRandomValues(new Uint8Array(32)),code=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');const result=await request('PUT',code,{state:snapshot(),revision:0});connection={code,revision:result.revision};store();status('Copia cloud creata! Conserva il codice per riprenderla su un altro dispositivo.');});
 $('cloudSave').onclick=()=>action(async()=>{const state=snapshot(),result=await request('PUT',connection.code,{state,revision:connection.revision});connection.revision=result.revision;store();status('Partita salvata nel cloud.');});
 $('cloudLoad').onclick=()=>{if(!window.confirm(I.t('Riprendere la copia cloud? La partita locale attuale verrà conservata come backup.')))return;action(async()=>replaceLocal(await request('GET',connection.code),connection.code));};
 $('cloudConnect').onclick=()=>{const code=$('cloudImport').value.trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(code)){status('Incolla il codice completo della partita.');return;}if(!window.confirm(I.t('Caricare la partita di questo codice? La partita locale attuale verrà conservata come backup.')))return;action(async()=>replaceLocal(await request('GET',code),code));};
 $('cloudCode').onclick=()=>$('cloudCode').select();
})();
