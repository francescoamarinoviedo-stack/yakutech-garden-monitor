import { useBluetooth } from "@/hooks/useBluetooth";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<
  string,
  { label: string; tone: string; dot: string }
> = {
  connected: {
    label: "Conectado",
    tone: "border-primary/40 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  connecting: {
    label: "Conectando",
    tone: "border-accent/40 bg-accent/10 text-accent",
    dot: "bg-accent",
  },
  lost: {
    label: "Sin conexión",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  disconnected: {
    label: "Desconectado",
    tone: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

/**
 * Live Bluetooth connection badge shown in the app header on every screen.
 * The pulsing ring makes the hardware link feel physical and immediate.
 */
export function ConnectionBadge({ className }: { className?: string }) {
  const { connected, isConnecting, deviceName } = useBluetooth();
  const key = isConnecting
    ? "connecting"
    : connected
      ? "connected"
      : "disconnected";
  const copy = STATUS_COPY[key];
  const live = connected || isConnecting;

  return (
    <div
      data-ocid="connection.badge"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        copy.tone,
        className,
      )}
      title={deviceName ?? "Sin dispositivo emparejado"}
    >
      <span className="relative flex size-2.5 items-center justify-center">
        {live && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inline-flex size-2.5 rounded-full opacity-70 animate-pulse-ring motion-reduce:animate-none",
              copy.dot,
            )}
          />
        )}
        <span
          className={cn("relative inline-flex size-2.5 rounded-full", copy.dot)}
        />
      </span>
      <span className="truncate">{copy.label}</span>
      {deviceName && (
        <span className="hidden max-w-24 truncate font-mono text-[10px] font-normal opacity-80 sm:inline">
          {deviceName}
        </span>
      )}
    </div>
  );
}
