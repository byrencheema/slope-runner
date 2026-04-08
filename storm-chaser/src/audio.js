// Procedural audio system using Web Audio API
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
    this.windGain = null;
    this.rainGain = null;
    this.thunderGain = null;
    this.windFilter = null;
    this.rainFilter = null;
    this.windNode = null;
    this.rainNode = null;
    this.lastThunder = 0;
    this.engineGain = null;
    this.engineOsc = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);

      // Wind (filtered noise)
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.value = 400;
      
      let windBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      let windData = windBuf.getChannelData(0);
      for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;
      this.windNode = this.ctx.createBufferSource();
      this.windNode.buffer = windBuf;
      this.windNode.loop = true;
      this.windNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      this.windNode.start();

      // Rain (higher freq noise)
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainFilter = this.ctx.createBiquadFilter();
      this.rainFilter.type = 'bandpass';
      this.rainFilter.frequency.value = 3000;
      this.rainFilter.Q.value = 0.5;
      
      let rainBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      let rainData = rainBuf.getChannelData(0);
      for (let i = 0; i < rainData.length; i++) rainData[i] = Math.random() * 2 - 1;
      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = rainBuf;
      this.rainNode.loop = true;
      this.rainNode.connect(this.rainFilter);
      this.rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);
      this.rainNode.start();

      // Thunder gain (for one-shot thunder)
      this.thunderGain = this.ctx.createGain();
      this.thunderGain.gain.value = 0;
      this.thunderGain.connect(this.masterGain);

      // Engine
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      let engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 200;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  update(dt, player, storm) {
    if (!this.initialized) return;
    let t = this.ctx.currentTime;

    let zone = storm.getZone(player.x, player.z);
    let danger = storm.getDangerLevel(player.x, player.z);
    let dist = storm.getDistanceTo(player.x, player.z);

    // Wind intensity based on proximity
    let windTarget = Math.min(1, Math.max(0.05, 1 - dist / 400)) * 0.5;
    if (zone === 'core') windTarget = 0.8;
    this.windGain.gain.linearRampToValueAtTime(windTarget, t + 0.3);
    this.windFilter.frequency.linearRampToValueAtTime(300 + danger * 600, t + 0.3);

    // Rain
    let rainTarget = zone === 'core' ? 0.6 : zone === 'rotation' ? 0.4 : zone === 'inflow' ? 0.2 : 0.02;
    this.rainGain.gain.linearRampToValueAtTime(rainTarget, t + 0.3);

    // Engine
    let engineFreq = 55 + Math.abs(player.speed) * 2.5;
    let engineVol = 0.05 + Math.abs(player.speed) / player.maxSpeed * 0.15;
    this.engineOsc.frequency.linearRampToValueAtTime(engineFreq, t + 0.1);
    this.engineGain.gain.linearRampToValueAtTime(engineVol, t + 0.1);

    // Thunder
    this.lastThunder -= dt;
    if (this.lastThunder <= 0 && danger > 0.1 && Math.random() < danger * 0.03) {
      this.playThunder(danger);
      this.lastThunder = 3 + Math.random() * 8;
    }
  }

  playThunder(intensity) {
    if (!this.initialized) return;
    let t = this.ctx.currentTime;
    let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
    let data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      let env = Math.exp(-i / (this.ctx.sampleRate * (0.5 + intensity)));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    let src = this.ctx.createBufferSource();
    src.buffer = buf;
    let filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150 + intensity * 200;
    let gain = this.ctx.createGain();
    gain.gain.value = 0.3 + intensity * 0.4;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
  }

  playShutter() {
    if (!this.initialized) return;
    let t = this.ctx.currentTime;
    let osc = this.ctx.createOscillator();
    osc.frequency.value = 2000;
    let gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}
