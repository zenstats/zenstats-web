import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { chromium } from "playwright";
import { createProxy } from "./network.mjs";

const token = process.env.SCREENSHOT_TOKEN;
if (!token || token.length < 32)
  throw new Error("SCREENSHOT_TOKEN must contain at least 32 characters");
const privateHosts = new Set(
  (process.env.SCREENSHOT_ALLOW_PRIVATE_HOSTS || "").split(",").filter(Boolean),
);
const ports = new Set([
  80,
  443,
  ...(process.env.SCREENSHOT_ALLOW_PORTS || "")
    .split(",")
    .filter(Boolean)
    .map(Number),
]);
let busy = false;
function authorized(header = "") {
  const a = Buffer.from(header),
    b = Buffer.from("Bearer " + token);
  return a.length === b.length && timingSafeEqual(a, b);
}
function reply(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET")
    return reply(res, 200, { ready: true });
  if (req.url !== "/capture" || req.method !== "POST")
    return reply(res, 404, { error: "Not found" });
  if (!authorized(req.headers.authorization))
    return reply(res, 401, { error: "Unauthorized" });
  if (busy) return reply(res, 429, { error: "Screenshot worker busy" });
  busy = true;
  let browser, context, proxy, timer, outcome;
  try {
    let length = 0,
      chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 8192) throw new Error("Request too large");
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString()),
      u = new URL(input.url);
    if (
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password ||
      u.search ||
      u.hash.includes("?") ||
      input.url.length > 2000
    )
      throw new Error("Invalid URL");
    const width = input.viewport_width,
      height = input.viewport_height;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 100 ||
      height < 100 ||
      width > 8192 ||
      height > 8192
    )
      throw new Error("Invalid viewport");
    proxy = await createProxy(privateHosts, ports);
    browser = await chromium.launch({
      timeout: 10000,
      headless: true,
      channel: process.env.SCREENSHOT_BROWSER_CHANNEL || undefined,
      proxy: { server: proxy.url, bypass: "<-loopback>" },
      args: [
        "--disable-quic",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-background-networking",
      ],
    });
    timer = setTimeout(() => browser.close().catch(() => {}), 30000);
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.addInitScript(() => {
      try {
        localStorage.zenstats_ignore = "true";
      } catch {}
      window.open = () => null;
      for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection"]) {
        Object.defineProperty(window, name, {
          value: undefined,
          writable: false,
          configurable: false,
        });
      }
    });
    await context.routeWebSocket(/.*/, (ws) => ws.close());
    const page = await context.newPage();
    context.on("page", (p) => {
      if (p !== page) p.close().catch(() => {});
    });
    await context.route("**/*", (route) => {
      try {
        const target = new URL(route.request().url());
        if (!["http:", "https:", "data:", "blob:"].includes(target.protocol))
          return route.abort();
        if (
          route.request().isNavigationRequest() &&
          route.request().frame() === page.mainFrame() &&
          target.hostname !== u.hostname
        )
          return route.abort();
        if (["/api/event", "/api/heatmap/clicks"].includes(target.pathname))
          return route.abort();
        return route.continue();
      } catch {
        return route.abort();
      }
    });
    const response = await page.goto(input.url, {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    if (!response || response.status() >= 400)
      throw new Error("Page unavailable");
    await page.evaluate(() => document.fonts.ready);
    // Trigger lazy images without clicking or accepting dialogs, then return to top.
    await page.evaluate(async () => {
      for (
        let y = 0;
        y < Math.min(document.documentElement.scrollHeight, 100000);
        y += innerHeight
      ) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 25));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    const metadata = await page.evaluate((hash) => {
      const root = document.documentElement,
        body = document.body || root;
      const script = document.querySelector(
        'script[data-domain][data-heatmap="true"]',
      );
      const attr = (name, fallback) => script?.getAttribute(name) || fallback;
      return {
        hostname: location.hostname,
        path: location.pathname + (hash ? location.hash.split("?")[0] : ""),
        aggregation_key: attr("data-heatmap-key", ""),
        version: attr("data-heatmap-version", "unknown"),
        variant: attr("data-heatmap-variant", "default"),
        viewport_width: innerWidth,
        viewport_height: innerHeight,
        document_width: Math.max(
          innerWidth,
          root.scrollWidth,
          body.scrollWidth,
        ),
        document_height: Math.max(
          innerHeight,
          root.scrollHeight,
          body.scrollHeight,
        ),
      };
    }, Boolean(u.hash));
    if (
      metadata.document_width * metadata.document_height > 25000000 ||
      metadata.document_width > 8192 ||
      metadata.document_height > 100000
    )
      throw new Error("Page too large");
    const image = await page.screenshot({
      type: "png",
      fullPage: true,
      animations: "disabled",
      timeout: 5000,
    });
    const stable = await page.evaluate(() => ({
      w: Math.max(
        innerWidth,
        document.documentElement.scrollWidth,
        document.body?.scrollWidth || 0,
      ),
      h: Math.max(
        innerHeight,
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0,
      ),
    }));
    if (
      stable.w !== metadata.document_width ||
      stable.h !== metadata.document_height
    )
      throw new Error("Unstable page layout");
    if (image.length > 5 * 1024 * 1024) throw new Error("Image too large");
    outcome = [
      200,
      { url: page.url(), page: metadata, image: image.toString("base64") },
    ];
  } catch (e) {
    console.error("Capture failed:", e.message);
    outcome = [422, { error: "Capture failed" }];
  } finally {
    clearTimeout(timer);
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    proxy?.close();
    busy = false;
    if (!res.headersSent && !res.destroyed) reply(res, ...outcome);
  }
});
server.requestTimeout = 35000;
server.headersTimeout = 5000;
server.listen(
  Number(process.env.PORT || 8090),
  process.env.HOST || "0.0.0.0",
  () => console.log("Screenshot worker ready"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close();
    setTimeout(() => process.exit(0), 1000).unref();
  });
