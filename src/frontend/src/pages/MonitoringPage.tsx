import { PlantStatus, SensorPresence } from "@/backend";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBluetooth } from "@/hooks/useBluetooth";
import {
  useHistory,
  useLatestMeasurement,
  usePlantStatus,
  usePlants,
} from "@/hooks/useQueries";
import { formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Leaf,
  Thermometer,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const HISTORY_LIMIT = 60n;

const STATUS_META: Record<
  PlantStatus,
  { label: string; tone: string; icon: typeof CheckCircle2 }
> = {
  [PlantStatus.healthy]: {
    label: "Saludable",
    tone: "border-primary/40 bg-primary/10 text-primary",
    icon: CheckCircle2,
  },
  [PlantStatus.needsWater]: {
    label: "Necesita agua",
    tone: "border-accent/50 bg-accent/10 text-accent",
    icon: Droplets,
  },
  [PlantStatus.needsAttention]: {
    label: "Requiere atención",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: AlertTriangle,
  },
};

function SensorTile({
  label,
  value,
  unit,
  icon: Icon,
  present,
}: {
  label: string;
  value: string;
  unit: string;
  icon: typeof Thermometer;
  present: boolean;
}) {
  return (
    <Card className="gap-2 rounded-lg py-4 shadow-subtle">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4 text-primary" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {label}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2 py-0 text-[10px]",
              present
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {present ? "Activo" : "Ausente"}
          </Badge>
        </div>
        <p className="sensor-readout text-2xl font-bold text-foreground">
          {present ? value : "—"}
          {present && (
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function PlantStatusRow({
  name,
  species,
  status,
  index,
}: {
  name: string;
  species: string;
  status: PlantStatus;
  index: number;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <li
      data-ocid={`monitoring.plant.item.${index}`}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Leaf className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{species}</p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          meta.tone,
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        {meta.label}
      </Badge>
    </li>
  );
}

function PlantStatusItem({
  plantId,
  name,
  species,
  index,
}: {
  plantId: bigint;
  name: string;
  species: string;
  index: number;
}) {
  const { data: status } = usePlantStatus(plantId);
  return (
    <PlantStatusRow
      name={name}
      species={species}
      status={status ?? PlantStatus.healthy}
      index={index}
    />
  );
}

export default function MonitoringPage() {
  const { connected } = useBluetooth();
  const { data: measurement, isLoading } = useLatestMeasurement();
  const { data: history } = useHistory(HISTORY_LIMIT);
  const { data: plants, isLoading: plantsLoading } = usePlants();

  const soilPresent = measurement?.soilPresence === SensorPresence.present;
  const tempPresent =
    measurement?.temperaturePresence === SensorPresence.present;
  const humidityPresent =
    measurement?.ambientHumidityPresence === SensorPresence.present;

  const chartData = (history ?? []).map((point) => ({
    time: formatTime(point.recordedAt),
    soil: point.soilMoisture !== undefined ? Number(point.soilMoisture) : null,
    temperature:
      point.temperature !== undefined ? Number(point.temperature) : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monitoreo"
        description="Lecturas en tiempo real de los sensores del jardín."
      />

      {!connected && (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
          data-ocid="monitoring.offline_state"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p className="text-sm text-foreground">
            Sin conexión Bluetooth: no se muestran mediciones ficticias. Conecta
            el Arduino para ver datos reales.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((id) => (
            <Skeleton key={id} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SensorTile
            label="Humedad suelo"
            value={
              measurement?.soilMoisture !== undefined
                ? `${Number(measurement.soilMoisture)}`
                : "—"
            }
            unit="%"
            icon={Droplets}
            present={soilPresent}
          />
          <SensorTile
            label="Temperatura"
            value={
              measurement?.temperature !== undefined
                ? `${Number(measurement.temperature)}`
                : "—"
            }
            unit="°C"
            icon={Thermometer}
            present={tempPresent}
          />
          <SensorTile
            label="Humedad amb."
            value={
              measurement?.ambientHumidity !== undefined
                ? `${Number(measurement.ambientHumidity)}`
                : "—"
            }
            unit="%"
            icon={Waves}
            present={humidityPresent}
          />
        </div>
      )}

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="monitoring.last_update_card"
      >
        <CardContent className="flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Última actualización
              </p>
              <p className="sensor-readout text-sm font-semibold text-foreground">
                {measurement ? formatTime(measurement.recordedAt) : "—"}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {measurement ? formatRelative(measurement.recordedAt) : "sin datos"}
          </span>
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="monitoring.plants_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Estado de las plantas
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {plantsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }, (_, i) => `plant-skeleton-${i}`).map(
                (id) => (
                  <Skeleton key={id} className="h-16 rounded-lg" />
                ),
              )}
            </div>
          ) : !plants || plants.length === 0 ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-ocid="monitoring.plants_empty_state"
            >
              Aún no has registrado plantas. Añádelas en la sección Plantas para
              ver su estado aquí.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {plants.map((plant, index) => (
                <PlantStatusItem
                  key={plant.id.toString()}
                  plantId={plant.id}
                  name={plant.name}
                  species={plant.species}
                  index={index + 1}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card
        className="rounded-lg shadow-subtle"
        data-ocid="monitoring.chart_card"
      >
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">
            Humedad y temperatura
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {chartData.length === 0 ? (
            <p
              className="px-4 py-10 text-center text-sm text-muted-foreground"
              data-ocid="monitoring.chart_empty_state"
            >
              Aún no hay mediciones registradas. Conecta el Arduino para empezar
              a graficar.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="soilFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="oklch(var(--chart-1))"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="oklch(var(--chart-3))"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(var(--chart-3))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(var(--popover))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="soil"
                    name="Humedad suelo"
                    stroke="oklch(var(--chart-1))"
                    fill="url(#soilFill)"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    name="Temperatura"
                    stroke="oklch(var(--chart-3))"
                    fill="url(#tempFill)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
