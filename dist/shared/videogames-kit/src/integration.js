import { SettingsStore, SETTINGS_DEFAULTS } from './storage.js';
import { getGameProfile } from './profiles.js';
import { GameLifecycleController } from './lifecycle.js';
import { I18n, UI_MESSAGES } from './i18n.js';
import { AppearanceController, SettingsDialog } from './ui.js';
import { FullscreenController } from './fullscreen.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';

const stores = new Map(), controllers = new Map();
export function createIntegratedSettings(gameId, { storage = () => globalThis.localStorage, onError } = {}) {
  const profile=getGameProfile(gameId),defaults={...SETTINGS_DEFAULTS,...profile.defaults,difficulty:profile.difficulty};
  const provider=typeof storage==='function'?storage:()=>storage;
  const allowed={language:['it','en'],theme:['system','light','dark'],difficulty:profile.difficulties};
  const migrate=()=>{
    const value={...defaults};
    for(const adapter of profile.legacy){
      try{
        const raw=provider().getItem(adapter.key);if(raw===null)continue;
        const previous=adapter.encoding==='text'?raw:JSON.parse(raw);
        for(const {from,to} of adapter.fields){
          const candidate=from===''?previous:previous&&Object.hasOwn(previous,from)?previous[from]:undefined;
          if(Object.hasOwn(defaults,to)&&(allowed[to]?allowed[to].includes(candidate):typeof candidate==='boolean'))value[to]=candidate;
        }
      }catch(error){if(onError)onError(error,'legacy:'+adapter.key);else console.warn('Legacy preference unavailable:',adapter.key,error);}
    }
    return {version:1,data:value};
  };
  return new SettingsStore({gameId,storage:provider,onError,difficulties:[...profile.difficulties],defaults,
    legacy:profile.legacy.map(adapter=>({key:adapter.key,parse:raw=>raw,decode:migrate}))});
}
export function getGameSettings(gameId) {
  if (!stores.has(gameId)) stores.set(gameId, createIntegratedSettings(gameId));
  return stores.get(gameId);
}
export function getGameController(gameId) { return controllers.get(gameId); }
export function toggleGameFullscreen(gameId) { return controllers.get(gameId)?.fullscreen.toggle(); }

/** One integration controller shared by DOM and React consumers. No game state is owned here. */
export class GameUIController {
  #off; #media; #change; #gesture; #close; #onOpen; #onClose; #hadClass;
  #navigation; #frame; #fullscreenOff; #previous = {};
  constructor({ gameId, settings = getGameSettings(gameId), root = document.body, mount,
    onOpen = () => {}, onClose = () => {} }) {
    if (controllers.has(gameId)) throw new Error('Game UI already mounted: ' + gameId);
    this.gameId = gameId; this.root = root; this.settings = settings;
    this.#onOpen = onOpen; this.#onClose = onClose;
    const document = root.ownerDocument, profile = getGameProfile(gameId);
    this.#hadClass = root.classList.contains('ag-game'); root.classList.add('ag-game', 'ag-kit-host');
    root.dataset.kitIntegrated = gameId;
    this.appearance = new AppearanceController(root, settings);
    this.audio = new AudioManager(); this.fullscreen = new FullscreenController(root);
    const messages = { it: { ...UI_MESSAGES.it, medium: 'Media', hard: 'Difficile', relaxed: 'Piccoli esploratori',
      '2': '2 lettere', '3': '3 lettere' }, en: { ...UI_MESSAGES.en, medium: 'Medium', hard: 'Hard',
      relaxed: 'Little explorers', '2': '2 letters', '3': '3 letters' } };
    for(const language of Object.keys(messages))Object.assign(messages[language],profile.messages[language]);
    this.i18n = new I18n(messages);
    this.dialog = new SettingsDialog(root, settings, { i18n: this.i18n, channels: [...profile.channels],
      difficulties: profile.difficulties.length > 1 ? profile.difficulties.map(value => ({ value, label: value })) : [] });
    this.dialog.element.dataset.kitDialog = gameId;
    this.controls = document.createElement('div'); this.controls.className = 'ag-kit-controls';
    const button = (key, action) => {
      const node = document.createElement('button'); node.type = 'button'; node.className = 'ag-button';
      node.dataset[key === 'settings' ? 'kitSettings' : 'kitFullscreen'] = '';
      node.addEventListener('click', action); this.controls.append(node); return node;
    };
    this.settingsButton = button('settings', () => this.open(this.settingsButton));
    this.fullscreenButton = button('fullscreen', () => { this.fullscreen.toggle().catch(error => console.error('Fullscreen:', error)); });
    this.settingsButton.setAttribute('aria-haspopup','dialog');this.settingsButton.setAttribute('aria-expanded','false');
    this.dialog.element.id||=(gameId+'-kit-settings');this.settingsButton.setAttribute('aria-controls',this.dialog.element.id);
    if (mount) mount.append(this.controls);
    this.#media = matchMedia('(prefers-color-scheme: dark)');
    this.#change = () => {
      const value = settings.getSnapshot(); this.i18n.setLanguage(value.language);
      const dark = value.theme === 'system' ? this.#media.matches : value.theme === 'dark';
      document.documentElement.classList.toggle('dark', dark); document.documentElement.lang = value.language;
      this.audio.setPreferences(value);
      if ((value.muted || !value.voice) && globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      this.settingsButton.textContent = this.i18n.t('settings'); this.fullscreenButton.textContent = this.i18n.t(this.fullscreen.active?'exitFullscreen':'fullscreen');this.fullscreenButton.setAttribute('aria-pressed',String(this.fullscreen.active));
    };
    this.#fullscreenOff=this.fullscreen.subscribe(()=>this.#change());
    this.#off = settings.subscribe(this.#change); this.#media.addEventListener('change', this.#change); this.#change();
    this.#gesture = event => { if (event.isTrusted && profile.channels.length && !settings.getSnapshot().muted) void this.audio.unlock(); };
    root.addEventListener('pointerdown', this.#gesture, true); root.addEventListener('keydown', this.#gesture, true);
    this.lifecycle=new GameLifecycleController({audio:this.audio,onPause:()=>this.#onOpen(),onResume:()=>this.#onClose(),document});
    this.#close = () => {if(!this.dialog.element.open){this.settingsButton.setAttribute('aria-expanded','false');this.lifecycle.resume('settings');}}; this.dialog.element.addEventListener('close', this.#close);
    this.#navigation = new InputManager({ keys: {}, gamepad: {
      previous: { axis: 1, direction: -1, buttons: [12] }, next: { axis: 1, direction: 1, buttons: [13] },
      left: { buttons: [14] }, right: { buttons: [15] }, confirm: { buttons: [0] }, back: { buttons: [1] }, settings: { buttons: [8] },
    } });
    const navigate = () => {
      const value = this.#navigation.poll(), pressed = key => value[key] && !this.#previous[key];
      if (pressed('settings')) { if (this.dialog.element.open) this.dialog.close(); else this.open(this.settingsButton); }
      if (this.dialog.element.open) {
        const nodes = [...this.dialog.element.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(node=>!node.closest('[hidden]'));
        const active = document.activeElement, index = nodes.indexOf(active);
        if (pressed('previous')) nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
        if (pressed('next')) nodes[(index + 1) % nodes.length]?.focus();
        if ((pressed('left') || pressed('right')) && active?.tagName === 'SELECT') {
          active.selectedIndex = (active.selectedIndex + (pressed('right') ? 1 : -1) + active.options.length) % active.options.length;
          active.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (pressed('confirm') && active?.tagName !== 'SELECT') active?.click();
        if (pressed('back')) this.dialog.close();
      }
      this.#previous = value; this.#frame = requestAnimationFrame(navigate);
    };
    this.#frame = requestAnimationFrame(navigate);
    controllers.set(gameId, this); globalThis.__gameKit = this;
  }
  open(opener) {
    if(this.dialog.element.open)return;
    this.lifecycle.pause('settings');
    try{this.dialog.open(opener);this.settingsButton.setAttribute('aria-expanded','true');}
    catch(error){this.lifecycle.resume('settings');throw error;}
  }
  async dispose() {
    cancelAnimationFrame(this.#frame); this.#navigation.dispose(); this.lifecycle.dispose();
    this.#off(); this.#fullscreenOff(); this.#media.removeEventListener('change', this.#change);
    this.root.removeEventListener('pointerdown', this.#gesture, true); this.root.removeEventListener('keydown', this.#gesture, true);
    this.dialog.element.removeEventListener('close', this.#close); this.dialog.dispose(); this.appearance.dispose(); this.controls.remove();
    this.root.classList.remove('ag-kit-host'); if (!this.#hadClass) this.root.classList.remove('ag-game');
    delete this.root.dataset.kitIntegrated;
    if (controllers.get(this.gameId) === this) controllers.delete(this.gameId);
    if (globalThis.__gameKit === this) delete globalThis.__gameKit;
    await Promise.all([this.fullscreen.dispose(), this.audio.dispose()]);
  }
}
