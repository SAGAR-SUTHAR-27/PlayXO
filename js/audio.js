/* ==========================================================================
   NEON GRID // SYNTHESIZED WEB AUDIO ENGINE
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    
    // Volume state (0.0 to 1.0)
    this.sfxVolume = 0.7;
    this.bgmVolume = 0.4;
    
    // Enable state
    this.sfxEnabled = true;
    this.bgmEnabled = true;
    
    // Master Node references
    this.sfxGain = null;
    this.bgmGain = null;
    
    // BGM Loop variables
    this.bgmIntervalId = null;
    this.bgmStep = 0;
    
    // Cyberpunk ambient progression: Dm9 - Fmaj7 - Bbmaj7 - Cadd9
    this.chords = [
      [146.83, 174.61, 220.00, 293.66], // D3, F3, A3, D4 (Dm9)
      [130.81, 174.61, 220.00, 329.63], // C3, F3, A3, E4 (Fmaj7)
      [116.54, 146.83, 220.00, 293.66], // Bb2, D3, A3, D4 (Bbmaj7)
      [130.81, 196.00, 246.94, 293.66]  // C3, G3, B3, D4 (Cadd9)
    ];
    this.melodyScale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33]; // D-minor Pentatonic: D4, F4, G4, A4, C5, D5
  }

  // Lazy initialize AudioContext on user interaction
  init() {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      
      // Setup SFX Channel
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);
      
      // Setup BGM Channel
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx.currentTime);
      this.bgmGain.connect(this.ctx.destination);
      
      this.startBgmLoop();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  // Ensure AudioContext is running (handles autoplay restrictions)
  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // SFX: Play a quick clean click/tap sound
  playClick(isPlayerO = false) {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const pitchFactor = isPlayerO ? 0.78 : 1.0; // Lower pitch for Player O / AI

    // Transient click (higher frequency, extremely short decay)
    const oscTransient = this.ctx.createOscillator();
    const gainTransient = this.ctx.createGain();
    
    oscTransient.type = 'sine';
    oscTransient.frequency.setValueAtTime(1400 * pitchFactor, now);
    oscTransient.frequency.exponentialRampToValueAtTime(800 * pitchFactor, now + 0.006);
    
    gainTransient.gain.setValueAtTime(0, now);
    gainTransient.gain.linearRampToValueAtTime(0.35, now + 0.001);
    gainTransient.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
    
    oscTransient.connect(gainTransient);
    gainTransient.connect(this.sfxGain);
    
    // Resonant block body (mid frequency, wooden/tactile resonance)
    const oscBody = this.ctx.createOscillator();
    const gainBody = this.ctx.createGain();
    
    oscBody.type = 'sine';
    oscBody.frequency.setValueAtTime(600 * pitchFactor, now);
    oscBody.frequency.exponentialRampToValueAtTime(160 * pitchFactor, now + 0.04);
    
    gainBody.gain.setValueAtTime(0, now);
    gainBody.gain.linearRampToValueAtTime(0.55, now + 0.002);
    gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    oscBody.connect(gainBody);
    gainBody.connect(this.sfxGain);
    
    // Start and stop both oscillators in perfect synchronization
    oscTransient.start(now);
    oscTransient.stop(now + 0.008);
    
    oscBody.start(now);
    oscBody.stop(now + 0.045);
  }

  // SFX: Play a fast light cursor hover tick
  playHover() {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // SFX: Play dynamic win arpeggio (sweet synth sweep)
  playWin() {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major upward
    const tempo = 0.07;
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * tempo);
      
      gainNode.gain.setValueAtTime(0, now + idx * tempo);
      gainNode.gain.linearRampToValueAtTime(0.25, now + idx * tempo + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * tempo + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(this.sfxGain);
      
      osc.start(now + idx * tempo);
      osc.stop(now + idx * tempo + 0.28);
    });
  }

  // SFX: Match draw (deep mechanical drone downward)
  playDraw() {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Two oscillators slightly detuned for chorus effect
    [180, 183].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq - 70, now + 0.6);
      
      // Lowpass filter to warm the sawtooth sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain);
      
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  // SFX: Sweep upward for game initializations
  playLaunch() {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.75);
    
    gainNode.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.75);
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.75);
  }

  // SFX: Warning alert sound for errors
  playWarning() {
    this.init();
    this.resumeContext();
    if (!this.sfxEnabled || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Dynamic BGM Synthesizer loop
  startBgmLoop() {
    if (this.bgmIntervalId) return;

    const tempo = 400; // Time in ms between arpeggio beats
    
    this.bgmIntervalId = setInterval(() => {
      if (!this.bgmEnabled || !this.ctx || this.ctx.state === 'suspended') return;

      const now = this.ctx.currentTime;
      const chordIdx = Math.floor(this.bgmStep / 8) % this.chords.length;
      const chord = this.chords[chordIdx];
      const noteInChord = chord[this.bgmStep % 4];

      // Occasional gentle background bass pad
      if (this.bgmStep % 8 === 0) {
        this.synthesizePadNote(chord[0] / 2, 2.5); // Root note an octave lower
      }

      // Pluck melody arpeggio
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      
      // Determine note pitch (mix arpeggio with random pentatonic highlights)
      let freq = noteInChord;
      if (this.bgmStep % 8 === 6 && Math.random() > 0.4) {
        freq = this.melodyScale[Math.floor(Math.random() * this.melodyScale.length)];
      }

      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05); // Very soft plucks
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + 0.4);

      this.bgmStep++;
    }, tempo);
  }

  // Synthesize a soft bass drone to back the arpeggio melody
  synthesizePadNote(freq, duration) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(130, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.07, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  stopBgmLoop() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  // Adjust volumes dynamically
  setSfxVolume(volumePct) {
    this.sfxVolume = volumePct / 100;
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? this.sfxVolume : 0, this.ctx ? this.ctx.currentTime : 0);
    }
  }

  setBgmVolume(volumePct) {
    this.bgmVolume = volumePct / 100;
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume : 0, this.ctx ? this.ctx.currentTime : 0);
    }
  }

  // Enable/Disable toggles
  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(enabled ? this.sfxVolume : 0, this.ctx.currentTime);
    }
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(enabled ? this.bgmVolume : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.init();
      this.startBgmLoop();
    }
  }
}

export const Audio = new SoundEngine();
