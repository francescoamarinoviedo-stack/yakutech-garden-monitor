import {
  useConnectionStatus,
  useDisconnectBluetooth,
  useParseSerialFrame,
  useRecordMeasurement,
  useReportConnectionLost,
  useSetPairedDevice,
} from "@/hooks/useQueries";
import { bluetoothTransport, isBluetoothSupported } from "@/lib/bluetooth";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface BluetoothContextValue {
  supported: boolean;
  connected: boolean;
  deviceName: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (command: string) => Promise<void>;
  clearError: () => void;
}

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

/**
 * Owns the physical Bluetooth link and mirrors its state into the backend.
 * Every screen reads the same connection through `useBluetooth()`.
 */
export function BluetoothProvider({ children }: { children: ReactNode }) {
  const { data: status } = useConnectionStatus();
  const setPairedDevice = useSetPairedDevice();
  const disconnectBluetooth = useDisconnectBluetooth();
  const reportConnectionLost = useReportConnectionLost();
  const parseFrame = useParseSerialFrame();
  const recordMeasurement = useRecordMeasurement();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const parseRef = useRef(parseFrame.mutateAsync);
  const recordRef = useRef(recordMeasurement.mutateAsync);
  const lostRef = useRef(reportConnectionLost.mutateAsync);
  parseRef.current = parseFrame.mutateAsync;
  recordRef.current = recordMeasurement.mutateAsync;
  lostRef.current = reportConnectionLost.mutateAsync;

  const handleFrame = useCallback(async (raw: string) => {
    try {
      const result = await parseRef.current(raw);
      if (result.__kind__ === "ok") {
        await recordRef.current(result.ok);
      }
    } catch {
      // A malformed frame is ignored; the next valid frame still records.
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setDeviceName(null);
    void lostRef.current().catch(() => undefined);
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const device = await bluetoothTransport.requestAndConnect({
        onFrame: (raw) => void handleFrame(raw),
        onDisconnect: handleDisconnect,
      });
      setDeviceName(device.name);
      await setPairedDevice.mutateAsync({
        name: device.name,
        address: device.id,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el dispositivo.";
      setError(message);
      setDeviceName(null);
    } finally {
      setIsConnecting(false);
    }
  }, [handleFrame, handleDisconnect, setPairedDevice]);

  const disconnect = useCallback(() => {
    bluetoothTransport.disconnect();
    setDeviceName(null);
    disconnectBluetooth.mutate();
  }, [disconnectBluetooth]);

  const sendCommand = useCallback(async (command: string) => {
    await bluetoothTransport.send(command);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      bluetoothTransport.disconnect();
    };
  }, []);

  const value = useMemo<BluetoothContextValue>(
    () => ({
      supported: isBluetoothSupported(),
      connected: status === "connected",
      deviceName,
      isConnecting,
      error,
      connect,
      disconnect,
      sendCommand,
      clearError,
    }),
    [
      status,
      deviceName,
      isConnecting,
      error,
      connect,
      disconnect,
      sendCommand,
      clearError,
    ],
  );

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth(): BluetoothContextValue {
  const context = useContext(BluetoothContext);
  if (!context)
    throw new Error("useBluetooth debe usarse dentro de BluetoothProvider");
  return context;
}
