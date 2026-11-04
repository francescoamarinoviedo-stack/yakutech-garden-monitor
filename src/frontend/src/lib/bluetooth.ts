/**
 * Reusable Bluetooth transport layer.
 *
 * The application logic never talks to the Web Bluetooth API directly: it goes
 * through this module so the hardware link can be swapped (Web Bluetooth today,
 * a native bridge later) without touching the UI or the backend hooks.
 *
 * The Arduino UNO exposes an HC-05/HC-06 serial bridge as a BLE UART service.
 * Frames are newline-delimited ASCII, e.g. `M:42,T:25,H:80`.
 */

/** Nordic UART Service — the standard BLE serial bridge used by HC-05/HC-06 modules. */
const NORDIC_UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // write (app -> Arduino)
const NORDIC_UART_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // notify (Arduino -> app)

/* Minimal Web Bluetooth typings (not shipped with the DOM lib). */
interface GattCharacteristic extends EventTarget {
  readonly value: DataView | null;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<GattCharacteristic>;
}

interface GattService {
  getCharacteristic(characteristic: string): Promise<GattCharacteristic>;
}

interface GattServer {
  readonly connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<GattService>;
}

interface BleDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: GattServer;
}

interface BleRequestOptions {
  filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

interface BluetoothApi {
  requestDevice(options: BleRequestOptions): Promise<BleDevice>;
}

function getBluetoothApi(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { bluetooth?: BluetoothApi };
  return nav.bluetooth ?? null;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
}

export interface BluetoothTransportEvents {
  onFrame: (raw: string) => void;
  onDisconnect: () => void;
}

export function isBluetoothSupported(): boolean {
  return getBluetoothApi() !== null;
}

/**
 * A single reusable transport instance. It owns the GATT connection, the
 * notification subscription and the write characteristic, and exposes a small
 * promise-based surface to the rest of the app.
 */
export class BluetoothTransport {
  private device: BleDevice | null = null;
  private server: GattServer | null = null;
  private writeChar: GattCharacteristic | null = null;
  private buffer = "";
  private events: BluetoothTransportEvents | null = null;

  get connected(): boolean {
    return this.server?.connected ?? false;
  }

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  /** Prompt the user to pick a nearby device and connect to its UART service. */
  async requestAndConnect(
    events: BluetoothTransportEvents,
  ): Promise<DiscoveredDevice> {
    const bluetooth = getBluetoothApi();
    if (!bluetooth) {
      throw new Error(
        "Este navegador no soporta Bluetooth Web. Usa Chrome en Android o escritorio.",
      );
    }
    this.events = events;
    const device = await bluetooth.requestDevice({
      filters: [{ services: [NORDIC_UART_SERVICE] }],
      optionalServices: [NORDIC_UART_SERVICE],
    });
    this.device = device;
    device.addEventListener("gattserverdisconnected", this.handleDisconnect);
    const server = await device.gatt?.connect();
    if (!server)
      throw new Error("No se pudo abrir la conexión GATT con el dispositivo.");
    this.server = server;
    const service = await server.getPrimaryService(NORDIC_UART_SERVICE);
    const tx = await service.getCharacteristic(NORDIC_UART_TX);
    await tx.startNotifications();
    tx.addEventListener("characteristicvaluechanged", this.handleNotification);
    this.writeChar = await service.getCharacteristic(NORDIC_UART_RX);
    return { id: device.id, name: device.name ?? "Arduino UNO" };
  }

  /** Send a command line to the Arduino. */
  async send(command: string): Promise<void> {
    if (!this.writeChar)
      throw new Error("No hay un canal de escritura Bluetooth activo.");
    const payload = new TextEncoder().encode(`${command}\n`);
    await this.writeChar.writeValue(payload);
  }

  /** Tear down the connection and stop listening. */
  disconnect(): void {
    this.device?.removeEventListener(
      "gattserverdisconnected",
      this.handleDisconnect,
    );
    if (this.server?.connected) this.server.disconnect();
    this.cleanup();
  }

  private cleanup(): void {
    this.server = null;
    this.writeChar = null;
    this.buffer = "";
  }

  private handleDisconnect = (): void => {
    this.cleanup();
    this.events?.onDisconnect();
  };

  private handleNotification = (event: Event): void => {
    const target = event.target as GattCharacteristic;
    const value = target.value;
    if (!value) return;
    this.buffer += new TextDecoder().decode(value);
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length > 0) this.events?.onFrame(line);
      newline = this.buffer.indexOf("\n");
    }
  };
}

/** Shared singleton so every screen observes the same physical link. */
export const bluetoothTransport = new BluetoothTransport();
