'use strict';
(function(){
 const I=window.PippoI18n,$=id=>document.getElementById(id);
 const button=document.createElement('button');button.id='settingsButton';I.text(button,'Impostazioni');document.querySelector('.tools').append(button);
 const language=document.createElement('button');language.id='languageToggle';language.textContent=I.settings.language==='it'?'EN':'IT';language.setAttribute('aria-label',I.settings.language==='it'?'Switch to English':'Passa a italiano');document.querySelector('.tools').append(language);
 const descriptions={easy:'Guidata: aiuti espliciti e note corrette conservate.',normal:'Normale: suggerimenti progressivi e melodia da ricominciare se sbagli.',challenge:'Sfida: meno indizi a schermo e un solo suggerimento iniziale.'};
 function describe(){I.text($('difficultyDescription'),descriptions[I.settings.difficulty]);}
 function setLanguage(value){I.update({language:value});}
 function refresh(){$('settingLanguage').value=I.settings.language;$('settingSounds').checked=I.settings.sounds;$('settingVoice').checked=window.PippoGame.getState().voice;$('settingDifficulty').value=I.settings.difficulty;language.textContent=I.settings.language==='it'?'EN':'IT';I.attribute(language,'aria-label',I.settings.language==='it'?'Passa a inglese':'Passa a italiano');describe();}
 button.onclick=()=>{refresh();$('settingsDialog').showModal();};
 $('closeSettings').onclick=()=>$('settingsDialog').close();
 $('settingLanguage').onchange=event=>setLanguage(event.target.value);
 language.onclick=()=>setLanguage(I.settings.language==='it'?'en':'it');
 $('settingSounds').onchange=event=>{I.update({sounds:event.target.checked});if(!event.target.checked)window.PippoGame.stopSounds();};
 $('settingVoice').onchange=event=>window.PippoGame.setVoice(event.target.checked);
 $('settingDifficulty').onchange=event=>{I.update({difficulty:event.target.value});window.PippoGame.resetHints();describe();};
 I.subscribe(refresh);refresh();
})();
