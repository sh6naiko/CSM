export // ========================================================
// 1. SOUND SYNTHESIZER (Web Audio API - Pure Client-Side)
// ========================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
  tick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        400,
        this.ctx.currentTime + 0.05,
      );
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + 0.05,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }
  whistle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 0.62;
      const fundamental = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const fundamentalGain = this.ctx.createGain();
      const overtoneGain = this.ctx.createGain();
      fundamental.type = "sine";
      overtone.type = "sine";
      fundamental.frequency.setValueAtTime(1780, now);
      fundamental.frequency.exponentialRampToValueAtTime(1420, now + duration);
      overtone.frequency.setValueAtTime(3560, now);
      overtone.frequency.exponentialRampToValueAtTime(2840, now + duration);
      fundamentalGain.gain.setValueAtTime(0.0001, now);
      fundamentalGain.gain.linearRampToValueAtTime(0.042, now + 0.035);
      fundamentalGain.gain.setValueAtTime(0.042, now + 0.3);
      fundamentalGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      overtoneGain.gain.setValueAtTime(0.0001, now);
      overtoneGain.gain.linearRampToValueAtTime(0.008, now + 0.04);
      overtoneGain.gain.setValueAtTime(0.008, now + 0.28);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      fundamental.connect(fundamentalGain);
      overtone.connect(overtoneGain);
      fundamentalGain.connect(this.ctx.destination);
      overtoneGain.connect(this.ctx.destination);
      fundamental.start(now);
      overtone.start(now);
      fundamental.stop(now + duration);
      overtone.stop(now + duration);
      const bufferLength = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(
        1,
        bufferLength,
        this.ctx.sampleRate,
      );
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < bufferLength; i++) samples[i] = Math.random() * 2 - 1;
      const breath = this.ctx.createBufferSource();
      const breathFilter = this.ctx.createBiquadFilter();
      const breathGain = this.ctx.createGain();
      breath.buffer = buffer;
      breathFilter.type = "bandpass";
      breathFilter.frequency.setValueAtTime(3400, now);
      breathFilter.Q.setValueAtTime(1.1, now);
      breathGain.gain.setValueAtTime(0.0001, now);
      breathGain.gain.linearRampToValueAtTime(0.002, now + 0.04);
      breathGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      breath.connect(breathFilter);
      breathFilter.connect(breathGain);
      breathGain.connect(this.ctx.destination);
      breath.start(now);
      breath.stop(now + duration);
    } catch (e) {}
  }
  correct() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.ctx.currentTime + idx * 0.07 + 0.16,
        );
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.07);
        osc.stop(this.ctx.currentTime + idx * 0.07 + 0.16);
      });
    } catch (e) {}
  }
  wrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch (e) {}
  }
  arenaCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.065);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.065 + 0.025);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + idx * 0.065 + 0.24,
        );
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.065);
        osc.stop(now + idx * 0.065 + 0.25);
      });
    } catch (e) {}
  }
  arenaWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [293.66, 220].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.05, now + idx * 0.12 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.19);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.2);
      });
    } catch (e) {}
  }
  detonation() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.36);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.36);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.065, now + 0.025);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start();
      noise.stop(now + 0.36);
      const pop = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      pop.type = "sine";
      pop.frequency.setValueAtTime(360, now);
      pop.frequency.exponentialRampToValueAtTime(170, now + 0.22);
      popGain.gain.setValueAtTime(0.0001, now);
      popGain.gain.exponentialRampToValueAtTime(0.085, now + 0.018);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      pop.connect(popGain);
      popGain.connect(this.ctx.destination);
      pop.start(now);
      pop.stop(now + 0.26);
    } catch (e) {}
  }
}
export const sound = new SoundEngine();
