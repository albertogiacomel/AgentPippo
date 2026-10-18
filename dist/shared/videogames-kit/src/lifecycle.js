/** Independent reasons prevent a dialog, hidden tab or manual pause resuming one another. */
export class GameLifecycleController {
  #reasons=new Set();#off=[];#input;#loop;#audio;#onPause;#onResume;#disposed=false;#wasRunning=false;#inputEnabled=true;
  constructor({input,loop,audio,onPause=()=>{},onResume=()=>{},document=globalThis.document,target=globalThis.window,pauseOnBlur=false}={}){
    this.#input=input;this.#loop=loop;this.#audio=audio;this.#onPause=onPause;this.#onResume=onResume;
    const listen=(source,event,handler)=>{if(source){source.addEventListener(event,handler);this.#off.push(()=>source.removeEventListener(event,handler));}};
    const visibility=()=>document.hidden?this.pause('visibility'):this.resume('visibility');
    listen(document,'visibilitychange',visibility);
    if(pauseOnBlur){listen(target,'blur',()=>this.pause('focus'));listen(target,'focus',()=>this.resume('focus'));}
    if(document?.hidden)this.pause('visibility');
  }
  get paused(){return this.#reasons.size>0;}
  get reasons(){return Object.freeze([...this.#reasons]);}
  pause(reason='manual'){
    if(this.#disposed)throw new Error('Lifecycle disposed');
    if(typeof reason!=='string'||!reason)throw new TypeError('Invalid pause reason');
    const paused=this.paused;this.#reasons.add(reason);
    if(!paused){this.#inputEnabled=this.#input?.enabled??true;this.#wasRunning=this.#loop?.running??false;this.#input?.setEnabled(false);this.#input?.clear();this.#loop?.stop();this.#audio?.stop();this.#onPause();}
  }
  resume(reason='manual'){
    if(this.#disposed)throw new Error('Lifecycle disposed');
    if(this.#reasons.delete(reason)&&!this.paused){this.#input?.setEnabled(this.#inputEnabled);if(this.#wasRunning)this.#loop?.start();this.#onResume();}
  }
  dispose(){if(this.#disposed)return;for(const off of this.#off)off();this.#off=[];this.#input?.clear();this.#reasons.clear();this.#disposed=true;}
}
