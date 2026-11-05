// Tre brevi loop originali per la demo dello shop. Nessun servizio o hardware collegato.
const LOOPS = [
  { bpm: 112, melody: [64, 67, 71, 74, 71, 67, 62, 67], bass: [40, 36, 43, 38], voice: "triangle" as OscillatorType },
  { bpm: 88, melody: [60, 64, 67, 71, 69, 67, 64, 62], bass: [36, 41, 43, 38], voice: "sine" as OscillatorType },
  { bpm: 124, melody: [69, 69, 72, 76, 74, 72, 67, 69], bass: [45, 41, 48, 43], voice: "sawtooth" as OscillatorType },
];

export class RecordDemoAudio {
  private context: AudioContext | null = null;
  async play(index: number, onEnded: () => void) {
    this.stop();
    const context = new AudioContext();
    this.context = context;
    const output = context.createGain();
    output.gain.value = .23;
    const compressor = context.createDynamicsCompressor();
    output.connect(compressor); compressor.connect(context.destination);
    await context.resume();
    if (this.context !== context) return;
    const loop = LOOPS[index % LOOPS.length];
    const beat = 60 / loop.bpm;
    const start = context.currentTime + .62;
    const tone = (midi: number, at: number, duration: number, level: number, type: OscillatorType) => {
      const source = context.createOscillator();
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      source.type = type; source.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      filter.type = "lowpass"; filter.frequency.value = type === "sawtooth" ? 1500 : 4200;
      envelope.gain.setValueAtTime(.0001, at);
      envelope.gain.exponentialRampToValueAtTime(level, at + .015);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(filter); filter.connect(envelope); envelope.connect(output);
      source.start(at); source.stop(at + duration + .03);
    };
    const noise = context.createBuffer(1, Math.floor(context.sampleRate * .16), context.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 8129;
    for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; samples[i] = seed / 2147483648; }
    for (let step = 0; step < 32; step++) {
      const at = start + step * beat;
      tone(loop.melody[step % loop.melody.length], at, beat * .7, .15, loop.voice);
      if (step % 2 === 0) tone(loop.bass[Math.floor(step / 8) % 4], at, beat * 1.4, .24, "sine");
      const kick = context.createOscillator();
      const kickGain = context.createGain();
      kick.frequency.setValueAtTime(135, at); kick.frequency.exponentialRampToValueAtTime(42, at + .15);
      kickGain.gain.setValueAtTime(.34, at); kickGain.gain.exponentialRampToValueAtTime(.0001, at + .18);
      kick.connect(kickGain); kickGain.connect(output); kick.start(at); kick.stop(at + .2);
      for (const offset of [0, .5]) {
        const hat = context.createBufferSource();
        const highpass = context.createBiquadFilter();
        const hatGain = context.createGain();
        hat.buffer = noise; highpass.type = "highpass"; highpass.frequency.value = step % 2 ? 1900 : 6500;
        const when = at + beat * offset;
        hatGain.gain.setValueAtTime(step % 2 && offset === 0 ? .065 : .025, when);
        hatGain.gain.exponentialRampToValueAtTime(.0001, when + .08);
        hat.connect(highpass); highpass.connect(hatGain); hatGain.connect(output); hat.start(when); hat.stop(when + .1);
      }
    }
    const end = context.createOscillator();
    const silence = context.createGain(); silence.gain.value = 0;
    end.connect(silence); silence.connect(output);
    end.start(start + 32 * beat); end.stop(start + 32 * beat + .02);
    end.onended = () => { if (this.context === context) { this.stop(); onEnded(); } };
  }
  pause() { if (this.context?.state === "running") return this.context.suspend(); return Promise.resolve(); }
  resume() { if (this.context?.state === "suspended") return this.context.resume(); return Promise.resolve(); }
  stop() { const context = this.context; this.context = null; if (context && context.state !== "closed") void context.close().catch(() => {}); }
}
