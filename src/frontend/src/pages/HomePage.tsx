import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBluetooth } from "@/hooks/useBluetooth";
import {
  useActiveActuator,
  useAlerts,
  useEmergencyStopIrrigation,
  useLatestMeasurement,
  usePlants,
} from "@/hooks/useQueries";
import { formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Droplets,
  Leaf,
  Thermometer,
  Waves,
} from "lucide-react";

function DonutGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-24 -rotate-90"
      role="img"
      aria-label={`Humedad ${clamped}%`}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="10"
        className="stroke-muted"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="stroke-primary transition-smooth"
      />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Thermometer;
  tone: "accent" | "muted";
}) {
  return (
    <Card
      className={cn(
        "gap-2 rounded-lg py-4 shadow-subtle",
        tone === "accent" ? "border-accent/30 bg-accent/5" : "",
      )}
    >
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon
            className={cn(
              "size-4",
              tone === "accent" ? "text-accent" : "text-primary",
            )}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
        <p className="sensor-readout text-2xl font-bold text-foreground">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { connected } = useBluetooth();
  const { data: measurement } = useLatestMeasurement();
  const { data: plants } = usePlants();
  const { data: alerts } = useAlerts();
  const { data: actuator } = useActiveActuator();
  const emergencyStop = useEmergencyStopIrrigation();

  const soil =
    measurement?.soilMoisture !== undefined
      ? Number(measurement.soilMoisture)
      : null;
  const temperature =
    measurement?.temperature !== undefined
      ? Number(measurement.temperature)
      : null;
  const humidity =
    measurement?.ambientHumidity !== undefined
      ? Number(measurement.ambientHumidity)
      : null;
  const activeAlerts = (alerts ?? []).filter((alert) => !alert.acknowledged);
  const thirsty = (plants ?? []).filter(
    (plant) => plant.status === "needsWater",
  ).length;
  const irrigating = actuator !== undefined && actuator !== "none";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Panel de control"
        description="Estado en vivo de tu jardín vertical conectado por Bluetooth."
      />

      {!connected && (
        <Card
          className="rounded-lg border-accent/40 bg-accent/5 shadow-subtle"
          data-ocid="home.offline_notice"
        >
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className="size-5 text-accent"
                aria-hidden="true"
              />
              <p className="text-sm text-foreground">
                Sin conexión Bluetooth. Las mediciones se muestran solo cuando
                el Arduino está enlazado.
              </p>
            </div>
            <Button asChild size="sm" className="rounded-lg">
              <Link to="/bluetooth" data-ocid="home.connect_button">
                Conectar dispositivo
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card
        className="animate-fade-in-up rounded-lg shadow-elevated"
        data-ocid="home.moisture_card"
      >
        <CardContent className="flex items-center justify-between gap-4 px-5 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Humedad del suelo
            </p>
            <p className="sensor-readout mt-2 text-5xl font-bold text-foreground">
              {soil !== null ? `${soil}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {measurement
                ? `Actualizado ${formatRelative(measurement.recordedAt)}`
                : "Sin mediciones"}
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <DonutGauge value={soil ?? 0} />
            <span className="sensor-readout absolute text-lg font-bold text-primary">
              {soil !== null ? `${soil}%` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <MetricCard
          label="Temperatura"
          value={temperature !== null ? `${temperature}` : "—"}
          unit="°C"
          icon={Thermometer}
          tone="accent"
        />
        <MetricCard
          label="Humedad amb."
          value={humidity !== null ? `${humidity}` : "—"}
          unit="%"
          icon={Waves}
          tone="accent"
        />
        <MetricCard
          label="Última act."
          value={measurement ? formatTime(measurement.recordedAt) : "—"}
          icon={Droplets}
          tone="muted"
        />
      </div>

      <Card
        className="animate-fade-in-up rounded-lg shadow-subtle"
        data-ocid="home.health_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Estado de las plantas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {plants && plants.length > 0
                  ? `${plants.length} plantas registradas`
                  : "Sin plantas"}
              </p>
              <p className="text-xs text-muted-foreground">
                {thirsty > 0
                  ? `${thirsty} necesitan agua`
                  : "Todas en buen estado"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-1",
              thirsty > 0
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-primary/50 bg-primary/10 text-primary",
            )}
          >
            {thirsty > 0 ? "Requiere atención" : "Saludable"}
          </Badge>
        </CardContent>
      </Card>

      <Card
        className="animate-fade-in-up rounded-lg shadow-subtle"
        data-ocid="home.irrigation_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Control de riego
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="flex-1 rounded-lg bg-gradient-primary shadow-subtle"
            >
              <Link to="/riego" data-ocid="home.irrigate_button">
                Ir a riego
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1 rounded-lg"
            >
              <Link to="/monitoreo" data-ocid="home.monitoring_button">
                Ver monitoreo
              </Link>
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="rounded-lg"
            data-ocid="home.emergency_stop_button"
            disabled={!irrigating || emergencyStop.isPending}
            onClick={() => emergencyStop.mutate()}
          >
            Parada de emergencia
          </Button>
        </CardContent>
      </Card>

      {activeAlerts.length > 0 && (
        <Card
          className="rounded-lg border-destructive/30 shadow-subtle"
          data-ocid="home.alerts_card"
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">
              Alertas activas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-6">
            {activeAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id.toString()}
                className="flex items-start gap-2 text-sm"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span className="text-foreground">{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
