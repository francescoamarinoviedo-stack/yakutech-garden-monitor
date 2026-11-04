import { Actuator, IrrigationMode } from "@/backend";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useBluetooth } from "@/hooks/useBluetooth";
import {
  useActiveActuator,
  useEmergencyStopIrrigation,
  useIrrigationConfig,
  useIrrigationEvents,
  useLatestMeasurement,
  useSetIrrigationConfig,
  useStartManualIrrigation,
  useStopIrrigation,
} from "@/hooks/useQueries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertOctagon,
  Droplets,
  Gauge,
  Power,
  ShieldCheck,
  Square,
  Timer,
  Waves,
  WifiOff,
} from "lucide-react";
import { useState } from "react";

const OUTCOME_LABEL: Record<string, string> = {
  completed: "Completado",
  stoppedManually: "Detenido manualmente",
  maxDurationReached: "Duración máxima",
  connectionLost: "Conexión perdida",
  emergencyStop: "Parada de emergencia",
  blocked: "Bloqueado",
};

const CAUSE_LABEL: Record<string, string> = {
  automatic: "Automático",
  manual: "Manual",
  emergency: "Emergencia",
};

const ACTUATOR_LABEL: Record<string, string> = {
  pump: "Bomba",
  valve: "Electroválvula",
  none: "Ninguno",
};

export default function IrrigationPage() {
  const { connected } = useBluetooth();
  const { data: config } = useIrrigationConfig();
  const { data: actuator } = useActiveActuator();
  const { data: events } = useIrrigationEvents();
  const { data: measurement } = useLatestMeasurement();
  const setConfig = useSetIrrigationConfig();
  const startManual = useStartManualIrrigation();
  const stop = useStopIrrigation();
  const emergencyStop = useEmergencyStopIrrigation();

  const [selectedActuator, setSelectedActuator] = useState<Actuator>(
    Actuator.pump,
  );

  const irrigating = actuator !== undefined && actuator !== "none";
  const busy =
    startManual.isPending || stop.isPending || emergencyStop.isPending;
  const automatic = config?.mode === IrrigationMode.automatic;

  const toggleMode = (next: boolean) => {
    if (!config) return;
    setConfig.mutate({
      moistureThreshold: config.moistureThreshold,
      maxDurationSeconds: config.maxDurationSeconds,
      mode: next ? IrrigationMode.automatic : IrrigationMode.manual,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Riego"
        description="Controla la bomba y la electroválvula, y revisa la configuración de riego."
      />

      {!connected && (
        <div
          className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3"
          data-ocid="irrigation.offline_state"
        >
          <WifiOff
            className="mt-0.5 size-5 shrink-0 text-accent"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Sin conexión Bluetooth
            </p>
            <p className="text-xs text-muted-foreground">
              No hay datos del Arduino. El riego manual y automático están
              deshabilitados hasta recuperar el enlace.
            </p>
          </div>
        </div>
      )}

      <Card
        className={cn(
          "rounded-lg shadow-elevated",
          irrigating ? "border-primary/40" : "",
        )}
        data-ocid="irrigation.control_card"
      >
        <CardContent className="flex flex-col gap-4 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl",
                  irrigating
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Droplets className="size-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-foreground">
                  {irrigating ? "Riego activo" : "Riego detenido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {actuator === "pump"
                    ? "Bomba en funcionamiento"
                    : actuator === "valve"
                      ? "Electroválvula abierta"
                      : "Ningún actuador activo"}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1",
                irrigating
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {irrigating ? "En marcha" : "Inactivo"}
            </Badge>
          </div>

          <div
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-2.5"
            data-ocid="irrigation.actuator_state"
          >
            <Gauge className="size-4 text-primary" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">
              Actuador activo:
            </span>
            <span className="text-sm font-semibold text-foreground">
              {ACTUATOR_LABEL[actuator ?? "none"]}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              Bomba y electroválvula nunca se activan a la vez
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Actuador para riego manual
            </p>
            <div className="flex flex-wrap gap-2">
              {[Actuator.pump, Actuator.valve].map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={selectedActuator === option ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-lg",
                    selectedActuator === option
                      ? "bg-gradient-primary shadow-subtle"
                      : "",
                  )}
                  data-ocid={`irrigation.actuator_option.${option}`}
                  disabled={busy}
                  onClick={() => setSelectedActuator(option)}
                >
                  {ACTUATOR_LABEL[option]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="flex-1 rounded-lg bg-gradient-primary shadow-subtle"
              data-ocid="irrigation.start_button"
              disabled={!connected || irrigating || busy}
              onClick={() => startManual.mutate(selectedActuator)}
            >
              <Power className="size-4" aria-hidden="true" />
              Activar riego manual
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="rounded-lg"
              data-ocid="irrigation.stop_button"
              disabled={!irrigating || busy}
              onClick={() => stop.mutate()}
            >
              <Square className="size-4" aria-hidden="true" />
              Detener
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="rounded-lg"
              data-ocid="irrigation.emergency_button"
              disabled={busy}
              onClick={() => emergencyStop.mutate()}
            >
              <AlertOctagon className="size-4" aria-hidden="true" />
              Emergencia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="irrigation.mode_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Modo de riego
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Riego automático por umbral
                </p>
                <p className="text-xs text-muted-foreground">
                  Riega cuando la humedad del suelo cae por debajo del umbral.
                </p>
              </div>
            </div>
            <Switch
              checked={automatic}
              data-ocid="irrigation.automatic_switch"
              disabled={!config || setConfig.isPending}
              onCheckedChange={toggleMode}
              aria-label="Activar riego automático por umbral"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Modo actual
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {config ? (automatic ? "Automático" : "Manual") : "Sin datos"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Umbral humedad
              </p>
              <p className="sensor-readout mt-1 text-sm font-semibold text-foreground">
                {config ? `${Number(config.moistureThreshold)}%` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Humedad actual
              </p>
              <p className="sensor-readout mt-1 text-sm font-semibold text-foreground">
                {connected && measurement?.soilMoisture !== undefined
                  ? `${Number(measurement.soilMoisture)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="irrigation.protection_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Protecciones activas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <Timer
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Corte por duración máxima
              </p>
              <p className="text-xs text-muted-foreground">
                El riego se detiene automáticamente al alcanzar{" "}
                {config
                  ? formatDuration(Number(config.maxDurationSeconds))
                  : "—"}
                .
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <WifiOff
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Detención por pérdida de conexión
              </p>
              <p className="text-xs text-muted-foreground">
                Si se pierde el enlace Bluetooth, el riego se detiene y se
                registra una alerta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="irrigation.events_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Eventos recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-6">
          {!events || events.length === 0 ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-ocid="irrigation.events_empty_state"
            >
              Todavía no se ha registrado ningún riego.
            </p>
          ) : (
            events.slice(0, 8).map((event) => (
              <div
                key={event.id.toString()}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Waves className="size-4 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {CAUSE_LABEL[event.cause] ?? event.cause}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {ACTUATOR_LABEL[event.actuator] ?? event.actuator}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.startedAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-border text-xs"
                >
                  {OUTCOME_LABEL[event.outcome] ?? event.outcome}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
