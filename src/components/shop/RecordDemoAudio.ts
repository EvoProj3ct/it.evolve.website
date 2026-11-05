// Tre loop per i dischi e un'introduzione rock'n'roll originale. Nessun servizio o hardware collegato.
const LOOPS = [
  { bpm: 112, melody: [64, 67, 71, 74, 71, 67, 62, 67], bass: [40, 36, 43, 38], voice: "triangle" as OscillatorType },
  { bpm: 88, melody: [60, 64, 67, 71, 69, 67, 64, 62], bass: [36, 41, 43, 38], voice: "sine" as OscillatorType },
  { bpm: 124, melody: [69, 69, 72, 76, 74, 72, 67, 69], bass: [45, 41, 48, 43], voice: "sawtooth" as OscillatorType },
];

export class RecordDemoAudio {
  private static active: RecordDemoAudio | null = null;
  private context: AudioContext | null = null;
  private onEnded: (() => void) | null = null;
  async play(index: number | "rock", onEnded: () => void) {
    this.stop();
    RecordDemoAudio.active?.finish();
    const context = new AudioContext();
    this.context = context;
    this.onEnded = onEnded;
    RecordDemoAudio.active = this;
    const output = context.createGain();
    output.gain.value = .23;
    const compressor = context.createDynamicsCompressor();
    output.connect(compressor); compressor.connect(context.destination);
    try { await context.resume(); }
    catch (error) { if (this.context === context) this.stop(); throw error; }
    if (this.context !== context) return false;
    const rock = index === "rock";
    const loop = LOOPS[typeof index === "number" ? index % LOOPS.length : 0];
    const beat = 60 / (rock ? 148 : loop.bpm);
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
    const kick = (at: number) => {
      const kick = context.createOscillator();
      const kickGain = context.createGain();
      kick.frequency.setValueAtTime(135, at); kick.frequency.exponentialRampToValueAtTime(42, at + .15);
      kickGain.gain.setValueAtTime(.34, at); kickGain.gain.exponentialRampToValueAtTime(.0001, at + .18);
      kick.connect(kickGain); kickGain.connect(output); kick.start(at); kick.stop(at + .2);
    };
    const percussion = (at: number, level: number, cutoff: number, duration: number) => {
      const source = context.createBufferSource();
      const highpass = context.createBiquadFilter();
      const envelope = context.createGain();
      source.buffer = noise; highpass.type = "highpass"; highpass.frequency.value = cutoff;
      envelope.gain.setValueAtTime(level, at);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      source.connect(highpass); highpass.connect(envelope); envelope.connect(output); source.start(at); source.stop(at + duration + .02);
    };
    let duration = 32 * beat;
    if (rock) {
      // Shuffle in dodici battute: chitarra pizzicata con overdrive, basso boogie e rullante sul 2 e sul 4.
      const drive = context.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 3);
      drive.curve = curve; drive.oversample = "2x";
      const cabinet = context.createBiquadFilter();
      cabinet.type = "lowpass"; cabinet.frequency.value = 3200; cabinet.Q.value = .65;
      const lowCut = context.createBiquadFilter();
      lowCut.type = "highpass"; lowCut.frequency.value = 110;
      drive.connect(cabinet); cabinet.connect(lowCut); lowCut.connect(output);
      const plucks = new Map<string, AudioBuffer>();
      const guitar = (midi: number, at: number, length: number, level: number) => {
        const cacheKey = `${midi}:${length}`;
        let buffer = plucks.get(cacheKey);
        if (!buffer) {
          const period = Math.round(context.sampleRate / (440 * 2 ** ((midi - 69) / 12)));
          const string = new Float32Array(period);
          for (let i = 0; i < period; i++) string[i] = samples[(i * 13 + midi * 23) % samples.length];
          buffer = context.createBuffer(1, Math.ceil(context.sampleRate * (length + .03)), context.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            const position = i % period;
            data[i] = string[position];
            string[position] = (string[position] + string[(position + 1) % period]) * .498;
          }
          plucks.set(cacheKey, buffer);
        }
        const source = context.createBufferSource();
        const envelope = context.createGain();
        source.buffer = buffer;
        envelope.gain.setValueAtTime(.0001, at);
        envelope.gain.exponentialRampToValueAtTime(level, at + .004);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + length);
        source.connect(envelope); envelope.connect(drive); source.start(at); source.stop(at + length + .02);
      };
      const progression = [48, 48, 48, 48, 53, 53, 48, 48, 55, 53, 48, 55];
      const walk = [0, 4, 7, 9, 10, 9, 7, 4];
      const lick = [72, 72, 75, 76, 79, 76, 75, 72];
      for (let step = 0; step < 48; step++) {
        const at = start + step * beat;
        const bar = Math.floor(step / 4), count = step % 4;
        const root = progression[bar];
        for (const [eighth, offset] of [0, 2 / 3].entries()) {
          const when = at + beat * offset;
          const length = beat * (eighth ? .27 : .48);
          guitar(root, when, length, eighth ? .15 : .2);
          guitar(root + (count % 2 ? 9 : 7), when + .006, length, eighth ? .1 : .14);
          tone(root - 12 + walk[count * 2 + eighth], when, length, .26, "triangle");
          percussion(when, eighth ? .022 : .035, 7200, .055);
          if (bar % 4 === 3) guitar(lick[count * 2 + eighth] + (bar === 7 ? 5 : 0), when, length, .12);
        }
        if (count % 2 === 0) kick(at);
        else { percussion(at, .2, 1100, .13); tone(50, at, .08, .09, "triangle"); }
      }
      const ending = start + 48 * beat;
      guitar(48, ending, .65, .22); guitar(55, ending + .006, .65, .14);
      tone(36, ending, .6, .25, "triangle"); kick(ending);
      duration = 48 * beat + .8;
    } else {
      for (let step = 0; step < 32; step++) {
        const at = start + step * beat;
        tone(loop.melody[step % loop.melody.length], at, beat * .7, .15, loop.voice);
        if (step % 2 === 0) tone(loop.bass[Math.floor(step / 8) % 4], at, beat * 1.4, .24, "sine");
        kick(at);
        for (const offset of [0, .5]) percussion(at + beat * offset, step % 2 && offset === 0 ? .065 : .025, step % 2 ? 1900 : 6500, .08);
      }
    }
    const end = context.createOscillator();
    const silence = context.createGain(); silence.gain.value = 0;
    end.connect(silence); silence.connect(output);
    end.start(start + duration); end.stop(start + duration + .02);
    end.onended = () => { if (this.context === context) this.finish(); };
    return true;
  }
  private finish() { const onEnded = this.onEnded; this.stop(); onEnded?.(); }
  pause() { if (this.context?.state === "running") return this.context.suspend(); return Promise.resolve(); }
  resume() { if (this.context?.state === "suspended") return this.context.resume(); return Promise.resolve(); }
  stop() {
    const context = this.context;
    this.context = null; this.onEnded = null;
    if (RecordDemoAudio.active === this) RecordDemoAudio.active = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
}
