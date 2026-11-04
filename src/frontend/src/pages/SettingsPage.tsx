import { IrrigationMode } from "@/backend";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBluetooth } from "@/hooks/useBluetooth";
import {
  useIrrigationConfig,
  usePairedDevice,
  useSetIrrigationConfig,
} from "@/hooks/useQueries";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CircuitBoard,
  Download,
  Droplets,
  Loader2,
  Save,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";

const ARDUINO_SKETCH_URL = "/assets/arduino/monitoreg_arduino_uno.ino";
const ARDUINO_SKETCH_FILENAME = "monitoreg_arduino_uno.ino";

export default function SettingsPage() {
  const { connected, isConnecting, deviceName } = useBluetooth();
  const { data: paired } = usePairedDevice();
  const { data: config } = useIrrigationConfig();
  const setConfig = useSetIrrigationConfig();

  const [threshold, setThreshold] = useState("40");
  const [maxDuration, setMaxDuration] = useState("60");
  const [automatic, setAutomatic] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setThreshold(Number(config.moistureThreshold).toString());
    setMaxDuration(Number(config.maxDurationSeconds).toString());
    setAutomatic(config.mode === IrrigationMode.automatic);
  }, [config]);

  const save = () => {
    const thresholdValue = Number.parseInt(threshold, 10);
    const durationValue = Number.parseInt(maxDuration, 10);
    if (
      Number.isNaN(thresholdValue) ||
      thresholdValue < 0 ||
      thresholdValue > 100
    ) {
      setError("El umbral de humedad debe estar entre 0 y 100.");
      return;
    }
    if (
      Number.isNaN(durationValue) ||
      durationValue < 5 ||
      durationValue > 3600
    ) {
      setError("La duración máxima debe estar entre 5 y 3600 segundos.");
      return;
    }
    setError(null);
    setSaved(false);
    setConfig.mutate(
      {
        moistureThreshold: BigInt(thresholdValue),
        maxDurationSeconds: BigInt(durationValue),
        mode: automatic ? IrrigationMode.automatic : IrrigationMode.manual,
      },
      { onSuccess: () => setSaved(true) },
    );
  };

  const downloadSketch = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      const response = await fetch(ARDUINO_SKETCH_URL);
      if (!response.ok) throw new Error("No se pudo descargar el código.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = ARDUINO_SKETCH_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("No se pudo descargar el código. Inténtalo de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  const connectionLabel = isConnecting
    ? "Conectando…"
    : connected
      ? "Conectado"
      : "Sin conexión";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Ajusta el riego automático, descarga el firmware y revisa el estado del enlace Bluetooth."
      />

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="settings.irrigation_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Riego automático
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Modo automático
                </p>
                <p className="text-xs text-muted-foreground">
                  Riega cuando la humedad cae por debajo del umbral.
                </p>
              </div>
            </div>
            <Switch
              checked={automatic}
              data-ocid="settings.automatic_switch"
              onCheckedChange={setAutomatic}
              aria-label="Activar riego automático"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="threshold" className="flex items-center gap-2">
                <Droplets className="size-4 text-primary" aria-hidden="true" />
                Umbral de humedad (%)
              </Label>
              <Input
                id="threshold"
                data-ocid="settings.threshold_input"
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Timer className="size-4 text-primary" aria-hidden="true" />
                Duración máxima (segundos)
              </Label>
              <Input
                id="duration"
                data-ocid="settings.duration_input"
                type="number"
                min={5}
                max={3600}
                value={maxDuration}
                onChange={(event) => setMaxDuration(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Equivale a{" "}
                {formatDuration(Number.parseInt(maxDuration, 10) || 0)}.
              </p>
            </div>
          </div>

          {error && (
            <p
              className="text-sm text-destructive"
              data-ocid="settings.error_state"
            >
              {error}
            </p>
          )}
          {saved && !error && (
            <p
              className="text-sm text-primary"
              data-ocid="settings.success_state"
            >
              Configuración guardada.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {connected ? "Arduino conectado" : "Sin conexión Bluetooth"}
            </p>
            <Button
              type="button"
              className={cn("rounded-lg bg-gradient-primary shadow-subtle")}
              data-ocid="settings.save_button"
              disabled={setConfig.isPending}
              onClick={save}
            >
              <Save className="size-4" aria-hidden="true" />
              {setConfig.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="settings.bluetooth_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Estado de la conexión
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  connected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {connected ? (
                  <BluetoothConnected className="size-5" aria-hidden="true" />
                ) : (
                  <BluetoothOff className="size-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {connectionLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connected
                    ? (deviceName ?? paired?.name ?? "Arduino UNO")
                    : "Enlaza el Arduino desde la pantalla de conexión."}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              data-ocid="settings.connection_badge"
              className={cn(
                "rounded-full",
                connected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {isConnecting ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <Bluetooth className="size-3" aria-hidden="true" />
              )}
              {connectionLabel}
            </Badge>
          </div>

          <div
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
            data-ocid="settings.paired_device"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Último dispositivo emparejado
              </p>
              {paired ? (
                <>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {paired.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {paired.address}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no has emparejado ningún dispositivo.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="settings.arduino_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Código de Arduino UNO
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6">
          <div className="flex items-start gap-3">
            <CircuitBoard
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              Descarga el firmware de referencia con el protocolo serie de
              comandos y respuestas. Cárgalo en tu Arduino UNO con el IDE de
              Arduino y conéctalo al módulo HC-05/HC-06.
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 font-mono text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="text-foreground">Comandos</dt>
              <dd>READ · PUMP:1 · VALVE:1 · STOP · THRESH:n · MAXDUR:n</dd>
            </div>
            <div>
              <dt className="text-foreground">Respuestas</dt>
              <dd>SOIL:n,TEMP:n,HUM:n</dd>
            </div>
          </dl>

          {downloadError && (
            <p
              className="text-sm text-destructive"
              data-ocid="settings.download_error_state"
            >
              {downloadError}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              data-ocid="settings.download_arduino_button"
              disabled={downloading}
              onClick={() => void downloadSketch()}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {downloading ? "Descargando…" : "Descargar código .ino"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="settings.about_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Acerca de Monitoreg
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-6 text-sm text-muted-foreground">
          <p>
            Monitoreg controla un jardín vertical con Arduino UNO y módulo
            HC-05/HC-06, midiendo humedad del suelo, temperatura y humedad
            ambiental.
          </p>
          <p>
            Las alertas se muestran dentro de la app. No se envían
            notificaciones push nativas del sistema operativo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
