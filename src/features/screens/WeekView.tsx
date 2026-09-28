import { DAYS, layoutColor } from "./shared";

export type ScheduleRow = {
  id: string;
  name: string | null;
  layout_id: string;
  days: number[];
  time_from: string | null;
  time_to: string | null;
  date_from: string | null;
  date_to: string | null;
  priority: number;
  enabled: boolean;
};

const toMin = (t: string | null, fallback: number) => {
  if (!t) return fallback;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Vista semanal: blocos por layout; o que fica vazio usa o layout por defeito. */
export function WeekView({
  schedules,
  layoutName,
  defaultLayoutName,
}: {
  schedules: ScheduleRow[];
  layoutName: (id: string) => string;
  defaultLayoutName: string | null;
}) {
  const blocks: Array<{ key: string; day: number; start: number; end: number; s: ScheduleRow }> =
    [];
  for (const s of schedules.filter((x) => x.enabled)) {
    const from = toMin(s.time_from, 0);
    const to = toMin(s.time_to, 24 * 60);
    for (const d of s.days) {
      if (!s.time_from || !s.time_to || from < to) {
        blocks.push({ key: `${s.id}-${d}`, day: d, start: from, end: s.time_to ? to : 1440, s });
      } else {
        // atravessa a meia-noite: parte até às 24h e parte no dia seguinte
        blocks.push({ key: `${s.id}-${d}a`, day: d, start: from, end: 1440, s });
        blocks.push({ key: `${s.id}-${d}b`, day: (d % 7) + 1, start: 0, end: to, s });
      }
    }
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[40px_repeat(7,1fr)] text-center text-xs font-medium text-muted-foreground">
          <div />
          {DAYS.map((d) => (
            <div key={d.n} className="pb-1">
              {d.short}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[40px_repeat(7,1fr)]">
          <div className="relative h-[384px] text-[10px] text-muted-foreground">
            {[0, 6, 12, 18, 24].map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2"
                style={{ top: `${(h / 24) * 100}%` }}
              >
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>
          {DAYS.map((d) => (
            <div key={d.n} className="relative h-[384px] border-l bg-muted/40">
              {[6, 12, 18].map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-dashed border-border"
                  style={{ top: `${(h / 24) * 100}%` }}
                />
              ))}
              {blocks
                .filter((b) => b.day === d.n)
                .sort((a, b) => a.s.priority - b.s.priority)
                .map((b) => (
                  <div
                    key={b.key}
                    title={`${b.s.name || layoutName(b.s.layout_id)} · prioridade ${b.s.priority}`}
                    className="absolute inset-x-0.5 overflow-hidden rounded px-1 text-[10px] leading-tight text-white"
                    style={{
                      top: `${(b.start / 1440) * 100}%`,
                      height: `${Math.max(2, ((b.end - b.start) / 1440) * 100)}%`,
                      background: layoutColor(b.s.layout_id),
                      opacity: 0.9,
                    }}
                  >
                    {layoutName(b.s.layout_id)}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Espaços vazios:{" "}
          {defaultLayoutName
            ? `layout por defeito (${defaultLayoutName})`
            : "sem layout por defeito — o ecrã mostra só o logótipo"}
          . Quando há blocos sobrepostos, ganha o de maior prioridade.
        </p>
      </div>
    </div>
  );
}
