import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBluetooth } from "@/hooks/useBluetooth";
import { usePairedDevice } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Loader2,
  Radio,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Known-device enumeration                                            */
/* ------------------------------------------------------------------ */

interface KnownDevice {
  id: string;
  name: string;
}

interface BluetoothWithDevices {
  getDevices?: () => Promise<Array<{ id: string; name?: string }>>;
}

/**
 * Enumerate devices the browser already remembers (previously granted).
 * New discovery still goes through the native picker in `connect()`.
 */
async function listKnownDevices(): Promise<KnownDevice[]> {
  if (typeof navigator === "undefined") return [];
  const api = (navigator as Navigator & { bluetooth?: BluetoothWithDevices })
    .bluetooth;
  if (!api?.getDevices) return [];
  try {
    const devices = await api.getDevices();
    return devices.map((device) => ({
      id: device.id,
      name: device.name ?? "Dispositivo sin nombre",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BluetoothPage() {
  const {
    supported,
    connected,
    deviceName,
    isConnecting,
    error,
    connect,
    disconnect,
    clearError,
  } = useBluetooth();
  const { data: paired } = usePairedDevice();

  const [devices, setDevices] = useState<KnownDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lostNotice, setLostNotice] = useState(false);
  const wasConnected = useRef(false);

  const refreshDevices = useCallback(async () => {
    setIsScanning(true);
    const found = await listKnownDevices();
    setDevices(found);
    setIsScanning(false);
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  // Merge the backend-remembered device into the list so it is always selectable.
  useEffect(() => {
    if (!paired) return;
    setDevices((current) => {
      if (current.some((device) => device.id === paired.address))
        return current;
      return [{ id: paired.address, name: paired.name }, ...current];
    });
  }, [paired]);

  // Detect a dropped link and surface a clear notice with a reconnect path.
  useEffect(() => {
    if (connected) {
      wasConnected.current = true;
      setLostNotice(false);
      return;
    }
    if (wasConnected.current && !isConnecting) {
      setLostNotice(true);
    }
  }, [connected, isConnecting]);

  const handleSearch = async () => {
    clearError();
    setLostNotice(false);
    await connect();
    await refreshDevices();
  };

  const handleReconnect = async () => {
    clearError();
    setLostNotice(false);
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
    setLostNotice(false);
  };

  const statusLabel = isConnecting
    ? "Conectando…"
    : connected
      ? "Conectado"
      : lostNotice
        ? "Comunicación perdida"
        : "Desconectado";

  const statusTone = isConnecting
    ? "border-accent/40 bg-accent/10 text-accent"
    : connected
      ? "border-primary/40 bg-primary/10 text-primary"
      : lostNotice
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conexión Bluetooth"
        description="Enlaza el Arduino UNO con su módulo HC-05/HC-06 para recibir datos del jardín."
      />

      {/* Connection status */}
      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="bluetooth.status_card"
      >
        <CardContent className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <span
            className={cn(
              "relative flex size-20 items-center justify-center rounded-full",
              connected
                ? "bg-primary/10 text-primary"
                : lostNotice
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {connected && (
              <span
                aria-hidden="true"
                className="absolute inline-flex size-20 rounded-full bg-primary/20 animate-pulse-ring motion-reduce:animate-none"
              />
            )}
            {connected ? (
              <BluetoothConnected
                className="relative size-9"
                aria-hidden="true"
              />
            ) : lostNotice ? (
              <TriangleAlert className="relative size-9" aria-hidden="true" />
            ) : (
              <BluetoothOff className="relative size-9" aria-hidden="true" />
            )}
          </span>

          <div className="flex flex-col items-center gap-2">
            <Badge
              variant="outline"
              className={cn("rounded-full px-3 py-1", statusTone)}
              data-ocid="bluetooth.status_badge"
            >
              {statusLabel}
            </Badge>
            <p className="font-display text-xl font-bold text-foreground">
              {connected
                ? (deviceName ?? paired?.name ?? "Arduino UNO")
                : "Sin conexión"}
            </p>
            <p className="text-sm text-muted-foreground">
              {connected
                ? "Recibiendo mediciones del jardín."
                : paired
                  ? `Último dispositivo: ${paired.name}`
                  : "Aún no has emparejado ningún dispositivo"}
            </p>
          </div>

          {!supported && (
            <p
              className="text-sm text-destructive"
              data-ocid="bluetooth.unsupported_state"
            >
              Este navegador no soporta Bluetooth Web. Usa Chrome en Android o
              escritorio.
            </p>
          )}

          {lostNotice && !connected && (
            <div
              className="flex flex-col items-center gap-2"
              data-ocid="bluetooth.lost_state"
            >
              <p className="text-sm text-destructive">
                Se perdió la comunicación con el Arduino. Intenta reconectar.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                data-ocid="bluetooth.reconnect_button"
                disabled={!supported || isConnecting}
                onClick={() => void handleReconnect()}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reconectar
              </Button>
            </div>
          )}

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="bluetooth.error_state"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {connected ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="rounded-lg"
                data-ocid="bluetooth.disconnect_button"
                onClick={handleDisconnect}
              >
                Desconectar
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="rounded-lg bg-gradient-primary shadow-subtle"
                data-ocid="bluetooth.connect_button"
                disabled={!supported || isConnecting}
                onClick={() => void handleSearch()}
              >
                {isConnecting ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    Conectando…
                  </>
                ) : (
                  <>
                    <Bluetooth className="size-4" aria-hidden="true" />
                    Buscar y conectar
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nearby / known devices */}
      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="bluetooth.devices_card"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="font-display text-base">
            Dispositivos cercanos
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg"
            data-ocid="bluetooth.refresh_button"
            disabled={!supported || isScanning}
            onClick={() => void refreshDevices()}
          >
            <RefreshCw
              className={cn("size-4", isScanning && "animate-spin")}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="px-6">
          {devices.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 py-8 text-center"
              data-ocid="bluetooth.devices_empty_state"
            >
              <Radio
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                No hay dispositivos recordados. Pulsa «Buscar y conectar» para
                descubrir tu HC-05/HC-06.
              </p>
            </div>
          ) : (
            <ul
              className="flex flex-col gap-2"
              data-ocid="bluetooth.devices_list"
            >
              {devices.map((device, index) => {
                const selected = selectedId === device.id;
                const isPaired = paired?.address === device.id;
                return (
                  <li key={device.id}>
                    <button
                      type="button"
                      data-ocid={`bluetooth.device.${index + 1}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedId(device.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-smooth",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            selected
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Bluetooth className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {device.name}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {device.id}
                          </span>
                        </span>
                      </span>
                      {isPaired && (
                        <Badge
                          variant="outline"
                          className="shrink-0 rounded-full border-primary/40 bg-primary/10 text-primary"
                        >
                          Guardado
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pairing guide */}
      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="bluetooth.info_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Cómo emparejar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-6 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Radio
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              Enciende el Arduino y asegúrate de que el LED del módulo
              HC-05/HC-06 parpadee.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Bluetooth
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              Pulsa «Buscar y conectar» y elige el dispositivo en el diálogo del
              navegador.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BluetoothConnected
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>
              Al conectar, las mediciones empezarán a llegar automáticamente a
              Monitoreo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
