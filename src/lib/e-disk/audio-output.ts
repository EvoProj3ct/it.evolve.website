export type AudioOutputState = {
  routingAvailable: boolean;
  pickerAvailable: boolean;
  selecting: boolean;
  deviceId: string;
  label: string;
  devices: { id: string; label: string }[];
  message: string;
  error: boolean;
};
export const INITIAL_AUDIO_OUTPUT: AudioOutputState = {
  routingAvailable: false, pickerAvailable: false, selecting: false, deviceId: "", label: "Uscita di sistema", devices: [], message: "", error: false,
};

type OutputMediaDevices = MediaDevices & { selectAudioOutput?: (options?: { deviceId?: string }) => Promise<MediaDeviceInfo> };
type RoutedContext = AudioContext & { setSinkId?: (id: string) => Promise<void> };
export const canRouteDemoAudio = () => typeof AudioContext !== "undefined" && typeof (AudioContext.prototype as RoutedContext).setSinkId === "function";

// Selezione dell'uscita della sola demo Web Audio. Il player YouTube usa l'uscita
// di sistema: il suo iframe esterno non espone setSinkId tramite la IFrame API.
export class AudioOutputRouter {
  private state: AudioOutputState = { ...INITIAL_AUDIO_OUTPUT, devices: [] };
  private media: OutputMediaDevices | undefined;
  private disposed = false;
  private observing = false;
  private revision = 0;
  constructor(private apply: (id: string) => Promise<void>, private update: (state: AudioOutputState) => void) {
    this.media = navigator.mediaDevices as OutputMediaDevices | undefined;
    const routingAvailable = window.isSecureContext && canRouteDemoAudio();
    this.emit({ routingAvailable, pickerAvailable: routingAvailable && typeof this.media?.selectAudioOutput === "function" });
    this.media?.addEventListener("devicechange", this.devicesChanged);
  }
  private emit(patch: Partial<AudioOutputState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch }; this.update(this.state);
  }
  async refresh() {
    this.observing = true;
    if (!this.media?.enumerateDevices || !this.state.routingAvailable) return;
    const revision = this.revision;
    try {
      // Non richiede microfono o videocamera: mostra solo uscite già autorizzate.
      const devices = (await this.media.enumerateDevices()).filter(device => device.kind === "audiooutput" && device.deviceId && device.deviceId !== "default" && device.label).map(device => ({ id: device.deviceId, label: device.label }));
      if (this.disposed || revision !== this.revision) return;
      this.emit({ devices });
    } catch { /* Il percorso di sistema resta sempre disponibile. */ }
  }
  private devicesChanged = async () => {
    if (!this.observing || this.disposed || this.state.selecting) return;
    const previousId = this.state.deviceId;
    const known = this.state.devices.some(device => device.id === previousId);
    await this.refresh();
    if (this.disposed || this.state.selecting || previousId !== this.state.deviceId) return;
    if (previousId && known && !this.state.devices.some(device => device.id === previousId)) {
      const reset = await this.select("");
      if (reset) this.emit({ message: "L’uscita scelta non è più disponibile. Il Test segue ora l’uscita di sistema.", error: false });
    }
  };
  private failure(error: unknown) {
    const name = error instanceof Error ? error.name : "";
    const messages: Record<string, string> = {
      NotAllowedError: "Scelta non autorizzata o annullata. Puoi usare l’uscita di sistema.",
      NotFoundError: "Uscita audio non disponibile. Collega la cassa al dispositivo e riprova.",
      InvalidStateError: "Apri di nuovo la scelta dell’uscita dal pulsante.",
      AbortError: "Cambio dell’uscita non riuscito. Puoi riprovare o usare l’uscita di sistema.",
    };
    this.emit({ message: messages[name] || "Non riesco a cambiare l’uscita audio. Puoi usare quella di sistema.", error: true });
  }
  async choose() {
    if (this.disposed || this.state.selecting || !this.state.pickerAvailable || !this.media?.selectAudioOutput) return;
    const revision = ++this.revision;
    this.emit({ selecting: true, message: "Scegli una cassa o delle cuffie nella finestra del browser…", error: false });
    try {
      // Chiamata diretta dal clic dell'utente, senza attese prima del selettore.
      const device = await this.media.selectAudioOutput(this.state.deviceId ? { deviceId: this.state.deviceId } : undefined);
      if (this.disposed || revision !== this.revision) return;
      const id = device.deviceId === "default" ? "" : device.deviceId;
      await this.apply(id);
      if (this.disposed || revision !== this.revision) return;
      this.emit({ deviceId: id, label: id ? device.label || "Uscita selezionata" : "Uscita di sistema", message: "Uscita impostata per il Test. YouTube continua a seguire l’uscita di sistema.", error: false });
      await this.refresh();
    } catch (error) { if (!this.disposed && revision === this.revision) this.failure(error); }
    finally { if (revision === this.revision) this.emit({ selecting: false }); }
  }
  async select(id: string) {
    if (this.disposed || this.state.selecting || (id && !this.state.routingAvailable)) return false;
    const device = this.state.devices.find(item => item.id === id);
    if (id && !device) return false;
    const revision = ++this.revision;
    this.emit({ selecting: true, message: "Cambio dell’uscita audio…", error: false });
    try {
      await this.apply(id);
      if (this.disposed || revision !== this.revision) return false;
      this.emit({ deviceId: id, label: device?.label || "Uscita di sistema", message: id ? "Uscita impostata per il Test. YouTube segue l’uscita di sistema." : "Il Test segue ora l’uscita di sistema, come YouTube.", error: false });
      return true;
    } catch (error) { if (!this.disposed && revision === this.revision) this.failure(error); return false; }
    finally { if (revision === this.revision) this.emit({ selecting: false }); }
  }
  dispose() { this.disposed = true; this.revision++; this.media?.removeEventListener("devicechange", this.devicesChanged); }
}
