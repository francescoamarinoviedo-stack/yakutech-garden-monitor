import type { Timestamp } from "@/backend";

/** Convert a Motoko nanosecond timestamp into a JS Date, or null when invalid. */
export function timestampToDate(timestamp: Timestamp): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a backend timestamp as a local time string (HH:MM:SS). */
export function formatTime(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Format a backend timestamp as a local date + time string. */
export function formatDateTime(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a backend timestamp as a short local date string. */
export function formatDate(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Relative "hace X" label for a backend timestamp. */
export function formatRelative(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "sin datos";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "ahora mismo";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

/** Format a duration in seconds as a compact human string. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}
