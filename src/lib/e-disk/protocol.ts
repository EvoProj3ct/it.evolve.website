// Protocollo del prototipo fornito: UUID e payload restano invariati.
export const SERVICE_UUID = "b9f00001-62f5-4e58-9777-71d66f8be001";
export const EVENT_UUID = "b9f00002-62f5-4e58-9777-71d66f8be001";
export const COMMAND_UUID = "b9f00003-62f5-4e58-9777-71d66f8be001";

interface Characteristic extends EventTarget {
  value?: DataView;
  properties?: { write?: boolean; writeWithoutResponse?: boolean };
  startNotifications(): Promise<Characteristic>;
  stopNotifications(): Promise<Characteristic>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValue?(value: BufferSource): Promise<void>;
}
interface GattServer {
  connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<Characteristic> }>;
}
interface Device extends EventTarget { name?: string; gatt?: GattServer }
type BluetoothApi = { requestDevice(options: { filters: { namePrefix: string }[]; optionalServices: string[] }): Promise<Device> };
type Callbacks = { connection: (connected: boolean, name: string) => void; message: (message: string) => void; log: (message: string) => void };

export class EDiskBluetooth {
  private device: Device | null = null;
  private events: Characteristic | null = null;
  private command: Characteristic | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private disposed = false;
  constructor(private callbacks: Callbacks) {}
  get connected() { return Boolean(this.device?.gatt?.connected && this.command); }

  private notification = (event: Event) => {
    const value = (event.target as Characteristic).value;
    if (!value || this.disposed) return;
    const message = new TextDecoder().decode(value);
    message.split(/[\r\n]+/).map(line => line.trim()).filter(Boolean).forEach(line => {
      this.callbacks.log(`ESP32 → ${line}`);
      this.callbacks.message(line);
    });
  };
  private disconnected = () => {
    this.generation++;
    this.release();
    if (!this.disposed) this.callbacks.connection(false, "");
  };
  private release() {
    this.events?.removeEventListener("characteristicvaluechanged", this.notification);
    if (this.events && this.device?.gatt?.connected) void this.events.stopNotifications().catch(() => {});
    this.device?.removeEventListener("gattserverdisconnected", this.disconnected);
    this.events = null;
    this.command = null;
    this.device = null;
  }

  async connect() {
    const api = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
    if (!window.isSecureContext) throw new Error("Il Bluetooth richiede HTTPS o localhost.");
    if (!api) throw new Error("Per il Bluetooth usa Chrome o Edge compatibile. Puoi comunque usare il Test.");
    const generation = ++this.generation;
    let device: Device | null = null;
    try {
      // requestDevice viene chiamato direttamente nel gesto del pulsante Connetti.
      device = await api.requestDevice({ filters: [{ namePrefix: "EVOLVE" }], optionalServices: [SERVICE_UUID] });
      if (this.disposed || generation !== this.generation) return;
      if (!device.gatt) throw new Error("Questo dispositivo non espone un servizio Bluetooth GATT.");
      this.device = device;
      device.addEventListener("gattserverdisconnected", this.disconnected);
      const server = await device.gatt.connect();
      if (this.disposed || generation !== this.generation) { server.disconnect(); return; }
      const service = await server.getPrimaryService(SERVICE_UUID);
      const events = await service.getCharacteristic(EVENT_UUID);
      const command = await service.getCharacteristic(COMMAND_UUID);
      if (this.disposed || generation !== this.generation) { server.disconnect(); return; }
      this.events = events;
      this.command = command;
      events.addEventListener("characteristicvaluechanged", this.notification);
      await events.startNotifications();
      if (this.disposed || generation !== this.generation) { server.disconnect(); return; }
      await this.send("PING");
      if (this.disposed || generation !== this.generation) { server.disconnect(); return; }
      this.callbacks.connection(true, device.name || "EVOLVE");
    } catch (error) {
      if (generation === this.generation) {
        this.release();
        if (device?.gatt?.connected) device.gatt.disconnect();
        if (!this.disposed) this.callbacks.connection(false, "");
      }
      throw error;
    }
  }

  send(payload: string): Promise<boolean> {
    const characteristic = this.command;
    const generation = this.generation;
    if (!characteristic || !this.connected) return Promise.resolve(false);
    const operation = this.queue.catch(() => {}).then(async () => {
      if (!this.connected || this.command !== characteristic || generation !== this.generation) return false;
      const data = new TextEncoder().encode(payload);
      if (characteristic.properties?.write && characteristic.writeValueWithResponse) await characteristic.writeValueWithResponse(data);
      else if (characteristic.properties?.writeWithoutResponse && characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(data);
      else if (characteristic.writeValue) await characteristic.writeValue(data);
      else if (characteristic.writeValueWithResponse) await characteristic.writeValueWithResponse(data);
      else throw new Error("Scrittura Bluetooth non disponibile.");
      if (!this.disposed) this.callbacks.log(`APP → ${payload}`);
      return true;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  disconnect() {
    this.generation++;
    const device = this.device;
    this.release();
    if (device?.gatt?.connected) device.gatt.disconnect();
    if (!this.disposed) this.callbacks.connection(false, "");
  }
  dispose() { this.disposed = true; this.disconnect(); }
}
