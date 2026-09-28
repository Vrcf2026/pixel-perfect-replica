import type { PlayerItem } from "./types";

/** Data, hora e dia da semana (1 = segunda … 7 = domingo) num fuso horário. */
export function nowIn(tz: string, d = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(d);
  } catch {
    return nowIn("Europe/Lisbon", d);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
    isoDow: wd || 1,
  };
}

const hms = (t: string) => (t.length === 5 ? `${t}:00` : t.slice(0, 8));

/** O item deve passar agora? (datas, dias da semana e horas no fuso do ecrã) */
export function isItemActive(item: PlayerItem, tz: string, d = new Date()) {
  const n = nowIn(tz, d);
  if (item.date_from && n.date < item.date_from) return false;
  if (item.date_to && n.date > item.date_to) return false;
  if (item.days && item.days.length && !item.days.includes(n.isoDow)) return false;
  if (item.time_from && item.time_to) {
    const from = hms(item.time_from);
    const to = hms(item.time_to);
    if (from <= to) {
      if (n.time < from || n.time >= to) return false;
    } else if (n.time < from && n.time >= to) return false; // atravessa a meia-noite
  } else if (item.time_from && n.time < hms(item.time_from)) return false;
  else if (item.time_to && n.time >= hms(item.time_to)) return false;
  return true;
}
