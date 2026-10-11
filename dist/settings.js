'use strict';
(function(){
 const I=window.PippoI18n,$=id=>document.getElementById(id);
 const button=document.createElement('button');button.id='settingsButton';button.textContent=I.t('Impostazioni');document.querySelector('.tools').append(button);
 const language=document.createElement('button');language.id='languageToggle';language.textContent=I.settings.language==='it'?'EN':'IT';language.setAttribute('aria-label',I.settings.language==='it'?'Switch to English':'Passa a italiano');document.querySelector('.tools').append(language);
 const descriptions={easy:'Guidata: aiuti espliciti e note corrette conservate.',normal:'Normale: suggerimenti progressivi e melodia da ricominciare se sbagli.',challenge:'Sfida: meno indizi a schermo e un solo suggerimento iniziale.'};
 function describe(){$('difficultyDescription').textContent=I.t(descriptions[I.settings.difficulty]);}
 function setLanguage(value){I.update({language:value});window.PippoGame.save();window.location.reload();}
 button.onclick=()=>{$('settingLanguage').value=I.settings.language;$('settingSounds').checked=I.settings.sounds;$('settingVoice').checked=window.PippoGame.getState().voice;$('settingDifficulty').value=I.settings.difficulty;describe();$('settingsDialog').showModal();};
 $('closeSettings').onclick=()=>$('settingsDialog').close();
 $('settingLanguage').onchange=event=>setLanguage(event.target.value);
 language.onclick=()=>setLanguage(I.settings.language==='it'?'en':'it');
 $('settingSounds').onchange=event=>{I.update({sounds:event.target.checked});if(!event.target.checked)window.PippoGame.stopSounds();};
 $('settingVoice').onchange=event=>window.PippoGame.setVoice(event.target.checked);
 $('settingDifficulty').onchange=event=>{I.update({difficulty:event.target.value});window.PippoGame.resetHints();describe();};
})();
