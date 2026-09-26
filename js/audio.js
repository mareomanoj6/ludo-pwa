/**
 * Web Audio API Sound Synthesizer for Minimal Ludo
 * Generates tactile, minimalist audio procedurally.
 * Zero external audio files required, instant, and completely offline capable.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.5;

    // Load persisted mute preference
    if (typeof localStorage !== 'undefined') {
      const savedMute = localStorage.getItem('ludo_sound_muted');
      if (savedMute !== null) {
        this.muted = savedMute === 'true';
      }
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ludo_sound_muted', this.muted);
    }
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Helper to create gain envelope
   */
  _createEnv(startTime, duration, peakVol = 1.0) {
    if (!this.ctx) return null;
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peakVol * this.volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    gainNode.connect(this.ctx.destination);
    return gainNode;
  }

  /**
   * Subtle UI click sound
   */
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this._createEnv(t, 0.04, 0.2);
    if (!gain) return;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Dice rolling rattle sound
   */
  playDiceRoll() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const clicks = 5;

    for (let i = 0; i < clicks; i++) {
      const clickTime = t + i * 0.045 + (Math.random() * 0.015);
      const osc = this.ctx.createOscillator();
      const gain = this._createEnv(clickTime, 0.03, 0.25);
      if (!gain) continue;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 280, clickTime);
      osc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.03);
      osc.connect(gain);
      osc.start(clickTime);
      osc.stop(clickTime + 0.03);
    }

    // Settling thud at the end
    const settleTime = t + 0.28;
    const oscSettle = this.ctx.createOscillator();
    const gainSettle = this._createEnv(settleTime, 0.09, 0.35);
    if (gainSettle) {
      oscSettle.type = 'sine';
      oscSettle.frequency.setValueAtTime(180, settleTime);
      oscSettle.frequency.exponentialRampToValueAtTime(50, settleTime + 0.09);
      oscSettle.connect(gainSettle);
      oscSettle.start(settleTime);
      oscSettle.stop(settleTime + 0.09);
    }
  }

  /**
   * Token stepping hop sound (pitch rises slightly with step index)
   */
  playStep(stepIndex = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this._createEnv(t, 0.06, 0.22);
    if (!gain) return;

    const baseFreq = 420 + Math.min(stepIndex * 5, 250);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.06);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Opponent piece captured sound (punchy impact)
   */
  playCapture() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Bass punch
    const osc1 = this.ctx.createOscillator();
    const gain1 = this._createEnv(t, 0.22, 0.5);
    if (gain1) {
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(260, t);
      osc1.frequency.exponentialRampToValueAtTime(40, t + 0.22);
      osc1.connect(gain1);
      osc1.start(t);
      osc1.stop(t + 0.22);
    }

    // High accent
    const osc2 = this.ctx.createOscillator();
    const gain2 = this._createEnv(t + 0.05, 0.18, 0.3);
    if (gain2) {
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(580, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(150, t + 0.23);
      osc2.connect(gain2);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.23);
    }
  }

  /**
   * Safe square landing chime
   */
  playSafe() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this._createEnv(t + idx * 0.05, 0.25, 0.2);
      if (!gain) return;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      osc.connect(gain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.25);
    });
  }

  /**
   * Token reached center home finish
   */
  playHome() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this._createEnv(t + idx * 0.08, 0.3, 0.28);
      if (!gain) return;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      osc.connect(gain);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.3);
    });
  }

  /**
   * Victory / Game won celebration fanfare
   */
  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chordProgression = [
      { freq: 523.25, time: 0.0 }, // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.50, time: 0.38 }, // C6
      { freq: 1318.51, time: 0.52 } // E6
    ];

    chordProgression.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this._createEnv(t + note.time, 0.6, 0.35);
      if (!gain) return;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, t + note.time);
      osc.connect(gain);
      osc.start(t + note.time);
      osc.stop(t + note.time + 0.6);
    });
  }

  /**
   * Sound played when move is skipped on 3 consecutive sixes
   */
  playPenalty() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [260, 180].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this._createEnv(t + idx * 0.1, 0.16, 0.25);
      if (!gain) return;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + idx * 0.1 + 0.16);
      osc.connect(gain);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.16);
    });
  }
}

// Export
if (typeof window !== 'undefined') {
  window.soundController = new SoundController();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundController };
}
