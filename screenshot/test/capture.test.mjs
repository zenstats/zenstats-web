import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

const token = "local-screenshot-integration-token-0123456789";
const root = new URL("..", import.meta.url);
async function serve(handler) {
  const s = http.createServer(handler);
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  return s;
}
async function launch(t, env = {}) {
  const probe = await serve(() => {}),
    port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      SCREENSHOT_TOKEN: token,
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stderr.on("data", (c) => {
    logs += c;
  });
  const ready = once(child.stdout, "data");
  await Promise.race([
    ready,
    once(child, "exit").then(() => {
      throw new Error(logs);
    }),
  ]);
  t.after(() => child.kill("SIGTERM"));
  return async (body, auth = token) =>
    fetch(`http://127.0.0.1:${port}/capture`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
}

test("real Chromium captures metadata and PNG, blocks subresources and suppresses tracking", async (t) => {
  let forbidden = 0,
    analytics = 0;
  const trap = await serve((_req, res) => {
    forbidden++;
    res.end("private");
  });
  t.after(() => trap.close());
  const site = await serve((req, res) => {
    if (req.url === "/api/event") {
      analytics++;
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<html><head><style>html,body{margin:0}body{height:1600px}</style></head><body><button data-zs-id="download">Download</button><img src="http://localhost:${trap.address().port}/private"><script data-domain="example.test" data-heatmap="true" data-heatmap-key="software" data-heatmap-version="v1">if(window.RTCPeerConnection)document.body.style.height='1700px';if(localStorage.zenstats_ignore!=='true')fetch('/api/event',{method:'POST'})</script></body></html>`,
    );
  });
  t.after(() => site.close());
  const call = await launch(t, {
    SCREENSHOT_ALLOW_PRIVATE_HOSTS: "127.0.0.1",
    SCREENSHOT_ALLOW_PORTS: `${site.address().port},${trap.address().port}`,
  });
  const payload = {
    url: `http://127.0.0.1:${site.address().port}/soft/a.html`,
    viewport_width: 800,
    viewport_height: 600,
  };
  assert.equal((await call(payload, "wrong")).status, 401);
  const pending = call(payload);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal((await call(payload)).status, 429);
  const res = await pending;
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.page.path, "/soft/a.html");
  assert.equal(result.page.aggregation_key, "software");
  assert.equal(result.page.version, "v1");
  assert.equal(result.page.document_width, 800);
  assert.equal(result.page.document_height, 1600);
  const png = Buffer.from(result.image, "base64");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 800);
  assert.equal(png.readUInt32BE(20), 1600);
  assert.equal(forbidden, 0);
  assert.equal(analytics, 0);
});

test("browser cannot bypass the proxy to a loopback URL by default", async (t) => {
  let calls = 0;
  const site = await serve((_req, res) => {
    calls++;
    res.end("<html>Private</html>");
  });
  t.after(() => site.close());
  const call = await launch(t, {
    SCREENSHOT_ALLOW_PORTS: String(site.address().port),
  });
  assert.equal(
    (
      await call({
        url: `http://127.0.0.1:${site.address().port}/`,
        viewport_width: 800,
        viewport_height: 600,
      })
    ).status,
    422,
  );
  assert.equal(calls, 0);
  assert.equal(
    (
      await call({
        url: "file:///etc/passwd",
        viewport_width: 800,
        viewport_height: 600,
      })
    ).status,
    422,
  );
});
