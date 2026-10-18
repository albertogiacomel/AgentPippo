/** Preload images; progress and abort are explicit parts of the contract. */
export class AssetLoader {
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
