import { CATALOG_KEY, cleanCatalog, validCode, type DiskTrack } from "./catalog";
import { DemoAudio, DEMO_DURATION } from "./demo-audio";
import { EDiskBluetooth, type ConnectionStep } from "./protocol";
import { loadYouTube, type YouTubePlayer } from "./youtube";
import { AudioOutputRouter, INITIAL_AUDIO_OUTPUT, type AudioOutputState } from "./audio-output";

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "cued" | "ended" | "error";
export type NfcFeedback = {
  phase: "idle" | "recognized" | "unmapped" | "sending" | "waiting" | "cancelling" | "written" | "cancelled" | "error";
  code: string;
  title: string;
  message: string;
  secondsLeft: number | null;
};
const IDLE_NFC: NfcFeedback = { phase: "idle", code: "", title: "", message: "", secondsLeft: null };
export type EDiskState = {
  tracks: DiskTrack[];
  active: DiskTrack | null;
  source: "none" | "youtube" | "test";
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  audioOutput: AudioOutputState;
  connected: boolean;
  connecting: boolean;
  connectionStep: ConnectionStep;
  deviceName: string;
  motor: "unknown" | "idle" | "accel" | "max" | "decel";
  writePending: boolean;
  nfc: NfcFeedback;
  persistent: boolean;
  notice: { text: string; error: boolean };
  logs: string[];
};
export const INITIAL_EDISK: EDiskState = {
  tracks: [], active: null, source: "none", status: "idle", currentTime: 0, duration: 0, volume: 55, audioOutput: INITIAL_AUDIO_OUTPUT,
  connected: false, connecting: false, connectionStep: "idle", deviceName: "", motor: "unknown", writePending: false, nfc: IDLE_NFC,
  persistent: true, notice: { text: "", error: false }, logs: [],
};
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export class EDiskController {
  state: EDiskState = { ...INITIAL_EDISK };
  private bluetooth: EDiskBluetooth;
  private demo = new DemoAudio();
  private audioOutputs: AudioOutputRouter;
  private player: YouTubePlayer | null = null;
  private playerReady = false;
  private playerLoading: Promise<YouTubePlayer> | null = null;
  private cancelReady: (() => void) | null = null;
  private timer: number;
  private writeTimer: number | null = null;
  private writeRequest = 0;
  private writingCode: string | null = null;
  private writeDeadline = 0;
  private disconnecting = false;
  private noticeTimer: number | null = null;
  private selection = 0;
  private syncVersion = 0;
  private syncing = false;
  private motorStarted = false;
  private lastTimeSync = 0;
  private durationWarning = false;
  private disposed = false;

  constructor(private host: HTMLElement, private update: (state: EDiskState) => void) {
    this.bluetooth = new EDiskBluetooth({ connection: this.connection, message: this.message, log: this.log, progress: connectionStep => this.emit({ connectionStep }) });
    this.audioOutputs = new AudioOutputRouter(id => this.demo.setOutput(id), audioOutput => this.emit({ audioOutput }));
    try { this.state.tracks = cleanCatalog(JSON.parse(localStorage.getItem(CATALOG_KEY) || "[]")); }
    catch { this.state.persistent = false; }
    this.emit({});
    this.timer = window.setInterval(this.tick, 500);
  }
  private emit(patch: Partial<EDiskState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.update(this.state);
  }
  private log = (message: string) => {
    const stamp = new Date().toLocaleTimeString("it-IT", { hour12: false });
    this.emit({ logs: [...this.state.logs.slice(-79), `${stamp}  ${message}`] });
  };
  notify(text: string, error = false) {
    if (this.noticeTimer !== null) window.clearTimeout(this.noticeTimer);
    this.emit({ notice: { text, error } });
    if (text) this.log(text);
    if (!error) this.noticeTimer = window.setTimeout(() => this.emit({ notice: { text: "", error: false } }), 6500);
  }
  dismissNotice() {
    if (this.noticeTimer !== null) window.clearTimeout(this.noticeTimer);
    this.emit({ notice: { text: "", error: false } });
  }
  resetNfcFeedback() { if (!this.state.writePending) this.emit({ nfc: { ...IDLE_NFC } }); }
  private nfc(patch: Partial<NfcFeedback>) { this.emit({ nfc: { ...this.state.nfc, ...patch } }); }

  private connection = (connected: boolean, name: string) => {
    const previous = this.state.connected;
    const interruptedWrite = this.state.writePending;
    this.motorStarted = false;
    this.syncVersion++;
    this.endWrite();
    this.durationWarning = false;
    this.emit({ connected, deviceName: name, connectionStep: connected ? "ready" : "idle", motor: connected ? this.state.motor : "unknown" });
    if (interruptedWrite) this.nfc({ phase: "error", secondsLeft: null, message: "Collegamento interrotto. La scrittura non è stata confermata: riconnetti il giradischi e riprova." });
    if (connected) { this.notify(`Connesso a ${name}.`); void this.sync(); }
    else if (previous) {
      if (this.state.source === "youtube") { this.player?.pauseVideo(); this.emit({ status: "paused" }); }
      this.notify(this.disconnecting ? "Giradischi disconnesso." : "Connessione al giradischi interrotta. Riconnettilo per usare NFC.", !this.disconnecting);
    }
  };

  async connect() {
    if (this.state.connecting || this.state.connected) return;
    this.emit({ connecting: true, connectionStep: "choosing" });
    try { await this.bluetooth.connect(); }
    catch (error) {
      if (error instanceof DOMException && error.name === "NotFoundError") { this.emit({ connectionStep: "idle" }); this.notify("Connessione annullata. Puoi riprovare quando vuoi."); }
      else { this.emit({ connectionStep: "error" }); this.notify(errorText(error), true); }
    } finally { this.emit({ connecting: false }); }
  }
  async disconnect() {
    if (this.state.connecting) return;
    this.disconnecting = true;
    this.emit({ connecting: true, connectionStep: "disconnecting" });
    try {
      if (this.state.writePending) await this.bluetooth.send("CANCEL");
      await this.bluetooth.send("STOP");
    } catch (error) { this.log(errorText(error)); }
    finally { this.bluetooth.disconnect(); this.disconnecting = false; this.emit({ connecting: false }); }
  }

  private message = (message: string) => {
    if (message.startsWith("TAG:")) {
      if (this.state.writePending) return;
      const code = message.slice(4).trim();
      if (!validCode(code)) { this.nfc({ ...IDLE_NFC, phase: "error", message: "Il lettore ha inviato un codice non valido. Riprova con un tag e-disk." }); return; }
      const track = this.state.tracks.find(item => item.code === code);
      if (track) {
        this.nfc({ ...IDLE_NFC, phase: "recognized", code, title: track.title, message: "Disco riconosciuto. Il tuo brano è pronto." });
        void this.select(track, true);
      } else {
        this.nfc({ ...IDLE_NFC, phase: "unmapped", code, message: "Tag letto. Associa questo codice a un brano della tua collezione." });
        this.notify(`Disco ${code} letto: manca il brano associato in questo browser.`);
      }
    } else if (message === "WRITE_WAIT") {
      if (!this.state.writePending || this.state.nfc.phase === "cancelling") return;
      this.writeDeadline = Date.now() + 30000;
      this.nfc({ phase: "waiting", message: "Avvicina il tag al lettore del giradischi e tienilo fermo fino alla conferma.", secondsLeft: 30 });
      this.startWriteTimeout();
      this.notify("Avvicina il tag al lettore.");
    } else if (message.startsWith("WRITE_OK:")) {
      if (!this.state.writePending) return;
      const code = message.slice(9).trim();
      const expected = this.writingCode;
      this.endWrite();
      if (!validCode(code) || code !== expected) {
        this.nfc({ phase: "error", secondsLeft: null, message: "Il codice confermato non coincide con quello richiesto. La scrittura non può essere confermata: riprova." });
        this.notify("Conferma NFC non valida: codice diverso da quello richiesto.", true);
        return;
      }
      this.nfc({ phase: "written", code, secondsLeft: null, message: "Il giradischi ha scritto e riletto il codice. Rimuovi il tag, poi riavvicinalo per ascoltare." });
      this.notify(`Disco ${code} scritto e verificato.`);
    } else if (message === "WRITE_CANCEL") {
      if (!this.state.writePending) return;
      this.endWrite();
      this.nfc({ phase: "cancelled", secondsLeft: null, message: "Richiesta annullata dal giradischi. Nessuna scrittura è più in attesa." });
      this.notify("Scrittura annullata.");
    } else if (message.startsWith("ERR:")) {
      const reason = message.slice(4).trim();
      const errors: Record<string, string> = {
        NO_CODE: "Il tag non contiene un codice e-disk leggibile. Puoi scriverne uno dalla collezione.", WRITE: "Scrittura non riuscita. Tieni fermo un tag compatibile sul lettore e riprova.",
        WRITE_TIMEOUT: "Tempo scaduto. Avvia di nuovo la scrittura.", BAD_CODE: "Il codice deve contenere da 4 a 8 cifre.", BAD_DURATION: "La durata del video non è valida.",
      };
      if (reason === "NO_CODE" && this.state.writePending) return;
      if (["WRITE", "WRITE_TIMEOUT", "BAD_CODE"].includes(reason)) {
        this.endWrite();
        this.nfc({ phase: "error", secondsLeft: null, message: errors[reason] });
      } else if (reason === "NO_CODE") this.nfc({ ...IDLE_NFC, phase: "error", message: errors.NO_CODE });
      this.notify(errors[reason] || `Giradischi: ${reason}`, true);
    } else {
      const states: Record<string, EDiskState["motor"]> = { "STATE:ACCEL": "accel", "STATE:PLAY": "accel", "STATE:MAX": "max", "STATE:DECEL": "decel", "STATE:STOP": "idle" };
      if (states[message]) this.emit({ motor: states[message] });
    }
  };
  private endWrite() {
    this.writeRequest++; this.writingCode = null; this.writeDeadline = 0;
    if (this.writeTimer !== null) window.clearTimeout(this.writeTimer);
    this.writeTimer = null; this.emit({ writePending: false });
  }
  private startWriteTimeout(ms = 35000, message = "Conferma non ricevuta. Il giradischi non ha confermato la scrittura: controlla il tag e riprova.") {
    if (this.writeTimer !== null) window.clearTimeout(this.writeTimer);
    this.writeTimer = window.setTimeout(() => {
      this.endWrite(); this.nfc({ phase: "error", secondsLeft: null, message }); this.notify(message, true);
    }, ms);
  }
  async write(code: string) {
    if (this.writingCode || this.state.writePending) { this.notify("Una scrittura è già in attesa. Avvicina il tag oppure annullala.", true); return false; }
    if (!validCode(code)) { this.notify("Il codice deve contenere da 4 a 8 cifre.", true); return false; }
    if (!this.state.connected) { this.notify("Connetti il giradischi per scrivere un tag.", true); return false; }
    // Il firmware scrive soltanto a motore fermo. Annulla anche un caricamento YouTube in corso.
    this.pause();
    const request = ++this.writeRequest;
    this.writingCode = code;
    const title = this.state.tracks.find(track => track.code === code)?.title || "";
    this.emit({ writePending: true, nfc: { phase: "sending", code, title, message: "Invio della richiesta al giradischi…", secondsLeft: null } });
    this.startWriteTimeout(8000, "Il giradischi non ha confermato la richiesta. Riconnettilo e riprova.");
    try {
      const sent = await this.bluetooth.send(`WRITE:${code}`);
      if (!sent) throw new Error("Giradischi scollegato.");
      return true;
    } catch (error) {
      if (request === this.writeRequest) { this.endWrite(); this.nfc({ phase: "error", secondsLeft: null, message: "Richiesta non inviata. Controlla la connessione e riprova." }); this.notify(errorText(error), true); }
      return false;
    }
  }
  async cancelWrite() {
    if (!this.state.writePending || this.state.nfc.phase === "cancelling") return;
    this.writeDeadline = 0;
    this.nfc({ phase: "cancelling", message: "Annullamento in corso…", secondsLeft: null });
    this.startWriteTimeout(8000, "Conferma di annullamento non ricevuta. Riconnetti il giradischi prima di riprovare.");
    try {
      if (!this.state.connected || !await this.bluetooth.send("CANCEL")) throw new Error("Giradischi scollegato.");
    } catch (error) {
      if (!this.state.writePending) return;
      this.endWrite(); this.nfc({ phase: "error", secondsLeft: null, message: "Annullamento non confermato. Controlla il collegamento." }); this.notify(errorText(error), true);
    }
  }

  private async ensurePlayer() {
    if (this.player && this.playerReady) return this.player;
    if (this.playerLoading) return this.playerLoading;
    this.playerLoading = (async () => {
      const api = await loadYouTube();
      if (this.disposed) throw new Error("Player chiuso.");
      const element = document.createElement("div");
      this.host.replaceChildren(element);
      return new Promise<YouTubePlayer>((resolve, reject) => {
        const timeout = window.setTimeout(() => { this.player?.destroy(); this.player = null; this.playerLoading = null; reject(new Error("Il video non si è caricato. Premi Play per riprovare.")); }, 20000);
        this.cancelReady = () => { window.clearTimeout(timeout); reject(new Error("Player chiuso.")); };
        this.player = new api.Player(element, {
          host: "https://www.youtube-nocookie.com", width: "100%", height: "100%",
          playerVars: { playsinline: 1, rel: 0, controls: 1, enablejsapi: 1, origin: window.location.origin },
          events: {
            onReady: event => {
              window.clearTimeout(timeout); this.cancelReady = null;
              if (this.disposed) { event.target.destroy(); reject(new Error("Player chiuso.")); return; }
              this.player = event.target; this.playerReady = true;
              event.target.getIframe().referrerPolicy = "strict-origin-when-cross-origin";
              event.target.setVolume(this.state.volume);
              resolve(event.target);
            },
            onStateChange: event => this.playerState(event.data),
            onError: event => this.playerError(event.data),
            onAutoplayBlocked: () => { if (this.state.source === "youtube") { this.stopMotor(); this.emit({ status: "cued" }); this.notify("Premi Play per avviare il video."); } },
          },
        });
      });
    })().catch(error => { this.playerLoading = null; throw error; });
    return this.playerLoading;
  }

  async select(track: DiskTrack, fromTag = false) {
    if (this.state.writePending) { this.notify("Completa o annulla la scrittura NFC prima di avviare un disco."); return; }
    const token = ++this.selection;
    this.durationWarning = false;
    this.stopMotor(); this.demo.stop();
    this.emit({ active: track, source: "youtube", status: "loading", currentTime: 0, duration: 0 });
    this.player?.pauseVideo();
    if (fromTag) this.notify(`Disco ${track.code} riconosciuto.`);
    try {
      const player = await this.ensurePlayer();
      if (this.disposed || token !== this.selection) return;
      player.loadVideoById(track.youtubeId);
    } catch (error) { if (!this.disposed && token === this.selection) { this.emit({ status: "error" }); this.notify(errorText(error), true); } }
  }

  async test() {
    if (this.state.writePending) { this.notify("Completa o annulla la scrittura NFC prima di avviare il Test."); return; }
    const token = ++this.selection;
    this.stopMotor();
    this.emit({ source: "test", active: null, status: "loading", currentTime: 0, duration: DEMO_DURATION });
    this.player?.pauseVideo();
    try {
      this.demo.setVolume(this.state.volume / 100);
      await this.demo.play();
      if (!this.disposed && token === this.selection) { this.emit({ status: "playing" }); this.notify("Test audio: demo sintetica, senza giradischi."); }
    } catch (error) { if (token === this.selection) { this.emit({ status: "error" }); this.notify(error instanceof Error && !(error instanceof DOMException) ? error.message : "Il browser ha bloccato l’audio. Premi di nuovo Test.", true); } }
  }

  async playPause() {
    if (this.state.writePending) { this.notify("Completa o annulla la scrittura NFC prima di riprendere l’ascolto."); return; }
    if (this.state.status === "playing") { this.pause(); return; }
    if (this.state.source === "test") {
      const token = this.selection;
      try { await this.demo.play(); if (!this.disposed && token === this.selection && this.state.source === "test") this.emit({ status: "playing", currentTime: this.demo.currentTime }); }
      catch (error) { this.notify(error instanceof Error && !(error instanceof DOMException) ? error.message : "Premi di nuovo Play per attivare l’audio.", true); }
    } else if (this.state.active) {
      if (this.playerReady && this.state.status !== "error") this.player?.playVideo();
      else void this.select(this.state.active);
    }
  }
  pause() {
    this.selection++;
    this.stopMotor();
    if (this.state.source === "test") this.demo.pause(); else this.player?.pauseVideo();
    this.emit({ status: "paused" });
  }
  stop() {
    this.selection++;
    this.stopMotor();
    if (this.state.source === "test") this.demo.stop(); else this.player?.stopVideo();
    this.emit({ status: "cued", currentTime: 0 });
  }
  next(direction: number) {
    const tracks = this.state.tracks;
    if (!tracks.length) return;
    const index = tracks.findIndex(track => track.code === this.state.active?.code);
    const next = index < 0 ? direction > 0 ? 0 : tracks.length - 1 : (index + direction + tracks.length) % tracks.length;
    void this.select(tracks[next]);
  }
  seek(time: number) {
    if (this.state.source !== "youtube" || !this.playerReady || !this.state.duration) return;
    const value = Math.max(0, Math.min(this.state.duration, time));
    this.player?.seekTo(value, true);
    this.emit({ currentTime: value });
    this.lastTimeSync = 0;
  }
  volume(value: number) {
    const volume = Math.round(Math.max(0, Math.min(100, value)));
    this.emit({ volume });
    this.demo.setVolume(volume / 100);
    if (this.playerReady) this.player?.setVolume(volume);
  }
  refreshAudioOutputs() { void this.audioOutputs.refresh(); }
  chooseAudioOutput() { return this.audioOutputs.choose(); }
  selectAudioOutput(id: string) { return this.audioOutputs.select(id); }

  private playerState(state: number) {
    if (this.state.source !== "youtube") return;
    if (state === 1 && this.state.writePending) { this.player?.pauseVideo(); this.stopMotor(); this.emit({ status: "paused" }); return; }
    const id = this.player?.getVideoData()?.video_id;
    if (id && id !== this.state.active?.youtubeId) return;
    if (state === 1) { this.emit({ status: "playing" }); void this.sync(); }
    else {
      this.stopMotor();
      const statuses: Record<number, PlaybackStatus> = { [-1]: "cued", 0: "ended", 2: "paused", 3: "loading", 5: "cued" };
      if (statuses[state]) this.emit({ status: statuses[state] });
    }
  }
  private playerError(code: number) {
    if (this.state.source !== "youtube") return;
    this.stopMotor(); this.emit({ status: "error" });
    const errors: Record<number, string> = { 2: "Link YouTube non valido.", 5: "YouTube non riesce a riprodurre il video in questo browser.", 100: "Il video è privato o non più disponibile.", 101: "Questo video non consente la riproduzione incorporata.", 150: "Questo video non consente la riproduzione incorporata.", 153: "YouTube richiede una pagina HTTPS con origine e referrer validi." };
    this.notify(errors[code] || `Errore YouTube ${code}. Prova un altro video.`, true);
  }
  private stopMotor() {
    this.syncVersion++;
    this.motorStarted = false;
    this.lastTimeSync = 0;
    if (this.state.connected) void this.bluetooth.send("STOP").catch(error => this.log(errorText(error)));
  }
  private async sync() {
    if (this.disposed || this.syncing || this.state.writePending || !this.state.connected || this.state.source !== "youtube" || this.state.status !== "playing" || !this.playerReady || !this.player || this.player.getPlayerState() !== 1) return;
    const duration = Number(this.player.getDuration());
    const position = Number(this.player.getCurrentTime());
    if (this.player.getVideoData()?.isLive) {
      if (!this.durationWarning) { this.durationWarning = true; this.notify("Le dirette si ascoltano nel browser; il giradischi richiede un video con durata definita."); }
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;
    const remaining = Math.max(1, Math.ceil(duration - position));
    const first = !this.motorStarted;
    if (!first && Date.now() - this.lastTimeSync < 2500) return;
    const version = this.syncVersion;
    this.syncing = true;
    try {
      const sent = await this.bluetooth.send(`${first ? "PLAY" : "TIME"}:${remaining}`);
      if (version !== this.syncVersion || this.state.status !== "playing") {
        if (sent && this.state.connected) await this.bluetooth.send("STOP");
        return;
      }
      if (sent) { this.motorStarted = true; this.lastTimeSync = Date.now(); }
    } catch (error) { this.motorStarted = false; this.log(errorText(error)); }
    finally { this.syncing = false; }
  }

  private tick = () => {
    if (this.disposed) return;
    if (this.state.writePending && this.writeDeadline) {
      const secondsLeft = Math.max(0, Math.ceil((this.writeDeadline - Date.now()) / 1000));
      if (secondsLeft !== this.state.nfc.secondsLeft) this.nfc({ secondsLeft });
    }
    if (this.state.source === "test" && this.state.status === "playing") {
      const currentTime = this.demo.currentTime;
      if (currentTime >= DEMO_DURATION) { this.demo.stop(); this.emit({ status: "ended", currentTime: DEMO_DURATION }); }
      else if (!this.demo.playing) this.emit({ status: "paused", currentTime });
      else this.emit({ currentTime });
    } else if (this.state.source === "youtube" && this.playerReady && this.player) {
      try {
        const id = this.player.getVideoData()?.video_id;
        if (id && id !== this.state.active?.youtubeId) return;
        const currentTime = Number(this.player.getCurrentTime()) || 0;
        const duration = Number(this.player.getDuration()) || 0;
        if (Number.isFinite(currentTime) && Number.isFinite(duration) && (Math.abs(currentTime - this.state.currentTime) > .1 || Math.abs(duration - this.state.duration) > .1)) this.emit({ currentTime, duration });
        void this.sync();
      } catch { /* Il player può essere in transizione tra due video. */ }
    }
  };

  private persist(tracks: DiskTrack[]) {
    let persistent = true;
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify(tracks)); } catch { persistent = false; }
    this.emit({ tracks, persistent });
    if (!persistent) this.notify("Collezione disponibile per questa sessione. Puoi esportarla dal menu.", true);
  }
  upsert(track: DiskTrack, originalCode?: string) {
    if (!validCode(track.code) || !/^[\w-]{11}$/.test(track.youtubeId) || !track.title.trim()) throw new Error("Controlla titolo, link YouTube e codice.");
    if (this.state.tracks.some(item => item.code === track.code && item.code !== originalCode)) throw new Error("Questo codice è già associato a un disco.");
    if (!originalCode && this.state.tracks.length >= 200) throw new Error("La collezione può contenere fino a 200 dischi.");
    const clean = { ...track, title: track.title.trim().slice(0, 90) };
    this.persist([clean, ...this.state.tracks.filter(item => item.code !== originalCode && item.code !== track.code)]);
    if (this.state.nfc.phase === "unmapped" && this.state.nfc.code === clean.code) {
      this.nfc({ phase: "recognized", title: clean.title, message: "Brano associato. Il disco è nella tua collezione." });
    }
    const active = this.state.active;
    if (active && active.code === originalCode) {
      if (active.youtubeId !== clean.youtubeId) void this.select(clean);
      else this.emit({ active: clean });
    }
    this.notify("Disco salvato.");
  }
  remove(code: string) {
    if (this.state.active?.code === code) { this.stop(); this.emit({ active: null, source: "none", status: "idle", duration: 0 }); }
    this.persist(this.state.tracks.filter(track => track.code !== code));
    this.notify("Disco rimosso dalla collezione. Il tag resta invariato.");
  }
  import(tracks: DiskTrack[]) {
    if (this.state.source === "youtube") { this.stop(); this.emit({ active: null, source: "none", status: "idle", duration: 0 }); }
    this.persist(cleanCatalog(tracks)); this.notify("Collezione importata.");
  }

  dispose() {
    this.disposed = true; this.selection++; this.syncVersion++;
    window.clearInterval(this.timer);
    if (this.writeTimer !== null) window.clearTimeout(this.writeTimer);
    if (this.noticeTimer !== null) window.clearTimeout(this.noticeTimer);
    this.audioOutputs.dispose();
    this.demo.stop(); this.cancelReady?.(); this.player?.destroy();
    const timeout = window.setTimeout(() => this.bluetooth.dispose(), 700);
    void (async () => {
      try { if (this.state.writePending) await this.bluetooth.send("CANCEL"); await this.bluetooth.send("STOP"); }
      catch { /* Il collegamento potrebbe già essere chiuso. */ }
      finally { window.clearTimeout(timeout); this.bluetooth.dispose(); }
    })();
  }
}
