// Shared settings preserve the classic-script/offline edition.
'use strict';
(function(){
 const I=window.PippoI18n,$=id=>document.getElementById(id);
 const kit=new window.VideoGamesKit.GameUIController({gameId:'agent-pippo',mount:document.querySelector('.tools')});
 kit.settingsButton.id='settingsButton';kit.dialog.element.id='settingsDialog';kit.dialog.element.querySelector('header button').id='closeSettings';
 const ids={language:'settingLanguage',effects:'settingSounds',voice:'settingVoice',difficulty:'settingDifficulty'};
 for(const [key,id]of Object.entries(ids))kit.dialog.element.querySelector('[data-setting='+key+']').id=id;
 const language=document.createElement('button');language.id='languageToggle';language.className='ag-button';document.querySelector('.tools').append(language);
 let applying=false;
 function apply(){
  if(applying)return;applying=true;
  try{
   const p=kit.settings.getSnapshot();
   I.update({language:p.language,sounds:!p.muted&&p.effects,difficulty:p.difficulty});
   const voice=!p.muted&&p.voice;
   if(window.PippoGame.getState().voice!==voice)window.PippoGame.setVoice(voice);
   if(p.muted||!p.effects)window.PippoGame.stopSounds();
   language.textContent=p.language==='it'?'EN':'IT';language.setAttribute('aria-label',p.language==='it'?'Switch to English':'Passa a italiano');
  }finally{applying=false;}
 }
 kit.settings.subscribe(apply);
 I.subscribe((value,before)=>{
  if(applying)return;
  const patch={};if(value.language!==before.language)patch.language=value.language;
  if(value.difficulty!==before.difficulty)patch.difficulty=value.difficulty;
  if(value.sounds!==before.sounds)patch.effects=value.sounds;
  if(Object.keys(patch).length)kit.settings.update(patch);
 });
 language.onclick=()=>kit.settings.update({language:kit.settings.getSnapshot().language==='it'?'en':'it'});
 $('voice').onclick=()=>kit.settings.update({voice:!kit.settings.getSnapshot().voice,muted:false});
 apply();
})();
