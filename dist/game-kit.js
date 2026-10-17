globalThis.VideoGamesKit = (() => {
"use strict";
const clone = value => structuredClone(value);
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/i.test(value);

/** Versioned JSON storage with explicit migration and an in-memory fallback. */
class VersionedStore {
  #factory; #validate; #defaults; #memory; #migrations; #legacy; #onError; #future = false; #loaded = false; #dirty = false;
  constructor({ gameId, slot = 'save', version = 1, defaults, validate,
    migrations = {}, legacy = [], storage = () => globalThis.localStorage,
    onError = (error, operation) => console.warn(`Storage ${operation}:`, error) }) {
    if (!validId(gameId) || !validId(slot) || !Number.isSafeInteger(version) || version < 1)
      throw new TypeError('Invalid gameId, slot or version');
    if (typeof defaults !== 'function' || typeof validate !== 'function')
      throw new TypeError('defaults and validate must be functions');
    this.key = `ag-games:${gameId}:${slot}:v${version}`; this.version = version;
    this.#defaults = defaults; this.#validate = validate;
    this.#factory = typeof storage === 'function' ? storage : () => storage;
    this.#migrations = migrations; this.#legacy = legacy; this.#onError = onError;
    this.#memory = this.#fresh(); this.status = 'empty';
  }
  #fresh() {
    const value = this.#defaults();
    if (!this.#validate(value)) throw new TypeError('Invalid defaults');
    return clone(value);
  }
  #decode(envelope) {
    if (!envelope || !Number.isSafeInteger(envelope.version) || envelope.version < 1)
      throw new TypeError('Missing storage version');
    if (envelope.version > this.version) {
      this.#future = true; this.status = 'future';
      throw new RangeError('Future save version: refusing to overwrite');
    }
    let { version, data } = envelope;
    while (version < this.version) {
      const migrate = this.#migrations[version];
      if (typeof migrate !== 'function') throw new TypeError(`Missing migration ${version}`);
      data = migrate(clone(data)); version += 1;
    }
    if (!this.#validate(data)) throw new TypeError('Invalid saved data');
    return clone(data);
  }
  load() {
    if (this.#dirty) return clone(this.#memory);
    this.#loaded = true; this.#future = false;
    let storage, raw;
    try { storage = this.#factory(); raw = storage.getItem(this.key); }
    catch (error) { this.status = 'memory'; this.#onError(error, 'read'); return clone(this.#memory); }
    if (raw !== null) {
      try { this.#memory = this.#decode(JSON.parse(raw)); this.status = 'persistent'; }
      catch (error) {
        if (!this.#future) this.status = 'invalid';
        this.#onError(error, 'decode'); this.#memory = this.#fresh();
      }
      return clone(this.#memory);
    }
    for (const old of this.#legacy) {
      try {
        const previous = storage.getItem(old.key);
        if (previous === null) continue;
        const value = this.#decode(old.decode(old.parse ? old.parse(previous) : JSON.parse(previous)));
        this.save(value); // Retain the old key for rollback.
        return clone(this.#memory);
      } catch (error) {
        this.#onError(error, `migrate:${old.key}`);
        if (this.#future) return this.#fresh();
      }
    }
    this.#memory = this.#fresh(); this.status = 'empty'; return clone(this.#memory);
  }
  save(value) {
    if (!this.#loaded) this.load();
    if (this.#future) throw new RangeError('Future save version: refusing to overwrite');
    if (!this.#validate(value)) throw new TypeError('Invalid data: save rejected');
    const raw = JSON.stringify({ version: this.version, data: value });
    const candidate = JSON.parse(raw).data;
    if (!this.#validate(candidate)) throw new TypeError('Data does not survive JSON encoding');
    this.#memory = clone(candidate);
    try { this.#factory().setItem(this.key, raw); this.status = 'persistent'; this.#dirty = false; return true; }
    catch (error) { this.status = 'memory'; this.#dirty = true; this.#onError(error, 'write'); return false; }
  }
  reset() { const value = this.#fresh(); this.save(value); return value; }
}

const SETTINGS_DEFAULTS = Object.freeze({
  language: 'it', theme: 'system', motion: 'system', contrast: 'normal',
  muted: false, effects: true, music: true, voice: true, difficulty: 'normal',
});

/** Stable frozen snapshots, compatible with useSyncExternalStore. */
class SettingsStore {
  #store; #snapshot; #listeners = new Set(); #validate;
  constructor({ gameId, difficulties = ['normal'], languages = ['it', 'en'], defaults = {}, ...options }) {
    const initial = { ...SETTINGS_DEFAULTS, ...defaults };
    const enums = { language: languages, theme: ['system', 'light', 'dark'],
      motion: ['system', 'reduced'], contrast: ['normal', 'high'], difficulty: difficulties };
    this.#validate = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).length === Object.keys(initial).length &&
      Object.keys(initial).every(key => Object.hasOwn(value, key) &&
        (enums[key] ? enums[key].includes(value[key]) : typeof value[key] === 'boolean'));
    this.#store = new VersionedStore({ ...options, gameId, slot: 'settings', version: 1,
      defaults: () => ({ ...initial }), validate: this.#validate });
    this.#snapshot = Object.freeze(this.#store.load());
  }
  get status() { return this.#store.status; }
  getSnapshot = () => this.#snapshot;
  subscribe = listener => { this.#listeners.add(listener); return () => this.#listeners.delete(listener); };
  #publish(value) {
    if (Object.keys(value).every(key => value[key] === this.#snapshot[key])) return this.#snapshot;
    this.#snapshot = Object.freeze(value);
    for (const listener of [...this.#listeners]) listener();
    return this.#snapshot;
  }
  update(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Invalid settings patch');
    const next = { ...this.#snapshot, ...patch };
    if (!this.#validate(next)) throw new TypeError('Unknown setting or invalid value');
    this.#store.save(next); return this.#publish(next);
  }
  reload() { return this.#publish(this.#store.load()); }
  reset() { return this.#publish(this.#store.reset()); }
}

/** Text-only localization. Callers write textContent, never translation HTML. */
class I18n {
  #catalogs; #language; #fallback;
  constructor(catalogs, { language = 'it', fallback = 'it' } = {}) {
    if (!Object.hasOwn(catalogs, fallback)) throw new TypeError('Missing fallback catalog');
    this.#catalogs = catalogs; this.#fallback = fallback; this.setLanguage(language);
  }
  get language() { return this.#language; }
  setLanguage(language) {
    if (!Object.hasOwn(this.#catalogs, language)) throw new RangeError(`Unknown language: ${language}`);
    this.#language = language;
  }
  t(key, values = {}) {
    const own = this.#catalogs[this.#language], fallback = this.#catalogs[this.#fallback];
    const text = Object.hasOwn(own, key) ? own[key] : Object.hasOwn(fallback, key) ? fallback[key] : key;
    if (typeof text !== 'string') throw new TypeError(`Translation must be text: ${key}`);
    return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
}
const UI_MESSAGES = Object.freeze({
  it: { settings: 'Impostazioni', close: 'Chiudi', language: 'Lingua', theme: 'Aspetto',
    system: 'Sistema', light: 'Chiaro', dark: 'Scuro', motion: 'Animazioni', reduced: 'Ridotte',
    contrast: 'Contrasto', normal: 'Normale', high: 'Aumentato', muted: 'Disattiva tutto l’audio',
    effects: 'Effetti sonori', music: 'Musica', voice: 'Voce', difficulty: 'Difficoltà',
    reset: 'Ripristina preferenze', resetAsk: 'Ripristinare le preferenze? I progressi restano conservati.',
    fullscreen: 'Schermo intero', help: 'Aiuto', saved: 'Preferenze salvate su questo dispositivo.',
    empty: 'Le preferenze saranno salvate alla prima modifica.',
    memory: 'Salvataggio non disponibile: preferenze mantenute per questa sessione.',
    future: 'Preferenze di una versione più recente: aggiornamento necessario.',
    invalid: 'Preferenze non valide: applicati i valori iniziali.', easy: 'Guidata', challenge: 'Sfida' },
  en: { settings: 'Settings', close: 'Close', language: 'Language', theme: 'Appearance',
    system: 'System', light: 'Light', dark: 'Dark', motion: 'Motion', reduced: 'Reduced',
    contrast: 'Contrast', normal: 'Normal', high: 'High', muted: 'Mute all audio',
    effects: 'Sound effects', music: 'Music', voice: 'Voice', difficulty: 'Difficulty',
    reset: 'Reset preferences', resetAsk: 'Reset preferences? Your progress will be preserved.',
    fullscreen: 'Fullscreen', help: 'Help', saved: 'Preferences saved on this device.',
    empty: 'Preferences will be saved on the first change.',
    memory: 'Storage unavailable: preferences are kept for this session.',
    future: 'Preferences belong to a newer version: an update is required.',
    invalid: 'Invalid preferences: initial values restored.', easy: 'Guided', challenge: 'Challenge' },
});

const DEFAULT_KEYS = Object.freeze({ ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right',
  KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'run',
  ShiftRight: 'run', Escape: 'pause', Enter: 'confirm' });
const DEFAULT_PAD = Object.freeze({
  left: { axis: 0, direction: -1, buttons: [14] }, right: { axis: 0, direction: 1, buttons: [15] },
  jump: { buttons: [0] }, confirm: { buttons: [0] }, run: { buttons: [1, 7] }, pause: { buttons: [9] },
});
/** Separate physical sources prevent a release from cancelling another held key or touch. */
class InputManager {
  #keys; #pad; #deadzone; #sources = new Map(); #off = []; #buttons = new Set();
  #document; #navigator; #enabled = true;
  constructor({ target = globalThis.window, document = globalThis.document,
    navigator = globalThis.navigator, keys = DEFAULT_KEYS, gamepad = DEFAULT_PAD, deadzone = 0.35 } = {}) {
    if (!(deadzone >= 0 && deadzone < 1)) throw new RangeError('Invalid gamepad deadzone');
    this.#document = document; this.#navigator = navigator;
    this.#keys = { ...keys }; this.#pad = gamepad; this.#deadzone = deadzone;
    for (const action of new Set([...Object.values(keys), ...Object.keys(gamepad)])) this.#sources.set(action, new Set());
    this.#listen(target, 'keydown', event => {
      const action = this.#keys[event.code];
      if (!this.#enabled || !action || event.ctrlKey || event.metaKey || event.altKey ||
          event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),dialog[open]')) return;
      event.preventDefault(); this.#set(action, `key:${event.code}`, true);
    });
    this.#listen(target, 'keyup', event => {
      const action = this.#keys[event.code]; if (action) this.#set(action, `key:${event.code}`, false);
    });
    this.#listen(target, 'blur', () => this.clear());
    this.#listen(document, 'visibilitychange', () => { if (document.hidden) this.clear(); });
  }
  #listen(target, event, listener) {
    target.addEventListener(event, listener); this.#off.push(() => target.removeEventListener(event, listener));
  }
  #set(action, source, active) {
    const sources = this.#sources.get(action);
    if (!sources) throw new RangeError(`Unknown action: ${action}`);
    if (active) sources.add(source); else sources.delete(source);
  }
  bindButton(element, action) {
    if (!this.#sources.has(action)) throw new RangeError(`Unknown action: ${action}`);
    const pointers = new Set();
    const release = event => {
      if (!pointers.delete(event.pointerId)) return;
      this.#set(action, `pointer:${event.pointerId}`, false);
      element.classList.toggle('ag-pressed', pointers.size > 0);
    };
    const down = event => {
      if (!this.#enabled || element.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); pointers.add(event.pointerId); this.#set(action, `pointer:${event.pointerId}`, true);
      if (element.setPointerCapture && event.isTrusted) element.setPointerCapture(event.pointerId);
      element.classList.add('ag-pressed');
    };
    element.addEventListener('pointerdown', down);
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(event, release);
    const button = { element, pointers }; this.#buttons.add(button);
    const unbind = () => {
      element.removeEventListener('pointerdown', down);
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) element.removeEventListener(event, release);
      for (const pointer of pointers) this.#set(action, `pointer:${pointer}`, false);
      pointers.clear(); element.classList.remove('ag-pressed'); this.#buttons.delete(button);
    };
    this.#off.push(unbind); return unbind;
  }
  setEnabled(enabled) { this.#enabled = Boolean(enabled); if (!enabled) this.clear(); }
  clear() {
    for (const sources of this.#sources.values()) sources.clear();
    for (const button of this.#buttons) { button.pointers.clear(); button.element.classList.remove('ag-pressed'); }
  }
  poll() {
    const result = Object.fromEntries([...this.#sources].map(([action, sources]) => [action, this.#enabled && sources.size > 0]));
    if (!this.#enabled || this.#document.hidden) return Object.freeze(Object.fromEntries(Object.keys(result).map(key => [key, false])));
    const pads = this.#navigator?.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad || pad.connected === false) continue;
      for (const [action, binding] of Object.entries(this.#pad)) {
        const axis = binding.axis === undefined ? 0 : (pad.axes?.[binding.axis] ?? 0) * binding.direction;
        if (axis > this.#deadzone || binding.buttons?.some(index => pad.buttons?.[index]?.pressed)) result[action] = true;
      }
    }
    return Object.freeze(result);
  }
  dispose() { this.clear(); for (const off of this.#off.splice(0)) off(); this.#enabled = false; }
}

/** Synthesized SFX and speech. unlock() must be called from a user gesture. */
class AudioManager {
  #factory; #context; #master; #channels = new Map(); #sources = new Map();
  #speech; #Utterance; #speaking = false; #unlocked = false; #disposed = false;
  #settings = { muted: false, effects: true, music: true, voice: true }; #onError;
  constructor({ contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    speech = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
    onError = error => console.warn('Audio:', error) } = {}) {
    this.#factory = contextFactory; this.#speech = speech; this.#Utterance = Utterance; this.#onError = onError;
  }
  async unlock() {
    if (this.#disposed) throw new Error('Audio manager disposed');
    this.#unlocked = true;
    try {
      this.#context ??= this.#factory();
      if (!this.#master) {
        this.#master = this.#context.createGain(); this.#master.connect(this.#context.destination);
        for (const channel of ['effects', 'music', 'voice']) {
          const gain = this.#context.createGain(); gain.connect(this.#master); this.#channels.set(channel, gain);
        }
      }
      if (this.#context.state === 'suspended') await this.#context.resume();
      this.setPreferences(this.#settings); return true;
    } catch (error) { this.#onError(error); return false; }
  }
  #allowed(channel) { return !this.#disposed && this.#unlocked && !this.#settings.muted && this.#settings[channel]; }
  setPreferences(settings) {
    this.#settings = { ...this.#settings, ...Object.fromEntries(['muted', 'effects', 'music', 'voice']
      .filter(key => typeof settings[key] === 'boolean').map(key => [key, settings[key]])) };
    if (this.#master) this.#master.gain.setValueAtTime(this.#settings.muted ? 0 : 1, this.#context.currentTime);
    for (const [channel, gain] of this.#channels)
      gain.gain.setValueAtTime(this.#settings[channel] ? 1 : 0, this.#context.currentTime);
    for (const [source, channel] of [...this.#sources]) if (!this.#allowed(channel)) { source.stop(); this.#sources.delete(source); }
    if (!this.#allowed('voice') && this.#speaking) { this.#speech.cancel(); this.#speaking = false; }
  }
  tone({ frequencies = [440], channel = 'effects', duration = 0.15, spacing = 0.07, volume = 0.05, wave = 'sine' } = {}) {
    if (!['effects','music','voice'].includes(channel) || !Array.isArray(frequencies) || !frequencies.length ||
      frequencies.some(f => !Number.isFinite(f) || f <= 0 || f > 20000) ||
      !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(spacing) || spacing < 0 ||
      !Number.isFinite(volume) || volume < 0 || volume > 1 || !['sine','square','sawtooth','triangle'].includes(wave))
      throw new TypeError('Invalid tone');
    if (!this.#allowed(channel) || !this.#context || this.#context.state !== 'running') return false;
    frequencies.forEach((frequency, index) => {
      const ctx = this.#context, source = ctx.createOscillator(), envelope = ctx.createGain();
      const at = ctx.currentTime + index * spacing;
      source.type = wave; source.frequency.setValueAtTime(frequency, at);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(volume, at + Math.min(0.01, duration / 2));
      envelope.gain.linearRampToValueAtTime(0, at + duration);
      source.connect(envelope); envelope.connect(this.#channels.get(channel)); this.#sources.set(source, channel);
      source.onended = () => { this.#sources.delete(source); source.disconnect(); envelope.disconnect(); };
      source.start(at); source.stop(at + duration);
    });
    return true;
  }
  speak(text, { language = 'it-IT', rate = 1 } = {}) {
    if (!this.#allowed('voice') || !this.#speech || !this.#Utterance) return false;
    if (typeof text !== 'string' || !Number.isFinite(rate) || rate < 0.1 || rate > 10) throw new TypeError('Invalid speech');
    if (this.#speaking) this.#speech.cancel();
    const utterance = new this.#Utterance(text); utterance.lang = language; utterance.rate = rate;
    this.#speaking = true;
    utterance.onend = () => { this.#speaking = false; };
    utterance.onerror = event => { this.#speaking = false; this.#onError(new Error(`Speech: ${event.error}`)); };
    this.#speech.speak(utterance); return true;
  }
  stop() {
    for (const source of this.#sources.keys()) source.stop(); this.#sources.clear();
    if (this.#speaking) this.#speech.cancel(); this.#speaking = false;
  }
  async dispose() { this.#disposed = true; this.stop(); if (this.#context && this.#context.state !== 'closed') await this.#context.close(); }
}

/** Native fullscreen with a CSS fallback, serialized toggles and lifecycle cleanup. */
class FullscreenController {
  #element; #document; #listeners = new Set(); #pending; #disposed = false; #onError;
  #change = () => { for (const listener of [...this.#listeners]) listener(this.active); };
  constructor(element, { document = element.ownerDocument, onError = () => {} } = {}) {
    this.#element = element; this.#document = document; this.#onError = onError;
    document.addEventListener('fullscreenchange', this.#change);
  }
  get active() { return this.#document.fullscreenElement === this.#element || this.#element.classList.contains('ag-fullscreen'); }
  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  toggle() {
    if (this.#disposed) return Promise.reject(new Error('Fullscreen controller disposed'));
    if (this.#pending) return this.#pending;
    this.#pending = this.#toggle().finally(() => { this.#pending = null; }); return this.#pending;
  }
  async #toggle() {
    if (this.active) {
      if (this.#document.fullscreenElement === this.#element) await this.#document.exitFullscreen();
      this.#element.classList.remove('ag-fullscreen'); this.#change(); return false;
    }
    try {
      if (typeof this.#element.requestFullscreen !== 'function') throw new Error('Fullscreen API unavailable');
      await this.#element.requestFullscreen();
    } catch (error) {
      this.#onError(error);
      if (!this.#disposed) this.#element.classList.add('ag-fullscreen');
    }
    if (this.#disposed && this.#document.fullscreenElement === this.#element) await this.#document.exitFullscreen();
    this.#change(); return this.active;
  }
  async dispose() {
    this.#disposed = true; this.#document.removeEventListener('fullscreenchange', this.#change);
    if (this.#pending) await this.#pending;
    this.#element.classList.remove('ag-fullscreen');
    if (this.#document.fullscreenElement === this.#element) await this.#document.exitFullscreen();
    this.#listeners.clear();
  }
}

/** Bounded fixed simulation step, independent of rendering and display refresh rate. */
class FixedStepLoop {
  #step; #render; #request; #cancel; #previous = null; #accumulator = 0; #id; #running = false;
  constructor({ update, render, hz = 60, maxSteps = 8,
    requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id) }) {
    if (typeof update !== 'function' || typeof render !== 'function' || !(hz > 0) || !Number.isFinite(hz) ||
      !Number.isInteger(maxSteps) || maxSteps < 1) throw new TypeError('Invalid loop configuration');
    this.#step = update; this.#render = render; this.dt = 1 / hz; this.maxSteps = maxSteps;
    this.#request = requestFrame; this.#cancel = cancelFrame; this.droppedSeconds = 0;
  }
  get running() { return this.#running; }
  #frame = timestamp => {
    if (!this.#running) return;
    try { this.advance(timestamp); } catch (error) { this.stop(); throw error; }
    if (this.#running) this.#id = this.#request(this.#frame);
  };
  advance(timestamp) {
    if (!Number.isFinite(timestamp)) throw new TypeError('Invalid timestamp');
    if (this.#previous !== null) this.#accumulator += Math.max(0, timestamp - this.#previous) / 1000;
    this.#previous = timestamp;
    let steps = 0;
    while (this.#accumulator + 1e-12 >= this.dt && steps < this.maxSteps) {
      this.#step(this.dt); this.#accumulator = Math.max(0, this.#accumulator - this.dt); steps += 1;
    }
    if (this.#accumulator >= this.dt) {
      const dropped = Math.floor(this.#accumulator / this.dt) * this.dt;
      this.droppedSeconds += dropped; this.#accumulator -= dropped;
    }
    this.#render(this.#accumulator / this.dt);
  }
  start() {
    if (this.#running) return;
    this.#running = true; this.#previous = null; this.#accumulator = 0;
    this.#id = this.#request(this.#frame);
  }
  stop() { this.#running = false; if (this.#id !== undefined) this.#cancel(this.#id); this.#id = undefined; }
  dispose() { this.stop(); }
}

/** Preload images; progress and abort are explicit parts of the contract. */
class AssetLoader {
  constructor({ imageFactory = () => new Image() } = {}) { this.imageFactory = imageFactory; }
  async load(entries, { signal, onProgress = () => {} } = {}) {
    const items = Object.entries(entries), result = new Map(); let completed = 0;
    onProgress(0, items.length);
    await Promise.all(items.map(([name, url]) => new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); return; }
      const image = this.imageFactory();
      const clean = () => { image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort); };
      const abort = () => { clean(); image.src = ''; reject(signal.reason ?? new DOMException('Aborted', 'AbortError')); };
      image.onload = () => {
        clean(); result.set(name, image); completed += 1;
        try { onProgress(completed, items.length); resolve(); } catch (error) { reject(error); }
      };
      image.onerror = () => { clean(); reject(new Error(`Asset failed: ${name}`)); };
      signal?.addEventListener('abort', abort, { once: true }); image.src = url;
    })));
    return result;
  }
}


/** Scoped appearance; cleanup restores the original host attributes. */
class AppearanceController {
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
/** Native modal with live language switching and settings-only reset. */
class SettingsDialog {
  #root; #settings; #i18n; #dialog; #fields = []; #labels = []; #off; #opener;
  #close; #reset; #status; #onError; #confirm; #disposed = false;
  constructor(root, settings, { i18n = new I18n(UI_MESSAGES), channels = ['effects','music','voice'],
    difficulties = [{ value: 'normal', label: 'normal' }], languages = [{ value: 'it', text: 'Italiano' }, { value: 'en', text: 'English' }],
    confirmReset = message => globalThis.confirm(message), onError = error => console.warn('Settings:', error) } = {}) {
    if (channels.some(c => !['effects','music','voice'].includes(c))) throw new TypeError('Unknown audio channel');
    this.#root = root; this.#settings = settings; this.#i18n = i18n; this.#confirm = confirmReset; this.#onError = onError;
    const document = root.ownerDocument, id = `ag-settings-${++nextDialog}`;
    const node = (tag, className) => { const e = document.createElement(tag); if (className) e.className = className; return e; };
    const text = (element, key) => { this.#labels.push({ element, key }); return element; };
    this.#dialog = node('dialog', 'ag-dialog'); this.#dialog.setAttribute('aria-labelledby', id);
    const title = text(node('h2', 'ag-title'), 'settings'); title.id = id;
    this.#close = text(node('button', 'ag-button'), 'close'); this.#close.type = 'button'; this.#close.onclick = () => this.close();
    const header = node('header', 'ag-topbar'); header.append(title, this.#close); this.#dialog.append(header);
    const add = (key, options) => {
      const label = node('label', 'ag-field'), caption = text(node('span'), key), control = node(options ? 'select' : 'input');
      control.name = key; control.dataset.setting = key;
      if (options) for (const option of options) {
        const item = node('option'); item.value = option.value;
        if (option.text) item.textContent = option.text; else text(item, option.label);
        control.append(item);
      } else control.type = 'checkbox';
      control.onchange = () => {
        try { settings.update({ [key]: options ? control.value : control.checked }); this.#render(); }
        catch (error) { this.#onError(error); this.#render(); }
      };
      label.append(caption, control); this.#fields.push({ key, control, options }); this.#dialog.append(label);
    };
    const options = values => values.map(value => ({ value, label: value }));
    add('language', languages); add('theme', options(['system','light','dark']));
    add('motion', options(['system','reduced'])); add('contrast', options(['normal','high']));
    if (channels.length) add('muted');
    for (const channel of channels) add(channel);
    if (difficulties.length) add('difficulty', difficulties);
    this.#reset = text(node('button', 'ag-button ag-button--quiet'), 'reset'); this.#reset.type = 'button';
    this.#reset.onclick = () => {
      if (this.#confirm(this.#i18n.t('resetAsk'))) {
        try { settings.reset(); this.#render(); } catch (error) { this.#onError(error); }
      }
    };
    this.#status = node('p', 'ag-status'); this.#status.setAttribute('role', 'status');
    this.#dialog.append(this.#reset, this.#status);
    this.#dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...this.#dialog.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled)')];
      const first = controls[0], last = controls.at(-1), active = document.activeElement;
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    });
    this.#dialog.addEventListener('close', () => { if (this.#opener?.isConnected) this.#opener.focus(); });
    root.append(this.#dialog); this.#off = settings.subscribe(this.#render); this.#render();
  }
  #render = () => {
    const value = this.#settings.getSnapshot(); this.#i18n.setLanguage(value.language); this.#dialog.lang = value.language;
    for (const { element, key } of this.#labels) element.textContent = this.#i18n.t(key);
    for (const { key, control, options } of this.#fields) {
      if (options) control.value = value[key]; else control.checked = value[key];
    }
    const status = this.#settings.status;
    this.#status.textContent = this.#i18n.t(['empty','memory','future','invalid'].includes(status) ? status : 'saved');
    for (const field of this.#fields) field.control.disabled = status === 'future';
    this.#reset.disabled = status === 'future';
  };
  get element() { return this.#dialog; }
  open(opener = this.#root.ownerDocument.activeElement) {
    if (this.#disposed) throw new Error('Settings dialog disposed');
    if (this.#dialog.open) return;
    this.#opener = opener; this.#render(); this.#dialog.showModal(); this.#close.focus();
  }
  close() { if (this.#dialog.open) this.#dialog.close(); }
  dispose() { this.close(); this.#off(); this.#dialog.remove(); this.#disposed = true; }
}


/** Capability profiles preserve the semantics of each game; they never rewrite saves. */
const GAME_PROFILES = Object.freeze(Object.fromEntries([
  ['agent-pippo', ['easy','normal','challenge'], 'normal', ['effects','voice']],
  ['battleship', ['easy','medium','hard'], 'medium', ['effects']],
  ['f1-paper-circuit', ['normal'], 'normal', []],
  ['hangman', ['easy','medium','hard'], 'easy', ['effects','voice']],
  ['ruota-del-tempo', ['easy','medium'], 'easy', ['effects','voice']],
  ['salti-magici', ['relaxed','normal'], 'relaxed', ['effects','music']],
  ['word-chain', ['2','3'], '2', []],
].map(([gameId, difficulties, difficulty, channels]) => [gameId, Object.freeze({
  gameId, difficulties: Object.freeze(difficulties), difficulty, channels: Object.freeze(channels),
})])));

function createGameSettings(gameId, options = {}) {
  const profile = GAME_PROFILES[gameId];
  if (!profile) throw new RangeError(`Unknown game profile: ${gameId}`);
  return new SettingsStore({ ...options, gameId, difficulties: [...profile.difficulties],
    defaults: { ...options.defaults, difficulty: profile.difficulty } });
}


const stores = new Map(), controllers = new Map();
const legacyKeys = {
  'agent-pippo': ['agent_pippo_settings', 'porto_buffo_v2'],
  battleship: ['theme'], 'f1-paper-circuit': [],
  hangman: ['appLanguage', 'theme', 'sfxEnabled', 'italianHangmanState'],
  'ruota-del-tempo': [], 'salti-magici': ['salti_magici_v1'], 'word-chain': ['theme'],
};
function createIntegratedSettings(gameId, { storage = () => globalThis.localStorage, onError } = {}) {
  const profile = GAME_PROFILES[gameId];
  if (!profile) throw new RangeError('Unknown game profile: ' + gameId);
  const defaults = { ...SETTINGS_DEFAULTS, difficulty: profile.difficulty,
    theme: gameId === 'agent-pippo' ? 'dark' : gameId === 'word-chain' || gameId === 'battleship' ? 'system' : 'light' };
  const provider = typeof storage === 'function' ? storage : () => storage;
  const read = (key, json = true) => {
    try { const raw = provider().getItem(key); return raw === null ? null : json ? JSON.parse(raw) : raw; }
    catch (error) { if (onError) onError(error, 'legacy:' + key); else console.warn('Legacy preference unavailable:', key, error); return null; }
  };
  const migrate = () => {
    const value = { ...defaults };
    if (['battleship', 'hangman', 'word-chain'].includes(gameId)) {
      const theme = read('theme', false); if (['light', 'dark'].includes(theme)) value.theme = theme;
    }
    if (gameId === 'hangman') {
      const language = read('appLanguage', false), effects = read('sfxEnabled');
      if (['it', 'en'].includes(language)) value.language = language;
      if (typeof effects === 'boolean') value.effects = effects;
      const saved = read('italianHangmanState');
      if (profile.difficulties.includes(saved?.currentDifficulty)) value.difficulty = saved.currentDifficulty;
    }
    if (gameId === 'agent-pippo') {
      const saved = read('agent_pippo_settings'), progress = read('porto_buffo_v2');
      if (['it', 'en'].includes(saved?.language)) value.language = saved.language;
      if (typeof saved?.sounds === 'boolean') value.effects = saved.sounds;
      if (profile.difficulties.includes(saved?.difficulty)) value.difficulty = saved.difficulty;
      if (typeof progress?.voice === 'boolean') value.voice = progress.voice;
    }
    if (gameId === 'salti-magici') {
      const saved = read('salti_magici_v1');
      if (['it', 'en'].includes(saved?.language)) value.language = saved.language;
      if (typeof saved?.sound === 'boolean') { value.effects = saved.sound; value.music = saved.sound; }
      if (profile.difficulties.includes(saved?.difficulty)) value.difficulty = saved.difficulty;
    }
    return { version: 1, data: value };
  };
  return new SettingsStore({ gameId, storage: provider, onError, difficulties: [...profile.difficulties], defaults,
    legacy: legacyKeys[gameId].map(key => ({ key, parse: raw => raw, decode: migrate })) });
}
function getGameSettings(gameId) {
  if (!stores.has(gameId)) stores.set(gameId, createIntegratedSettings(gameId));
  return stores.get(gameId);
}
function getGameController(gameId) { return controllers.get(gameId); }
function toggleGameFullscreen(gameId) { return controllers.get(gameId)?.fullscreen.toggle(); }

/** One integration controller shared by DOM and React consumers. No game state is owned here. */
class GameUIController {
  #off; #media; #change; #gesture; #close; #onOpen; #onClose; #hadClass;
  #navigation; #frame; #previous = {};
  constructor({ gameId, settings = getGameSettings(gameId), root = document.body, mount,
    onOpen = () => {}, onClose = () => {} }) {
    if (controllers.has(gameId)) throw new Error('Game UI already mounted: ' + gameId);
    this.gameId = gameId; this.root = root; this.settings = settings;
    this.#onOpen = onOpen; this.#onClose = onClose;
    const document = root.ownerDocument, profile = GAME_PROFILES[gameId];
    this.#hadClass = root.classList.contains('ag-game'); root.classList.add('ag-game', 'ag-kit-host');
    root.dataset.kitIntegrated = gameId;
    this.appearance = new AppearanceController(root, settings);
    this.audio = new AudioManager(); this.fullscreen = new FullscreenController(root);
    const messages = { it: { ...UI_MESSAGES.it, medium: 'Media', hard: 'Difficile', relaxed: 'Piccoli esploratori',
      '2': '2 lettere', '3': '3 lettere' }, en: { ...UI_MESSAGES.en, medium: 'Medium', hard: 'Hard',
      relaxed: 'Little explorers', '2': '2 letters', '3': '3 letters' } };
    if (gameId === 'agent-pippo') { messages.it.voice = 'Lettura automatica'; messages.en.voice = 'Read dialogues aloud'; }
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
    if (mount) mount.append(this.controls);
    this.#media = matchMedia('(prefers-color-scheme: dark)');
    this.#change = () => {
      const value = settings.getSnapshot(); this.i18n.setLanguage(value.language);
      const dark = value.theme === 'system' ? this.#media.matches : value.theme === 'dark';
      document.documentElement.classList.toggle('dark', dark); document.documentElement.lang = value.language;
      this.audio.setPreferences(value);
      if ((value.muted || !value.voice) && globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      this.settingsButton.textContent = this.i18n.t('settings'); this.fullscreenButton.textContent = this.i18n.t('fullscreen');
    };
    this.#off = settings.subscribe(this.#change); this.#media.addEventListener('change', this.#change); this.#change();
    this.#gesture = event => { if (event.isTrusted && profile.channels.length && !settings.getSnapshot().muted) void this.audio.unlock(); };
    root.addEventListener('pointerdown', this.#gesture, true); root.addEventListener('keydown', this.#gesture, true);
    this.#close = () => this.#onClose(); this.dialog.element.addEventListener('close', this.#close);
    this.#navigation = new InputManager({ keys: {}, gamepad: {
      previous: { axis: 1, direction: -1, buttons: [12] }, next: { axis: 1, direction: 1, buttons: [13] },
      left: { buttons: [14] }, right: { buttons: [15] }, confirm: { buttons: [0] }, back: { buttons: [1] }, settings: { buttons: [8] },
    } });
    const navigate = () => {
      const value = this.#navigation.poll(), pressed = key => value[key] && !this.#previous[key];
      if (pressed('settings')) { if (this.dialog.element.open) this.dialog.close(); else this.open(this.settingsButton); }
      if (this.dialog.element.open) {
        const nodes = [...this.dialog.element.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
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
  open(opener) { this.#onOpen(); this.dialog.open(opener); }
  async dispose() {
    cancelAnimationFrame(this.#frame); this.#navigation.dispose();
    this.#off(); this.#media.removeEventListener('change', this.#change);
    this.root.removeEventListener('pointerdown', this.#gesture, true); this.root.removeEventListener('keydown', this.#gesture, true);
    this.dialog.element.removeEventListener('close', this.#close); this.dialog.dispose(); this.appearance.dispose(); this.controls.remove();
    this.root.classList.remove('ag-kit-host'); if (!this.#hadClass) this.root.classList.remove('ag-game');
    delete this.root.dataset.kitIntegrated;
    if (controllers.get(this.gameId) === this) controllers.delete(this.gameId);
    if (globalThis.__gameKit === this) delete globalThis.__gameKit;
    await Promise.all([this.fullscreen.dispose(), this.audio.dispose()]);
  }
}

return Object.freeze({VersionedStore,SETTINGS_DEFAULTS,SettingsStore,I18n,UI_MESSAGES,InputManager,AudioManager,FullscreenController,FixedStepLoop,AssetLoader,AppearanceController,SettingsDialog,GAME_PROFILES,createGameSettings,createIntegratedSettings,getGameSettings,getGameController,toggleGameFullscreen,GameUIController});
})();
