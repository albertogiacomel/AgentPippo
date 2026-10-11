'use strict';
(function(root){
 const storageKey='agent_pippo_settings',defaults={language:'it',sounds:true,difficulty:'normal'};
 let settings={...defaults};
 function valid(patch){const result={};if(['it','en'].includes(patch?.language))result.language=patch.language;if(typeof patch?.sounds==='boolean')result.sounds=patch.sounds;if(['easy','normal','challenge'].includes(patch?.difficulty))result.difficulty=patch.difficulty;return result;}
 try{settings={...defaults,...valid(JSON.parse(localStorage.getItem(storageKey)))};}catch(error){console.warn('Settings read failed:',error.message);}
 const listeners=new Set(),bindings=new Set(),byNode=new WeakMap();
 function content(){return settings.language==='en'?root.CONTENT_EN:root.CONTENT_IT;}
 function t(source){if(source&&typeof source==='object'&&source.template)return root.PippoTemplates[source.template][settings.language](source.value);const value=String(source??''),catalog=content();return Object.hasOwn(catalog,value)?catalog[value]:value;}
 function format(template,value){if(!Object.hasOwn(root.PippoTemplates,template))throw new Error('Unknown content template: '+template);return {template,value};}
 function paint(binding){if(binding.attr)binding.node.setAttribute(binding.attr,t(binding.source));else binding.node.textContent=t(binding.source);}
 function bind(node,source,attr=''){let map=byNode.get(node);if(!map){map=new Map();byNode.set(node,map);}let binding=map.get(attr);if(!binding){binding={node,attr,source};map.set(attr,binding);bindings.add(binding);}binding.source=source;paint(binding);return node;}
 const text=(node,source)=>bind(node,source),attribute=(node,attr,source)=>bind(node,source,attr);
 function clearText(node){const map=byNode.get(node),binding=map?.get('');if(binding){bindings.delete(binding);map.delete('');}node.replaceChildren();}
 function staticText(){document.documentElement.lang=settings.language;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode()){const node=walker.currentNode;if(!['SCRIPT','STYLE','SVG'].includes(node.parentElement?.tagName)&&node.textContent.trim())nodes.push(node);}for(const node of nodes){const value=node.textContent;if(Object.hasOwn(root.CONTENT_IT,value.trim()))text(node,value.trim());}document.querySelectorAll('[aria-label],[title]').forEach(node=>{for(const attr of ['aria-label','title'])if(node.hasAttribute(attr))attribute(node,attr,node.getAttribute(attr));});text(document.querySelector('title'),'Agente Pippo — Il segreto di Porto Buffo');}
 function update(patch){const before={...settings};Object.assign(settings,valid(patch));try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch(error){console.warn('Settings save failed:',error.message);}if(before.language!==settings.language){document.documentElement.lang=settings.language;for(const binding of bindings){if(binding.node.isConnected===false){bindings.delete(binding);continue;}paint(binding);}if('speechSynthesis'in root)root.speechSynthesis.cancel();}for(const listener of listeners)listener(settings,before);return settings;}
 function subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
 function missing(){return [...new Set([...bindings].filter(b=>b.node.isConnected!==false&&typeof b.source==='string'&&/[a-zA-ZÀ-ÿ]/.test(b.source)&&!Object.hasOwn(root.CONTENT_IT,b.source)).map(b=>b.source))];}
 root.PippoI18n={settings,t,format,text,attribute,clearText,update,subscribe,staticText,missing,get content(){return content();}};staticText();
})(globalThis);
