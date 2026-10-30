// Static assets are served without invoking this Worker. Only /api/* runs code.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    if (pathname !== "/api/health") return json({ error: "NOT_FOUND" }, 404);
    try {
      const response = await env.ASSETS.fetch(new URL("/data/manifest.json", request.url));
      if (!response.ok) throw new Error("MANIFEST_MISSING");
      const data = await response.json();
      return json({
        status: "healthy",
        service: "healingmart-exam-cloudflare",
        dataMode: data.mode,
        recordCount: data.total,
        fullCatalog: data.fullCatalog,
        updatedAt: data.lastSync,
        storage: "static-assets",
        d1: false, kv: false, cron: false
      });
    } catch {
      return json({ status: "error", reason: "DATA_UNAVAILABLE" }, 503);
    }
  }
};
