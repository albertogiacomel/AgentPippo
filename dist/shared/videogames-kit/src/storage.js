const clone = value => structuredClone(value);
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]*$/i.test(value);

/** Versioned JSON storage with explicit migration and an in-memory fallback. */
export class VersionedStore {
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

export const SETTINGS_DEFAULTS = Object.freeze({
  language: 'it', theme: 'system', motion: 'system', contrast: 'normal',
  muted: false, effects: true, music: true, voice: true, difficulty: 'normal',
});

/** Stable frozen snapshots, compatible with useSyncExternalStore. */
export class SettingsStore {
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
