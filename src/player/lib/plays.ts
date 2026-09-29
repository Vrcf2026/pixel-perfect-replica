/** Registo de exibições: agrega em memória e envia em lotes (player_log_plays). */
type Agg = {
  key: string;
  item_id?: string;
  playlist_id?: string;
  label?: string;
  kind?: string;
  day: string;
  plays: number;
  seconds: number;
};

const buf = new Map<string, Agg>();
let enabled = false;

export function setPlayLogging(on: boolean) {
  enabled = on;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function logPlay(e: {
  key: string;
  item_id?: string | undefined;
  playlist_id?: string | undefined;
  label?: string | undefined;
  kind?: string | undefined;
  seconds: number;
}) {
  if (!enabled || !e.key) return;
  const day = today();
  const k = `${e.key}|${day}`;
  const cur = buf.get(k);
  if (cur) {
    cur.plays += 1;
    cur.seconds += Math.round(e.seconds);
    if (e.label) cur.label = e.label;
  } else {
    buf.set(k, {
      key: e.key,
      day,
      plays: 1,
      seconds: Math.round(e.seconds),
      ...(e.item_id ? { item_id: e.item_id } : {}),
      ...(e.playlist_id ? { playlist_id: e.playlist_id } : {}),
      ...(e.label ? { label: e.label.slice(0, 120) } : {}),
      ...(e.kind ? { kind: e.kind } : {}),
    });
  }
}

/** Tira o conteúdo do buffer para enviar; devolve-o se o envio falhar. */
export function takePlays(): Agg[] {
  const list = [...buf.values()];
  buf.clear();
  return list;
}

export function restorePlays(list: Agg[]) {
  for (const a of list) {
    const k = `${a.key}|${a.day}`;
    const cur = buf.get(k);
    if (cur) {
      cur.plays += a.plays;
      cur.seconds += a.seconds;
    } else buf.set(k, a);
  }
}
