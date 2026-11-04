import type { Alert, HistoryPoint, IrrigationEvent } from "@/backend";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAcknowledgeAlert,
  useAlerts,
  useHistory,
  useIrrigationEvents,
} from "@/hooks/useQueries";
import { formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  Check,
  CloudOff,
  Droplets,
  Info,
  Thermometer,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const HISTORY_LIMIT = 100n;
const CACHE_KEY = "monitoreg.history.cache.v1";

interface HistoryCache {
  history: HistoryPoint[];
  events: IrrigationEvent[];
  alerts: Alert[];
  savedAt: number;
}

/**
 * Backend numeric fields (timestamps, ids, sensor readings) arrive as bigint,
 * which JSON.stringify cannot serialize. Encode them as tagged strings so the
 * snapshot survives a round-trip through localStorage.
 */
function serializeCache(snapshot: HistoryCache): string {
  return JSON.stringify(snapshot, (_key, value) =>
    typeof value === "bigint" ? { __bigint__: value.toString() } : value,
  );
}

/** Restore bigint fields encoded by serializeCache back into bigint values. */
function reviveCache(raw: string): HistoryCache {
  return JSON.parse(raw, (_key, value) => {
    if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as { __bigint__?: unknown }).__bigint__ === "string"
    ) {
      return BigInt((value as { __bigint__: string }).__bigint__);
    }
    return value;
  }) as HistoryCache;
}

/**
 * Persist the last successful history snapshot so it stays readable offline.
 * The backend remains the source of truth; this is a read-only fallback.
 */
function useOfflineCache(
  history: HistoryPoint[] | undefined,
  events: IrrigationEvent[] | undefined,
  alerts: Alert[] | undefined,
) {
  const [cached, setCached] = useState<HistoryCache | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) setCached(reviveCache(raw));
    } catch {
      // A corrupt cache is ignored; the backend snapshot replaces it.
    }
  }, []);

  useEffect(() => {
    if (!history || !events || !alerts) return;
    if (history.length === 0 && events.length === 0 && alerts.length === 0) {
      return;
    }
    const snapshot: HistoryCache = {
      history,
      events,
      alerts,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(CACHE_KEY, serializeCache(snapshot));
      setCached(snapshot);
    } catch {
      // Storage may be unavailable (private mode); the live data still shows.
    }
  }, [history, events, alerts]);

  return cached;
}

const SEVERITY_META: Record<
  string,
  { className: string; icon: typeof Info; label: string }
> = {
  critical: {
    className: "border-destructive/50 bg-destructive/10 text-destructive",
    icon: AlertTriangle,
    label: "Crítica",
  },
  warning: {
    className: "border-accent/50 bg-accent/10 text-accent",
    icon: AlertTriangle,
    label: "Advertencia",
  },
  info: {
    className: "border-primary/50 bg-primary/10 text-primary",
    icon: Info,
    label: "Información",
  },
};

const OUTCOME_LABEL: Record<string, string> = {
  completed: "Completado",
  stoppedManually: "Detenido",
  maxDurationReached: "Duración máxima",
  connectionLost: "Conexión perdida",
  emergencyStop: "Emergencia",
  blocked: "Bloqueado",
};

const CAUSE_LABEL: Record<string, string> = {
  automatic: "Automático",
  manual: "Manual",
  emergency: "Emergencia",
};

function EmptyState({ ocid, message }: { ocid: string; message: string }) {
  return (
    <p
      className="py-10 text-center text-sm text-muted-foreground"
      data-ocid={ocid}
    >
      {message}
    </p>
  );
}

export default function HistoryPage() {
  const { data: history, isLoading: historyLoading } =
    useHistory(HISTORY_LIMIT);
  const { data: events, isLoading: eventsLoading } = useIrrigationEvents();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const acknowledge = useAcknowledgeAlert();

  const cached = useOfflineCache(history, events, alerts);

  const liveEmpty =
    (history?.length ?? 0) === 0 &&
    (events?.length ?? 0) === 0 &&
    (alerts?.length ?? 0) === 0;
  const usingCache = liveEmpty && cached !== null;

  const historyData = usingCache ? cached.history : (history ?? []);
  const eventData = usingCache ? cached.events : (events ?? []);
  const alertData = usingCache ? cached.alerts : (alerts ?? []);

  const chartData = historyData.map((point) => ({
    time: formatTime(point.recordedAt),
    soil: point.soilMoisture !== undefined ? Number(point.soilMoisture) : null,
    temperature:
      point.temperature !== undefined ? Number(point.temperature) : null,
  }));

  const pendingAlerts = alertData.filter((alert) => !alert.acknowledged).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historial"
        description="Mediciones, eventos de riego y alertas guardados para consultarlos sin conexión."
      />

      {usingCache && (
        <div
          className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent"
          data-ocid="history.offline_banner"
        >
          <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Sin conexión al backend. Mostrando la última copia guardada
            {cached
              ? ` (${formatDateTime(BigInt(cached.savedAt * 1_000_000))})`
              : ""}
            .
          </span>
        </div>
      )}

      <Tabs defaultValue="charts" data-ocid="history.tabs">
        <TabsList className="grid w-full grid-cols-4 rounded-lg">
          <TabsTrigger value="charts" data-ocid="history.tab.charts">
            Gráficos
          </TabsTrigger>
          <TabsTrigger
            value="measurements"
            data-ocid="history.tab.measurements"
          >
            Mediciones
          </TabsTrigger>
          <TabsTrigger value="irrigation" data-ocid="history.tab.irrigation">
            Riego
          </TabsTrigger>
          <TabsTrigger value="alerts" data-ocid="history.tab.alerts">
            Alertas
            {pendingAlerts > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {pendingAlerts}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-4">
          <Card
            className="rounded-lg shadow-subtle"
            data-ocid="history.chart_card"
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">
                Humedad y temperatura en el tiempo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {historyLoading && historyData.length === 0 ? (
                <Skeleton
                  className="mx-4 h-64 rounded-lg"
                  data-ocid="history.chart_loading_state"
                />
              ) : chartData.length === 0 ? (
                <EmptyState
                  ocid="history.chart_empty_state"
                  message="Aún no hay mediciones registradas para graficar."
                />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="historySoilFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
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
                        <linearGradient
                          id="historyTempFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
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
                        fill="url(#historySoilFill)"
                        strokeWidth={2}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        name="Temperatura"
                        stroke="oklch(var(--chart-3))"
                        fill="url(#historyTempFill)"
                        strokeWidth={2}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="mt-4">
          <Card className="rounded-lg shadow-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">
                Mediciones registradas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              {historyLoading && historyData.length === 0 ? (
                <Skeleton
                  className="my-4 h-32 rounded-lg"
                  data-ocid="history.measurements_loading_state"
                />
              ) : historyData.length === 0 ? (
                <EmptyState
                  ocid="history.measurements_empty_state"
                  message="Sin mediciones todavía."
                />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {historyData.map((point, index) => (
                    <div
                      key={`${point.recordedAt.toString()}-${index}`}
                      className="flex items-center justify-between gap-3 py-3"
                      data-ocid={`history.measurement_row.${index + 1}`}
                    >
                      <span className="sensor-readout text-xs text-muted-foreground">
                        {formatDateTime(point.recordedAt)}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="sensor-readout flex items-center gap-1.5 text-sm text-foreground">
                          <Droplets
                            className="size-3.5 text-primary"
                            aria-hidden="true"
                          />
                          {point.soilMoisture !== undefined
                            ? `${Number(point.soilMoisture)}%`
                            : "—"}
                        </span>
                        <span className="sensor-readout flex items-center gap-1.5 text-sm text-foreground">
                          <Thermometer
                            className="size-3.5 text-accent"
                            aria-hidden="true"
                          />
                          {point.temperature !== undefined
                            ? `${Number(point.temperature)}°C`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="irrigation" className="mt-4">
          <Card className="rounded-lg shadow-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">
                Eventos de riego
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              {eventsLoading && eventData.length === 0 ? (
                <Skeleton
                  className="my-4 h-32 rounded-lg"
                  data-ocid="history.irrigation_loading_state"
                />
              ) : eventData.length === 0 ? (
                <EmptyState
                  ocid="history.irrigation_empty_state"
                  message="Sin eventos de riego todavía."
                />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {eventData.map((event, index) => (
                    <div
                      key={event.id.toString()}
                      className="flex items-center justify-between gap-3 py-3"
                      data-ocid={`history.irrigation_row.${index + 1}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {CAUSE_LABEL[event.cause] ?? event.cause}
                        </p>
                        <p className="sensor-readout text-xs text-muted-foreground">
                          {formatDateTime(event.startedAt)}
                          {event.endedAt !== undefined &&
                            ` · ${formatTime(event.endedAt)}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-border text-xs"
                      >
                        {OUTCOME_LABEL[event.outcome] ?? event.outcome}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card className="rounded-lg shadow-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Alertas</CardTitle>
            </CardHeader>
            <CardContent className="px-6">
              {alertsLoading && alertData.length === 0 ? (
                <Skeleton
                  className="my-4 h-32 rounded-lg"
                  data-ocid="history.alerts_loading_state"
                />
              ) : alertData.length === 0 ? (
                <EmptyState
                  ocid="history.alerts_empty_state"
                  message="Sin alertas registradas."
                />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {alertData.map((alert, index) => {
                    const meta =
                      SEVERITY_META[alert.severity] ?? SEVERITY_META.info;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={alert.id.toString()}
                        className="flex items-start justify-between gap-3 py-3"
                        data-ocid={`history.alert_row.${index + 1}`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Icon
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              meta.className.split(" ").pop(),
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">
                              {alert.message}
                            </p>
                            <p className="sensor-readout text-xs text-muted-foreground">
                              {formatDateTime(alert.createdAt)} · {meta.label}
                            </p>
                          </div>
                        </div>
                        {alert.acknowledged ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 rounded-full border-border text-xs text-muted-foreground"
                            data-ocid={`history.alert_acknowledged.${index + 1}`}
                          >
                            Vista
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0 rounded-full"
                            disabled={acknowledge.isPending}
                            onClick={() => acknowledge.mutate(alert.id)}
                            data-ocid={`history.alert_acknowledge_button.${index + 1}`}
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                            Reconocer
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bell className="size-3.5" aria-hidden="true" />
        El historial se guarda localmente y queda disponible sin conexión a
        Internet.
      </p>
    </div>
  );
}
