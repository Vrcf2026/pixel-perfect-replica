/** Leitura de sites (sem browser): logótipo, cores, contactos, redes e texto. */
export type SiteInfo = {
  url: string;
  title: string;
  description: string;
  siteName: string;
  themeColor: string;
  logos: string[];
  phones: string[];
  emails: string[];
  socials: string[];
  mapsLinks: string[];
  jsonLd: Array<Record<string, unknown>>;
  text: string;
};

const UA = "Mozilla/5.0 (compatible; VRCF-Montra/1.0; +https://vrcf.pt)";

export function normalizeUrl(u: string) {
  const t = u.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function getHtml(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("html")) throw new Error("não é uma página");
    return { html: (await r.text()).slice(0, 1_500_000), finalUrl: r.url || url };
  } finally {
    clearTimeout(t);
  }
}

const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
    .exec(tag)
    ?.slice(2)
    .find((x) => x !== undefined) ?? "";

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));

function abs(href: string, base: string) {
  try {
    return new URL(decode(href), base).toString();
  } catch {
    return "";
  }
}

function textOf(html: string) {
  return decode(
    html
      .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function parse(html: string, base: string) {
  const tags = (name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
  const meta = (key: string) =>
    tags("meta")
      .filter((m) => [attr(m, "property"), attr(m, "name")].some((v) => v.toLowerCase() === key))
      .map((m) => decode(attr(m, "content")))[0] ?? "";
  const links = tags("link");
  const icons = links
    .filter((l) => /icon/i.test(attr(l, "rel")))
    .map((l) => ({
      href: abs(attr(l, "href"), base),
      size: Number(attr(l, "sizes").split("x")[0]) || (/apple/i.test(attr(l, "rel")) ? 180 : 32),
    }))
    .filter((x) => x.href)
    .sort((a, b) => b.size - a.size);
  const imgs = tags("img")
    .filter((i) =>
      /logo/i.test(`${attr(i, "src")} ${attr(i, "alt")} ${attr(i, "class")} ${attr(i, "id")}`),
    )
    .map((i) => abs(attr(i, "src") || attr(i, "data-src"), base))
    .filter((u) => u && !u.startsWith("data:"));
  const jsonLd: Array<Record<string, unknown>> = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1] as string) as unknown;
      const list = Array.isArray(j)
        ? j
        : (j as Record<string, unknown>)["@graph"]
          ? ((j as Record<string, unknown>)["@graph"] as unknown[])
          : [j];
      for (const x of list)
        if (x && typeof x === "object") jsonLd.push(x as Record<string, unknown>);
    } catch {
      /* JSON-LD inválido */
    }
  }
  const ldLogos = jsonLd
    .map((o) => o["logo"])
    .map((l) =>
      typeof l === "string"
        ? l
        : l && typeof l === "object"
          ? String((l as Record<string, unknown>)["url"] ?? "")
          : "",
    )
    .filter(Boolean)
    .map((u) => abs(u, base));
  const hrefs = (html.match(/href\s*=\s*("[^"]*"|'[^']*')/gi) ?? []).map((h) =>
    decode(h.replace(/^href\s*=\s*['"]|['"]$/gi, "")),
  );
  const phones = [
    ...new Set(
      hrefs
        .filter((h) => /^tel:/i.test(h))
        .map((h) => h.replace(/^tel:/i, "").replace(/[^\d+]/g, ""))
        .concat(
          (textOf(html).match(/(?:\+351\s?)?(?:2\d|9[1236])\d(?:\s?\d{3}){2}/g) ?? []).map((p) =>
            p.replace(/\s/g, ""),
          ),
        )
        .filter((p) => p.replace(/\D/g, "").length >= 9),
    ),
  ].slice(0, 4);
  const emails = [
    ...new Set(
      hrefs
        .filter((h) => /^mailto:/i.test(h))
        .map((h) => h.replace(/^mailto:/i, "").split("?")[0] as string)
        .concat(textOf(html).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [])
        .map((e) => e.toLowerCase())
        .filter((e) => !/\.(png|jpe?g|svg|webp)$/.test(e)),
    ),
  ].slice(0, 4);
  const absHrefs = hrefs.map((h) => abs(h, base)).filter(Boolean);
  const socials = [
    ...new Set(
      absHrefs.filter((h) =>
        /(facebook|instagram|linkedin|youtube|tiktok|x)\.com\/(?!sharer|share|intent)/i.test(h),
      ),
    ),
  ].slice(0, 6);
  const mapsLinks = [
    ...new Set(
      absHrefs.filter((h) =>
        /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|g\.page|goo\.gl\/maps/i.test(h),
      ),
    ),
  ].slice(0, 3);
  const title = decode((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim());
  const ogImage = meta("og:image");
  const logos = [
    ...new Set([
      ...ldLogos,
      ...imgs,
      ...(ogImage && /logo/i.test(ogImage) ? [abs(ogImage, base)] : []),
      ...icons.filter((i) => i.size >= 120).map((i) => i.href),
      ...(ogImage ? [abs(ogImage, base)] : []),
      ...icons.map((i) => i.href),
    ]),
  ].filter(Boolean);
  const internal = absHrefs.filter((h) => {
    try {
      return new URL(h).host === new URL(base).host;
    } catch {
      return false;
    }
  });
  return {
    title,
    description: meta("description") || meta("og:description"),
    siteName: meta("og:site_name"),
    themeColor: meta("theme-color"),
    logos,
    phones,
    emails,
    socials,
    mapsLinks,
    jsonLd,
    text: textOf(html),
    internal,
  };
}

/** Lê a página indicada e até 3 páginas internas úteis (contactos, sobre, serviços). */
export async function readSite(input: string): Promise<SiteInfo> {
  const url = normalizeUrl(input);
  const home = await getHtml(url);
  const p = parse(home.html, home.finalUrl);
  const extraUrls = [
    ...new Set(
      p.internal.filter(
        (h) =>
          /contact|contacto|sobre|about|servi[cç]o|services|empresa|quem-somos|horario/i.test(h) &&
          !/#|\.(pdf|jpe?g|png)$/i.test(h),
      ),
    ),
  ].slice(0, 3);
  const extras = await Promise.all(
    extraUrls.map(async (u) => {
      try {
        const r = await getHtml(u);
        return parse(r.html, r.finalUrl);
      } catch {
        return null;
      }
    }),
  );
  const all = [p, ...extras.filter((x): x is NonNullable<typeof x> => !!x)];
  const uniq = (arr: string[]) => [...new Set(arr)];
  return {
    url: home.finalUrl,
    title: p.title,
    description: p.description,
    siteName: p.siteName,
    themeColor: p.themeColor,
    logos: uniq(all.flatMap((x) => x.logos)).slice(0, 8),
    phones: uniq(all.flatMap((x) => x.phones)).slice(0, 4),
    emails: uniq(all.flatMap((x) => x.emails)).slice(0, 4),
    socials: uniq(all.flatMap((x) => x.socials)).slice(0, 6),
    mapsLinks: uniq(all.flatMap((x) => x.mapsLinks)).slice(0, 3),
    jsonLd: all.flatMap((x) => x.jsonLd).slice(0, 10),
    text: all
      .map((x) => x.text)
      .join("\n")
      .slice(0, 7000),
  };
}
