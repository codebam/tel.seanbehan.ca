// src/worker-globals.mjs — the only hand-written module in the server tree.
//
// Cloudflare Workers and Node >= 20 both expose the WHATWG fetch primitives as
// globals, so Tel can stay free of `node:*` imports and no compatibility flags
// are required. Tel imports the bindings it needs through this shim so that
// `tel check` sees them as defined identifiers.

export const Response = globalThis.Response;

export const runtime = (() => {
  const ua = globalThis.navigator?.userAgent ?? "";
  if (ua.includes("Cloudflare-Workers")) return "cloudflare-workers";
  if (typeof process !== "undefined" && process.version) return `node-${process.version}`;
  return "unknown";
})();
