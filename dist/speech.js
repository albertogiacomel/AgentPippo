'use strict';
(function(root){
 const synth=root.speechSynthesis;
 let generation=0,pending=[];
 function voiceFor(language,voices=synth?.getVoices()||[],speaker='Pippo'){
  const prefix=language==='en'?'en':'it';
  return voices.filter(v=>v.lang.toLowerCase().startsWith(prefix)).sort((a,b)=>score(b,speaker)-score(a,speaker))[0];
 }
 function character(speaker){return /^ada\b/i.test(speaker)?{gender:'female',pitch:1.06}:/^berto\b/i.test(speaker)?{gender:'male',pitch:.92}:{gender:'male',pitch:1};}
 function genderOf(voice){if(/\b(elsa|isabella|alice|lucia|silvia|paola|samantha|susan|zira|jenny|sonia|emma|aria)\b/i.test(voice.name))return 'female';if(/\b(diego|cosimo|luca|paolo|roberto|riccardo|daniel|david|george|james|guy|ryan)\b/i.test(voice.name))return 'male';return 'unknown';}
 function score(voice,speaker){const gender=genderOf(voice),wanted=character(speaker).gender;return (gender===wanted?1000:gender==='unknown'?0:-1000)+(/natural|neural|online/i.test(voice.name)?100:0)+(voice.default?1:0);}
 function spokenText(text){return String(text).replace(/^(?:Pippo|Berto|Ada)\s*:\s*«?/,'').replace(/[«»✓◆◇•★]/g,' ').replace(/→/g,', poi ').replace(/…/g,'. ').replace(/\s+/g,' ').trim();}
 function stop(){generation++;synth?.cancel();pending=[];}
 function speak(text,language='it',speaker='Pippo'){
  if(!synth)return false;
  stop();const ticket=generation;
  const chunks=spokenText(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
  // Queue every sentence immediately. Keep strong references until completion:
  // some browser voices omit end events, which must not block later sentences.
  pending=chunks.map(chunk=>new root.SpeechSynthesisUtterance(chunk.trim()));
  for(const utterance of pending){
   const voice=voiceFor(language,undefined,speaker);
   utterance.lang=language==='en'?'en-GB':'it-IT';if(voice)utterance.voice=voice;
   utterance.rate=language==='it'?.94:.92;utterance.pitch=character(speaker).pitch;
   utterance.onend=()=>{if(ticket===generation)pending=pending.filter(item=>item!==utterance);};
   utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))console.warn('Dialog voice unavailable:',event.error);};
  }
  synth.resume();for(const utterance of pending)synth.speak(utterance);return pending.length>0;
 }
 root.PippoSpeech={speak,stop,voiceFor,spokenText,character,genderOf};
})(globalThis);
