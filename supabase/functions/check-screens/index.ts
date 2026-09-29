// VRCF Montra — verifica ecrãs sem sinal e envia alertas por email (Resend).
// Agendar de 5 em 5 minutos (pg_cron). Secrets: RESEND_API_KEY, CRON_SECRET, APP_URL (opcional).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type Row = {
  screen_id: string;
  screen_name: string;
  org_id: string;
  org_name: string;
  emails: string[];
  state: "down" | "recovered";
  last_seen_at: string | null;
  timezone: string;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function when(iso: string | null, tz: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: tz,
  }).format(new Date(iso));
}

function emailHtml(r: Row, appUrl: string) {
  const down = r.state === "down";
  const color = down ? "#DC2626" : "#16A34A";
  const title = down ? "Ecrã sem sinal" : "Ecrã voltou a ligar";
  const text = down
    ? `O ecrã <b>${esc(r.screen_name)}</b> (${esc(r.org_name)}) não contacta o servidor desde ${when(r.last_seen_at, r.timezone)}.`
    : `O ecrã <b>${esc(r.screen_name)}</b> (${esc(r.org_name)}) voltou a estar ligado.`;
  const tips = down
    ? `<p style="margin:16px 0 0;color:#475569;font-size:14px">Verifique se a TV e o aparelho (mini PC, Raspberry Pi ou box) estão ligados e com internet.</p>`
    : "";
  const link = appUrl
    ? `<p style="margin:20px 0 0"><a href="${appUrl}/ecras/${r.screen_id}" style="background:#0F1E36;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">Ver ecrã</a></p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #E2E8F0;border-radius:10px">
  <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.05em">VRCF Montra</div>
  <h2 style="margin:6px 0 12px;color:${color}">${title}</h2>
  <p style="margin:0;color:#0F1E36;font-size:15px;line-height:1.5">${text}</p>${tips}${link}
</div>`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: cfg } = await db.from("platform_settings").select("from_email").maybeSingle();
  const from = `VRCF Montra <${cfg?.from_email ?? "alertas@vrcf.pt"}>`;
  const { data, error } = await db.rpc("screens_alert_state");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const rows = (data ?? []) as Row[];

  const results: Array<{ screen: string; state: string; sent: boolean; error?: string }> = [];
  for (const r of rows) {
    let sent = false;
    let err: string | undefined;
    const to = [...new Set(r.emails.filter(Boolean))];
    if (resendKey && to.length) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject:
            r.state === "down"
              ? `⚠ Sem sinal: ${r.screen_name} (${r.org_name})`
              : `✓ Voltou: ${r.screen_name} (${r.org_name})`,
          html: emailHtml(r, appUrl),
        }),
      });
      sent = res.ok;
      if (!res.ok) err = `${res.status} ${await res.text()}`;
    } else {
      err = resendKey ? "sem destinatários" : "RESEND_API_KEY em falta";
    }
    // Marca o estado mesmo sem email, para não repetir de 5 em 5 minutos.
    await db
      .from("screens")
      .update({ alert_sent_at: r.state === "down" ? new Date().toISOString() : null })
      .eq("id", r.screen_id);
    results.push({ screen: r.screen_name, state: r.state, sent, ...(err ? { error: err } : {}) });
  }
  return new Response(JSON.stringify({ checked: rows.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
