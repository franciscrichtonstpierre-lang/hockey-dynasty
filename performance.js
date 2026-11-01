/* Hockey Dynasty performance layer — safe optimizations for static game data */
(function () {
  "use strict";
  if (window.__HD_PERF_LAYER__) return;
  window.__HD_PERF_LAYER__ = true;

  const nativeFetch = window.fetch.bind(window);
  const cache = new Map();
  const pending = new Map();
  const MAX_ENTRIES = 96;
  const MAX_BYTES = 24 * 1024 * 1024;
  const TTL = 5 * 60 * 1000;
  let cacheBytes = 0;

  function normalize(url) {
    const u = new URL(url, location.href);
    if (!/\/data\/.*\.json$/i.test(u.pathname)) return null;
    if (u.origin !== location.origin &&
        !u.hostname.endsWith("githubusercontent.com") &&
        u.hostname !== "cdn.jsdelivr.net") return null;
    // Existing code appends Date.now() to static JSON URLs, which defeats caching.
    for (const [key, value] of [...u.searchParams.entries()]) {
      if (/^\d{10,}$/.test(value) || /^(v|_=)$/.test(key)) u.searchParams.delete(key);
    }
    return u.href;
  }

  function trimCache() {
    while (cache.size > MAX_ENTRIES || cacheBytes > MAX_BYTES) {
      const first = cache.keys().next().value;
      if (!first) break;
      const old = cache.get(first);
      cacheBytes -= old.bytes;
      cache.delete(first);
    }
  }

  window.fetch = async function (input, init) {
    const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();
    const key = method === "GET" ? normalize(rawUrl) : null;
    if (!key || /[?&](?:refresh|nocache)=1(?:&|$)/.test(rawUrl)) {
      return nativeFetch(input, init);
    }

    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.time < TTL) {
      cache.delete(key); cache.set(key, hit);
      return new Response(hit.body, { status: 200, headers: hit.headers });
    }

    if (pending.has(key)) {
      const body = await pending.get(key);
      return new Response(body.body, { status: body.status, statusText: body.statusText, headers: body.headers });
    }

    const request = (async () => {
      const response = await nativeFetch(key, init);
      if (!response.ok) return { body: "", status: response.status, statusText: response.statusText, headers: response.headers };
      const type = response.headers.get("content-type") || "";
      if (!type.includes("json")) return { body: "", status: response.status, statusText: response.statusText, headers: response.headers };
      const body = await response.text();
      const bytes = new Blob([body]).size;
      if (bytes <= MAX_BYTES) {
        cache.set(key, { body, headers: response.headers, time: Date.now(), bytes });
        cacheBytes += bytes;
        trimCache();
      }
      return { body, status: response.status, statusText: response.statusText, headers: response.headers };
    })();

    pending.set(key, request);
    try {
      const result = await request;
      if (!result.body && result.status !== 200) {
        return new Response(null, { status: result.status, statusText: result.statusText, headers: result.headers });
      }
      return new Response(result.body, { status: result.status, statusText: result.statusText, headers: result.headers });
    } finally {
      pending.delete(key);
    }
  };

  // Avoid repeated layout/paint work for long lists below the fold.
  const style = document.createElement("style");
  style.textContent = [
    ".item,.lineGroup{content-visibility:auto;contain-intrinsic-size:auto 64px}",
    ".lineGroup{contain-intrinsic-size:auto 320px}",
    "@media(max-width:700px){nav{backdrop-filter:none!important} .card{box-shadow:0 3px 10px #0002!important} body{background:#081625!important}}",
    "@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}"
  ].join("");
  document.head.appendChild(style);

  window.hdPerformanceStats = function () {
    return { cachedFiles: cache.size, pendingRequests: pending.size, cacheMegabytes: +(cacheBytes / 1048576).toFixed(2) };
  };
})();