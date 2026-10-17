import { I18n, UI_MESSAGES } from './i18n.mjs';

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
/** Native modal with live language switching and settings-only reset. */
export class SettingsDialog {
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
