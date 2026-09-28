/* VRCF Montra — cache dos ficheiros da biblioteca (imagens e vídeos) para o player
   continuar a funcionar se a internet cair. Só toca em pedidos ao bucket "media". */
const CACHE = "montra-media-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function isMedia(url) {
  return url.pathname.includes("/storage/v1/object/public/media/");
}

async function rangeResponse(cached, rangeHeader) {
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || "");
  const size = buf.byteLength;
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (!m || !m[1]) start = m && m[2] ? size - Number(m[2]) : 0;
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

const pending = new Set();

async function cacheFull(key) {
  if (pending.has(key)) return;
  pending.add(key);
  try {
    const full = await fetch(key, { mode: "cors", credentials: "omit" });
    if (full.ok && full.status === 200) {
      const cache = await caches.open(CACHE);
      await cache.put(key, full);
    }
  } catch {
    /* sem rede: fica para a próxima */
  } finally {
    pending.delete(key);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isMedia(url)) return;
  const key = url.origin + url.pathname;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key);
      const range = req.headers.get("range");
      if (cached) return range ? rangeResponse(cached, range) : cached;
      // Primeira vez: serve da rede já e guarda o ficheiro inteiro em segundo plano.
      event.waitUntil(cacheFull(key));
      return fetch(req);
    })(),
  );
});
