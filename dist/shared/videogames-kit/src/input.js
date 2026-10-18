const DEFAULT_KEYS = Object.freeze({ ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right',
  KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'run',
  ShiftRight: 'run', Escape: 'pause', Enter: 'confirm' });
const DEFAULT_PAD = Object.freeze({
  left: { axis: 0, direction: -1, buttons: [14] }, right: { axis: 0, direction: 1, buttons: [15] },
  jump: { buttons: [0] }, confirm: { buttons: [0] }, run: { buttons: [1, 7] }, pause: { buttons: [9] },
});
/** Separate physical sources prevent a release from cancelling another held key or touch. */
export class InputManager {
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
  get enabled() { return this.#enabled; }
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
