import test from "node:test";
import assert from "node:assert/strict";
import worker from "../dist/worker-entry.mjs";

const base = "https://tel.seanbehan.ca";

function call(pathname, init = {}) {
  return worker.fetch(new Request(base + pathname, init), { SITE_NAME: "tel.seanbehan.ca" }, {});
}

test("home page renders the Tel marketing page", async () => {
  const response = await call("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  const html = await response.text();
  assert.match(html, /The token-efficient language for/);
  assert.match(html, /2,193/);
  assert.match(html, /id="app"/);
  assert.match(html, /\/assets\/app\.mjs/);
  assert.doesNotMatch(html, /\sstyle="/, "strict CSP: no inline style attributes");
  assert.match(html, /class="tok-kw"/, "server-side syntax highlighting");
  assert.match(html, /540/);
  assert.match(html, /759/);
  assert.match(html, /npx @codebam\/tel init/, "hero advertises the published package");
});

test("HEAD requests reuse the GET routes", async () => {
  const response = await call("/", { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(await response.text(), "");
});

test("health endpoint reports the compiled runtime", async () => {
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.ok, true);
  assert.equal(body.language, "tel");
  assert.equal(body.service, "tel.seanbehan.ca");
  assert.match(body.runtime, /node|cloudflare|unknown/);
});

test("benchmarks endpoint exposes the exact documented totals", async () => {
  const response = await call("/api/benchmarks");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.totals.all.tel, 540);
  assert.equal(body.totals.all.ts, 759);
  assert.equal(body.base.length, 3);
  assert.equal(body.v02.length, 3);
});

test("GET /api/estimate returns a code-aware estimate", async () => {
  const response = await call("/api/estimate?text=fn%20main()%3A%0A%20%20print(%22hi%22)");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.chars, 24);
  assert.equal(body.lines, 2);
  assert.ok(body.approxTokens > 0);
});

test("POST /api/estimate reads the Tel function result", async () => {
  const response = await call("/api/estimate", { method: "POST", body: "const value = 41 + 1;" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.chars, 21);
  assert.ok(body.approxTokens > 0);
  assert.match(body.note, /tel tokens/);
});

test("unknown routes return the Tel 404 page", async () => {
  const response = await call("/definitely-not-a-route");
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, /No route for/);
  assert.match(html, /definitely-not-a-route/);
});

test("robots and sitemap are served from Tel strings", async () => {
  const robots = await call("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: https:\/\/tel\.seanbehan\.ca\/sitemap\.xml/);
  const sitemap = await call("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset/);
});

test("missing static assets fall through to a plain 404", async () => {
  const response = await call("/assets/missing-app.mjs");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /^text\/plain/);
});
