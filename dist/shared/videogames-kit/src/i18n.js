/** Text-only localization. Callers write textContent, never translation HTML. */
export class I18n {
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
export const UI_MESSAGES = Object.freeze({
  it: { settingsHint: 'Le modifiche si applicano subito. I progressi della partita restano conservati.', displayGroup: 'Lingua e aspetto', audioGroup: 'Audio', playGroup: 'Partita', accessibilityGroup: 'Accessibilità', done: 'Fatto', cancel: 'Annulla', confirmReset: 'Ripristina', settingsError: 'Modifica non riuscita. Riprova.', exitFullscreen: 'Esci da schermo intero', settings: 'Impostazioni', close: 'Chiudi', language: 'Lingua', theme: 'Aspetto',
    system: 'Sistema', light: 'Chiaro', dark: 'Scuro', motion: 'Animazioni', reduced: 'Ridotte',
    contrast: 'Contrasto', normal: 'Normale', high: 'Aumentato', muted: 'Disattiva tutto l’audio',
    effects: 'Effetti sonori', music: 'Musica', voice: 'Voce', difficulty: 'Difficoltà',
    reset: 'Ripristina preferenze', resetAsk: 'Ripristinare le preferenze? I progressi restano conservati.',
    fullscreen: 'Schermo intero', help: 'Aiuto', saved: 'Preferenze salvate su questo dispositivo.',
    empty: 'Le preferenze saranno salvate alla prima modifica.',
    memory: 'Salvataggio non disponibile: preferenze mantenute per questa sessione.',
    future: 'Preferenze di una versione più recente: aggiornamento necessario.',
    invalid: 'Preferenze non valide: applicati i valori iniziali.', easy: 'Guidata', challenge: 'Sfida' },
  en: { settingsHint: 'Changes apply immediately. Your game progress is preserved.', displayGroup: 'Language and appearance', audioGroup: 'Audio', playGroup: 'Game', accessibilityGroup: 'Accessibility', done: 'Done', cancel: 'Cancel', confirmReset: 'Reset', settingsError: 'Could not apply the change. Try again.', exitFullscreen: 'Exit fullscreen', settings: 'Settings', close: 'Close', language: 'Language', theme: 'Appearance',
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
