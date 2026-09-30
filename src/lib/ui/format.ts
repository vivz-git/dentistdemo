import { formatInZone } from "@/lib/time";

export function relativeTime(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  let out: string;
  if (s < 45) out = "just now";
  else if (s < 3600) out = `${Math.round(s / 60)} min`;
  else if (s < 86400) out = `${Math.round(s / 3600)} h`;
  else if (s < 86400 * 45) out = `${Math.round(s / 86400)} d`;
  else out = `${Math.round(s / (86400 * 30))} mo`;
  if (out === "just now") return out;
  return future ? `in ${out}` : `${out} ago`;
}

export const clock = (iso: string, tz: string) => formatInZone(iso, tz, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
export const shortDate = (iso: string, tz: string) => formatInZone(iso, tz, { day: "numeric", month: "short" });
export const dayTime = (iso: string, tz: string) => formatInZone(iso, tz, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export function formatDuration(seconds?: number): string {
  if (seconds === undefined) return "No reply yet";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} sec`;
  return `${(seconds / 3600).toFixed(1)} h`;
}
