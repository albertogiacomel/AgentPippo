'use strict';
(function(root){
 const synth=root.speechSynthesis;
 let generation=0;
 function voiceFor(language,voices=synth?.getVoices()||[],speaker='Pippo'){
  const prefix=language==='en'?'en':'it';
  return voices.filter(v=>v.lang.toLowerCase().startsWith(prefix)).sort((a,b)=>score(b,speaker)-score(a,speaker))[0];
 }
 function score(voice,speaker){return (/natural|neural|online/i.test(voice.name)?100:0)+((speaker==='Ada'?/elsa|isabella/i:/diego|cosimo/i).test(voice.name)?10:0)+(voice.default?1:0);}
 function spokenText(text){return String(text).replace(/^[^:«]{1,25}:\s*«?/,'').replace(/[«»✓◆◇•★]/g,' ').replace(/→/g,', poi ').replace(/…/g,'. ').replace(/\s+/g,' ').trim();}
 function stop(){generation++;synth?.cancel();}
 function speak(text,language='it',speaker='Pippo'){
  if(!synth)return false;
  stop();const ticket=generation;
  const chunks=spokenText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  function next(index){
   if(ticket!==generation||index>=chunks.length)return;
   const utterance=new root.SpeechSynthesisUtterance(chunks[index].trim());
   const voice=voiceFor(language,undefined,speaker);
   utterance.lang=language==='en'?'en-GB':'it-IT';if(voice)utterance.voice=voice;
   utterance.rate=language==='it'?.94:.92;utterance.pitch=speaker==='Berto'?.92:speaker==='Ada'?1.06:1;
   utterance.onend=()=>next(index+1);
   utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))console.warn('Dialog voice unavailable:',event.error);};
   synth.speak(utterance);
  }
  synth.resume();next(0);return true;
 }
 root.PippoSpeech={speak,stop,voiceFor,spokenText};
})(globalThis);
