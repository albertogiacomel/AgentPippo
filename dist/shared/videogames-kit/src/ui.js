import { I18n, UI_MESSAGES } from './i18n.js';

/** Scoped appearance; cleanup restores the original host attributes. */
export class AppearanceController {
  #root; #settings; #media; #off; #previous;
  constructor(root, settings, { matchMedia = query => globalThis.matchMedia(query) } = {}) {
    this.#root = root; this.#settings = settings; this.#media = matchMedia('(prefers-color-scheme: dark)');
    this.#previous = Object.fromEntries(['data-ag-theme','data-ag-motion','data-ag-contrast','lang'].map(key => [key, root.getAttribute(key)]));
    this.#media.addEventListener('change', this.#apply); this.#off = settings.subscribe(this.#apply); this.#apply();
  }
  #apply = () => {
    const value = this.#settings.getSnapshot();
    this.#root.dataset.agTheme = value.theme === 'system' ? (this.#media.matches ? 'dark' : 'light') : value.theme;
    this.#root.dataset.agMotion = value.motion; this.#root.dataset.agContrast = value.contrast; this.#root.lang = value.language;
  };
  dispose() {
    this.#off(); this.#media.removeEventListener('change', this.#apply);
    for (const [key, value] of Object.entries(this.#previous))
      if (value === null) this.#root.removeAttribute(key); else this.#root.setAttribute(key, value);
  }
}

let nextDialog = 0;
/** Accessible, capability-aware settings; every change is immediate. */
export class SettingsDialog {
  #root;#settings;#i18n;#dialog;#fields=[];#labels=[];#off;#opener;
  #close;#reset;#status;#onError;#confirm;#confirmation;#disposed=false;
  constructor(root,settings,{i18n=new I18n(UI_MESSAGES),channels=['effects','music','voice'],
    difficulties=[{value:'normal',label:'normal'}],languages=[{value:'it',text:'Italiano'},{value:'en',text:'English'}],
    confirmReset,onError=error=>console.warn('Settings:',error)}={}){
    if(channels.some(c=>!['effects','music','voice'].includes(c)))throw new TypeError('Unknown audio channel');
    this.#root=root;this.#settings=settings;this.#i18n=i18n;this.#confirm=confirmReset;this.#onError=onError;
    const document=root.ownerDocument,id=`ag-settings-${++nextDialog}`;
    const node=(tag,className)=>{const e=document.createElement(tag);if(className)e.className=className;return e;};
    const text=(element,key)=>{this.#labels.push({element,key});return element;};
    const button=(key,className,action)=>{const e=text(node('button',className),key);e.type='button';e.onclick=action;return e;};
    this.#dialog=node('dialog','ag-dialog');this.#dialog.setAttribute('aria-labelledby',id);this.#dialog.setAttribute('aria-describedby',id+'-hint');
    const title=text(node('h2','ag-title'),'settings');title.id=id;
    this.#close=button('close','ag-button ag-button--quiet',()=>this.close());
    const header=node('header','ag-topbar ag-dialog-header');header.append(title,this.#close);
    const hint=text(node('p','ag-status'),'settingsHint');hint.id=id+'-hint';
    this.#dialog.append(header,hint);
    const section=key=>{const e=node('fieldset','ag-settings-group');e.append(text(node('legend'),key));this.#dialog.append(e);return e;};
    const add=(group,key,options)=>{
      const label=node('label','ag-field'),caption=text(node('span'),key),control=node(options?'select':'input');
      control.name=key;control.dataset.setting=key;
      if(options)for(const option of options){const e=node('option');e.value=option.value;if(option.text)e.textContent=option.text;else text(e,option.label);control.append(e);}
      else control.type='checkbox';
      control.onchange=()=>{try{settings.update({[key]:options?control.value:control.checked});this.#render();}catch(error){this.#onError(error);this.#render();this.#status.textContent=this.#i18n.t('settingsError');}};
      label.append(caption,control);this.#fields.push({key,control,options});group.append(label);
    };
    const options=values=>values.map(value=>({value,label:value}));
    const display=section('displayGroup');add(display,'language',languages);add(display,'theme',options(['system','light','dark']));
    if(channels.length){const audio=section('audioGroup');add(audio,'muted');for(const channel of channels)add(audio,channel);}
    if(difficulties.length>1)add(section('playGroup'),'difficulty',difficulties);
    const accessibility=section('accessibilityGroup');add(accessibility,'motion',options(['system','reduced']));add(accessibility,'contrast',options(['normal','high']));
    const footer=node('footer','ag-dialog-footer');
    this.#reset=button('reset','ag-button ag-button--quiet',()=>{
      if(this.#confirm){if(this.#confirm(this.#i18n.t('resetAsk')))reset();}
      else{this.#confirmation.hidden=false;cancel.focus();}
    });
    const reset=()=>{try{settings.reset();this.#render();this.#confirmation.hidden=true;this.#reset.focus();}catch(error){this.#onError(error);this.#status.textContent=this.#i18n.t('settingsError');}};
    this.#confirmation=node('div','ag-reset-confirm');this.#confirmation.hidden=true;this.#confirmation.setAttribute('role','group');
    const question=text(node('p'),'resetAsk');question.id=id+'-reset';this.#confirmation.setAttribute('aria-labelledby',question.id);
    const cancel=button('cancel','ag-button',()=>{this.#confirmation.hidden=true;this.#reset.focus();});
    const confirm=button('confirmReset','ag-button ag-button--danger',reset);
    this.#confirmation.append(question,cancel,confirm);
    this.#status=node('p','ag-status');this.#status.setAttribute('role','status');this.#status.setAttribute('aria-live','polite');this.#status.setAttribute('aria-atomic','true');
    footer.append(this.#reset,button('done','ag-button ag-button--primary',()=>this.close()));
    this.#dialog.append(this.#confirmation,this.#status,footer);
    this.#dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!this.#confirmation.hidden){event.preventDefault();this.#confirmation.hidden=true;this.#reset.focus();return;}
      if(event.key!=='Tab')return;
      const controls=[...this.#dialog.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')].filter(e=>!e.closest('[hidden]'));
      const first=controls[0],last=controls.at(-1),active=document.activeElement;
      if(event.shiftKey&&active===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
    });
    this.#dialog.addEventListener('close',()=>{this.#confirmation.hidden=true;if(this.#opener?.isConnected)this.#opener.focus();});
    root.append(this.#dialog);this.#off=settings.subscribe(this.#render);this.#render();
  }
  #render=()=>{
    const value=this.#settings.getSnapshot();this.#i18n.setLanguage(value.language);this.#dialog.lang=value.language;
    for(const {element,key}of this.#labels)element.textContent=this.#i18n.t(key);
    const status=this.#settings.status;
    for(const {key,control,options}of this.#fields){
      if(options)control.value=value[key];else control.checked=value[key];
      control.disabled=status==='future'||(['effects','music','voice'].includes(key)&&value.muted);
    }
    const message=['empty','memory','future','invalid'].includes(status)?status:'saved';
    this.#status.dataset.storage=message;const next=this.#i18n.t(message);if(this.#status.textContent!==next)this.#status.textContent=next;
    this.#reset.disabled=status==='future';
  };
  get element(){return this.#dialog;}
  open(opener=this.#root.ownerDocument.activeElement){
    if(this.#disposed)throw new Error('Settings dialog disposed');if(this.#dialog.open)return;
    this.#opener=opener;this.#confirmation.hidden=true;this.#render();this.#dialog.showModal();this.#close.focus();
  }
  close(){if(this.#dialog.open)this.#dialog.close();}
  dispose(){if(this.#disposed)return;this.close();this.#off();this.#dialog.remove();this.#disposed=true;}
}
