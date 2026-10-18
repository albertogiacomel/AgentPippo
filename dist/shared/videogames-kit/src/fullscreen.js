/** Native fullscreen with a CSS fallback, serialized toggles and lifecycle cleanup. */
export class FullscreenController {
  #element; #document; #listeners = new Set(); #pending; #disposed = false; #onError;
  #sync = active => {
    for (const el of [this.#document.documentElement, this.#document.body]) {
      el?.classList?.toggle('ag-fullscreen-active', active);
      el?.classList?.toggle('fullscreen-mode', active);
    }
  };
  #change = () => { this.#sync(this.active); for (const listener of [...this.#listeners]) listener(this.active); };
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
    this.#sync(false); this.#listeners.clear();
  }
}
