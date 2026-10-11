'use strict';
(function(root){
 let settings={language:'it',sounds:true,difficulty:'normal'};
 try{const saved=JSON.parse(localStorage.getItem('agent_pippo_settings'));if(saved&&['it','en'].includes(saved.language)&&typeof saved.sounds==='boolean'&&['easy','normal','challenge'].includes(saved.difficulty))settings=saved;}catch(error){console.warn('Settings read failed:',error.message);}
 const dictionary=root.PippoEnglish;
 const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const fragments=new RegExp(Object.keys(dictionary).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
 function t(value){const text=String(value??'');if(settings.language==='it')return text;return Object.hasOwn(dictionary,text)?dictionary[text]:text.replace(fragments,key=>dictionary[key]);}
 function update(patch){Object.assign(settings,patch);try{localStorage.setItem('agent_pippo_settings',JSON.stringify(settings));}catch(error){console.warn('Settings save failed:',error.message);}return settings;}
 function staticText(){document.documentElement.lang=settings.language;document.title=t(document.title);const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(['SCRIPT','STYLE','SVG'].includes(node.parentElement?.tagName))continue;const raw=node.textContent,trimmed=raw.trim();if(trimmed)node.textContent=raw.replace(trimmed,t(trimmed));}document.querySelectorAll('[aria-label],[title]').forEach(node=>{for(const attr of ['aria-label','title'])if(node.hasAttribute(attr))node.setAttribute(attr,t(node.getAttribute(attr)));});}
 root.PippoI18n={settings,t,update,staticText};staticText();
})(globalThis);
