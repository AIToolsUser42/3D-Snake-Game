
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private noteIndex: number = 0;

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      // "Normal" volume (was 0.25)
      this.masterGain.gain.value = 0.5; 
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Gentle Sine Wave Beep with optional filtering
  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    // Add low pass filter for retro warmth
    filter.type = "lowpass";
    filter.frequency.value = 3000;

    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  public playClick() {
    this.init();
    // Short, high tick
    this.playTone(800, 'triangle', 0.05, 0, 0.2);
  }

  public playEat() {
    this.init();
    // Retro "Coin" sound: Two quick tones
    this.playTone(523.25, 'sine', 0.1, 0, 0.4); // C5
    this.playTone(783.99, 'sine', 0.2, 0.05, 0.4); // G5
  }

  public playGameOver() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    // Descending slide
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  public playWin() {
    this.init();
    // Ascending Arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; 
    notes.forEach((freq, i) => {
        this.playTone(freq, 'square', 0.3, i * 0.1, 0.3);
    });
  }

  public startBGM() {
    this.init();
    if (this.bgmInterval) return;

    // More rhythmic, electronic BGM (125ms per tick = ~120BPM 16th notes)
    // Progression: Am - F - C - G
    const bassline = [
      110, 110, 110, 110, // A2
      87.31, 87.31, 87.31, 87.31, // F2
      130.81, 130.81, 130.81, 130.81, // C3
      98.00, 98.00, 98.00, 98.00 // G2
    ];

    // Arpeggio pattern
    const scale = [220, 261.63, 329.63, 392.00, 440.00]; // A Minor pentatonic

    this.noteIndex = 0;

    this.bgmInterval = window.setInterval(() => {
        if (!this.ctx || this.ctx.state !== 'running') return;
        
        const step = this.noteIndex % 16;
        
        // Bass (Every 4th step or so for rhythm, or constant pulse)
        if (step % 2 === 0) {
           const bassFreq = bassline[Math.floor(this.noteIndex / 4) % bassline.length];
           this.playTone(bassFreq, 'sawtooth', 0.2, 0, 0.15);
        }

        // Lead/Arp (Every step, randomized from scale)
        if (Math.random() > 0.3) {
            const leadFreq = scale[Math.floor(Math.random() * scale.length)];
            // Offset slightly for stereo feel or delay (simulated)
            this.playTone(leadFreq, 'square', 0.1, 0, 0.05);
        }

        this.noteIndex++;
    }, 125);
  }

  public stopBGM() {
    if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    }
  }
}

export const audio = new AudioManager();