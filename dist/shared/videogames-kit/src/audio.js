/** Synthesized SFX and speech. unlock() must be called from a user gesture. */
export class AudioManager {
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
