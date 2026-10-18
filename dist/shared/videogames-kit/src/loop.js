/** Bounded fixed simulation step, independent of rendering and display refresh rate. */
export class FixedStepLoop {
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
