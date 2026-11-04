import { canRouteDemoAudio } from "./audio-output";

// Piccolo brano originale sintetizzato: il Test suona anche senza Bluetooth o YouTube.
export const DEMO_DURATION = 32;
export class DemoAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private startedAt = 0;
  private scheduled = false;
  private volume = .55;
  private sinkId = "";

  async setOutput(id: string) {
    if (id && !canRouteDemoAudio()) throw new Error("La scelta dell’uscita audio non è disponibile in questo browser.");
    const context = this.context as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (context && typeof context.setSinkId === "function") await context.setSinkId(id);
    this.sinkId = id;
  }

  get currentTime() { return this.context && this.scheduled ? Math.min(DEMO_DURATION, Math.max(0, this.context.currentTime - this.startedAt)) : 0; }
  get playing() { return Boolean(this.context?.state === "running" && this.scheduled && this.currentTime < DEMO_DURATION); }

  async play() {
    if (this.context?.state === "suspended" && this.scheduled && this.currentTime < DEMO_DURATION) { await this.context.resume(); return; }
    this.stop();
    const context = new AudioContext();
    this.context = context;
    const output = context.createGain();
    this.output = output;
    output.gain.value = this.volume * .35;
    const compressor = context.createDynamicsCompressor();
    output.connect(compressor);
    compressor.connect(context.destination);
    await context.resume();
    if (this.context !== context) return;
    if (this.sinkId) {
      try { await (context as AudioContext & { setSinkId: (id: string) => Promise<void> }).setSinkId(this.sinkId); }
      catch { if (this.context === context) this.stop(); throw new Error("L’uscita scelta non è disponibile. Apri Uscita audio e scegli quella di sistema."); }
    }
    if (this.context !== context) return;
    this.startedAt = context.currentTime + .06;
    const melody = [64, 67, 71, 74, 71, 67, 62, 59, 60, 64, 67, 71, 69, 67, 64, 62];
    const bass = [40, 40, 36, 36, 43, 43, 38, 38];
    const note = (midi: number, at: number, duration: number, level: number, type: OscillatorType) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(level, at + .014);
      envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
      oscillator.connect(envelope);
      envelope.connect(output);
      oscillator.start(at);
      oscillator.stop(at + duration + .02);
    };
    for (let beat = 0; beat < 48; beat++) {
      const at = this.startedAt + beat * (2 / 3);
      note(melody[beat % melody.length], at, .42, .17, "triangle");
      if (beat % 2 === 0) note(bass[Math.floor(beat / 6) % bass.length], at, .52, .22, "sine");
      if (beat % 4 === 2) note(76, at + .32, .12, .04, "square");
    }
    this.scheduled = true;
  }
  pause() { if (this.context?.state === "running") void this.context.suspend().catch(() => {}); }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.output) this.output.gain.setTargetAtTime(this.volume * .35, this.context.currentTime, .04);
  }
  stop() {
    const context = this.context;
    this.context = null;
    this.output = null;
    this.scheduled = false;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
}
